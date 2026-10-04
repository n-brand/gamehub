// Würfelsprung – Rhythmus-Runner nach dem Geometry-Dash-Prinzip: Der Würfel läuft von selbst, du springst
// über Stacheln, Blöcke und Gruben. Drei feste Level (bei jedem Versuch gleich) mit Fortschritt in %.
// mount(container, api) gibt eine Cleanup-Funktion zurück. buildLevel/newRun/stepRun sind reine
// Simulationsfunktionen ohne DOM – damit wird geprüft, dass jedes Level schaffbar ist.

import { cubeTheme, cubeSkin, drawCube } from '../js/designs.js';

const W = 1280; // logische Canvas-Größe (16:9), wird auf die angezeigte Größe skaliert
const H = 720;
const B = 64; // Pixel pro Block
const GROUND_Y = H - 2.2 * B; // Bildschirm-y der Bodenoberkante
const PLAYER_X = 4.5 * B; // feste Bildschirm-x-Position des Würfels

const BASE_SPEED = 10.4; // Blöcke pro Sekunde (bei Tempo 1)
const GRAVITY = 107; // Blöcke/s²
const JUMP_V = 21.4; // Sprung: ca. 2,1 Blöcke hoch
const PAD_V = 27.5; // Sprungplatte: ca. 3,5 Blöcke hoch
const RING_V = 20.5; // Sprungring in der Luft
export const STEP = 1 / 240; // Physik-Schritt
const BUFFER = 0.1; // s, so früh darf vor der Landung gedrückt werden
const SPIN = 450; // Grad pro Sekunde im Sprung
const RESPAWN_MS = 900; // Pause nach einem Absturz bis zum nächsten Versuch
const STORE_KEY = 'gamehub-cubejump';

// ---------- Hindernis-Muster (x in Blöcken ab Musterbeginn, y = Höhe über dem Boden) ----------

const spike = (x, y = 0) => ({ type: 'spike', x, y });
const block = (x, y, w, h) => ({ type: 'block', x, y, w, h });
const pad = (x) => ({ type: 'pad', x, y: 0 });
const ring = (x, y) => ({ type: 'ring', x, y });
const spikes = (from, count) => Array.from({ length: count }, (_, i) => spike(from + i));

// Jedes Muster: [Hindernisse, Länge in Blöcken]
const PATTERNS = {
  s1: () => [[spike(0)], 1],
  s2: () => [spikes(0, 2), 2],
  s3: () => [spikes(0, 3), 3],
  step: () => [[block(0, 0, 2, 1), block(4, 0, 2, 2)], 6],
  blockSpike: () => [[block(0, 0, 1, 1), spike(3)], 4],
  pad: () => [[pad(0), ...spikes(2, 3)], 5],
  plat: () => [[block(0, 1, 5, 0.5), ...spikes(1, 4)], 5],
  ring: () => [[...spikes(0, 6), ring(2.5, 2)], 6],
  pit: () => [[block(0, 0, 1, 1), spike(1), spike(2), block(3, 0, 1, 1)], 4],
  stairs: () => [[block(0, 0, 2, 1), spike(2), block(4, 0, 2, 2), spike(6), spike(7)], 8],
  tower: () => [[block(0, 0, 1, 1), spike(0, 1)], 1],
  padClimb: () => [[pad(0), spike(2), spike(3), block(5, 0, 2, 2), spike(7), spike(8)], 9],
  doubleRing: () => [[...spikes(0, 10), ring(2.5, 2), ring(7, 2)], 10],
};

