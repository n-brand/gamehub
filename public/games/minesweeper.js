// Minesweeper – alle Felder ohne Mine aufdecken. mount(container, api) gibt eine Cleanup-Funktion zurück.

const LEVELS = {
  easy: { cols: 9, rows: 9, mines: 10 },
  medium: { cols: 16, rows: 16, mines: 40 },
  hard: { cols: 30, rows: 16, mines: 99 },
};
const STORE_KEY = 'gamehub-minesweeper';
const LONG_PRESS_MS = 420;

const FLAG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M36 16v66" stroke="#343a40" stroke-width="9" stroke-linecap="round"/><path d="M40 14 80 33 40 52Z" fill="#fa5252"/><rect x="22" y="78" width="30" height="9" rx="4.5" fill="#343a40"/></svg>';
const MINE = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 12v76M12 50h76M23 23l54 54M77 23 23 77" stroke="#212529" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="50" r="26" fill="#212529"/><circle cx="41" cy="41" r="7" fill="#fff" opacity=".85"/></svg>';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // Speicher nicht verfügbar – Rekord gilt nur für diese Sitzung
  }
}

const fmtTime = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function mount(container, api = {}) {
  const data = load();
  data.best = data.best || {};
  let level = LEVELS[data.level] ? data.level : 'easy';
  let flagMode = false;

  container.innerHTML = `
    <div class="gp ms">
      <div class="gp-panel">
        <div class="gp-stats">
          <div class="gp-stat"><span>Minen</span><b data-left>0</b></div>
          <div class="gp-stat"><span>Zeit</span><b data-time>0:00</b></div>
          <div class="gp-stat" style="grid-column: span 2"><span>Rekord</span><b data-best>–</b></div>
        </div>
        <div class="gp-group">
          <span class="gp-label">Schwierigkeit</span>
          <div class="gp-seg" role="group" aria-label="Schwierigkeit">
            <button type="button" data-level="easy">Leicht</button>
            <button type="button" data-level="medium">Mittel</button>
            <button type="button" data-level="hard">Schwer</button>
          </div>
        </div>
        <div class="gp-group">
          <span class="gp-label">Klick</span>
          <div class="gp-seg" role="group" aria-label="Klick-Modus">
            <button type="button" data-flagmode="0">Aufdecken</button>
            <button type="button" data-flagmode="1">Flagge</button>
          </div>
        </div>
        <button type="button" class="btn btn--primary" data-new>Neues Spiel</button>
        <p class="gp-hint"><kbd>Rechtsklick</kbd> setzt eine Flagge. Klick auf eine Zahl deckt die Nachbarn auf, wenn genug Flaggen stehen.</p>
      </div>
      <div class="ms-field" data-field>
        <div class="ms-board" data-board role="grid" aria-label="Minenfeld"></div>
        <div class="gp-overlay" data-overlay hidden>
          <p data-msg></p>
          <small data-sub></small>
          <div class="gp-overlay-actions"><button type="button" class="btn btn--primary" data-again>Nochmal</button></div>
        </div>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const field = $('[data-field]');
  const board = $('[data-board]');
  const overlay = $('[data-overlay]');

  let cols = 0;
  let rows = 0;
  let total = 0;
  let mines = 0;
  let mine; // Uint8Array: 1 = Mine
  let open; // Uint8Array: 1 = aufgedeckt
  let flag; // Uint8Array: 1 = Flagge
  let count; // Uint8Array: Minen in der Nachbarschaft
  let neighbors = []; // Nachbar-Indizes je Feld
  let cells = []; // Buttons
  let generated = false;
  let over = false;
  let openCount = 0;
  let flagCount = 0;
  let startTime = 0;
  let endTime = 0;
  let focusIdx = 0;
  let round = 0;
  let ticker = 0;
  const timers = new Set();

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
    clearInterval(ticker);
  }

  const elapsed = () => (startTime ? (endTime || performance.now()) - startTime : 0);

  function renderStats() {
    $('[data-left]').textContent = mines - flagCount;
    $('[data-time]').textContent = fmtTime(elapsed());
    const best = data.best[level];
    $('[data-best]').textContent = best ? fmtTime(best) : '–';
    container.querySelectorAll('[data-level]').forEach((b) => {
      const on = b.dataset.level === level;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
    container.querySelectorAll('[data-flagmode]').forEach((b) => {
      const on = (b.dataset.flagmode === '1') === flagMode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
  }

  function renderCell(i, delay = 0) {
    const el = cells[i];
    el.className = 'ms-cell';
    el.removeAttribute('data-n');
    el.style.removeProperty('--d');
    if (open[i]) {
      el.classList.add('is-open');
      if (delay) el.style.setProperty('--d', `${delay}ms`);
      if (count[i]) {
        el.dataset.n = count[i];
        el.textContent = count[i];
        el.setAttribute('aria-label', `${count[i]} ${count[i] === 1 ? 'Mine' : 'Minen'} in der Nähe`);
      } else {
        el.textContent = '';
        el.setAttribute('aria-label', 'Leer');
      }
    } else if (flag[i]) {
      el.classList.add('is-flag');
      el.innerHTML = FLAG;
      el.setAttribute('aria-label', 'Flagge');
    } else {
      el.textContent = '';
      el.setAttribute('aria-label', 'Verdeckt');
    }
  }

  function newGame() {
    round++;
    clearTimers();
    ({ cols, rows, mines } = LEVELS[level]);
    total = cols * rows;
    mine = new Uint8Array(total);
    open = new Uint8Array(total);
    flag = new Uint8Array(total);
    count = new Uint8Array(total);
    neighbors = Array.from({ length: total }, (_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const list = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if ((dr || dc) && c + dc >= 0 && c + dc < cols && r + dr >= 0 && r + dr < rows) list.push((r + dr) * cols + c + dc);
        }
      }
      return list;
    });
    generated = false;
    over = false;
    openCount = 0;
    flagCount = 0;
    startTime = endTime = 0;
    focusIdx = Math.floor(rows / 2) * cols + Math.floor(cols / 2);

    // Feldmaße: Zelle = 1 Einheit, Abstand 0,08, Rand 0,3 → Seitenverhältnis des Bretts
    const ratio = (rows * 1.08 + 0.52) / (cols * 1.08 + 0.52);
    field.style.setProperty('--ratio', ratio);
    field.style.setProperty('--cols', cols);
    field.classList.remove('is-won', 'is-lost');
    board.innerHTML = Array.from(
      { length: total },
      (_, i) => `<button type="button" class="ms-cell" data-i="${i}" tabindex="${i === focusIdx ? 0 : -1}" aria-label="Verdeckt"></button>`,
    ).join('');
    cells = [...board.children];
    overlay.hidden = true;
    renderStats();
  }

  // Minen erst beim ersten Klick verteilen: das Feld und seine Nachbarn bleiben frei
  function placeMines(safe) {
    const banned = new Set([safe, ...neighbors[safe]]);
    const pool = [];
    for (let i = 0; i < total; i++) if (!banned.has(i)) pool.push(i);
    for (let k = 0; k < mines; k++) {
      const j = k + Math.floor(Math.random() * (pool.length - k));
      [pool[k], pool[j]] = [pool[j], pool[k]];
      mine[pool[k]] = 1;
    }
    for (let i = 0; i < total; i++) count[i] = neighbors[i].reduce((n, j) => n + mine[j], 0);
    generated = true;
    startTime = performance.now();
    ticker = setInterval(renderStats, 250);
  }

  function reveal(i) {
    if (over || open[i] || flag[i]) return;
    if (!generated) placeMines(i);
    if (mine[i]) {
      lose(i);
      return;
    }
    // Leere Flächen wellenförmig aufdecken (Verzögerung nach Abstand)
    const queue = [[i, 0]];
    const seen = new Set([i]);
    while (queue.length) {
      const [j, dist] = queue.shift();
      if (open[j] || flag[j]) continue;
      open[j] = 1;
      openCount++;
      renderCell(j, Math.min(dist * 22, 600));
      if (count[j] === 0) {
        for (const n of neighbors[j]) {
          if (!seen.has(n) && !open[n] && !mine[n]) {
            seen.add(n);
            queue.push([n, dist + 1]);
          }
        }
      }
    }
    if (openCount === total - mines) win();
  }

  // Klick auf eine Zahl: stimmen die Flaggen ringsum, werden die übrigen Nachbarn aufgedeckt
  function chord(i) {
    if (over || !open[i] || !count[i]) return;
    const around = neighbors[i];
    if (around.reduce((n, j) => n + flag[j], 0) !== count[i]) {
      around.forEach((j) => !open[j] && !flag[j] && cells[j].animate([{ scale: 1 }, { scale: 0.85 }, { scale: 1 }], { duration: 180 }));
      return;
    }
    for (const j of around) {
      if (over) break;
      if (!open[j] && !flag[j]) reveal(j);
    }
  }

  function toggleFlag(i) {
    if (over || open[i]) return;
    flag[i] ^= 1;
    flagCount += flag[i] ? 1 : -1;
    renderCell(i);
    if (flag[i]) cells[i].animate([{ scale: 0.6 }, { scale: 1.15 }, { scale: 1 }], { duration: 220, easing: 'ease-out' });
    renderStats();
  }

  function stopClock() {
    endTime = performance.now();
    clearInterval(ticker);
  }

  function win() {
    over = true;
    stopClock();
    api.reportResult?.({ result: 'win', difficulty: level, durationMs: elapsed() });
    const time = Math.round(elapsed());
    const record = !data.best[level] || time < data.best[level];
    if (record) {
      data.best[level] = time;
      save(data);
    }
    // Restliche Minen bekommen Flaggen
    let k = 0;
    for (let i = 0; i < total; i++) {
      if (mine[i] && !flag[i]) {
        flag[i] = 1;
        flagCount++;
        renderCell(i);
        cells[i].style.setProperty('--d', `${Math.min(k++ * 30, 600)}ms`);
      }
    }
    field.classList.add('is-won');
    renderStats();
    schedule(() => {
      $('[data-msg]').textContent = record ? 'Neuer Rekord!' : 'Geschafft!';
      $('[data-sub]').textContent = `Zeit ${fmtTime(time)}`;
      overlay.hidden = false;
    }, 900);
  }

  function lose(hit) {
    over = true;
    stopClock();
    api.reportResult?.({ result: 'loss', difficulty: level, durationMs: elapsed() });
    field.classList.add('is-lost');
    const hc = hit % cols;
    const hr = Math.floor(hit / cols);
    // Falsch gesetzte Flaggen markieren
    for (let i = 0; i < total; i++) if (flag[i] && !mine[i]) cells[i].classList.add('is-wrong');
    // Getroffene Mine sofort, die übrigen nacheinander von innen nach außen
    const others = [];
    for (let i = 0; i < total; i++) if (mine[i] && !flag[i] && i !== hit) others.push(i);
    others.sort((a, b) => Math.hypot((a % cols) - hc, Math.floor(a / cols) - hr) - Math.hypot((b % cols) - hc, Math.floor(b / cols) - hr));
    const showMine = (i, delay, boom) => {
      const el = cells[i];
      el.className = `ms-cell is-mine${boom ? ' is-boom' : ''}`;
      el.style.setProperty('--d', `${delay}ms`);
      el.innerHTML = MINE;
      el.setAttribute('aria-label', 'Mine');
    };
    showMine(hit, 0, true);
    field.animate(
      [{ translate: '0 0' }, { translate: '-6px 2px' }, { translate: '5px -3px' }, { translate: '-3px 1px' }, { translate: '0 0' }],
      { duration: 320 },
    );
    const step = Math.min(40, 1200 / Math.max(1, others.length));
    others.forEach((i, k) => showMine(i, 150 + k * step, false));
    schedule(() => {
      $('[data-msg]').textContent = 'Boom!';
      $('[data-sub]').textContent = 'Du hast eine Mine erwischt.';
      overlay.hidden = false;
    }, 150 + others.length * step + 700);
  }

  function setFocus(i) {
    if (i < 0 || i >= total) return;
    cells[focusIdx]?.setAttribute('tabindex', '-1');
    focusIdx = i;
    cells[i].setAttribute('tabindex', '0');
    cells[i].focus();
  }

  // ---------- Eingabe ----------

  let pressTimer = 0;
  let pressFired = false;
  let lastPointer = 'mouse';
  const cancelPress = () => clearTimeout(pressTimer);

  board.addEventListener('pointerdown', (e) => {
    lastPointer = e.pointerType;
    const cell = e.target.closest('.ms-cell');
    if (!cell || e.pointerType !== 'touch') return;
    // Langes Drücken auf dem Handy = Flagge
    pressFired = false;
    pressTimer = setTimeout(() => {
      pressFired = true;
      toggleFlag(Number(cell.dataset.i));
      navigator.vibrate?.(15);
    }, LONG_PRESS_MS);
  });
  board.addEventListener('pointerup', cancelPress);
  board.addEventListener('pointercancel', cancelPress);
  board.addEventListener('pointerleave', cancelPress);

  board.addEventListener('click', (e) => {
    const cell = e.target.closest('.ms-cell');
    if (!cell) return;
    if (pressFired) {
      pressFired = false;
      return;
    }
    const i = Number(cell.dataset.i);
    setFocus(i);
    if (open[i]) chord(i);
    else if (flagMode) toggleFlag(i);
    else reveal(i);
  });

  board.addEventListener('contextmenu', (e) => {
    const cell = e.target.closest('.ms-cell');
    if (!cell) return;
    e.preventDefault();
    if (lastPointer === 'touch') return; // auf dem Handy übernimmt das langes Drücken
    const i = Number(cell.dataset.i);
    if (open[i]) chord(i);
    else toggleFlag(i);
  });

  board.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
    if (step) {
      e.preventDefault();
      const col = focusIdx % cols;
      if ((e.key === 'ArrowLeft' && col === 0) || (e.key === 'ArrowRight' && col === cols - 1)) return;
      setFocus(focusIdx + step);
    } else if (e.code === 'KeyF') {
      e.preventDefault();
      toggleFlag(focusIdx);
    }
  });

  container.querySelectorAll('[data-level]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.level === level) return;
      level = b.dataset.level;
      data.level = level;
      save(data);
      newGame();
    }),
  );
  container.querySelectorAll('[data-flagmode]').forEach((b) =>
    b.addEventListener('click', () => {
      flagMode = b.dataset.flagmode === '1';
      renderStats();
    }),
  );
  $('[data-new]').addEventListener('click', newGame);
  $('[data-again]').addEventListener('click', newGame);

  newGame();

  return () => {
    round++;
    clearTimers();
    cancelPress();
  };
}
