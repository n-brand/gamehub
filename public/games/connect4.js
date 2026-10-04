// Vier gewinnt – gegen den Computer (drei Stärken) oder zu zweit an einem Gerät.
// mount(container) gibt eine Cleanup-Funktion zurück.

const COLS = 7;
const ROWS = 6;
const CELLS = COLS * ROWS;
const RED = 1; // Spieler 1 (gegen den Computer: du)
const YELLOW = 2; // Spieler 2 (gegen den Computer: der Computer)
const SETTINGS_KEY = 'gamehub-connect4';

// Geometrie in SVG-Einheiten: 100 pro Feld, 16 Rand. Darüber liegt eine Feldhöhe für den
// Vorschau-Stein, dadurch ist die Bühne genau quadratisch (732 × 732).
const U = 100;
const PAD = 16;
const SIZE = COLS * U + 2 * PAD;
const BOARD_H = ROWS * U + 2 * PAD;
const HOLE_R = 41;
const DISC = 80;
const DISC_INSET = (U - DISC) / 2;

const LEVELS = {
  easy: { depth: 2, random: 0.35 },
  medium: { depth: 4, random: 0.1 },
  hard: { depth: 14, random: 0 },
};
const AI_TIME_LIMIT = 600; // ms Rechenzeit pro Zug (höchstens)
const AI_MIN_THINK = 500; // ms, damit der Computer nicht „sofort“ zieht

// ---------- Computer-Gegner (Negamax mit Alpha-Beta) ----------

const ORDER = [3, 2, 4, 1, 5, 0, 6]; // Mitte zuerst – gute Züge früh prüfen, spart viel Rechenzeit
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
const WIN_SCORE = 1_000_000;
const TIMEOUT = Symbol('timeout');

// Alle 69 möglichen Vierer-Reihen (Indizes: Spalte * ROWS + Zeile, Zeile 0 = unten)
const WINDOWS = [];
for (let c = 0; c < COLS; c++) {
  for (let r = 0; r < ROWS; r++) {
    for (const [dc, dr] of DIRS) {
      const ec = c + 3 * dc;
      const er = r + 3 * dr;
      if (ec < 0 || ec >= COLS || er < 0 || er >= ROWS) continue;
      WINDOWS.push([0, 1, 2, 3].map((k) => (c + k * dc) * ROWS + (r + k * dr)));
    }
  }
}

// Würde ein Stein von p auf (c, r) vier in eine Reihe ergeben? (Das Feld selbst wird nicht gelesen.)
function isWin(cells, c, r, p) {
  for (const [dc, dr] of DIRS) {
    let n = 1;
    for (const s of [1, -1]) {
      let cc = c + dc * s;
      let rr = r + dr * s;
      while (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && cells[cc * ROWS + rr] === p) {
        n++;
        cc += dc * s;
        rr += dr * s;
      }
    }
    if (n >= 4) return true;
  }
  return false;
}