// Level: Tempo, Musiktempo, Farbstimmung und Strecke als [Muster, freier Anlauf davor]
export const LEVELS = [
  {
    id: 'easy',
    name: 'Leicht',
    speed: 1,
    bpm: 120,
    sky: ['#7048e8', '#f06595', '#5f3dc4'],
    track: [
      ['s1', 16], ['s1', 8], ['s2', 8], ['s1', 7], ['step', 8], ['s2', 8], ['blockSpike', 8], ['s1', 6], ['s1', 5], ['pad', 8],
      ['s2', 8], ['step', 8], ['s1', 7], ['s2', 6], ['blockSpike', 8], ['pad', 8], ['s1', 7], ['s2', 7], ['step', 8], ['s1', 6],
      ['s2', 7], ['pad', 8], ['s1', 6], ['s1', 5], ['s2', 7], ['blockSpike', 8], ['step', 8], ['s2', 7], ['pad', 8], ['s2', 7],
    ],
  },
  {
    id: 'medium',
    name: 'Mittel',
    speed: 1.15,
    bpm: 128,
    sky: ['#1c7ed6', '#22b8cf', '#1864ab'],
    track: [
      ['s1', 16], ['s2', 8], ['plat', 8], ['s2', 7], ['ring', 8], ['step', 8], ['pit', 8], ['s2', 6], ['pad', 8], ['plat', 8],
      ['s1', 6], ['s2', 6], ['ring', 8], ['stairs', 8], ['s2', 7], ['pit', 8], ['blockSpike', 7], ['ring', 8], ['plat', 8], ['s2', 6],
      ['step', 8], ['pad', 8], ['s1', 5], ['s2', 6], ['pit', 8], ['ring', 8], ['s2', 7], ['plat', 8], ['stairs', 8], ['s2', 7],
    ],
  },
  {
    id: 'hard',
    name: 'Schwer',
    speed: 1.3,
    bpm: 140,
    sky: ['#c2255c', '#ff8787', '#a61e4d'],
    track: [
      ['s2', 16], ['s3', 9], ['tower', 8], ['ring', 8], ['s3', 8], ['padClimb', 8], ['pit', 8], ['doubleRing', 8], ['s2', 6], ['tower', 7],
      ['stairs', 8], ['s3', 8], ['plat', 8], ['ring', 7], ['s3', 8], ['padClimb', 8], ['tower', 7], ['s2', 6], ['doubleRing', 8], ['pit', 8],
      ['s3', 8], ['stairs', 8], ['tower', 7], ['ring', 8], ['s3', 8], ['plat', 8], ['padClimb', 8], ['s3', 8], ['doubleRing', 8], ['s3', 8],
    ],
  },
];

// Strecke aus den Mustern zusammensetzen; die Ziellinie liegt 12 Blöcke nach dem letzten Hindernis
export function buildLevel(def) {
  const obstacles = [];
  let x = 0;
  for (const [name, gap] of def.track) {
    x += gap;
    const [items, length] = PATTERNS[name]();
    obstacles.push(...items.map((o) => ({ ...o, x: o.x + x })));
    x += length;
  }
  obstacles.sort((a, b) => a.x - b.x);
  return { ...def, obstacles, length: x + 12 };
}

// ---------- Simulation (ohne DOM) ----------

export function newRun(level) {
  return { px: 0, py: 0, vy: 0, grounded: true, angle: 0, buffer: 0, first: 0, dead: false, finished: false, used: new Uint8Array(level.obstacles.length), events: [] };
}

const overlaps = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

