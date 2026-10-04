// Blockfall – fallende Blöcke zu vollen Reihen stapeln (Tetris-Prinzip).
// mount(container, api) gibt eine Cleanup-Funktion zurück.

const COLS = 10;
const ROWS = 22; // die obersten 2 Reihen sind unsichtbar (dort erscheinen neue Steine)
const HIDDEN = 2;
const CELL = 32; // logische Pixel pro Feld; die Canvas wird auf die angezeigte Größe skaliert
const W = COLS * CELL;
const H = (ROWS - HIDDEN) * CELL;
const DAS = 0.15; // s Verzögerung, bis gedrücktes ← → dauerhaft schiebt
const ARR = 0.04; // s pro Feld beim Dauerschieben
const SOFT_DROP = 0.03; // s pro Reihe beim schnellen Fallen (↓)
const LOCK_DELAY = 0.5; // s, bis ein aufliegender Stein einrastet
const MAX_LOCK_RESETS = 15;
const CLEAR_TIME = 0.32;
const LINE_POINTS = [0, 100, 300, 500, 800];
const NEXT_COUNT = 3;
const BG = '#24164f';
const FONT = '"Nunito", system-ui, sans-serif';

function shade(hex, amount = 0.18) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * (1 - amount));
  return `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

const PIECES = {
  I: { color: '#66d9e8', size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { color: '#ffe066', size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { color: '#f783ac', size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { color: '#8ce99a', size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { color: '#ff8787', size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { color: '#74c0fc', size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { color: '#ffc078', size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};
// Drehzustände 0, R, 2, L: Drehung im umschließenden Quadrat (entspricht dem Standard-Drehsystem SRS)
for (const p of Object.values(PIECES)) {
  p.rot = [p.cells];
  for (let i = 1; i < 4; i++) p.rot.push(p.rot[i - 1].map(([x, y]) => [p.size - 1 - y, x]));
  p.dark = shade(p.color);
}

// Ausweich-Versuche beim Drehen (SRS „Wall Kicks“), y nach oben positiv wie im Standard
const KICKS = {
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICKS_I = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ein Feld als flacher Block mit Kante unten und Glanzstreifen
function drawBlock(ctx, x, y, size, piece, alpha = 1) {
  const r = size * 0.18;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = piece.dark;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, size - 2, size - 2, r);
  ctx.fill();
  ctx.fillStyle = piece.color;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, size - 2, size - 2 - size * 0.13, r);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.roundRect(x + size * 0.2, y + size * 0.16, size * 0.6, size * 0.12, size * 0.06);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function mount(container, api) {
  container.innerHTML = `
    <div class="gp bf">
      <div class="gp-panel">
        <div class="bf-box"><span class="gp-label">Halten</span><canvas class="bf-hold" data-hold></canvas></div>
        <div class="gp-stats">
          <div class="gp-stat"><span>Punkte</span><b data-score>0</b></div>
          <div class="gp-stat"><span>Level</span><b data-level>1</b></div>
          <div class="gp-stat"><span>Reihen</span><b data-lines>0</b></div>
          <div class="gp-stat"><span>Rekord</span><b data-best>0</b></div>
        </div>
        <button type="button" class="btn btn--primary" data-new>Neues Spiel</button>
        <button type="button" class="btn" data-pause>Pause</button>
      </div>
      <div class="bf-center">
        <div class="bf-well" data-well>
          <canvas data-canvas></canvas>
          <div class="gp-overlay" data-overlay hidden>
            <p data-msg></p>
            <small data-sub></small>
            <div class="gp-overlay-actions"><button type="button" class="btn btn--primary" data-action></button></div>
          </div>
        </div>
        <div class="bf-touch" aria-label="Steuerung">
          <button type="button" data-touch="left" aria-label="Links">◀</button>
          <button type="button" data-touch="rotate" aria-label="Drehen">↻</button>
          <button type="button" data-touch="right" aria-label="Rechts">▶</button>
          <button type="button" data-touch="soft" aria-label="Schneller fallen">▼</button>
          <button type="button" data-touch="drop" aria-label="Fallen lassen">⤓</button>
          <button type="button" data-touch="hold" aria-label="Halten">H</button>
        </div>
      </div>
      <div class="gp-panel bf-side">
        <div class="bf-box"><span class="gp-label">Als Nächstes</span><canvas class="bf-next" data-next></canvas></div>
        <p class="gp-hint"><kbd>←</kbd> <kbd>→</kbd> schieben · <kbd>↑</kbd> drehen (<kbd>Z</kbd> andersherum) · <kbd>↓</kbd> schneller · <kbd>Leertaste</kbd> fallen lassen · <kbd>C</kbd> halten · <kbd>P</kbd> Pause</p>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const canvas = $('[data-canvas]');
  const ctx = canvas.getContext('2d');
  const holdCanvas = $('[data-hold]');
  const nextCanvas = $('[data-next]');
  const overlay = $('[data-overlay]');
  const actionBtn = $('[data-action]');
  const pauseBtn = $('[data-pause]');

  let board = [];
  let piece = null; // { type, rot, x, y }
  let queue = [];
  let held = null;
  let holdUsed = false;
  let score = 0;
  let lines = 0;
  let level = 1;
  let state = 'start'; // start | playing | paused | over
  let fallAcc = 0;
  let lockTimer = 0;
  let lockResets = 0;
  let lowestY = 0;
  let clearing = null; // { rows, timer }
  let bestAtStart = 0;
  let overlayAction = null;
  const keys = { left: false, right: false, soft: false };
  let hDir = 0;
  let dasTimer = 0;
  let arrTimer = 0;
  let effects = []; // Texte und Fall-Spuren
  let quads = 0; // Vierer-Reihen in dieser Runde (für Erfolge)
  let startedAt = 0;

  // ---------- Spielregeln ----------

  const cellsOf = (p, rot = p.rot) => PIECES[p.type].rot[rot];

  function collides(p, x = p.x, y = p.y, rot = p.rot) {
    for (const [cx, cy] of cellsOf(p, rot)) {
      const bx = x + cx;
      const by = y + cy;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
    return false;
  }

  const gravity = () => Math.max(0.03, Math.pow(0.8 - (level - 1) * 0.007, level - 1));

  function refill() {
    while (queue.length < 7 + NEXT_COUNT) queue.push(...shuffle(Object.keys(PIECES)));
  }

  function spawn(type) {
    refill();
    const t = type || queue.shift();
    const size = PIECES[t].size;
    piece = { type: t, rot: 0, x: Math.floor((COLS - size) / 2), y: HIDDEN - 1 };
    fallAcc = 0;
    lockTimer = 0;
    lockResets = 0;
    lowestY = piece.y;
    if (collides(piece)) {
      gameOver();
      return;
    }
    drawPreviews();
  }

  const onGround = () => piece && collides(piece, piece.x, piece.y + 1);

  // Bewegung/Drehung auf dem Boden verlängert die Einrast-Zeit (begrenzt)
  function resetLock() {
    if (onGround() && lockResets < MAX_LOCK_RESETS) {
      lockTimer = 0;
      lockResets++;
    }
  }

  function tryMove(dx, dy) {
    if (!piece || collides(piece, piece.x + dx, piece.y + dy)) return false;
    piece.x += dx;
    piece.y += dy;
    if (piece.y > lowestY) {
      lowestY = piece.y;
      lockResets = 0;
    }
    if (dx) resetLock();
    return true;
  }

  function rotate(dir) {
    if (!piece || piece.type === 'O') return;
    const from = piece.rot;
    const to = (from + dir + 4) % 4;
    const table = piece.type === 'I' ? KICKS_I : KICKS;
    for (const [kx, ky] of table[`${from}${to}`]) {
      if (!collides(piece, piece.x + kx, piece.y - ky, to)) {
        piece.x += kx;
        piece.y -= ky;
        piece.rot = to;
        resetLock();
        return;
      }
    }
  }

  function dropDistance() {
    let d = 0;
    while (!collides(piece, piece.x, piece.y + d + 1)) d++;
    return d;
  }

  function hardDrop() {
    if (!piece) return;
    const d = dropDistance();
    const cols = cellsOf(piece).map(([cx]) => piece.x + cx);
    effects.push({ kind: 'trail', x0: Math.min(...cols), x1: Math.max(...cols) + 1, y0: piece.y, y1: piece.y + d, life: 0.18, max: 0.18, color: PIECES[piece.type].color });
    piece.y += d;
    score += 2 * d;
    lock();
  }

  function hold() {
    if (!piece || holdUsed) return;
    const t = piece.type;
    const swap = held;
    held = t;
    holdUsed = true;
    spawn(swap || undefined);
  }

  function lock() {
    for (const [cx, cy] of cellsOf(piece)) {
      const by = piece.y + cy;
      if (by >= 0) board[by][piece.x + cx] = piece.type;
    }
    // Komplett oberhalb des Sichtbereichs eingerastet → verloren
    const above = cellsOf(piece).every(([, cy]) => piece.y + cy < HIDDEN);
    piece = null;
    holdUsed = false;
    if (above) {
      gameOver();
      return;
    }
    const full = [];
    for (let r = 0; r < ROWS; r++) if (board[r].every(Boolean)) full.push(r);
    if (full.length) {
      clearing = { rows: full, timer: CLEAR_TIME };
    } else {
      spawn();
    }
    renderStats();
  }

  function finishClear() {
    const n = clearing.rows.length;
    if (n === 4) quads++;
    board = board.filter((_, r) => !clearing.rows.includes(r));
    while (board.length < ROWS) board.unshift(Array(COLS).fill(null));
    clearing = null;
    lines += n;
    const points = LINE_POINTS[n] * level;
    score += points;
    effects.push({ kind: 'text', text: n === 4 ? `Vierer! +${points}` : `+${points}`, y: H * 0.42, life: 0.9, max: 0.9 });
    const newLevel = Math.min(20, 1 + Math.floor(lines / 10));
    if (newLevel > level) {
      level = newLevel;
      effects.push({ kind: 'text', text: `Level ${level}`, y: H * 0.32, big: true, life: 1.4, max: 1.4 });
    }
    renderStats();
    spawn();
  }

  // ---------- Spielablauf ----------

  // Runde ans Portal melden (Coins, Erfolge)
  function report() {
    api.reportResult?.({ result: 'score', score, durationMs: Date.now() - startedAt, extra: { level, quads } });
  }

  function newGame() {
    // Abgebrochene Runde mit Punkten trotzdem werten
    if ((state === 'playing' || state === 'paused') && score > 0) report();
    startedAt = Date.now();
    quads = 0;
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    queue = [];
    held = null;
    holdUsed = false;
    score = 0;
    lines = 0;
    level = 1;
    clearing = null;
    effects = [];
    bestAtStart = api.getHighscore();
    keys.left = keys.right = keys.soft = false;
    hDir = 0;
    state = 'playing';
    hideOverlay();
    spawn();
    renderStats();
  }

  function gameOver() {
    state = 'over';
    piece = null;
    report();
    api.submitScore(score);
    const record = score > bestAtStart && score > 0;
    renderStats();
    showOverlay(record ? 'Neuer Rekord!' : 'Game Over', `${score} Punkte · ${lines} Reihen · Level ${level}`, 'Nochmal', newGame);
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      showOverlay('Pause', `${score} Punkte · Level ${level}`, 'Weiter', togglePause);
    } else if (state === 'paused') {
      state = 'playing';
      hideOverlay();
    }
    renderStats();
  }

  function showOverlay(msg, sub, label, action) {
    $('[data-msg]').textContent = msg;
    $('[data-sub]').textContent = sub;
    actionBtn.textContent = label;
    overlayAction = action;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
    overlayAction = null;
  }

  function renderStats() {
    $('[data-score]').textContent = score;
    $('[data-level]').textContent = level;
    $('[data-lines]').textContent = lines;
    $('[data-best]').textContent = Math.max(api.getHighscore(), score);
    pauseBtn.textContent = state === 'paused' ? 'Weiter' : 'Pause';
    pauseBtn.disabled = state !== 'playing' && state !== 'paused';
  }

  function update(dt) {
    if (clearing) {
      clearing.timer -= dt;
      if (clearing.timer <= 0) finishClear();
      return;
    }
    if (!piece) return;

    // Dauerschieben (DAS/ARR)
    if (hDir) {
      if (dasTimer > 0) {
        dasTimer -= dt;
      } else {
        arrTimer += dt;
        while (arrTimer >= ARR) {
          arrTimer -= ARR;
          if (!tryMove(hDir, 0)) break;
        }
      }
    }

    // Fallen
    const step = keys.soft ? Math.min(SOFT_DROP, gravity()) : gravity();
    fallAcc += dt;
    while (fallAcc >= step) {
      fallAcc -= step;
      if (!tryMove(0, 1)) {
        fallAcc = 0;
        break;
      }
      if (keys.soft) score += 1;
    }

    // Einrasten nach kurzer Verzögerung
    if (onGround()) {
      lockTimer += dt;
      if (lockTimer >= LOCK_DELAY) lock();
    } else {
      lockTimer = 0;
    }
    if (keys.soft) renderStats();
  }

  // ---------- Zeichnen ----------

  function drawPreview(cv, types, slotH) {
    if (!cv.clientWidth) return;
    const c = cv.getContext('2d');
    const scale = cv.width / cv.clientWidth;
    c.setTransform(scale, 0, 0, scale, 0, 0);
    const w = cv.clientWidth;
    c.clearRect(0, 0, w, cv.clientHeight);
    const size = 18;
    types.forEach((t, i) => {
      if (!t) return;
      const p = PIECES[t];
      const cells = p.cells;
      const minX = Math.min(...cells.map(([x]) => x));
      const maxX = Math.max(...cells.map(([x]) => x));
      const minY = Math.min(...cells.map(([, y]) => y));
      const maxY = Math.max(...cells.map(([, y]) => y));
      const ox = (w - (maxX - minX + 1) * size) / 2 - minX * size;
      const oy = i * slotH + (slotH - (maxY - minY + 1) * size) / 2 - minY * size;
      const dim = cv === holdCanvas && holdUsed ? 0.4 : 1;
      cells.forEach(([x, y]) => drawBlock(c, ox + x * size, oy + y * size, size, p, dim));
    });
  }

  function drawPreviews() {
    refill();
    drawPreview(holdCanvas, [held], 72);
    drawPreview(nextCanvas, queue.slice(0, NEXT_COUNT), 72);
  }

  function draw() {
    const scale = canvas.width / W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    // Raster
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, H);
    }
    for (let y = 1; y < ROWS - HIDDEN; y++) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(W, y * CELL + 0.5);
    }
    ctx.stroke();

    // Fall-Spuren
    for (const e of effects) {
      if (e.kind !== 'trail') continue;
      const a = e.life / e.max;
      const g = ctx.createLinearGradient(0, (e.y0 - HIDDEN) * CELL, 0, (e.y1 - HIDDEN + 1) * CELL);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, `rgba(255,255,255,${0.25 * a})`);
      ctx.fillStyle = g;
      ctx.fillRect(e.x0 * CELL, Math.max(0, (e.y0 - HIDDEN) * CELL), (e.x1 - e.x0) * CELL, (e.y1 - e.y0 + 1) * CELL);
    }

    // Liegende Blöcke (Reihen beim Abräumen blitzen auf und schrumpfen)
    for (let r = HIDDEN; r < ROWS; r++) {
      const clearingRow = clearing && clearing.rows.includes(r);
      const t = clearingRow ? clearing.timer / CLEAR_TIME : 1;
      for (let c = 0; c < COLS; c++) {
        const type = board[r][c];
        if (!type) continue;
        const x = c * CELL;
        const y = (r - HIDDEN) * CELL;
        if (clearingRow) {
          const s = CELL * t;
          drawBlock(ctx, x + (CELL - s) / 2, y + (CELL - s) / 2, s, PIECES[type]);
        } else {
          drawBlock(ctx, x, y, CELL, PIECES[type]);
        }
      }
      if (clearingRow) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * t})`;
        ctx.fillRect(0, (r - HIDDEN) * CELL, W, CELL);
      }
    }

    if (piece) {
      const p = PIECES[piece.type];
      // Geisterstein: zeigt, wo der Stein landen würde
      const gy = piece.y + dropDistance();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.55;
      for (const [cx, cy] of cellsOf(piece)) {
        const y = (gy + cy - HIDDEN) * CELL;
        if (y < 0) continue;
        ctx.beginPath();
        ctx.roundRect((piece.x + cx) * CELL + 3, y + 3, CELL - 6, CELL - 6, 6);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const [cx, cy] of cellsOf(piece)) {
        const y = (piece.y + cy - HIDDEN) * CELL;
        if (y <= -CELL) continue;
        drawBlock(ctx, (piece.x + cx) * CELL, y, CELL, p);
      }
    }

    // Texte (Punkte, Level)
    ctx.textAlign = 'center';
    for (const e of effects) {
      if (e.kind !== 'text') continue;
      const a = Math.min(1, (e.life / e.max) * 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${e.big ? 40 : 28}px ${FONT}`;
      ctx.fillText(e.text, W / 2, e.y - (1 - e.life / e.max) * 30);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Schleife ----------

  let raf = 0;
  let last = performance.now();

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === 'playing') update(dt);
    if (state !== 'paused') {
      for (const e of effects) e.life -= dt;
      effects = effects.filter((e) => e.life > 0);
    }
    draw();
  }

  // ---------- Eingabe ----------

  function press(action) {
    if (state !== 'playing') return;
    if (action === 'left' || action === 'right') {
      const dir = action === 'left' ? -1 : 1;
      keys[action] = true;
      hDir = dir;
      tryMove(dir, 0);
      dasTimer = DAS;
      arrTimer = 0;
    } else if (action === 'soft') {
      keys.soft = true;
    } else if (action === 'rotate') {
      rotate(1);
    } else if (action === 'rotateBack') {
      rotate(-1);
    } else if (action === 'drop') {
      hardDrop();
    } else if (action === 'hold') {
      hold();
    }
  }

  function release(action) {
    if (action === 'left' || action === 'right') {
      keys[action] = false;
      const other = action === 'left' ? 'right' : 'left';
      if (hDir === (action === 'left' ? -1 : 1)) {
        hDir = keys[other] ? (other === 'left' ? -1 : 1) : 0;
        dasTimer = DAS;
      }
    } else if (action === 'soft') {
      keys.soft = false;
    }
  }

  const KEYMAP = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowDown: 'soft',
    KeyS: 'soft',
    ArrowUp: 'rotate',
    KeyX: 'rotate',
    KeyW: 'rotate',
    KeyZ: 'rotateBack',
    KeyQ: 'rotateBack',
    Space: 'drop',
    KeyC: 'hold',
    ShiftLeft: 'hold',
    ShiftRight: 'hold',
  };

  function isTyping(t) {
    return t instanceof HTMLElement && (t.closest('input, textarea, select') || t.isContentEditable);
  }

  function onKeyDown(e) {
    if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      togglePause();
      return;
    }
    if ((e.code === 'Enter' || e.code === 'Space') && !overlay.hidden) {
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      overlayAction?.();
      return;
    }
    const action = KEYMAP[e.code];
    if (!action) return;
    if (e.target instanceof HTMLButtonElement && e.code === 'Space') e.target.blur();
    e.preventDefault();
    if (e.repeat) return; // Dauerschieben steuert das Spiel selbst
    press(action);
  }

  function onKeyUp(e) {
    const action = KEYMAP[e.code];
    if (action) release(action);
  }

  function onVisibility() {
    if (document.hidden && state === 'playing') togglePause();
  }

  // Touch-Tasten (nur auf Touch-Geräten sichtbar): gedrückt halten wie eine Taste
  container.querySelectorAll('[data-touch]').forEach((b) => {
    const action = { left: 'left', right: 'right', soft: 'soft', rotate: 'rotate', drop: 'drop', hold: 'hold' }[b.dataset.touch];
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      press(action);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => release(action));
  });

  // Nach Klick auf einen Button den Fokus lösen, damit die Leertaste wieder das Spiel steuert
  const blurAfter = (fn) => (e) => {
    fn();
    e.currentTarget.blur();
  };
  $('[data-new]').addEventListener('click', blurAfter(newGame));
  pauseBtn.addEventListener('click', blurAfter(togglePause));
  actionBtn.addEventListener('click', blurAfter(() => overlayAction?.()));

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('visibilitychange', onVisibility);

  // Canvas-Auflösungen an die angezeigte Größe anpassen
  const resize = new ResizeObserver(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const cv of [canvas, holdCanvas, nextCanvas]) {
      cv.width = Math.max(1, Math.round(cv.clientWidth * dpr));
      cv.height = Math.max(1, Math.round(cv.clientHeight * dpr));
    }
    drawPreviews();
  });
  resize.observe(canvas);

  // Startbildschirm
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  bestAtStart = api.getHighscore();
  refill();
  renderStats();
  showOverlay('Blockfall', 'Stapel die Blöcke zu vollen Reihen.', 'Start', newGame);
  raf = requestAnimationFrame(frame);

  return () => {
    if ((state === 'playing' || state === 'paused') && score > 0) report();
    cancelAnimationFrame(raf);
    resize.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
