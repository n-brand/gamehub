// Watermelon Drop – Früchte aus der Wolke fallen lassen; zwei gleiche verschmelzen zur nächstgrößeren
// (Suika-Prinzip, neutraler Name). Ziel: die Wassermelone. Ragt eine Frucht zu lange über den Kistenrand, ist Schluss.
//
// Eigene kleine Kreis-Physik: positionsbasiert mit Teilschritten, Reibung am Berührpunkt (Früchte rollen),
// leichtes Abprallen. Die Physik steckt in reinen Funktionen (createWorld, dropFruit, stepWorld, overflowTop),
// damit tools/check-watermelon.mjs sie ohne Browser prüfen kann. mount(container, api) gibt eine Cleanup-Funktion zurück.

import { wmDesign, drawObject, drawBackdrop, drawBox, drawCloud, tierColor, SET_NAMES, SET_GOALS, OVERHANG } from '../js/watermelon-art.js';

// ---------- Physik ----------

export const RADII = [24, 32, 40, 54, 64, 76, 88, 100, 124, 152, 184];
export const BOX_W = 620; // Innenbreite der Kiste
export const BOX_H = 820; // Boden; der Rand (Gefahrenlinie) liegt bei y = 0
export const STEP = 1 / 60;
export const DROP_TIERS = 5; // aus der Wolke kommen nur die fünf kleinsten Stufen
export const HOLD_Y = -76; // Mittelpunkt der Frucht an der Wolke
const SUBSTEPS = 8;
const ITERATIONS = 2; // Lösungsdurchgänge pro Teilschritt (Stapel sinken sonst leicht ineinander)
const GRAVITY = 3000;
const FRICTION = 0.35;
const WALL_FRICTION = 0.45;
const RESTITUTION = 0.18;
const BOUNCE_MIN = 150; // erst ab diesem Aufprall-Tempo prallt etwas ab (sonst zittern Stapel)
const SEPARATION_SLACK = 60; // so viel schneller als der Abprall dürfen sich Früchte trennen
const MAX_SPEED = 2400;
const ANGULAR_DAMPING = 1.2;
const GROW_TIME = 0.12; // neue Frucht wächst nach dem Verschmelzen auf volle Größe
const MERGE_SLOP = 1.5; // gleiche Früchte verschmelzen schon bei fast-Berührung
export const GRACE = 1; // so lange nach dem Entstehen zählt eine Frucht noch nicht als „über dem Rand“

// Punkte, wenn zwei Früchte der Stufe `tier` verschmelzen: 1, 3, 6, 10 … (zwei Wassermelonen: 66)
export const points = (tier) => ((tier + 1) * (tier + 2)) / 2;

export function createWorld() {
  return { bodies: [], time: 0, nextId: 1, score: 0, maxTier: 0, events: [] };
}

function makeBody(world, tier, x, y, vx = 0, vy = 0, fromR = RADII[tier]) {
  const R = RADII[tier];
  const body = {
    id: world.nextId++, tier, x, y, px: x, py: y, vx, vy, pvx: vx, pvy: vy,
    angle: (Math.random() - 0.5) * 0.6, omega: 0, r: fromR, w: 1 / (R * R),
    grow: fromR < R ? 0 : 1, fromR, born: world.time, dead: false,
  };
  world.bodies.push(body);
  world.maxTier = Math.max(world.maxTier, tier);
  return body;
}

export function dropFruit(world, tier, x, y = HOLD_Y) {
  return makeBody(world, tier, x, y);
}

export function stepWorld(world) {
  const h = STEP / SUBSTEPS;
  const damp = Math.exp(-ANGULAR_DAMPING * h);
  for (let s = 0; s < SUBSTEPS; s++) {
    const bodies = world.bodies;
    world.time += h;
    for (const b of bodies) {
      if (b.grow < 1) {
        b.grow = Math.min(1, b.grow + h / GROW_TIME);
        b.r = b.fromR + (RADII[b.tier] - b.fromR) * (1 - (1 - b.grow) ** 2);
      }
      b.pvx = b.vx;
      b.pvy = b.vy;
      b.vy += GRAVITY * h;
      b.px = b.x;
      b.py = b.y;
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.angle += b.omega * h;
    }

    const contacts = [];
    const merges = [];
    for (let it = 0; it < ITERATIONS; it++) {
      solvePairs(bodies, contacts, it === 0 ? merges : null);
      solveWalls(bodies, contacts);
    }

    for (const b of bodies) {
      b.vx = (b.x - b.px) / h;
      b.vy = (b.y - b.py) / h;
    }
    for (const c of contacts) solveVelocity(c, h);
    for (const b of bodies) {
      b.omega *= damp;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > MAX_SPEED) {
        b.vx *= MAX_SPEED / speed;
        b.vy *= MAX_SPEED / speed;
      }
    }
    if (merges.length) applyMerges(world, merges);
  }
}