// Einen Physik-Schritt rechnen. held = Taste gedrückt, pressed = in diesem Schritt neu gedrückt.
export function stepRun(s, level, dt, held, pressed) {
  if (s.dead || s.finished) return;
  const obs = level.obstacles;
  const prevY = s.py;
  s.px += BASE_SPEED * level.speed * dt;
  if (pressed) s.buffer = BUFFER;
  else if (s.buffer > 0) s.buffer -= dt;

  if (s.grounded && (held || s.buffer > 0)) {
    s.vy = JUMP_V;
    s.grounded = false;
    s.buffer = 0;
  }
  if (!s.grounded) {
    s.vy -= GRAVITY * dt;
    s.py += s.vy * dt;
    s.angle += SPIN * dt;
  }
  if (s.py <= 0) {
    s.py = 0;
    s.vy = 0;
    s.grounded = true;
  }

  while (s.first < obs.length && obs[s.first].x + (obs[s.first].w || 1) < s.px - 2) s.first++;
  let supported = s.py === 0;
  for (let i = s.first; i < obs.length; i++) {
    const o = obs[i];
    if (o.x > s.px + 2) break;
    if (o.type === 'block') {
      const top = o.y + o.h;
      const horizontal = s.px + 1 > o.x + 0.02 && s.px < o.x + o.w - 0.02;
      if (horizontal && s.vy <= 0 && prevY >= top - 0.08 && s.py <= top) {
        // Von oben gelandet
        s.py = top;
        s.vy = 0;
        s.grounded = true;
        supported = true;
      } else if (horizontal && s.grounded && Math.abs(s.py - top) < 0.001) {
        supported = true;
      } else if (overlaps(s.px + 0.05, s.py + 0.05, 0.9, 0.9, o.x, o.y, o.w, o.h)) {
        s.dead = true; // gegen Seite oder Unterseite
        s.events.push({ type: 'death' });
        return;
      }
    } else if (o.type === 'spike') {
      // Kleine Trefferzonen wie im Original: Stachel nur in der Mitte, Würfel etwas kleiner
      if (overlaps(s.px + 0.18, s.py + 0.12, 0.64, 0.7, o.x + 0.38, o.y, 0.24, 0.55)) {
        s.dead = true;
        s.events.push({ type: 'death' });
        return;
      }
    } else if (o.type === 'pad') {
      if (!s.used[i] && overlaps(s.px, s.py, 1, 1, o.x + 0.1, 0, 0.8, 0.3)) {
        s.used[i] = 1;
        s.vy = PAD_V;
        s.grounded = false;
        s.events.push({ type: 'pad', x: o.x + 0.5, y: 0.2 });
      }
    } else if (o.type === 'ring') {
      const dx = s.px + 0.5 - o.x;
      const dy = s.py + 0.5 - o.y;
      if (!s.used[i] && dx * dx + dy * dy < 0.85 * 0.85 && s.buffer > 0) {
        s.used[i] = 1;
        s.vy = RING_V;
        s.grounded = false;
        s.buffer = 0;
        s.events.push({ type: 'ring', x: o.x, y: o.y });
      }
    }
  }
  if (s.grounded && !supported) s.grounded = false; // über eine Kante gelaufen
  if (s.grounded) {
    const target = Math.round(s.angle / 90) * 90; // auf die nächste Vierteldrehung einrasten
    s.angle += (target - s.angle) * Math.min(1, dt * 30);
  }
  if (s.px >= level.length) {
    s.finished = true;
    s.events.push({ type: 'finish' });
  }
}

// ---------- Musik (Web Audio, alles synthetisch erzeugt) ----------

function createMusic() {
  let ctx = null;
  let master = null;
  let timer = 0;
  let next = 0;
  let step = 0;
  let bpm = 120;
  let muted = false;
  let noise = null;
  const kicks = []; // geplante Schläge – für das Pulsieren im Takt
  const BASS = [45, 45, 48, 48, 41, 41, 43, 43]; // A, C, F, G (MIDI), je halber Takt
  const CHORDS = [[57, 60, 64], [60, 64, 67], [53, 57, 60], [55, 59, 62]];
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);

  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.3;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  function env(node, t, peak, decay) {
    node.gain.setValueAtTime(peak, t);
    node.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  }

  function kick(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, t, 0.9, 0.16);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.2);
    kicks.push(t);
    if (kicks.length > 8) kicks.shift();
  }

  function noiseHit(t, type, freq, peak, decay) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    env(g, t, peak, decay);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + decay + 0.02);
  }

  function tone(t, freq, type, peak, decay, cutoff) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    env(g, t, peak, decay);
    let out = o;
    if (cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      o.connect(f);
      out = f;
    }
    out.connect(g).connect(master);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  // Ein Sechzehntel: Bassdrum auf jedem Schlag, Hi-Hat dazwischen, Snare auf 2 und 4, Bass in Achteln, leises Arpeggio
  function play(i, t) {
    const s = i % 16;
    const bar = Math.floor(i / 16) % 4;
    if (s % 4 === 0) kick(t);
    if (s % 4 === 2) noiseHit(t, 'highpass', 7000, 0.18, 0.05);
    if (s === 4 || s === 12) noiseHit(t, 'bandpass', 1800, 0.35, 0.13);
    if (s % 2 === 0) tone(t, hz(BASS[bar * 2 + (s >= 8 ? 1 : 0)] - 12), 'sawtooth', 0.22, 0.16, 700);
    tone(t, hz(CHORDS[bar][s % 3] + 12), 'square', 0.035, 0.09);
  }

  function schedule() {
    const sixteenth = 60 / bpm / 4;
    while (next < ctx.currentTime + 0.12) {
      play(step, next);
      next += sixteenth;
      step = (step + 1) % 64;
    }
  }

  return {
    start(tempo) {
      ensure();
      ctx.resume();
      bpm = tempo;
      clearInterval(timer);
      kicks.length = 0;
      step = 0;
      next = ctx.currentTime + 0.06;
      timer = setInterval(schedule, 25);
    },
    stop() {
      clearInterval(timer);
      timer = 0;
    },
    pause() {
      clearInterval(timer);
      timer = 0;
      ctx?.suspend();
    },
    resume() {
      if (!ctx) return;
      ctx.resume();
      next = ctx.currentTime + 0.06;
      timer = setInterval(schedule, 25);
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.setValueAtTime(m ? 0 : 0.3, ctx.currentTime);
    },
    // 1 direkt auf dem Schlag, klingt schnell ab
    pulse() {
      if (!ctx || !timer) return 0;
      const now = ctx.currentTime;
      let last = -1;
      for (const k of kicks) if (k <= now) last = k;
      return last < 0 ? 0 : Math.exp(-(now - last) * 9);
    },
    boom() {
      if (!ctx) return;
      const t = ctx.currentTime;
      noiseHit(t, 'lowpass', 900, 0.8, 0.5);
      tone(t, 90, 'sine', 0.6, 0.35);
    },
    blip() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(500, t);
      o.frequency.exponentialRampToValueAtTime(1300, t + 0.12);
      env(g, t, 0.18, 0.15);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.2);
    },
    fanfare() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [72, 76, 79, 84].forEach((m, i) => tone(t + i * 0.12, hz(m), 'square', 0.12, 0.3));
    },
    close() {
      clearInterval(timer);
      ctx?.close();
    },
  };
}