// Gewinnreihe durch den zuletzt gesetzten Stein (für die Hervorhebung) oder null
function winningLine(cells, c, r, p) {
  for (const [dc, dr] of DIRS) {
    const line = [c * ROWS + r];
    for (const s of [1, -1]) {
      let cc = c + dc * s;
      let rr = r + dr * s;
      while (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && cells[cc * ROWS + rr] === p) {
        line.push(cc * ROWS + rr);
        cc += dc * s;
        rr += dr * s;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

// Stellungsbewertung aus Sicht von p: offene Zweier/Dreier und Steine in der Mitte zählen
function evaluate(cells, p) {
  const o = 3 - p;
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    const v = cells[3 * ROWS + r];
    if (v === p) score += 3;
    else if (v === o) score -= 3;
  }
  for (const w of WINDOWS) {
    let mine = 0;
    let theirs = 0;
    for (let k = 0; k < 4; k++) {
      const v = cells[w[k]];
      if (v === p) mine++;
      else if (v === o) theirs++;
    }
    if (mine && theirs) continue;
    if (mine === 3) score += 5;
    else if (mine === 2) score += 2;
    else if (theirs === 3) score -= 6;
    else if (theirs === 2) score -= 2;
  }
  return score;
}

function negamax(s, depth, alpha, beta, p) {
  if ((++s.nodes & 2047) === 0 && performance.now() > s.deadline) throw TIMEOUT;
  const { cells, heights } = s;
  // Sofortiger Sieg möglich? Schnellere Siege zählen mehr (depth ist dann noch größer).
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS && isWin(cells, c, heights[c], p)) return WIN_SCORE + depth;
  }
  if (depth === 0) return evaluate(cells, p);
  let best = -Infinity;
  for (const c of ORDER) {
    const r = heights[c];
    if (r === ROWS) continue;
    const i = c * ROWS + r;
    cells[i] = p;
    heights[c]++;
    s.moves++;
    const score = s.moves === CELLS ? 0 : -negamax(s, depth - 1, -beta, -alpha, 3 - p);
    cells[i] = 0;
    heights[c]--;
    s.moves--;
    if (score > best) {
      best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
  }
  return best === -Infinity ? 0 : best;
}

// Bester Zug für p. Iterative Vertiefung mit Zeitlimit; gleich gute Züge werden zufällig gewählt.
export function chooseMove(cells, heights, moves, p, levelKey) {
  const level = LEVELS[levelKey] || LEVELS.medium;
  const legal = ORDER.filter((c) => heights[c] < ROWS);
  for (const c of legal) if (isWin(cells, c, heights[c], p)) return c;
  if (Math.random() < level.random) return legal[Math.floor(Math.random() * legal.length)];

  const s = {
    cells: Int8Array.from(cells),
    heights: Int8Array.from(heights),
    moves,
    nodes: 0,
    deadline: performance.now() + AI_TIME_LIMIT,
  };
  let best = legal;
  for (let depth = 1; depth <= level.depth; depth++) {
    let bestScore = -Infinity;
    let found = [];
    try {
      for (const c of legal) {
        const i = c * ROWS + s.heights[c];
        s.cells[i] = p;
        s.heights[c]++;
        s.moves++;
        // Fenster knapp unter dem bisher Besten: gleich gute Züge bleiben exakt vergleichbar
        const score = s.moves === CELLS ? 0 : -negamax(s, depth - 1, -Infinity, -(bestScore - 1), 3 - p);
        s.cells[i] = 0;
        s.heights[c]--;
        s.moves--;
        if (score > bestScore) {
          bestScore = score;
          found = [c];
        } else if (score === bestScore) {
          found.push(c);
        }
      }
    } catch (err) {
      // Zeit abgelaufen: Ergebnis der letzten vollständigen Tiefe verwenden (s wird verworfen)
      if (err === TIMEOUT) break;
      throw err;
    }
    best = found;
    if (Math.abs(bestScore) >= WIN_SCORE) break; // Ausgang steht fest
  }
  return best[Math.floor(Math.random() * best.length)];
}

// ---------- Darstellung ----------

const pct = (units) => `${(units / SIZE) * 100}%`;

// Brett als SVG: Fläche mit 42 ausgestanzten Löchern (evenodd), die Steine liegen dahinter
function boardSvg() {
  const R = 30;
  let d = `M${R} 0H${SIZE - R}A${R} ${R} 0 0 1 ${SIZE} ${R}V${BOARD_H - R}A${R} ${R} 0 0 1 ${SIZE - R} ${BOARD_H}H${R}A${R} ${R} 0 0 1 0 ${BOARD_H - R}V${R}A${R} ${R} 0 0 1 ${R} 0Z`;
  let rims = '';
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const cx = PAD + U / 2 + c * U;
      const cy = PAD + U / 2 + r * U;
      d += `M${cx - HOLE_R} ${cy}a${HOLE_R} ${HOLE_R} 0 1 0 ${2 * HOLE_R} 0a${HOLE_R} ${HOLE_R} 0 1 0 ${-2 * HOLE_R} 0Z`;
      rims += `<circle cx="${cx}" cy="${cy}" r="${HOLE_R}"/>`;
    }
  }
  return `<svg viewBox="0 0 ${SIZE} ${BOARD_H}" aria-hidden="true"><path d="${d}" fill="#4c6ef5" fill-rule="evenodd"/><g fill="none" stroke="#3b5bdb" stroke-width="6">${rims}</g></svg>`;
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    return { mode: s.mode === 'duo' ? 'duo' : 'cpu', level: LEVELS[s.level] ? s.level : 'medium' };
  } catch {
    return { mode: 'cpu', level: 'medium' };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Speicher nicht verfügbar – Einstellung gilt nur für diese Sitzung
  }
}