// Überlappungen zwischen Früchten auflösen (schwere Früchte bewegen sich weniger).
// merges: Liste für Paare gleicher Stufe, die sich berühren (nur im ersten Durchgang gesammelt)
function solvePairs(bodies, contacts, merges) {
  const n = bodies.length;
  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j];
      const same = merges && a.tier === b.tier;
      const reach = a.r + b.r + (same ? MERGE_SLOP : 0);
      const dx = b.x - a.x;
      if (dx > reach || dx < -reach) continue;
      const dy = b.y - a.y;
      if (dy > reach || dy < -reach) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 >= reach * reach) continue;
      if (same) merges.push(a, b);
      const rr = a.r + b.r;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2);
      const nx = d > 1e-9 ? dx / d : 0;
      const ny = d > 1e-9 ? dy / d : 1;
      const depth = rr - d;
      const wsum = a.w + b.w;
      a.x -= (nx * depth * a.w) / wsum;
      a.y -= (ny * depth * a.w) / wsum;
      b.x += (nx * depth * b.w) / wsum;
      b.y += (ny * depth * b.w) / wsum;
      contacts.push({ a, b, nx, ny, depth });
    }
  }
}

// Wände und Boden (nach oben ist die Kiste offen)
function solveWalls(bodies, contacts) {
  for (const b of bodies) {
    if (b.x < b.r) {
      contacts.push({ a: b, b: null, nx: -1, ny: 0, depth: b.r - b.x });
      b.x = b.r;
    } else if (b.x > BOX_W - b.r) {
      contacts.push({ a: b, b: null, nx: 1, ny: 0, depth: b.x - (BOX_W - b.r) });
      b.x = BOX_W - b.r;
    }
    if (b.y > BOX_H - b.r) {
      contacts.push({ a: b, b: null, nx: 0, ny: 1, depth: b.y - (BOX_H - b.r) });
      b.y = BOX_H - b.r;
    }
  }
}

// Abprallen und Reibung für einen Kontakt. n zeigt von a zu b (bzw. in die Wand).
function solveVelocity({ a, b, nx, ny, depth }, h) {
  const wa = a.w;
  const wb = b ? b.w : 0;
  const wsum = wa + wb;
  const bvx = b ? b.vx : 0;
  const bvy = b ? b.vy : 0;

  // Normalrichtung: höchstens so schnell auseinander, wie es der Aufprall hergibt. Tiefe Überlappungen
  // (z. B. wenn eine neue Frucht in einer anderen entsteht) werden so nur weggeschoben, ohne Schwung –
  // sonst würden kleine Früchte quer durchs Bild geschleudert.
  const approach = (a.pvx - (b ? b.pvx : 0)) * nx + (a.pvy - (b ? b.pvy : 0)) * ny;
  const target = approach > BOUNCE_MIN ? -RESTITUTION * approach : 0;
  const vn = (a.vx - bvx) * nx + (a.vy - bvy) * ny;
  if (vn > target || vn < target - SEPARATION_SLACK) {
    const p = (vn - target) / wsum;
    a.vx -= p * wa * nx;
    a.vy -= p * wa * ny;
    if (b) {
      b.vx += p * wb * nx;
      b.vy += p * wb * ny;
    }
  }

  // Reibung am Berührpunkt: bremst das Rutschen und bringt die Früchte zum Rollen (Scheibe: I = m·r²/2)
  const tx = -ny;
  const ty = nx;
  const vt = (a.vx - (b ? b.vx : 0)) * tx + (a.vy - (b ? b.vy : 0)) * ty + a.omega * a.r + (b ? b.omega * b.r : 0);
  const limit = ((b ? FRICTION : WALL_FRICTION) * depth) / h;
  const p = Math.max(-limit, Math.min(limit, vt)) / (3 * wsum);
  a.vx -= p * wa * tx;
  a.vy -= p * wa * ty;
  a.omega -= (2 * p * wa) / a.r;
  if (b) {
    b.vx += p * wb * tx;
    b.vy += p * wb * ty;
    b.omega -= (2 * p * wb) / b.r;
  }
}