// ---------- Spiel ----------

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStore(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // Speicher nicht verfügbar
  }
}

// Bestwerte je Level für die Level-Galerie im Spielmenü
export function levelStats() {
  const best = loadStore().best || {};
  return Object.fromEntries(LEVELS.map((l) => [l.id, best[l.id] ? `Bestwert ${best[l.id]} %` : '']));
}

export function mount(container, api = {}) {
  const store = loadStore();
  store.best = store.best || {};
  // Level kommt aus dem Spielmenü (api.level), sonst das zuletzt gespielte
  let levelIdx = Math.max(0, LEVELS.findIndex((l) => l.id === (api.level || store.level)));
  let muted = store.muted === true;
  const levels = LEVELS.map(buildLevel);

  container.innerHTML = `
    <div class="gp cj">
      <div class="gp-panel">
        <div class="gp-stats">
          <div class="gp-stat"><span>Fortschritt</span><b data-progress>0 %</b></div>
          <div class="gp-stat"><span>Bestwert</span><b data-best>0 %</b></div>
          <div class="gp-stat" style="grid-column: span 2"><span>Versuche</span><b data-tries>0</b></div>
        </div>
        <div class="gp-stat"><span>Level</span><b data-level-name></b></div>
        <button type="button" class="btn" data-pause>Pause</button>
        <button type="button" class="btn" data-mute></button>
        <p class="gp-hint"><kbd>Leertaste</kbd>, <kbd>↑</kbd> oder Klick = springen, gedrückt halten springt bei jeder Landung. Gelbe Ringe in der Luft anklicken, gelbe Platten katapultieren dich. <kbd>P</kbd> pausiert.</p>
      </div>
      <div class="cj-field" data-field>
        <canvas></canvas>
        <div class="gp-overlay" data-overlay hidden>
          <p data-msg></p>
          <small data-sub></small>
          <div class="gp-overlay-actions" data-actions></div>
        </div>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const field = $('[data-field]');
  const canvas = field.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const overlay = $('[data-overlay]');
  const pauseBtn = $('[data-pause]');
  const muteBtn = $('[data-mute]');
  const music = createMusic();
  music.setMuted(muted);

  let level = levels[levelIdx];
  let run = newRun(level);
  let state = 'ready'; // ready | playing | paused | dead | finished
  let held = false;
  let pressed = false;
  let tries = 0;
  let runStartedAt = 0; // Beginn des aktuellen Versuchs
  let particles = [];
  let shake = 0;
  let flash = 0;
  let respawnTimer = 0;
  let theme = cubeTheme(api.getDesign?.('cubejump-theme'));
  let skin = cubeSkin(api.getDesign?.('cubejump-skin'));

  const percent = () => Math.min(100, Math.floor((run.px / level.length) * 100));
  const best = () => store.best[level.id] || 0;

  // ---------- Ablauf ----------

  function startAttempt() {
    clearTimeout(respawnTimer);
    run = newRun(level);
    particles = particles.filter((p) => p.keep);
    tries++;
    runStartedAt = Date.now();
    state = 'playing';
    hideOverlay();
    music.start(level.bpm);
    renderStats();
  }

  function selectLevel(i) {
    clearTimeout(respawnTimer);
    levelIdx = i;
    level = levels[i];
    store.level = level.id;
    saveStore(store);
    run = newRun(level);
    tries = 0;
    state = 'ready';
    music.stop();
    showOverlay(level.name, best() ? `Bestwert ${best()} %` : 'Klick oder Leertaste zum Starten', [['Start', startAttempt, true]]);
    renderStats();
  }

  function saveBest() {
    const p = percent();
    if (p > best()) {
      store.best[level.id] = p;
      saveStore(store);
    }
  }

  function crash() {
    state = 'dead';
    music.stop();
    music.boom();
    shake = 1;
    flash = 0.8;
    const cx = PLAYER_X + B / 2;
    const cy = GROUND_Y - (run.py + 0.5) * B;
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 150 + Math.random() * 420;
      particles.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, life: 1, max: 1, size: 8 + Math.random() * 12, color: i % 2 ? skin.body : skin.shade, spin: Math.random() * 10 });
    }
    saveBest();
    renderStats();
    // Wie im Original: kurz durchatmen, dann sofort der nächste Versuch
    respawnTimer = setTimeout(() => state === 'dead' && startAttempt(), RESPAWN_MS);
  }

  function finish() {
    state = 'finished';
    music.stop();
    music.fanfare();
    saveBest();
    for (let i = 0; i < 90; i++) {
      particles.push({ x: Math.random() * W, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 120, vy: 100 + Math.random() * 200, life: 2.5, max: 2.5, size: 8 + Math.random() * 8, color: ['#ffd43b', '#74c0fc', '#ff8787', '#8ce99a', '#b197fc'][i % 5], spin: Math.random() * 8, keep: false });
    }
    api.reportResult?.({ result: 'win', difficulty: level.id, durationMs: Date.now() - runStartedAt, extra: { attempts: tries } });
    renderStats();
    const next = levels[levelIdx + 1];
    const actions = [['Nochmal', () => { tries = 0; startAttempt(); }, !next]];
    if (next) actions.push([`Weiter: ${next.name}`, () => selectLevel(levelIdx + 1), true]);
    setTimeout(() => showOverlay('Level geschafft!', `${level.name} in ${tries} ${tries === 1 ? 'Versuch' : 'Versuchen'}`, actions), 700);
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      music.pause();
      showOverlay('Pause', `${percent()} % geschafft`, [['Weiter', togglePause, true]]);
    } else if (state === 'paused') {
      state = 'playing';
      hideOverlay();
      music.resume();
    }
    renderStats();
  }

  function showOverlay(msg, sub, actions) {
    $('[data-msg]').textContent = msg;
    $('[data-sub]').textContent = sub;
    const box = $('[data-actions]');
    box.innerHTML = '';
    for (const [label, fn, primary] of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `btn ${primary ? 'btn--primary' : ''}`;
      b.textContent = label;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        fn();
      });
      box.append(b);
    }
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function renderStats() {
    $('[data-progress]').textContent = `${percent()} %`;
    $('[data-best]').textContent = `${best()} %`;
    $('[data-tries]').textContent = tries;
    $('[data-level-name]').textContent = level.name;
    pauseBtn.textContent = state === 'paused' ? 'Weiter' : 'Pause';
    pauseBtn.disabled = state !== 'playing' && state !== 'paused';
    muteBtn.textContent = muted ? 'Ton an' : 'Ton aus';
  }

  // ---------- Zeichnen ----------

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const screenX = (wx) => PLAYER_X + (wx - run.px) * B;

  function drawBackground(pulse, time) {
    const [top, bottom, groundColor] = theme.sky ? [...theme.sky, theme.ground] : level.sky;
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // Große, langsam mitziehende Quadrate (Tiefe)
    ctx.save();
    ctx.globalAlpha = 0.1 + pulse * 0.05;
    ctx.fillStyle = theme.shapes;
    for (let i = 0; i < 7; i++) {
      const size = 90 + (i % 3) * 50;
      const x = ((((i * 260 - run.px * B * 0.15) % (W + 300)) + W + 300) % (W + 300)) - 150;
      const y = 60 + ((i * 97) % 300);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((time / 4000 + i) % (Math.PI * 2));
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.restore();

    // Boden mit mitlaufenden Fugen und Kante, die im Takt aufleuchtet
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    const offset = (run.px * B) % B;
    for (let x = -offset; x < W; x += B) ctx.fillRect(x, GROUND_Y + 8, 3, H - GROUND_Y);
    const [lr, lg, lb] = hexToRgb(theme.line);
    ctx.fillStyle = `rgba(${lr}, ${lg}, ${lb}, ${0.7 + pulse * 0.3})`;
    ctx.fillRect(0, GROUND_Y - 2, W, 4 + pulse * 3);
  }

  function drawObstacles(pulse, time) {
    const shine = (a) => `rgba(${theme.shine}, ${a})`;
    for (let i = 0; i < level.obstacles.length; i++) {
      const o = level.obstacles[i];
      const x = screenX(o.x);
      if (x > W + B * 2) break;
      if (x < -B * 12) continue;
      const used = run.used[i];
      if (o.type === 'block') {
        const y = GROUND_Y - (o.y + o.h) * B;
        const w = o.w * B;
        const h = o.h * B;
        ctx.fillStyle = theme.obstacle;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 6);
        ctx.fill();
        ctx.strokeStyle = theme.outline || shine(0.35 + pulse * 0.4);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x + 5, y + 5, w - 10, h - 10, 4);
        ctx.stroke();
      } else if (o.type === 'spike') {
        const by = GROUND_Y - o.y * B;
        ctx.fillStyle = theme.obstacle;
        ctx.beginPath();
        ctx.moveTo(x + 2, by);
        ctx.lineTo(x + B / 2, by - B * 0.92);
        ctx.lineTo(x + B - 2, by);
        ctx.closePath();
        ctx.fill();
        if (theme.outline) {
          ctx.strokeStyle = theme.outline;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        ctx.fillStyle = shine(0.3 + pulse * 0.35);
        ctx.beginPath();
        ctx.moveTo(x + B * 0.3, by - 6);
        ctx.lineTo(x + B / 2, by - B * 0.62);
        ctx.lineTo(x + B * 0.7, by - 6);
        ctx.closePath();
        ctx.fill();
      } else if (o.type === 'pad') {
        ctx.fillStyle = used ? 'rgba(255, 212, 59, 0.5)' : '#ffd43b';
        ctx.beginPath();
        ctx.ellipse(x + B / 2, GROUND_Y, B * 0.42, B * 0.2, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(x + B * 0.3, GROUND_Y - B * 0.12, B * 0.4, 3);
      } else if (o.type === 'ring') {
        const cy = GROUND_Y - o.y * B;
        const r = B * 0.42 * (1 + 0.08 * Math.sin(time / 120));
        ctx.lineWidth = 7;
        ctx.strokeStyle = used ? 'rgba(255, 212, 59, 0.35)' : '#ffd43b';
        ctx.beginPath();
        ctx.arc(x, cy, r, 0, Math.PI * 2);
        if (!used) {
          ctx.fillStyle = 'rgba(255, 212, 59, 0.25)';
          ctx.fill();
        }
        ctx.stroke();
      }
    }
    // Ziellinie
    const fx = screenX(level.length);
    if (fx < W + B) {
      for (let y = 0; y < GROUND_Y; y += 32) {
        ctx.fillStyle = (y / 32) % 2 ? '#ffffff' : '#183153';
        ctx.fillRect(fx, y, 16, 32);
        ctx.fillStyle = (y / 32) % 2 ? '#183153' : '#ffffff';
        ctx.fillRect(fx + 16, y, 16, 32);
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.spin || 0) * (1 - p.life / p.max));
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    // Fortschrittsbalken oben wie im Original
    const bw = W * 0.5;
    const bx = (W - bw) / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.roundRect(bx, 22, bw, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#8ce99a';
    ctx.beginPath();
    ctx.roundRect(bx, 22, Math.max(16, bw * (run.px / level.length)), 16, 8);
    ctx.fill();
    ctx.font = '900 22px "Nunito", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${percent()} %`, bx + bw + 14, 38);
    ctx.textAlign = 'right';
    ctx.fillText(`Versuch ${Math.max(1, tries)}`, bx - 14, 38);
  }

  function draw(time) {
    const scale = canvas.width / W;
    const pulse = music.pulse();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 18 * shake, (Math.random() - 0.5) * 12 * shake);
    drawBackground(pulse, time);
    drawObstacles(pulse, time);
    if (state !== 'dead') drawCube(ctx, PLAYER_X + B / 2, GROUND_Y - (run.py + 0.5) * B, B, run.angle, skin, time);
    drawParticles();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
    drawHud();
  }

  // ---------- Schleife ----------

  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let trailTick = 0;
  let statsTick = 0;

  function burst(wx, wy, color) {
    const sx = screenX(wx);
    const sy = GROUND_Y - wy * B;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 80 + Math.random() * 200;
      particles.push({ x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, max: 0.5, size: 6, color });
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    theme = cubeTheme(api.getDesign?.('cubejump-theme'));
    skin = cubeSkin(api.getDesign?.('cubejump-skin'));
    if (state === 'playing') {
      acc += dt;
      while (acc >= STEP && state === 'playing') {
        stepRun(run, level, STEP, held, pressed);
        pressed = false;
        acc -= STEP;
        for (const e of run.events) {
          if (e.type === 'pad' || e.type === 'ring') {
            music.blip();
            burst(e.x, e.y, '#ffd43b');
          } else if (e.type === 'death') {
            crash();
          } else if (e.type === 'finish') {
            finish();
          }
        }
        run.events.length = 0;
      }
      trailTick += dt;
      if (run.grounded && trailTick > 0.03) {
        trailTick = 0;
        particles.push({ x: PLAYER_X + 4, y: GROUND_Y - run.py * B - 4, vx: -120 - Math.random() * 80, vy: -40 - Math.random() * 60, life: 0.35, max: 0.35, size: 5 + Math.random() * 4, color: skin.trail });
      }
      statsTick += dt;
      if (statsTick > 0.1) {
        statsTick = 0;
        $('[data-progress]').textContent = `${percent()} %`;
      }
    } else {
      acc = 0;
    }
    if (state !== 'paused') {
      for (const p of particles) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 700 * dt;
      }
      particles = particles.filter((p) => p.life > 0);
      shake = Math.max(0, shake - dt * 2.5);
      flash = Math.max(0, flash - dt * 3);
    }
    draw(now);
  }

  // ---------- Eingabe ----------

  function press() {
    if (state === 'ready' || state === 'finished') {
      if (state === 'finished' && overlay.hidden) return;
      if (state === 'finished') tries = 0;
      startAttempt();
      return;
    }
    if (state === 'paused') {
      togglePause();
      return;
    }
    if (state !== 'playing') return;
    held = true;
    pressed = true;
  }

  function release() {
    held = false;
  }

  function isTyping(t) {
    return t instanceof HTMLElement && (t.closest('input, textarea, select') || t.isContentEditable);
  }

  function onKeyDown(e) {
    if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      togglePause();
      return;
    }
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (e.repeat) return;
      press();
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') release();
  }

  function onVisibility() {
    if (document.hidden && state === 'playing') togglePause();
  }

  field.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.gp-overlay button')) return;
    e.preventDefault();
    press();
  });
  field.addEventListener('pointerup', release);
  field.addEventListener('pointercancel', release);
  field.addEventListener('pointerleave', release);
  pauseBtn.addEventListener('click', togglePause);
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    music.setMuted(muted);
    store.muted = muted;
    saveStore(store);
    renderStats();
  });
  // Nach Klick auf einen Button den Fokus lösen, damit die Leertaste wieder springt
  container.addEventListener('click', (e) => e.target.closest('button')?.blur());

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('visibilitychange', onVisibility);

  const resize = new ResizeObserver(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  });
  resize.observe(canvas);

  selectLevel(levelIdx);
  raf = requestAnimationFrame(frame);

  return () => {
    if (state === 'playing' || state === 'paused') saveBest();
    clearTimeout(respawnTimer);
    cancelAnimationFrame(raf);
    resize.disconnect();
    music.close();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
