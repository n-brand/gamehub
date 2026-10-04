// Mauerbrecher – mit Ball und Schläger alle Steine abräumen (Breakout-Prinzip).
// mount(container, api) gibt eine Cleanup-Funktion zurück.

const W = 960; // logische Spielfeldgröße (4:3), wird auf die Canvas-Größe skaliert
const H = 720;
const COLS = 12;
const MARGIN = 36;
const GAP = 8;
const BRICK_H = 28;
const TOP = 84;
const BRICK_W = (W - 2 * MARGIN - (COLS - 1) * GAP) / COLS;
const PADDLE_Y = H - 56;
const PADDLE_H = 18;
const PADDLE_W = 130;
const PADDLE_WIDE = 200;
const BALL_R = 9;
const START_SPEED = 470; // px/s
const MAX_SPEED = 860;
const STEP = 1 / 120; // feste Physik-Schrittweite – der Ball kann so keinen Stein „überspringen“
const LIVES = 3;
const MAX_LIVES = 5;
const MAX_BALLS = 8;
const POWER_CHANCE = 0.14;
const WIDE_SECONDS = 12;
const KEY_SPEED = 900; // Schläger-Tempo mit der Tastatur

// '.' leer, 'x' normaler Stein, 'T' harter Stein (zwei Treffer)
const LEVELS = [
  ['xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx'],
  ['.....TT.....', '....xxxx....', '...xxxxxx...', '..xxxxxxxx..', '.xxxxxxxxxx.', 'xxxxxxxxxxxx'],
  ['T.T.T.T.T.T.', '.x.x.x.x.x.x', 'x.x.x.x.x.x.', '.x.x.x.x.x.x', 'x.x.x.x.x.x.', '.T.T.T.T.T.T'],
  ['..xx....xx..', '.xxxx..xxxx.', 'xxxxxxxxxxxx', 'xxxxTTTTxxxx', '.xxxxxxxxxx.', '..xxxxxxxx..', '...xxxxxx...', '....xxxx....', '.....xx.....'],
  ['TTTTTTTTTTTT', 'T..........T', 'T.xxxxxxxx.T', 'T.xxTTTTxx.T', 'T.xxxxxxxx.T', 'T..........T', 'TTTT....TTTT'],
];
const ROW_COLORS = ['#ffffff', '#ffe3e3', '#ffd8a8', '#fff3bf', '#d3f9d8', '#d0ebff', '#e5dbff', '#ffdeeb', '#c5f6fa'];
const TOUGH = '#ffd43b';
const POWERS = {
  wide: { color: '#4dabf7', weight: 0.45 },
  multi: { color: '#9775fa', weight: 0.4 },
  life: { color: '#40c057', weight: 0.15 },
};
const BG = '#ff8787';
const FONT = '"Nunito", system-ui, sans-serif';

