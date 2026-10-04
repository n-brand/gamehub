// 2048 – klassische Regeln im GameHub-Design. mount(container, api) gibt eine Cleanup-Funktion zurück.

const SIZE = 4;
const WIN = 2048;
const ANIM_MS = 110;
const SAVE_KEY = 'gamehub-2048-state';

const VECTORS = {
  up: { r: -1, c: 0 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 },
};

const KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

function save(data) {
  try {
    if (data) localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    // Speicher nicht verfügbar – Spielstand gilt nur für diese Sitzung
  }
}

export function mount(container, api) {
  container.innerHTML = `
    <div class="g2048">
      <div class="g2048-hud">
        <div class="g2048-box"><span>Punkte</span><b data-score>0</b><i class="g2048-plus" data-plus></i></div>
        <div class="g2048-box"><span>Rekord</span><b data-best>0</b></div>
        <button class="btn btn--primary g2048-new" data-new>Neues Spiel</button>
      </div>
      <div class="g2048-board" data-board>
        ${'<div class="g2048-cell"></div>'.repeat(SIZE * SIZE)}
        <div class="g2048-tiles" data-tiles></div>
        <div class="g2048-overlay" data-overlay hidden>
          <p data-msg></p>
          <div class="g2048-overlay-actions" data-actions></div>
        </div>
      </div>
    </div>
  `;

  const board = container.querySelector('[data-board]');
  const tilesEl = container.querySelector('[data-tiles]');
  const scoreEl = container.querySelector('[data-score]');
  const bestEl = container.querySelector('[data-best]');
  const plusEl = container.querySelector('[data-plus]');
  const overlay = container.querySelector('[data-overlay]');
  const msg = container.querySelector('[data-msg]');
  const actions = container.querySelector('[data-actions]');

  let grid; // grid[r][c] = { id, value } | null
  let score;
  let won; // 2048 schon erreicht (danach weiterspielen ohne erneute Meldung)
  let over;
  let bestAtStart = 0; // Rekord zu Spielbeginn, für „Neuer Rekord!“
  let nextId = 1;
  let pending = null; // laufende Animation: { timer, finish }
  const els = new Map(); // tile id -> Element

  // ---------- Darstellung ----------

  function place(el, r, c) {
    el.style.setProperty('--r', r);
    el.style.setProperty('--c', c);
  }

  function createTileEl(tile, r, c, anim) {
    const el = document.createElement('div');
    el.className = `g2048-tile ${anim || ''}`;
    el.dataset.v = tile.value > WIN ? 'super' : tile.value;
    el.dataset.digits = String(tile.value).length;
    el.textContent = tile.value;
    place(el, r, c);
    tilesEl.appendChild(el);
    els.set(tile.id, el);
    return el;
  }

  function renderAll() {
    tilesEl.innerHTML = '';
    els.clear();
    forEachCell((r, c, t) => t && createTileEl(t, r, c));
    updateScore(0);
  }

  function updateScore(gained) {
    scoreEl.textContent = score;
    const best = Math.max(api.getHighscore(), score);
    bestEl.textContent = best;
    if (gained > 0) {
      plusEl.textContent = `+${gained}`;
      plusEl.classList.remove('is-anim');
      void plusEl.offsetWidth; // Animation neu starten
      plusEl.classList.add('is-anim');
    }
  }

  // ---------- Spiellogik ----------

  function forEachCell(fn) {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) fn(r, c, grid[r][c]);
  }

  function emptyCells() {
    const cells = [];
    forEachCell((r, c, t) => !t && cells.push({ r, c }));
    return cells;
  }

  function spawn() {
    const cells = emptyCells();
    if (!cells.length) return null;
    const { r, c } = cells[Math.floor(Math.random() * cells.length)];
    const tile = { id: nextId++, value: Math.random() < 0.9 ? 2 : 4 };
    grid[r][c] = tile;
    return { tile, r, c };
  }

  function canMove() {
    if (emptyCells().length) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c].value;
        if ((c + 1 < SIZE && grid[r][c + 1].value === v) || (r + 1 < SIZE && grid[r + 1][c].value === v)) return true;
      }
    }
    return false;
  }

  function newGame() {
    finishPending();
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    score = 0;
    bestAtStart = api.getHighscore();
    won = false;
    over = false;
    spawn();
    spawn();
    renderAll();
    hideOverlay();
    persist();
  }

  function persist() {
    save(over ? null : { grid: grid.map((row) => row.map((t) => (t ? t.value : 0))), score, won, bestAtStart });
  }

  function restore(data) {
    grid = data.grid.map((row) => row.map((v) => (v ? { id: nextId++, value: v } : null)));
    score = data.score;
    bestAtStart = data.bestAtStart ?? api.getHighscore();
    won = data.won;
    over = false;
    renderAll();
  }

  function move(dirName) {
    if (over) return;
    finishPending();
    const v = VECTORS[dirName];
    // Von der Seite aus abarbeiten, in die geschoben wird
    const rows = [...Array(SIZE).keys()];
    const cols = [...Array(SIZE).keys()];
    if (v.r === 1) rows.reverse();
    if (v.c === 1) cols.reverse();

    const merged = new Set(); // ids der in diesem Zug entstandenen Kacheln
    const moves = []; // { el, r, c }
    const removals = []; // Kacheln, die in einer Verschmelzung aufgehen
    const births = []; // { tile, r, c }
    let gained = 0;
    let moved = false;

    for (const r of rows) {
      for (const c of cols) {
        const tile = grid[r][c];
        if (!tile) continue;
        // Bis zum letzten freien Feld rutschen
        let nr = r;
        let nc = c;
        while (true) {
          const tr = nr + v.r;
          const tc = nc + v.c;
          if (tr < 0 || tc < 0 || tr >= SIZE || tc >= SIZE || grid[tr][tc]) break;
          nr = tr;
          nc = tc;
        }
        const br = nr + v.r;
        const bc = nc + v.c;
        const blocker = br >= 0 && bc >= 0 && br < SIZE && bc < SIZE ? grid[br][bc] : null;

        grid[r][c] = null;
        if (blocker && blocker.value === tile.value && !merged.has(blocker.id)) {
          // Verschmelzen: beide alten Kacheln gleiten auf das Zielfeld, dann erscheint die neue
          const fused = { id: nextId++, value: tile.value * 2 };
          grid[br][bc] = fused;
          merged.add(fused.id);
          moves.push({ el: els.get(tile.id), r: br, c: bc });
          removals.push(tile.id, blocker.id);
          births.push({ tile: fused, r: br, c: bc });
          gained += fused.value;
          moved = true;
        } else {
          grid[nr][nc] = tile;
          if (nr !== r || nc !== c) {
            moves.push({ el: els.get(tile.id), r: nr, c: nc });
            moved = true;
          }
        }
      }
    }

    if (!moved) return;

    score += gained;
    moves.forEach(({ el, r, c }) => place(el, r, c));
    const spawned = spawn();
    updateScore(gained);
    api.submitScore(score);

    const finish = () => {
      pending = null;
      removals.forEach((id) => {
        els.get(id)?.remove();
        els.delete(id);
      });
      births.forEach(({ tile, r, c }) => createTileEl(tile, r, c, 'is-merged'));
      if (spawned) createTileEl(spawned.tile, spawned.r, spawned.c, 'is-new');
      checkEnd(births);
    };
    pending = { timer: setTimeout(finish, ANIM_MS), finish };
    persist();
  }

  function finishPending() {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.finish();
  }

  function checkEnd(births) {
    if (!won && births.some((b) => b.tile.value === WIN)) {
      won = true;
      persist();
      showOverlay('2048 geschafft!', [
        ['Weiterspielen', hideOverlay, true],
        ['Neues Spiel', newGame],
      ]);
      return;
    }
    if (!canMove()) {
      over = true;
      persist();
      const record = score > bestAtStart;
      showOverlay(`Keine Züge mehr${record && score > 0 ? ' · Neuer Rekord!' : ''}`, [['Nochmal', newGame, true]]);
    }
  }

  function showOverlay(text, buttons) {
    msg.textContent = text;
    actions.innerHTML = '';
    buttons.forEach(([label, fn, primary]) => {
      const b = document.createElement('button');
      b.className = `btn ${primary ? 'btn--primary' : ''}`;
      b.textContent = label;
      b.addEventListener('click', fn);
      actions.appendChild(b);
    });
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  // ---------- Eingabe ----------

  function onKey(e) {
    const dir = KEYS[e.code];
    if (!dir) return;
    e.preventDefault();
    if (!overlay.hidden) return;
    move(dir);
  }

  let touchStart = null;
  function onTouchStart(e) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e) {
    if (!touchStart || !overlay.hidden) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  }

  container.querySelector('[data-new]').addEventListener('click', newGame);
  board.addEventListener('touchstart', onTouchStart, { passive: true });
  board.addEventListener('touchend', onTouchEnd);
  window.addEventListener('keydown', onKey);

  const saved = loadSaved();
  if (saved?.grid?.length === SIZE) restore(saved);
  else newGame();

  return () => {
    finishPending();
    window.removeEventListener('keydown', onKey);
  };
}