function applyMerges(world, list) {
  for (let i = 0; i < list.length; i += 2) {
    const a = list[i];
    const b = list[i + 1];
    if (a.dead || b.dead) continue;
    a.dead = true;
    b.dead = true;
    const tier = a.tier;
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    const gained = points(tier);
    world.score += gained;
    if (tier === RADII.length - 1) {
      // Zwei Wassermelonen verschwinden mit einem großen Knall
      world.events.push({ type: 'pop', tier, x, y, points: gained });
    } else {
      makeBody(world, tier + 1, x, y, (a.vx + b.vx) / 2, (a.vy + b.vy) / 2, RADII[tier] * 0.85);
      world.events.push({ type: 'merge', tier: tier + 1, x, y, points: gained });
    }
  }
  world.bodies = world.bodies.filter((b) => !b.dead);
}

// Höchster Punkt der Früchte, die schon länger als GRACE liegen (y < 0 = über dem Rand)
export function overflowTop(world) {
  let top = Infinity;
  for (const b of world.bodies) {
    if (world.time - b.born > GRACE) top = Math.min(top, b.y - b.r);
  }
  return top;
}

// ---------- Spiel ----------

const SAVE_KEY = 'gamehub-watermelon';
const WALL = 22;
const VIEW_X = -35;
const VIEW_Y = -183;
const VIEW_W = 690; // 2 : 3 wie das Spielfeld
const VIEW_H = 1035;
const DROP_COOLDOWN = 0.45;
const DANGER_TIME = 2.5; // so lange darf eine Frucht über den Rand ragen
const WARN_Y = 90; // ab hier blinkt die Linie schon leicht
const AIM_SPEED = 720;

const fmt = (n) => new Intl.NumberFormat('de-DE').format(n);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const randomTier = () => Math.floor(Math.random() * DROP_TIERS);

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStore(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Speicher nicht verfügbar – Spielstand gilt nur für diese Sitzung
  }
}

// Kleine Klänge per Web Audio (kein Ton, bis zur ersten Eingabe)
function createSound() {
  let ctx = null;
  let master = null;
  let muted = false;

  function blip(t0, from, to, dur, type, peak) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t0);
    o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  const play = (fn) => {
    if (!ctx || muted || ctx.state !== 'running') return;
    fn(ctx.currentTime);
  };

  return {
    unlock() {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.32;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
    },
    drop: () => play((t) => blip(t, 520, 260, 0.09, 'sine', 0.3)),
    merge: (tier) =>
      play((t) => {
        const f = 900 * 0.87 ** tier;
        blip(t, f, f * 1.9, 0.12, 'triangle', 0.45);
        blip(t + 0.04, f * 1.5, f * 2.6, 0.1, 'sine', 0.2);
      }),
    fanfare: () => play((t) => [523, 659, 784, 1047].forEach((f, i) => blip(t + i * 0.09, f, f * 1.01, 0.22, 'triangle', 0.32))),
    over: () => play((t) => [392, 330, 262].forEach((f, i) => blip(t + i * 0.2, f, f * 0.96, 0.3, 'triangle', 0.3))),
    setMuted(m) {
      muted = m;
    },
    close() {
      ctx?.close();
    },
  };
}