const HEART = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 21C5 16 2 12.5 2 8.5 2 5.5 4.3 3.5 7 3.5c2 0 3.6 1 5 2.7 1.4-1.7 3-2.7 5-2.7 2.7 0 5 2 5 5 0 4-3 7.5-10 12.5Z" fill="currentColor"/></svg>';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function shade(hex, amount = 0.16) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * (1 - amount));
  return `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

function pickPower() {
  let r = Math.random();
  for (const [type, p] of Object.entries(POWERS)) {
    if ((r -= p.weight) <= 0) return type;
  }
  return 'wide';
}

export function mount(container, api) {
  container.innerHTML = `
    <div class="gp bk">
      <div class="gp-panel">
        <div class="gp-stats">
          <div class="gp-stat"><span>Punkte</span><b data-score>0</b></div>
          <div class="gp-stat"><span>Level</span><b data-level>1</b></div>
          <div class="gp-stat"><span>Leben</span><b class="bk-lives" data-lives></b></div>
          <div class="gp-stat"><span>Rekord</span><b data-best>0</b></div>
        </div>
        <button type="button" class="btn btn--primary" data-new>Neues Spiel</button>
        <button type="button" class="btn" data-pause>Pause</button>
        <p class="gp-hint">Maus oder <kbd>←</kbd> <kbd>→</kbd> bewegen den Schläger. Klick oder <kbd>Leertaste</kbd> startet den Ball, <kbd>P</kbd> pausiert.</p>
      </div>
      <div class="bk-field" data-field>
        <canvas></canvas>
        <div class="gp-overlay" data-overlay hidden>
          <p data-msg></p>
          <small data-sub></small>
          <div class="gp-overlay-actions"><button type="button" class="btn btn--primary" data-action></button></div>
        </div>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const field = $('[data-field]');
  const canvas = field.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const overlay = $('[data-overlay]');
  const actionBtn = $('[data-action]');
  const pauseBtn = $('[data-pause]');

  let bricks = [];
  let balls = [];
  let capsules = [];
  let particles = [];
  const paddle = { x: W / 2, target: W / 2, w: PADDLE_W, hit: 0 };
  let score = 0;
  let lives = LIVES;
  let level = 1;
  let state = 'ready'; // ready | playing | paused | clear | over
  let gameTime = 0;
  let wideUntil = 0;
  let shake = 0;
  let clearTimer = 0;
  let bestAtStart = 0;
  const keys = { left: false, right: false };
  let overlayAction = null;
  let startedAt = 0;

  // ---------- Spielaufbau ----------

  function buildLevel() {
    const pattern = LEVELS[(level - 1) % LEVELS.length];
    bricks = [];
    pattern.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (ch === '.') return;
        const tough = ch === 'T';
        const color = tough ? TOUGH : ROW_COLORS[r % ROW_COLORS.length];
        bricks.push({
          x: MARGIN + c * (BRICK_W + GAP),
          y: TOP + r * (BRICK_H + GAP),
          w: BRICK_W,
          h: BRICK_H,
          hp: tough ? 2 : 1,
          tough,
          color,
          dark: shade(color),
        });
      }),
    );
  }

  const levelSpeed = () => Math.min(MAX_SPEED - 160, START_SPEED + (level - 1) * 40);

  function resetBall() {
    balls = [{ x: paddle.x, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, speed: levelSpeed(), stuck: true, offset: 0, trail: [] }];
    capsules = [];
    wideUntil = 0;
    state = 'ready';
  }

  // Runde ans Portal melden (Coins, Erfolge)
  function report() {
    api.reportResult?.({ result: 'score', score, durationMs: Date.now() - startedAt, extra: { level } });
  }

  function newGame() {
    // Abgebrochene Runde mit Punkten trotzdem werten
    if (state !== 'over' && score > 0) report();
    startedAt = Date.now();
    score = 0;
    lives = LIVES;
    level = 1;
    bestAtStart = api.getHighscore();
    particles = [];
    paddle.x = paddle.target = W / 2;
    paddle.w = PADDLE_W;
    buildLevel();
    resetBall();
    hideOverlay();
    renderStats();
  }

  function renderStats() {
    $('[data-score]').textContent = score;
    $('[data-level]').textContent = level;
    $('[data-lives]').innerHTML = HEART.repeat(lives);
    $('[data-best]').textContent = Math.max(api.getHighscore(), score);
    pauseBtn.textContent = state === 'paused' ? 'Weiter' : 'Pause';
    pauseBtn.disabled = state === 'over';
    field.classList.toggle('is-playing', state === 'playing');
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

  // ---------- Steuerung ----------

  function launch() {
    if (state !== 'ready') return;
    state = 'playing';
    for (const b of balls) {
      if (!b.stuck) continue;
      const angle = (Math.random() - 0.5) * 0.7;
      b.stuck = false;
      b.vx = b.speed * Math.sin(angle);
      b.vy = -b.speed * Math.cos(angle);
    }
    renderStats();
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      showOverlay('Pause', `Level ${level} · ${score} Punkte`, 'Weiter', togglePause);
    } else if (state === 'paused') {
      state = 'playing';
      hideOverlay();
    }
    renderStats();
  }

  // ---------- Physik ----------

  // Richtung beibehalten, Tempo setzen und zu flache Flugbahnen vermeiden
  function normalize(b) {
    const len = Math.hypot(b.vx, b.vy) || 1;
    let vx = (b.vx / len) * b.speed;
    let vy = (b.vy / len) * b.speed;
    const minVy = b.speed * 0.3;
    if (Math.abs(vy) < minVy) {
      vy = (Math.sign(vy) || -1) * minVy;
      vx = (Math.sign(vx) || 1) * Math.sqrt(b.speed * b.speed - vy * vy);
    }
    b.vx = vx;
    b.vy = vy;
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 80 + Math.random() * 220;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.7, max: 0.7, color, size: 4 + Math.random() * 5 });
    }
  }

  function floatText(x, y, text) {
    particles.push({ x, y, vx: 0, vy: -60, life: 0.8, max: 0.8, text });
  }

  function hitBrick(brick) {
    brick.hp--;
    if (brick.hp > 0) {
      brick.cracked = true;
      spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.dark, 4);
      return;
    }
    const points = (brick.tough ? 20 : 10) * level;
    score += points;
    spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 12);
    floatText(brick.x + brick.w / 2, brick.y, `+${points}`);
    if (Math.random() < POWER_CHANCE) capsules.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, type: pickPower() });
    renderStats();
  }

  function collideBricks(b) {
    for (const brick of bricks) {
      if (brick.hp <= 0) continue;
      const cx = clamp(b.x, brick.x, brick.x + brick.w);
      const cy = clamp(b.y, brick.y, brick.y + brick.h);
      const dx = b.x - cx;
      const dy = b.y - cy;
      if (dx * dx + dy * dy > BALL_R * BALL_R) continue;
      // An der Achse mit der kleineren Überlappung abprallen
      const overlapX = Math.min(b.x + BALL_R - brick.x, brick.x + brick.w - (b.x - BALL_R));
      const overlapY = Math.min(b.y + BALL_R - brick.y, brick.y + brick.h - (b.y - BALL_R));
      if (overlapX < overlapY) {
        const left = b.x < brick.x + brick.w / 2;
        b.vx = left ? -Math.abs(b.vx) : Math.abs(b.vx);
        b.x += left ? -overlapX : overlapX;
      } else {
        const above = b.y < brick.y + brick.h / 2;
        b.vy = above ? -Math.abs(b.vy) : Math.abs(b.vy);
        b.y += above ? -overlapY : overlapY;
      }
      hitBrick(brick);
      return; // höchstens ein Stein pro Schritt
    }
  }

  function applyPower(type) {
    if (type === 'wide') {
      wideUntil = gameTime + WIDE_SECONDS;
      floatText(paddle.x, PADDLE_Y - 20, 'Breit!');
    } else if (type === 'multi') {
      const extra = [];
      for (const b of balls) {
        if (b.stuck) continue;
        for (const turn of [-0.4, 0.4]) {
          if (balls.length + extra.length >= MAX_BALLS) break;
          const cos = Math.cos(turn);
          const sin = Math.sin(turn);
          extra.push({ ...b, trail: [], vx: b.vx * cos - b.vy * sin, vy: b.vx * sin + b.vy * cos });
        }
      }
      extra.forEach(normalize);
      balls.push(...extra);
      floatText(paddle.x, PADDLE_Y - 20, 'Mehr Bälle!');
    } else if (type === 'life') {
      lives = Math.min(MAX_LIVES, lives + 1);
      floatText(paddle.x, PADDLE_Y - 20, '+1 Leben');
    }
    score += 50;
    renderStats();
  }

  function update(dt) {
    gameTime += dt;
    // Schläger
    if (keys.left) paddle.target -= KEY_SPEED * dt;
    if (keys.right) paddle.target += KEY_SPEED * dt;
    const targetW = gameTime < wideUntil ? PADDLE_WIDE : PADDLE_W;
    paddle.w += (targetW - paddle.w) * Math.min(1, dt * 10);
    paddle.target = clamp(paddle.target, paddle.w / 2, W - paddle.w / 2);
    paddle.x = paddle.target;
    paddle.hit = Math.max(0, paddle.hit - dt * 5);

    for (const b of balls) {
      if (b.stuck) {
        b.x = paddle.x + b.offset;
        b.y = PADDLE_Y - BALL_R - 1;
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < BALL_R) {
        b.x = BALL_R;
        b.vx = Math.abs(b.vx);
      } else if (b.x > W - BALL_R) {
        b.x = W - BALL_R;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y < BALL_R) {
        b.y = BALL_R;
        b.vy = Math.abs(b.vy);
      }
      // Schläger: Abprallwinkel hängt davon ab, wo der Ball trifft (Mitte = gerade, Rand = schräg)
      const half = paddle.w / 2;
      if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y + BALL_R <= PADDLE_Y + PADDLE_H + 12 && b.x >= paddle.x - half - BALL_R && b.x <= paddle.x + half + BALL_R) {
        const offset = clamp((b.x - paddle.x) / half, -1, 1);
        const angle = offset * 1.05;
        b.speed = Math.min(MAX_SPEED, b.speed * 1.015);
        b.vx = b.speed * Math.sin(angle);
        b.vy = -b.speed * Math.cos(angle);
        b.y = PADDLE_Y - BALL_R;
        paddle.hit = 1;
      }
      collideBricks(b);
      normalize(b);
    }
    balls = balls.filter((b) => b.y - BALL_R <= H);
    if (state === 'playing' && balls.length === 0) loseLife();

    for (const c of capsules) {
      c.y += 190 * dt;
      if (c.y + 11 >= PADDLE_Y && c.y - 11 <= PADDLE_Y + PADDLE_H && Math.abs(c.x - paddle.x) <= paddle.w / 2 + 23) {
        c.taken = true;
        applyPower(c.type);
      }
    }
    capsules = capsules.filter((c) => !c.taken && c.y < H + 20);

    if (state === 'playing' && bricks.every((b) => b.hp <= 0)) levelClear();
  }

  function loseLife() {
    lives--;
    shake = 1;
    if (lives <= 0) {
      gameOver();
      return;
    }
    paddle.w = PADDLE_W;
    resetBall();
    renderStats();
  }

  function levelClear() {
    const bonus = 100 * level;
    score += bonus;
    state = 'clear';
    clearTimer = 1.8;
    capsules = [];
    floatText(W / 2, H / 2 + 50, `Bonus +${bonus}`);
    renderStats();
  }

  function gameOver() {
    state = 'over';
    capsules = [];
    report();
    api.submitScore(score);
    const record = score > bestAtStart && score > 0;
    renderStats();
    showOverlay(record ? 'Neuer Rekord!' : 'Game Over', `${score} Punkte · Level ${level}`, 'Nochmal', newGame);
  }

  // ---------- Zeichnen ----------

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  function drawCapsule(c) {
    const color = POWERS[c.type].color;
    ctx.fillStyle = shade(color, 0.2);
    roundRect(c.x - 23, c.y - 9, 46, 22, 11);
    ctx.fillStyle = color;
    roundRect(c.x - 23, c.y - 11, 46, 20, 10);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    if (c.type === 'wide') {
      ctx.beginPath();
      ctx.moveTo(c.x - 11, c.y - 1);
      ctx.lineTo(c.x + 11, c.y - 1);
      ctx.moveTo(c.x - 11, c.y - 1);
      ctx.lineTo(c.x - 6, c.y - 6);
      ctx.moveTo(c.x - 11, c.y - 1);
      ctx.lineTo(c.x - 6, c.y + 4);
      ctx.moveTo(c.x + 11, c.y - 1);
      ctx.lineTo(c.x + 6, c.y - 6);
      ctx.moveTo(c.x + 11, c.y - 1);
      ctx.lineTo(c.x + 6, c.y + 4);
      ctx.stroke();
    } else if (c.type === 'multi') {
      for (const dx of [-8, 0, 8]) {
        ctx.beginPath();
        ctx.arc(c.x + dx, c.y - 1, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + 6);
      ctx.bezierCurveTo(c.x - 12, c.y - 2, c.x - 6, c.y - 11, c.x, c.y - 5);
      ctx.bezierCurveTo(c.x + 6, c.y - 11, c.x + 12, c.y - 2, c.x, c.y + 6);
      ctx.fill();
    }
  }

  function draw() {
    const scale = canvas.width / W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    // Dezentes Punktraster
    ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
    for (let x = 24; x < W; x += 48) {
      for (let y = 24; y < H; y += 48) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (shake > 0) ctx.translate((Math.random() - 0.5) * 14 * shake, (Math.random() - 0.5) * 10 * shake);

    // Steine mit Kante unten
    for (const b of bricks) {
      if (b.hp <= 0) continue;
      ctx.fillStyle = b.dark;
      roundRect(b.x, b.y + 4, b.w, b.h - 4, 7);
      ctx.fillStyle = b.color;
      roundRect(b.x, b.y, b.w, b.h - 4, 7);
      if (b.cracked) {
        ctx.strokeStyle = 'rgba(92, 60, 0, 0.55)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x + b.w * 0.3, b.y + 3);
        ctx.lineTo(b.x + b.w * 0.42, b.y + b.h * 0.45);
        ctx.lineTo(b.x + b.w * 0.36, b.y + b.h - 6);
        ctx.moveTo(b.x + b.w * 0.42, b.y + b.h * 0.45);
        ctx.lineTo(b.x + b.w * 0.62, b.y + b.h * 0.35);
        ctx.stroke();
      }
    }

    capsules.forEach(drawCapsule);

    // Schläger (federt beim Treffer kurz ein)
    const squash = paddle.hit * 3;
    const px = paddle.x - paddle.w / 2;
    ctx.fillStyle = '#0b1a2e';
    roundRect(px, PADDLE_Y + 5 + squash, paddle.w, PADDLE_H - 5, 9);
    ctx.fillStyle = '#183153';
    roundRect(px, PADDLE_Y + squash, paddle.w, PADDLE_H - 4, 9);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    roundRect(px + 10, PADDLE_Y + 3 + squash, paddle.w - 20, 4, 2);

    // Bälle mit kurzer Spur
    for (const b of balls) {
      b.trail.forEach((p, i) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${(i + 1) * 0.06})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, BALL_R * (0.5 + i * 0.08), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.arc(b.x + 2, b.y + 4, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    // Partikel und Punkte-Texte
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      if (p.text) {
        ctx.fillStyle = '#fff';
        ctx.font = `900 22px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    // Hinweise auf dem Spielfeld
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    if (state === 'ready') {
      ctx.font = `900 44px ${FONT}`;
      ctx.fillText(`Level ${level}`, W / 2, PADDLE_Y - 150);
      ctx.font = `800 24px ${FONT}`;
      ctx.fillText('Klicken oder Leertaste zum Starten', W / 2, PADDLE_Y - 105);
    } else if (state === 'clear') {
      ctx.font = `900 52px ${FONT}`;
      ctx.fillText('Level geschafft!', W / 2, H / 2);
    }
  }

  // ---------- Schleife ----------

  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let trailTick = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === 'playing' || state === 'ready') {
      acc += dt;
      while (acc >= STEP) {
        update(STEP);
        acc -= STEP;
      }
      trailTick += dt;
      if (trailTick > 1 / 60) {
        trailTick = 0;
        for (const b of balls) {
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > 6) b.trail.shift();
        }
      }
    } else {
      acc = 0;
    }
    if (state === 'clear') {
      clearTimer -= dt;
      if (clearTimer <= 0) {
        level++;
        buildLevel();
        paddle.w = PADDLE_W;
        resetBall();
        renderStats();
      }
    }
    if (state !== 'paused') {
      for (const p of particles) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (!p.text) p.vy += 600 * dt;
      }
      particles = particles.filter((p) => p.life > 0);
      shake = Math.max(0, shake - dt * 3);
    }
    draw();
  }

  // ---------- Eingabe ----------

  function pointerToPaddle(e) {
    const rect = canvas.getBoundingClientRect();
    paddle.target = ((e.clientX - rect.left) / rect.width) * W;
  }

  field.addEventListener('pointermove', pointerToPaddle);
  field.addEventListener('pointerdown', (e) => {
    if (!overlay.hidden) return;
    pointerToPaddle(e);
    launch();
  });
  actionBtn.addEventListener('click', () => overlayAction?.());
  $('[data-new]').addEventListener('click', newGame);
  pauseBtn.addEventListener('click', togglePause);

  // Nach Klick auf einen Button den Fokus lösen, damit die Leertaste wieder das Spiel steuert
  container.addEventListener('click', (e) => e.target.closest('button')?.blur());

  function isTyping(t) {
    return t instanceof HTMLElement && (t.closest('input, textarea, select') || t.isContentEditable);
  }

  function onKeyDown(e) {
    if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.code;
    if (k === 'ArrowLeft' || k === 'KeyA') {
      keys.left = true;
      e.preventDefault();
    } else if (k === 'ArrowRight' || k === 'KeyD') {
      keys.right = true;
      e.preventDefault();
    } else if (k === 'Space' || k === 'ArrowUp') {
      if (e.target instanceof HTMLButtonElement) return; // Button selbst auslösen lassen
      e.preventDefault();
      if (state === 'ready') launch();
      else if (state === 'paused') togglePause();
    } else if (k === 'KeyP' || k === 'Escape') {
      togglePause();
    }
  }

  function onKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  }

  function onVisibility() {
    if (document.hidden && state === 'playing') togglePause();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('visibilitychange', onVisibility);

  // Canvas-Auflösung an die angezeigte Größe anpassen (scharf auf HiDPI-Bildschirmen)
  const resize = new ResizeObserver(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  });
  resize.observe(canvas);

  newGame();
  raf = requestAnimationFrame(frame);

  return () => {
    if (state !== 'over' && score > 0) report();
    cancelAnimationFrame(raf);
    resize.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