export function mount(container) {
  const settings = loadSettings();

  const playerCard = (p) => `
    <div class="c4-player" data-player="${p}">
      <span class="c4-chip"></span>
      <span class="c4-player-text"><b data-name></b><small data-sub></small></span>
      <span class="c4-score" data-score>0</span>
    </div>`;

  container.innerHTML = `
    <div class="gp c4">
      <div class="gp-panel">
        <div class="c4-players" aria-live="polite">${playerCard(RED)}${playerCard(YELLOW)}</div>
        <div class="gp-group">
          <span class="gp-label">Gegner</span>
          <div class="gp-seg" role="group" aria-label="Gegner">
            <button type="button" data-mode="cpu">Computer</button>
            <button type="button" data-mode="duo">Zu zweit</button>
          </div>
        </div>
        <div class="gp-group" data-level-group>
          <span class="gp-label">Stärke</span>
          <div class="gp-seg" role="group" aria-label="Stärke">
            <button type="button" data-level="easy">Leicht</button>
            <button type="button" data-level="medium">Mittel</button>
            <button type="button" data-level="hard">Schwer</button>
          </div>
        </div>
        <button type="button" class="btn btn--primary" data-new>Neues Spiel</button>
      </div>
      <div class="c4-stage" data-stage>
        <div class="c4-discs" data-discs></div>
        <div class="c4-board">${boardSvg()}</div>
        <div class="c4-col-hl" data-hl></div>
        <div class="c4-disc c4-preview" data-preview></div>
        <div class="c4-cols">
          ${[...Array(COLS).keys()].map((c) => `<button type="button" tabindex="-1" data-col="${c}" aria-label="Spalte ${c + 1}"></button>`).join('')}
        </div>
        <div class="c4-banner" data-banner hidden>
          <span class="c4-banner-text" data-banner-text aria-live="polite"></span>
          <button type="button" class="btn btn--primary" data-again>Nochmal</button>
        </div>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const stage = $('[data-stage]');
  const discsEl = $('[data-discs]');
  const preview = $('[data-preview]');
  const hl = $('[data-hl]');
  const banner = $('[data-banner]');
  const bannerText = $('[data-banner-text]');
  const levelGroup = $('[data-level-group]');
  const players = { [RED]: $(`[data-player="${RED}"]`), [YELLOW]: $(`[data-player="${YELLOW}"]`) };

  const cells = new Int8Array(CELLS);
  const heights = new Int8Array(COLS);
  let moves = 0;
  let current = RED;
  let starter = YELLOW; // wechselt zu Rundenbeginn → die erste Runde beginnt Rot
  let over = false;
  let winner = 0;
  let busy = false; // Stein fällt, Computer ist dran oder Brett wird geleert
  let thinking = false;
  let previewCol = 3;
  let hoverCol = null;
  let scores = { [RED]: 0, [YELLOW]: 0 };
  let round = 0;
  let clearing = false;
  const timers = new Set();

  // setTimeout, das beim Rundenwechsel automatisch verfällt
  function schedule(fn, ms) {
    const token = round;
    const id = setTimeout(() => {
      timers.delete(id);
      if (token === round) fn();
    }, ms);
    timers.add(id);
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers.clear();
  }

  const isComputerTurn = () => settings.mode === 'cpu' && current === YELLOW;
  const canPlay = () => !over && !busy && !isComputerTurn();

  function nameOf(p) {
    if (settings.mode === 'cpu') return p === RED ? 'Du' : 'Computer';
    return p === RED ? 'Rot' : 'Gelb';
  }

  function placePreview() {
    preview.style.left = pct(PAD + previewCol * U + DISC_INSET);
    hl.style.left = pct(PAD + previewCol * U);
  }

  function render() {
    const humanTurn = canPlay();
    if (humanTurn && hoverCol !== null) previewCol = hoverCol;
    for (const p of [RED, YELLOW]) {
      const el = players[p];
      el.classList.toggle('is-turn', !over && current === p);
      el.classList.toggle('is-winner', over && winner === p);
      el.querySelector('[data-name]').textContent = nameOf(p);
      el.querySelector('[data-score]').textContent = scores[p];
      let sub = '';
      if (over) sub = winner === p ? 'gewinnt!' : '';
      else if (current === p) sub = thinking ? 'denkt …' : 'am Zug';
      el.querySelector('[data-sub]').textContent = sub;
    }
    stage.classList.toggle('is-locked', !humanTurn);
    stage.classList.toggle('is-over', over);
    preview.dataset.p = current;
    preview.classList.toggle('is-hidden', !humanTurn);
    hl.classList.toggle('is-hidden', !humanTurn);
    placePreview();
  }

  function renderControls() {
    container.querySelectorAll('[data-mode]').forEach((b) => {
      const on = b.dataset.mode === settings.mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
    container.querySelectorAll('[data-level]').forEach((b) => {
      const on = b.dataset.level === settings.level;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
    levelGroup.hidden = settings.mode !== 'cpu';
  }

  // ---------- Spielablauf ----------

  function drop(col) {
    const row = heights[col];
    const p = current;
    const i = col * ROWS + row;
    cells[i] = p;
    heights[col]++;
    moves++;
    busy = true;
    render();

    const el = document.createElement('div');
    el.className = 'c4-disc';
    el.dataset.p = p;
    el.dataset.i = i;
    el.style.left = pct(PAD + col * U + DISC_INSET);
    el.style.top = pct(U + PAD + (ROWS - 1 - row) * U + DISC_INSET);
    discsEl.appendChild(el);

    // Fallen ab dem Vorschau-Platz mit Beschleunigung und kleinem Aufprall-Hüpfer
    const unit = stage.clientWidth / SIZE;
    const dist = (PAD + (ROWS - row) * U) * unit;
    const total = Math.round((150 + 85 * Math.sqrt(ROWS - row)) / 0.72);
    const bounce = Math.min(dist * 0.12, unit * 18);
    el.animate(
      [
        { transform: `translateY(${-dist}px)`, easing: 'cubic-bezier(.5,0,1,1)' },
        { transform: 'translateY(0)', offset: 0.72, easing: 'cubic-bezier(0,0,.4,1)' },
        { transform: `translateY(${-bounce}px)`, offset: 0.86, easing: 'cubic-bezier(.6,0,1,1)' },
        { transform: 'translateY(0)' },
      ],
      { duration: total },
    );
    schedule(() => afterDrop(col, row, p), total);
  }

  function afterDrop(col, row, p) {
    const line = winningLine(cells, col, row, p);
    if (line || moves === CELLS) {
      finish(line ? p : 0, line);
      return;
    }
    current = 3 - p;
    busy = false;
    render();
    if (isComputerTurn()) computerMove();
  }

  function finish(win, line) {
    over = true;
    busy = false;
    winner = win;
    if (win) {
      scores[win]++;
      line.forEach((i) => discsEl.querySelector(`[data-i="${i}"]`)?.classList.add('is-win'));
    }
    render();
    if (!win) bannerText.textContent = 'Unentschieden';
    else if (settings.mode === 'cpu') bannerText.textContent = win === RED ? 'Du gewinnst!' : 'Der Computer gewinnt';
    else bannerText.textContent = `${nameOf(win)} gewinnt!`;
    banner.hidden = false;
  }

  function computerMove() {
    busy = true;
    thinking = true;
    render();
    const started = performance.now();
    // Kurz warten, damit „denkt …“ gezeichnet wird, bevor gerechnet wird
    schedule(() => {
      const col = chooseMove(cells, heights, moves, YELLOW, settings.level);
      const rest = Math.max(0, AI_MIN_THINK - (performance.now() - started));
      schedule(() => {
        thinking = false;
        previewCol = col;
        render();
        preview.classList.remove('is-hidden'); // kurz zeigen, wohin der Computer wirft
        schedule(() => drop(col), 220);
      }, rest);
    }, 30);
  }

  function humanDrop(col) {
    if (!canPlay()) return;
    if (heights[col] >= ROWS) {
      preview.animate([{ translate: '0' }, { translate: '-8% 0' }, { translate: '8% 0' }, { translate: '0' }], { duration: 240 });
      return;
    }
    drop(col);
  }

  function startRound() {
    starter = 3 - starter;
    current = starter;
    busy = false;
    render();
    if (isComputerTurn()) computerMove();
  }

  function newGame(resetScores = false) {
    round++;
    clearTimers();
    cells.fill(0);
    heights.fill(0);
    moves = 0;
    over = false;
    winner = 0;
    thinking = false;
    busy = true;
    banner.hidden = true;
    if (resetScores) {
      scores = { [RED]: 0, [YELLOW]: 0 };
      starter = YELLOW;
    }
    render();
    // Alte Steine fallen unten aus dem Brett
    const old = [...discsEl.children];
    if (old.length && !clearing) {
      clearing = true;
      const h = stage.clientHeight;
      old.forEach((el) => {
        el.classList.remove('is-win');
        el.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${h}px)` }], {
          duration: 500,
          delay: Math.random() * 120,
          easing: 'cubic-bezier(.55,0,1,.45)',
          fill: 'forwards',
        });
      });
    }
    schedule(() => {
      discsEl.replaceChildren();
      clearing = false;
      startRound();
    }, old.length ? 650 : 0);
  }

  // ---------- Eingabe ----------

  container.querySelectorAll('[data-col]').forEach((b) => {
    const col = Number(b.dataset.col);
    b.addEventListener('pointerenter', () => {
      hoverCol = col;
      if (canPlay()) {
        previewCol = col;
        placePreview();
      }
    });
    b.addEventListener('click', () => {
      hoverCol = col;
      if (canPlay()) previewCol = col;
      humanDrop(col);
    });
  });

  container.querySelectorAll('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      if (settings.mode === b.dataset.mode) return;
      settings.mode = b.dataset.mode;
      saveSettings(settings);
      renderControls();
      newGame(true);
    }),
  );
  container.querySelectorAll('[data-level]').forEach((b) =>
    b.addEventListener('click', () => {
      if (settings.level === b.dataset.level) return;
      settings.level = b.dataset.level;
      saveSettings(settings);
      renderControls();
      newGame(true);
    }),
  );
  $('[data-new]').addEventListener('click', () => newGame());
  $('[data-again]').addEventListener('click', () => newGame());

  function onKey(e) {
    const t = e.target;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (t instanceof HTMLElement && (t.closest('input, textarea, select') || t.isContentEditable)) return;
    const k = e.code;
    if (k === 'ArrowLeft' || k === 'KeyA' || k === 'ArrowRight' || k === 'KeyD') {
      e.preventDefault();
      if (!canPlay()) return;
      hoverCol = null;
      previewCol = Math.min(COLS - 1, Math.max(0, previewCol + (k === 'ArrowLeft' || k === 'KeyA' ? -1 : 1)));
      placePreview();
    } else if (k === 'ArrowDown' || k === 'KeyS' || k === 'Enter' || k === 'Space') {
      // Enter/Leertaste auf einem Button löst den Button aus, nicht den Wurf
      if ((k === 'Enter' || k === 'Space') && t instanceof HTMLButtonElement) return;
      e.preventDefault();
      humanDrop(previewCol);
    } else if (/^(Digit|Numpad)[1-7]$/.test(k)) {
      const col = Number(k.slice(-1)) - 1;
      hoverCol = null;
      if (canPlay()) previewCol = col;
      humanDrop(col);
    }
  }
  window.addEventListener('keydown', onKey);

  renderControls();
  newGame(true);

  return () => {
    round++;
    clearTimers();
    window.removeEventListener('keydown', onKey);
  };
}
