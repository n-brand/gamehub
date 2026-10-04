// Snake im Stil von Google Snake – mount(container, api) gibt eine Cleanup-Funktion zurück.

const COLS = 17;
const ROWS = 15;
const CELL = 48; // interne Auflösung pro Feld
const START_STEP = 135; // ms pro Feld
const MIN_STEP = 70;

const COLORS = {
  light: '#aad751',
  dark: '#a2d149',
  snake: '#4875ea',
  snakeShade: '#3a62cc',
  apple: '#e7471d',
};

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

const APPLE_ICON = `<svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="14" r="8" fill="${COLORS.apple}"/><path d="M12 6 q1 -3 3 -4" stroke="#5d3a1a" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="16" cy="5" rx="3.5" ry="2" fill="#4caf50" transform="rotate(-25 16 5)"/></svg>`;
const TROPHY_ICON = `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="#ffd43b"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" stroke="#ffd43b" stroke-width="2" fill="none"/><rect x="10.5" y="12" width="3" height="5" fill="#f59f00"/><rect x="7" y="17" width="10" height="4" rx="1" fill="#f59f00"/></svg>`;

export function mount(container, api) {
  container.innerHTML = `
    <div class="snake">
      <div class="snake-hud">
        <span class="snake-stat">${APPLE_ICON}<b data-score>0</b></span>
        <span class="snake-stat">${TROPHY_ICON}<b data-best>${api.getHighscore()}</b></span>
      </div>
      <div class="snake-board">
        <canvas width="${COLS * CELL}" height="${ROWS * CELL}"></canvas>
        <div class="snake-overlay" data-overlay>
          <p data-msg>Snake</p>
          <button class="btn btn--primary" data-start>Spielen</button>
          <small>Pfeiltasten / WASD · Leertaste = Pause</small>
        </div>
      </div>
      <div class="snake-pad">
        <button data-dir="up">▲</button>
        <button data-dir="left">◀</button>
        <button data-dir="down">▼</button>
        <button data-dir="right">▶</button>
      </div>
    </div>
  `;

  const canvas = container.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = container.querySelector('[data-score]');
  const bestEl = container.querySelector('[data-best]');
  const overlay = container.querySelector('[data-overlay]');
  const msg = container.querySelector('[data-msg]');
  const startBtn = container.querySelector('[data-start]');

  // state: 'idle' | 'running' | 'paused' | 'over'
  let state = 'idle';
  let snake, prevTail, dir, queue, food, score, step, progress, lastTime, raf;

  function reset() {
    const y = Math.floor(ROWS / 2);
    snake = [{ x: 4, y }, { x: 3, y }, { x: 2, y }];
    prevTail = { x: 1, y };
    dir = DIRS.right;
    queue = [];
    score = 0;
    step = START_STEP;
    progress = 1;
    scoreEl.textContent = '0';
    food = { x: 12, y };
  }

  function placeFood() {
    const free = [];
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
      }
    }
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function start() {
    reset();
    state = 'running';
    overlay.hidden = true;
    lastTime = performance.now();
  }

  function steer(name) {
    const next = DIRS[name];
    const last = queue.length ? queue[queue.length - 1] : dir;
    // Keine 180°-Wende und keine doppelten Eingaben
    if (next === last || (next.x === -last.x && next.y === -last.y)) return;
    if (queue.length < 3) queue.push(next);
  }

  // Ein Feld weiterziehen. Gibt false zurück, wenn das Spiel vorbei ist.
  function advance() {
    if (queue.length) dir = queue.shift();
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const eating = food && head.x === food.x && head.y === food.y;
    // Der Schwanz bewegt sich weg, außer die Schlange frisst gerade
    const body = eating ? snake : snake.slice(0, -1);

    const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
    if (hitWall || body.some((s) => s.x === head.x && s.y === head.y)) return false;

    // Beim Fressen bleibt der Schwanz liegen (alter Schwanz = neuer Schwanz)
    prevTail = snake[snake.length - 1];
    snake = [head, ...body];
    if (eating) {
      score += 1;
      scoreEl.textContent = String(score);
      step = Math.max(MIN_STEP, step - 2);
      placeFood();
      if (!food) {
        gameOver(true);
        return false;
      }
    }
    return true;
  }

  function gameOver(won = false) {
    state = 'over';
    progress = 1;
    const record = api.submitScore(score);
    if (record) bestEl.textContent = String(score);
    msg.textContent = won ? `Gewonnen! ${score} Äpfel` : `${score} ${score === 1 ? 'Apfel' : 'Äpfel'}${record ? ' · Neuer Rekord!' : ''}`;
    startBtn.textContent = 'Nochmal';
    overlay.hidden = false;
  }

  function togglePause() {
    if (state === 'running') {
      state = 'paused';
      msg.textContent = 'Pause';
      startBtn.textContent = 'Weiter';
      overlay.hidden = false;
    } else if (state === 'paused') {
      state = 'running';
      overlay.hidden = true;
      lastTime = performance.now();
    }
  }

  // ---------- Zeichnen ----------

  const center = (p) => ({ x: (p.x + 0.5) * CELL, y: (p.y + 0.5) * CELL });
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  function drawBoard() {
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        ctx.fillStyle = (x + y) % 2 ? COLORS.dark : COLORS.light;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  function drawApple(time) {
    if (!food) return;
    const { x, y } = center(food);
    const pulse = 1 + Math.sin(time / 180) * 0.04;
    const r = CELL * 0.36 * pulse;
    ctx.save();
    ctx.translate(x, y + 2);
    // Schatten
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.95, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Apfel
    ctx.fillStyle = COLORS.apple;
    ctx.beginPath();
    ctx.arc(-r * 0.35, 0, r * 0.8, 0, Math.PI * 2);
    ctx.arc(r * 0.35, 0, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.5, -r * 0.3, r * 0.18, r * 0.28, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // Stiel und Blatt
    ctx.strokeStyle = '#5d3a1a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.05, -r * 1.05, r * 0.3, -r * 1.2);
    ctx.stroke();
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(r * 0.55, -r * 1.1, r * 0.38, r * 0.18, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function snakePoints() {
    const t = state === 'running' ? progress : 1;
    const pts = snake.map(center);
    // Kopf gleitet vom vorherigen Feld ins neue, Schwanz zieht nach
    pts[0] = lerp(pts[1], pts[0], t);
    pts.push(lerp(center(prevTail), center(snake[snake.length - 1]), t));
    return pts;
  }

  function strokePath(pts, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function drawSnake() {
    const pts = snakePoints();
    // Schatten, Körper, Glanzlinie
    ctx.save();
    ctx.translate(0, 4);
    strokePath(pts, CELL * 0.78, 'rgba(0,0,0,.12)');
    ctx.restore();
    strokePath(pts, CELL * 0.78, COLORS.snakeShade);
    strokePath(pts, CELL * 0.66, COLORS.snake);
    drawEyes(pts[0]);
  }

  function drawEyes(head) {
    const look = queue[0] && state === 'running' && progress > 0.6 ? queue[0] : dir;
    const fx = dir.x;
    const fy = dir.y;
    // Senkrecht zur Laufrichtung
    const px = -fy;
    const py = fx;
    const eyeR = CELL * 0.17;
    for (const side of [-1, 1]) {
      const ex = head.x + fx * CELL * 0.12 + px * side * CELL * 0.2;
      const ey = head.y + fy * CELL * 0.12 + py * side * CELL * 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b1b1b';
      ctx.beginPath();
      ctx.arc(ex + look.x * eyeR * 0.4, ey + look.y * eyeR * 0.4, eyeR * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex + look.x * eyeR * 0.4 - eyeR * 0.2, ey + look.y * eyeR * 0.4 - eyeR * 0.2, eyeR * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Spielschleife ----------

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (state === 'running') {
      progress += (now - lastTime) / step;
      lastTime = now;
      while (progress >= 1 && state === 'running') {
        if (!advance()) {
          if (state === 'running') gameOver();
          break;
        }
        progress -= 1;
      }
    }
    drawBoard();
    drawApple(now);
    drawSnake();
  }

  // ---------- Eingabe ----------

  function onKey(e) {
    if (e.code === 'Space' || e.code === 'KeyP') {
      e.preventDefault();
      if (state === 'running' || state === 'paused') togglePause();
      else start();
      return;
    }
    const name = KEYS[e.code];
    if (!name) return;
    e.preventDefault();
    if (state === 'running') steer(name);
    else if (state !== 'paused') {
      start();
      steer(name);
    }
  }

  let touchStart = null;
  function onTouchStart(e) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e) {
    if (!touchStart || state !== 'running') return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  }

  function onVisibility() {
    if (document.hidden && state === 'running') togglePause();
  }

  startBtn.addEventListener('click', () => (state === 'paused' ? togglePause() : start()));
  container.querySelectorAll('[data-dir]').forEach((b) =>
    b.addEventListener('click', () => {
      if (state === 'running') steer(b.dataset.dir);
    }),
  );
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchend', onTouchEnd);
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);

  reset();
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