export function mount(container, api) {
  const design = wmDesign(api.getDesign?.());
  const names = SET_NAMES[design.set];
  container.innerHTML = `
    <div class="gp wm">
      <div class="gp-panel">
        <div class="gp-stats">
          <div class="gp-stat"><span>Punkte</span><b data-score>0</b></div>
          <div class="gp-stat"><span>Rekord</span><b data-best>0</b></div>
          <div class="gp-stat wm-wide"><span>Größte</span><b data-biggest></b></div>
        </div>
        <div class="wm-box">
          <span class="gp-label">Als Nächstes</span>
          <canvas class="wm-next" data-next></canvas>
          <b class="wm-next-name" data-next-name></b>
        </div>
        <button type="button" class="btn btn--primary" data-new>Neues Spiel</button>
        <button type="button" class="btn" data-pause>Pause</button>
        <button type="button" class="btn" data-sound></button>
        <p class="gp-hint">Maus bewegen und klicken oder <kbd>←</kbd> <kbd>→</kbd> und <kbd>Leertaste</kbd> · <kbd>P</kbd> Pause</p>
      </div>
      <div class="wm-field" data-field>
        <canvas data-canvas></canvas>
        <div class="gp-overlay" data-overlay hidden>
          <p data-msg></p>
          <small data-sub></small>
          <div class="gp-overlay-actions"><button type="button" class="btn btn--primary" data-action></button></div>
        </div>
      </div>
      <div class="gp-panel wm-side">
        <div class="wm-box">
          <span class="gp-label">Kreislauf</span>
          <canvas class="wm-cycle" data-cycle></canvas>
        </div>
        <p class="gp-hint">Zwei gleiche verschmelzen zur nächstgrößeren Stufe. Schaffst du ${SET_GOALS[design.set]}? Ragt etwas zu lange über den Rand, ist die Kiste voll.</p>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const field = $('[data-field]');
  const canvas = $('[data-canvas]');
  const ctx = canvas.getContext('2d');
  const nextCanvas = $('[data-next]');
  const cycleCanvas = $('[data-cycle]');
  const overlay = $('[data-overlay]');
  const actionBtn = $('[data-action]');
  const pauseBtn = $('[data-pause]');
  const soundBtn = $('[data-sound]');

  const store = loadStore();
  const sound = createSound();
  let muted = store.muted === true;
  sound.setMuted(muted);

  let world;
  let state = 'playing'; // playing | paused | over
  let held = null; // Stufe an der Wolke (null während der Pause nach dem Fallenlassen)
  let next = 0;
  let aimX = BOX_W / 2;
  let cloudY = HOLD_Y - RADII[0] - 14;
  let cooldown = 0;
  let holdAnim = 1;
  let danger = 0;
  let warn = false;
  let playMs = 0;
  let bestAtStart = 0;
  let shownMax = -1;
  let shake = 0;
  let effects = []; // Partikel, Ringe, Punkte-Texte
  let overlayAction = null;
  let pointerDown = false;
  const keys = { left: false, right: false };

  // ---------- Bild-Zwischenspeicher (jede Stufe einmal vorgezeichnet) ----------

  let pxPerUnit = 1;
  const sprites = new Map();
  function sprite(tier) {
    let sp = sprites.get(tier);
    if (!sp) {
      const r = RADII[tier] * pxPerUnit;
      const size = Math.ceil(r * 2 * OVERHANG) + 4;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const g = c.getContext('2d');
      g.translate(size / 2, size / 2);
      drawObject(g, design.set, tier, r);
      sp = { canvas: c, size };
      sprites.set(tier, sp);
    }
    return sp;
  }

  function drawSprite(tier, x, y, angle, scale) {
    const sp = sprite(tier);
    const s = (sp.size / pxPerUnit) * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(sp.canvas, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  // ---------- Spielablauf ----------

  function persist() {
    if (state === 'over' || !world) {
      delete store.game;
    } else {
      store.game = {
        bodies: world.bodies.map((b) => [b.tier, Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.angle * 100) / 100]),
        score: world.score,
        maxTier: world.maxTier,
        held: held ?? next,
        next: held === null ? randomTier() : next,
        playMs: Math.round(playMs),
        bestAtStart,
        aimX: Math.round(aimX),
      };
    }
    saveStore(store);
  }

  function restore(saved) {
    world = createWorld();
    for (const [tier, x, y, angle] of saved.bodies) {
      if (!RADII[tier] || !Number.isFinite(x) || !Number.isFinite(y)) continue;
      const b = dropFruit(world, tier, clamp(x, RADII[tier], BOX_W - RADII[tier]), Math.min(y, BOX_H - RADII[tier]));
      b.angle = angle || 0;
      b.born = -GRACE; // liegt schon
    }
    world.score = saved.score || 0;
    world.maxTier = Math.max(world.maxTier, saved.maxTier || 0);
    held = clamp(saved.held | 0, 0, DROP_TIERS - 1);
    next = clamp(saved.next | 0, 0, DROP_TIERS - 1);
    playMs = saved.playMs || 0;
    bestAtStart = saved.bestAtStart ?? api.getHighscore();
    aimX = saved.aimX || BOX_W / 2;
  }

  function report() {
    api.reportResult?.({
      result: 'score',
      score: world.score,
      durationMs: Math.round(playMs),
      extra: { maxFruit: world.maxTier + 1 },
    });
  }

  function newGame() {
    // Abgebrochene Runde mit Punkten trotzdem werten
    if (world && state !== 'over' && world.score > 0) {
      api.submitScore(world.score);
      report();
    }
    world = createWorld();
    state = 'playing';
    held = randomTier();
    next = randomTier();
    cooldown = 0;
    holdAnim = 0;
    danger = 0;
    playMs = 0;
    effects = [];
    bestAtStart = api.getHighscore();
    hideOverlay();
    updatePanel();
    persist();
  }

  function drop() {
    if (state !== 'playing' || held === null) return;
    const r = RADII[held];
    dropFruit(world, held, clamp(aimX, r, BOX_W - r));
    sound.drop();
    held = null;
    cooldown = DROP_COOLDOWN;
    api.submitScore(world.score);
    persist();
  }

  function gameOver() {
    state = 'over';
    keys.left = keys.right = false;
    sound.over();
    api.submitScore(world.score);
    report();
    persist();
    const record = world.score > bestAtStart && world.score > 0;
    showOverlay(
      'Kiste voll!',
      `${fmt(world.score)} Punkte${record ? ' · Neuer Rekord!' : ''} · Größte: ${names[world.maxTier]}`,
      'Nochmal',
      newGame,
    );
    updatePanel();
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      keys.left = keys.right = false;
      persist();
      showOverlay('Pause', 'Dein Spielstand bleibt erhalten.', 'Weiter', togglePause);
    } else if (state === 'paused') {
      state = 'playing';
      hideOverlay();
    }
    pauseBtn.textContent = state === 'paused' ? 'Weiter' : 'Pause';
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
    pauseBtn.textContent = 'Pause';
  }

  // ---------- Bedienfeld ----------

  function updatePanel() {
    if (!world) return;
    $('[data-score]').textContent = fmt(world.score);
    $('[data-best]').textContent = fmt(Math.max(api.getHighscore(), world.score));
    $('[data-biggest]').textContent = names[world.maxTier];
    $('[data-next-name]').textContent = names[next];
    drawNext(next);
    if (shownMax !== world.maxTier) {
      shownMax = world.maxTier;
      drawCycle();
    }
  }

  function drawNext(tier) {
    const c = nextCanvas;
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    const unit = c.width / 2 / (RADII[DROP_TIERS - 1] * 1.25);
    g.translate(c.width / 2, c.height / 2 + RADII[tier] * unit * 0.1);
    drawObject(g, design.set, tier, RADII[tier] * unit);
  }

  function drawCycle() {
    const c = cycleCanvas;
    const g = c.getContext('2d');
    const s = c.width / 200;
    g.setTransform(s, 0, 0, s, 0, 0);
    g.clearRect(0, 0, 200, 200);
    g.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(100, 100, 72, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < RADII.length; i++) {
      const a = -Math.PI / 2 + (i / RADII.length) * Math.PI * 2;
      g.save();
      g.globalAlpha = i <= world.maxTier ? 1 : 0.28;
      g.translate(100 + Math.cos(a) * 72, 100 + Math.sin(a) * 72);
      drawObject(g, design.set, i, 8 + i * 1.3);
      g.restore();
    }
  }

  // ---------- Effekte ----------

  function burst(ev) {
    const color = tierColor(design.set, ev.tier);
    const r = RADII[ev.tier];
    const count = 8 + ev.tier * 2;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 250 + Math.random() * 450 + ev.tier * 30;
      effects.push({
        kind: 'dot', x: ev.x + Math.cos(a) * r * 0.5, y: ev.y + Math.sin(a) * r * 0.5,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, size: 5 + Math.random() * 6 + ev.tier,
        color: i % 3 ? color : '#ffffff', life: 0.5 + Math.random() * 0.3, max: 0.8,
      });
    }
    effects.push({ kind: 'ring', x: ev.x, y: ev.y, r, life: 0.35, max: 0.35 });
    effects.push({ kind: 'text', x: ev.x, y: ev.y - r * 0.3, text: `+${ev.points}`, size: 30 + ev.tier * 3, life: 0.9, max: 0.9 });
  }

  function handleEvents() {
    if (!world.events.length) return;
    for (const ev of world.events) {
      burst(ev);
      if (ev.type === 'pop' || ev.tier === RADII.length - 1) {
        sound.fanfare();
        shake = 0.45;
      } else {
        sound.merge(ev.tier);
        if (ev.tier >= 7) shake = Math.max(shake, 0.25);
      }
    }
    world.events.length = 0;
    updatePanel();
  }

  function updateEffects(dt) {
    for (const e of effects) {
      e.life -= dt;
      if (e.kind === 'dot') {
        e.vy += 1400 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else if (e.kind === 'text') {
        e.y -= 70 * dt;
      }
    }
    effects = effects.filter((e) => e.life > 0);
    shake = Math.max(0, shake - dt);
  }

  // ---------- Zeichnen ----------

  // Hintergrund ändert sich nie – einmal pro Größe vorzeichnen
  let backdrop = null;
  function renderBackdrop() {
    backdrop = document.createElement('canvas');
    backdrop.width = canvas.width;
    backdrop.height = canvas.height;
    const g = backdrop.getContext('2d');
    const k = canvas.width / VIEW_W;
    g.setTransform(k, 0, 0, k, -VIEW_X * k, -VIEW_Y * k);
    drawBackdrop(g, design, VIEW_X, VIEW_Y, VIEW_X + VIEW_W, VIEW_Y + VIEW_H);
  }

  function draw(now) {
    const k = canvas.width / VIEW_W;
    let ox = 0;
    let oy = 0;
    if (shake > 0) {
      ox = (Math.random() - 0.5) * shake * 40;
      oy = (Math.random() - 0.5) * shake * 40;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (backdrop) ctx.drawImage(backdrop, 0, 0);
    ctx.setTransform(k, 0, 0, k, (ox - VIEW_X) * k, (oy - VIEW_Y) * k);
    drawBox(ctx, design, BOX_W, BOX_H, 0, WALL);

    const r = held !== null ? RADII[held] : RADII[next];
    const x = clamp(aimX, r, BOX_W - r);

    // Hilfslinie unter der Frucht (liegt hinter den Früchten, endet optisch am Stapel)
    if (state === 'playing' && held !== null) {
      ctx.strokeStyle = design.guide;
      ctx.lineWidth = 5;
      ctx.setLineDash([16, 16]);
      ctx.beginPath();
      ctx.moveTo(x, HOLD_Y + r);
      ctx.lineTo(x, BOX_H);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Gefahrenlinie am Rand
    if (warn || danger > 0) {
      const blink = danger > 0 ? 0.55 + 0.45 * Math.sin(now / (110 - danger * 30)) : 0.3;
      ctx.globalAlpha = blink;
      ctx.strokeStyle = design.line;
      ctx.lineWidth = 7;
      ctx.setLineDash([22, 14]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(BOX_W, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    for (const b of world.bodies) {
      const pop = b.grow < 1 ? 1 + 0.14 * Math.sin(Math.PI * b.grow) : 1;
      drawSprite(b.tier, b.x, b.y, b.angle, (b.r / RADII[b.tier]) * pop);
    }

    for (const e of effects) {
      const t = e.life / e.max;
      if (e.kind === 'dot') {
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * (0.4 + 0.6 * t), 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'ring') {
        ctx.globalAlpha = t * 0.8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8 * t + 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * (1 + (1 - t) * 0.6), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = Math.min(1, t * 2.5);
        ctx.font = `900 ${e.size}px Nunito, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(24, 49, 83, 0.4)';
        ctx.fillText(e.text, e.x + 2, e.y + 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(e.text, e.x, e.y);
      }
      ctx.globalAlpha = 1;
    }

    // Wolke mit der nächsten Frucht
    const targetCloud = HOLD_Y - r - 14;
    cloudY += (targetCloud - cloudY) * 0.2;
    if (held !== null) {
      const s = holdAnim < 1 ? 0.4 + 0.6 * (1 - (1 - holdAnim) ** 3) : 1;
      drawSprite(held, x, HOLD_Y, Math.sin(now / 600) * 0.06, s);
    }
    drawCloud(ctx, design, x, cloudY + Math.sin(now / 700) * 3, 30);
  }

  // ---------- Hauptschleife ----------

  let raf = 0;
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === 'playing') {
      playMs += dt * 1000;
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 4) {
        stepWorld(world);
        acc -= STEP;
        steps++;
      }
      if (steps === 4) acc = 0;
      handleEvents();

      if (keys.left !== keys.right) aimX = clamp(aimX + (keys.right ? 1 : -1) * AIM_SPEED * dt, 0, BOX_W);
      if (held === null) {
        cooldown -= dt;
        if (cooldown <= 0) {
          held = next;
          next = randomTier();
          holdAnim = 0;
          updatePanel();
        }
      }
      holdAnim = Math.min(1, holdAnim + dt / 0.18);

      const top = overflowTop(world);
      warn = top < WARN_Y;
      if (top < 0) {
        danger += dt;
        if (danger >= DANGER_TIME) gameOver();
      } else {
        danger = Math.max(0, danger - dt * 2);
      }
    }
    if (state !== 'paused') updateEffects(dt);
    draw(now);
  }

  // ---------- Eingabe ----------

  function toWorldX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return VIEW_X + ((clientX - rect.left) / rect.width) * VIEW_W;
  }

  field.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.gp-overlay')) return;
    sound.unlock();
    if (state !== 'playing') return;
    pointerDown = true;
    aimX = toWorldX(e.clientX);
    field.setPointerCapture?.(e.pointerId);
  });
  field.addEventListener('pointermove', (e) => {
    if (state === 'playing' && (pointerDown || e.pointerType === 'mouse')) aimX = toWorldX(e.clientX);
  });
  field.addEventListener('pointerup', (e) => {
    if (!pointerDown) return;
    pointerDown = false;
    aimX = toWorldX(e.clientX);
    drop();
  });
  field.addEventListener('pointercancel', () => (pointerDown = false));

  function isTyping(t) {
    return t instanceof HTMLElement && (t.closest('input, textarea, select') || t.isContentEditable);
  }

  function onKeyDown(e) {
    if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA') keys.left = true;
    else if (code === 'ArrowRight' || code === 'KeyD') keys.right = true;
    else if (code === 'Space' || code === 'ArrowDown' || code === 'KeyS' || code === 'Enter') {
      if (!e.repeat) {
        sound.unlock();
        if (state === 'playing') drop();
        else if (overlayAction && code !== 'ArrowDown' && code !== 'KeyS') overlayAction();
      }
    } else if (code === 'KeyP' || code === 'Escape') {
      if (!e.repeat && state !== 'over') togglePause();
    } else return;
    e.preventDefault();
  }
  function onKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  }
  function onVisibility() {
    if (document.hidden && state === 'playing') togglePause();
  }

  // Knöpfe nach dem Klick entfokussieren, sonst löst die Leertaste sie erneut aus
  const button = (el, fn) =>
    el.addEventListener('click', () => {
      sound.unlock();
      fn();
      el.blur();
    });
  button(actionBtn, () => overlayAction?.());
  button($('[data-new]'), newGame);
  button(pauseBtn, () => state !== 'over' && togglePause());
  button(soundBtn, () => {
    muted = !muted;
    sound.setMuted(muted);
    store.muted = muted;
    saveStore(store);
    soundBtn.textContent = muted ? 'Ton an' : 'Ton aus';
  });
  soundBtn.textContent = muted ? 'Ton an' : 'Ton aus';

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('visibilitychange', onVisibility);

  // Canvas-Auflösungen an die angezeigte Größe anpassen
  const resize = new ResizeObserver(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const cv of [canvas, nextCanvas, cycleCanvas]) {
      cv.width = Math.max(1, Math.round(cv.clientWidth * dpr));
      cv.height = Math.max(1, Math.round(cv.clientHeight * dpr));
    }
    pxPerUnit = canvas.width / VIEW_W;
    sprites.clear();
    renderBackdrop();
    shownMax = -1;
    updatePanel();
  });
  resize.observe(canvas);
  resize.observe(nextCanvas);

  // Gespeicherte Runde fortsetzen oder neu beginnen
  if (store.game?.bodies) {
    restore(store.game);
    updatePanel();
  } else {
    newGame();
  }
  raf = requestAnimationFrame(frame);

  return () => {
    if (state !== 'over' && world) api.submitScore(world.score);
    persist();
    cancelAnimationFrame(raf);
    resize.disconnect();
    sound.close();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
