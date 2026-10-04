// Aussehen der Shop-Designs. Preis und Besitz stehen in der Datenbank (shop_items);
// hier steht nur, wie ein Design aussieht – genutzt vom Spiel und von der Shop-Vorschau.
//
// Snake-Design: board = Schachbrett-Farben, hud = Leiste über dem Feld, apple = Apfelfarbe,
// body/edge(i, n, t) = Farbe von Segment i (0 = Kopf) bei n Segmenten zur Zeit t (ms),
// uniform = alle Segmente gleich (wird als ein Pfad gezeichnet), glow = Leuchtfarbe, sparkle = Funkeln.

const CLASSIC_BOARD = ['#aad751', '#a2d149'];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// Verlauf über mehrere Farben vom Kopf (t = 0) zum Schwanz (t = 1)
function gradient(stops) {
  return (i, n) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const pos = t * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(pos));
    return mixHex(stops[k], stops[k + 1], pos - k);
  };
}

export const SNAKE_DESIGNS = {
  'snake-classic': {
    board: CLASSIC_BOARD,
    hud: '#4a752c',
    apple: '#e7471d',
    uniform: true,
    body: () => '#4875ea',
    edge: () => '#3a62cc',
  },
  'snake-fire': {
    board: CLASSIC_BOARD,
    hud: '#4a752c',
    apple: '#e7471d',
    body: gradient(['#e03131', '#f76707', '#ffd43b']),
    edge: gradient(['#a51111', '#c2410c', '#e0a800']),
  },
  'snake-zebra': {
    board: CLASSIC_BOARD,
    hud: '#4a752c',
    apple: '#e7471d',
    body: (i) => (i % 2 ? '#212529' : '#f8f9fa'),
    edge: () => '#343a40',
  },
  'snake-neon': {
    board: ['#1d2140', '#232849'],
    hud: '#141733',
    apple: '#ff5c9e',
    uniform: true,
    body: () => '#69f0ae',
    edge: () => '#1fbf75',
    glow: 'rgba(105, 240, 174, 0.85)',
  },
  'snake-rainbow': {
    board: CLASSIC_BOARD,
    hud: '#4a752c',
    apple: '#e7471d',
    body: (i, n, t) => `hsl(${(i * 26 + t / 9) % 360} 88% 60%)`,
    edge: (i, n, t) => `hsl(${(i * 26 + t / 9) % 360} 75% 42%)`,
  },
  'snake-gold': {
    board: CLASSIC_BOARD,
    hud: '#4a752c',
    apple: '#e7471d',
    body: (i, n, t) => `hsl(45 96% ${54 + 14 * Math.sin(i * 0.7 - t / 180)}%)`,
    edge: () => '#a77b00',
    sparkle: true,
  },
};

export function snakeDesign(id) {
  return SNAKE_DESIGNS[id] || SNAKE_DESIGNS['snake-classic'];
}

function strokePath(ctx, pts, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

function strokeSegment(ctx, a, b, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

// Kleine Glanzsterne, die an wechselnden Stellen des Körpers aufblitzen
function drawSparkles(ctx, pts, cell, t) {
  const n = pts.length - 1;
  if (n < 1) return;
  for (let k = 0; k < 3; k++) {
    const cycle = t / 700 + k / 3;
    const phase = cycle % 1;
    const rnd = Math.abs(Math.sin(Math.floor(cycle) * 12.9898 + k * 78.233) * 43758.5453) % 1;
    const seg = Math.min(n - 1, Math.floor(rnd * n));
    const x = (pts[seg].x + pts[seg + 1].x) / 2;
    const y = (pts[seg].y + pts[seg + 1].y) / 2;
    const glow = Math.sin(phase * Math.PI);
    const s = cell * 0.24 * glow;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * glow})`;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }
}

// Schlangenkörper durch die Punkte pts (pts[0] = Kopf) zeichnen
export function drawSnakeBody(ctx, pts, cell, design, t = 0) {
  if (pts.length < 2) return;
  const outer = cell * 0.78;
  const inner = cell * 0.66;
  ctx.save();
  ctx.translate(0, cell * 0.08);
  strokePath(ctx, pts, outer, 'rgba(0, 0, 0, 0.12)');
  ctx.restore();

  ctx.save();
  if (design.glow) {
    ctx.shadowColor = design.glow;
    ctx.shadowBlur = cell * 0.55;
  }
  if (design.uniform) {
    strokePath(ctx, pts, outer, design.edge(0, 1, t));
    strokePath(ctx, pts, inner, design.body(0, 1, t));
  } else {
    // Vom Schwanz zum Kopf zeichnen, damit der Kopf obenauf liegt
    const n = pts.length - 1;
    for (let i = n - 1; i >= 0; i--) strokeSegment(ctx, pts[i], pts[i + 1], outer, design.edge(i, n, t));
    for (let i = n - 1; i >= 0; i--) strokeSegment(ctx, pts[i], pts[i + 1], inner, design.body(i, n, t));
  }
  ctx.restore();
  if (design.sparkle) drawSparkles(ctx, pts, cell, t);
}

export function drawSnakeEyes(ctx, head, dir, cell) {
  const px = -dir.y;
  const py = dir.x;
  const r = cell * 0.17;
  for (const side of [-1, 1]) {
    const ex = head.x + dir.x * cell * 0.12 + px * side * cell * 0.2;
    const ey = head.y + dir.y * cell * 0.12 + py * side * cell * 0.2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath();
    ctx.arc(ex + dir.x * r * 0.4, ey + dir.y * r * 0.4, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawApple(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-r * 0.35, 0, r * 0.8, 0, Math.PI * 2);
  ctx.arc(r * 0.35, 0, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.5, -r * 0.3, r * 0.18, r * 0.28, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5d3a1a';
  ctx.lineWidth = Math.max(1.5, r * 0.18);
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

// ---------- Würfelsprung: Themes (Umgebung) und Skins (Würfel) ----------
// Theme: sky = Himmel oben/unten (null = eigene Farbe des Levels), ground/line = Boden und Bodenkante,
// obstacle/outline/shine = Hindernisse (shine als "r, g, b" für Glanz im Takt), shapes = Hintergrundformen.

export const CUBE_THEMES = {
  'cubejump-classic': { sky: null, ground: null, line: '#ffffff', obstacle: '#1b1e3b', shine: '255, 255, 255', shapes: '#ffffff' },
  'cubejump-sunset': { sky: ['#5f3dc4', '#ff922b'], ground: '#862e9c', line: '#ffd8a8', obstacle: '#3b1f5a', shine: '255, 216, 168', shapes: '#ffd8a8' },
  'cubejump-ice': { sky: ['#4dabf7', '#e7f5ff'], ground: '#1c7ed6', line: '#ffffff', obstacle: '#1864ab', shine: '231, 245, 255', shapes: '#ffffff' },
  'cubejump-neon': { sky: ['#0b0d1f', '#1a1240'], ground: '#0b0d1f', line: '#22d3ee', obstacle: '#0b0d1f', outline: '#f72585', shine: '247, 37, 133', shapes: '#22d3ee' },
  'cubejump-lava': { sky: ['#2b0505', '#7a1010'], ground: '#e8590c', line: '#ffd43b', obstacle: '#1a0303', shine: '255, 146, 43', shapes: '#ff922b' },
  'cubejump-gold': { sky: ['#0d0d0d', '#2b2b2b'], ground: '#161616', line: '#fcc419', obstacle: '#000000', outline: '#fcc419', shine: '252, 196, 25', shapes: '#fcc419' },
};

export function cubeTheme(id) {
  return CUBE_THEMES[id] || CUBE_THEMES['cubejump-classic'];
}

// Skin: body/shade/inner = Körper, Kante unten, Innenfläche; face = Gesichtsfarbe;
// eyes = square | angry | round | big | visor | slit; deco = Zusatz-Muster; glow = Leuchten; trail = Spurfarbe
export const CUBE_SKINS = {
  'cube-classic': { body: '#ffd43b', shade: '#f08c00', inner: '#ffe066', face: '#183153', eyes: 'square', trail: 'rgba(255, 255, 255, 0.8)' },
  'cube-fire': { body: '#fa5252', shade: '#a51111', inner: '#ff922b', face: '#3b0a0a', eyes: 'angry', deco: 'flames', trail: 'rgba(255, 146, 43, 0.9)' },
  'cube-ice': { body: '#d0ebff', shade: '#4dabf7', inner: '#e7f5ff', face: '#1864ab', eyes: 'round', deco: 'frost', trail: 'rgba(208, 235, 255, 0.9)' },
  'cube-slime': { body: '#69db7c', shade: '#2b8a3e', inner: '#8ce99a', face: '#0b3d1e', eyes: 'big', deco: 'drips', trail: 'rgba(105, 219, 124, 0.85)' },
  'cube-robot': { body: '#adb5bd', shade: '#495057', inner: '#ced4da', face: '#212529', eyes: 'visor', deco: 'bolts', visor: '#22d3ee', trail: 'rgba(34, 211, 238, 0.85)' },
  'cube-ninja': { body: '#343a40', shade: '#121416', inner: '#495057', face: '#f8f9fa', eyes: 'slit', deco: 'headband', noInner: true, trail: 'rgba(250, 82, 82, 0.8)' },
  'cube-diamond': { body: '#66d9e8', shade: '#1098ad', inner: '#c5f6fa', face: '#0b3d4a', eyes: 'square', deco: 'facets', glow: '#99e9f2', sparkle: true, trail: 'rgba(153, 233, 242, 0.9)' },
  'cube-crown': { body: '#9775fa', shade: '#5f3dc4', inner: '#b197fc', face: '#1a0b3d', eyes: 'square', deco: 'crown', trail: 'rgba(252, 196, 25, 0.9)' },
};

export function cubeSkin(id) {
  return CUBE_SKINS[id] || CUBE_SKINS['cube-classic'];
}

function roundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function sparkleAt(ctx, x, y, r, alpha) {
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// Würfel mit Mittelpunkt (cx, cy), Kantenlänge size, Drehung in Grad
export function drawCube(ctx, cx, cy, size, angle, skin, t = 0) {
  const s = size;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angle * Math.PI) / 180);
  if (skin.glow) {
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = s * 0.45;
  }
  roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.16, skin.shade);
  ctx.shadowBlur = 0;
  roundRect(ctx, -s / 2, -s / 2, s, s * 0.89, s * 0.16, skin.body);

  // Muster unter dem Gesicht
  if (skin.deco === 'flames') {
    ctx.fillStyle = '#ffd43b';
    for (const [x, h] of [[-0.3, 0.42], [0, 0.55], [0.3, 0.4]]) {
      ctx.beginPath();
      ctx.moveTo(s * (x - 0.13), s * 0.44);
      ctx.quadraticCurveTo(s * (x - 0.12), s * (0.44 - h * 0.6), s * x, s * (0.44 - h));
      ctx.quadraticCurveTo(s * (x + 0.12), s * (0.44 - h * 0.6), s * (x + 0.13), s * 0.44);
      ctx.fill();
    }
  } else if (skin.deco === 'frost') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (const [sx, sy] of [[-1, -1], [1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(sx * s * 0.5, sy * s * 0.5 - sy * s * 0.06);
      ctx.lineTo(sx * s * 0.5 - sx * s * 0.28, sy * s * 0.5 - sy * s * 0.06);
      ctx.lineTo(sx * s * 0.5, sy * s * 0.5 - sy * s * 0.34);
      ctx.fill();
    }
  } else if (skin.deco === 'facets') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(-s / 2, -s / 2);
    ctx.lineTo(0, -s * 0.1);
    ctx.lineTo(s / 2, -s / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 60, 80, 0.18)';
    ctx.beginPath();
    ctx.moveTo(-s / 2, s * 0.39);
    ctx.lineTo(0, -s * 0.1);
    ctx.lineTo(s / 2, s * 0.39);
    ctx.fill();
  }

  if (!skin.noInner) roundRect(ctx, -s * 0.3, -s * 0.3, s * 0.6, s * 0.52, s * 0.09, skin.inner);

  // Augen
  ctx.fillStyle = skin.face;
  if (skin.eyes === 'square' || skin.eyes === 'angry') {
    ctx.fillRect(-s * 0.2, -s * 0.15, s * 0.12, s * 0.14);
    ctx.fillRect(s * 0.08, -s * 0.15, s * 0.12, s * 0.14);
    if (skin.eyes === 'angry') {
      ctx.strokeStyle = skin.face;
      ctx.lineWidth = s * 0.06;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.24, -s * 0.27);
      ctx.lineTo(-s * 0.06, -s * 0.2);
      ctx.moveTo(s * 0.24, -s * 0.27);
      ctx.lineTo(s * 0.06, -s * 0.2);
      ctx.stroke();
    }
  } else if (skin.eyes === 'round') {
    for (const x of [-0.14, 0.14]) {
      ctx.fillStyle = skin.face;
      ctx.beginPath();
      ctx.arc(s * x, -s * 0.08, s * 0.075, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s * x - s * 0.025, -s * 0.105, s * 0.025, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skin.eyes === 'big') {
    for (const x of [-0.14, 0.14]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s * x, -s * 0.08, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skin.face;
      ctx.beginPath();
      ctx.arc(s * x + s * 0.03, -s * 0.06, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skin.eyes === 'visor') {
    ctx.fillStyle = skin.face;
    ctx.beginPath();
    ctx.roundRect(-s * 0.26, -s * 0.18, s * 0.52, s * 0.16, s * 0.08);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = skin.visor;
    ctx.shadowBlur = s * 0.25;
    ctx.fillStyle = skin.visor;
    const scan = Math.sin(t / 300) * s * 0.14;
    ctx.beginPath();
    ctx.roundRect(scan - s * 0.08, -s * 0.15, s * 0.16, s * 0.1, s * 0.05);
    ctx.fill();
    ctx.restore();
  } else if (skin.eyes === 'slit') {
    roundRect(ctx, -s * 0.5, -s * 0.24, s, s * 0.22, 0, '#e03131');
    ctx.fillStyle = skin.face;
    ctx.fillRect(-s * 0.22, -s * 0.15, s * 0.16, s * 0.05);
    ctx.fillRect(s * 0.06, -s * 0.15, s * 0.16, s * 0.05);
  }

  // Mund
  if (skin.eyes === 'visor') {
    ctx.fillStyle = skin.face;
    for (let i = 0; i < 4; i++) ctx.fillRect(-s * 0.15 + i * s * 0.09, s * 0.08, s * 0.05, s * 0.08);
  } else if (skin.eyes !== 'slit') {
    ctx.fillStyle = skin.face;
    ctx.fillRect(-s * 0.16, s * 0.08, s * 0.32, s * 0.07);
  }

  // Muster über dem Gesicht
  if (skin.deco === 'drips') {
    ctx.fillStyle = skin.shade;
    for (const [x, h] of [[-0.3, 0.12], [-0.05, 0.2], [0.25, 0.14]]) {
      ctx.beginPath();
      ctx.roundRect(s * (x - 0.05), s * 0.38, s * 0.1, s * h, s * 0.05);
      ctx.fill();
    }
  } else if (skin.deco === 'bolts') {
    ctx.fillStyle = '#868e96';
    for (const [x, y] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.3], [0.38, 0.3]]) {
      ctx.beginPath();
      ctx.arc(s * x, s * y, s * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skin.deco === 'headband') {
    // Bandenden flattern nach hinten
    ctx.fillStyle = '#c92a2a';
    const wave = Math.sin(t / 120) * s * 0.06;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.2);
    ctx.lineTo(-s * 0.8, -s * 0.3 + wave);
    ctx.lineTo(-s * 0.78, -s * 0.18 + wave);
    ctx.closePath();
    ctx.fill();
  } else if (skin.deco === 'crown') {
    ctx.fillStyle = '#fcc419';
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.5);
    ctx.lineTo(-s * 0.3, -s * 0.78);
    ctx.lineTo(-s * 0.15, -s * 0.62);
    ctx.lineTo(0, -s * 0.84);
    ctx.lineTo(s * 0.15, -s * 0.62);
    ctx.lineTo(s * 0.3, -s * 0.78);
    ctx.lineTo(s * 0.3, -s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fa5252';
    ctx.beginPath();
    ctx.arc(0, -s * 0.6, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  if (skin.sparkle) {
    const phase = (t / 900) % 1;
    const glow = Math.sin(phase * Math.PI);
    sparkleAt(ctx, s * 0.28, -s * 0.3, s * 0.22 * glow, 0.95 * glow);
  }
  ctx.restore();
}

// Kleine Szene für Shop und Menü: Himmel, Boden, Stacheln, Ring
function cubeScene(ctx, w, h, theme, sky) {
  const b = h / 5;
  const groundY = h - b * 1.1;
  const [top, bottom] = theme.sky || sky || ['#7048e8', '#f06595'];
  const g = ctx.createLinearGradient(0, 0, 0, groundY);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, groundY);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.shapes;
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(40 + i * 120, 40 + (i % 2) * 40);
    ctx.rotate(0.4 + i);
    ctx.fillRect(-26, -26, 52, 52);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.ground || (sky && sky[2]) || '#5f3dc4';
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = theme.line;
  ctx.fillRect(0, groundY - 2, w, 4);
  return { b, groundY };
}

function spikeAt(ctx, x, groundY, b, theme) {
  ctx.fillStyle = theme.obstacle;
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x + b / 2, groundY - b * 0.9);
  ctx.lineTo(x + b, groundY);
  ctx.closePath();
  ctx.fill();
  if (theme.outline) {
    ctx.strokeStyle = theme.outline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(${theme.shine}, 0.45)`;
  ctx.beginPath();
  ctx.moveTo(x + b * 0.3, groundY - 4);
  ctx.lineTo(x + b / 2, groundY - b * 0.6);
  ctx.lineTo(x + b * 0.7, groundY - 4);
  ctx.closePath();
  ctx.fill();
}

// Theme-Vorschau: ganze Szene mit dem klassischen Würfel
export function drawCubePreview(canvas, id, t = 0, skinId = 'cube-classic') {
  const ctx = canvas.getContext('2d');
  const theme = cubeTheme(id);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const { b, groundY } = cubeScene(ctx, canvas.width, canvas.height, theme);
  spikeAt(ctx, b * 3.2, groundY, b, theme);
  spikeAt(ctx, b * 4.2, groundY, b, theme);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffd43b';
  ctx.beginPath();
  ctx.arc(b * 6.6, groundY - b * 2.3, b * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  const skin = cubeSkin(skinId);
  ctx.fillStyle = skin.trail;
  for (let i = 0; i < 4; i++) ctx.fillRect(b * 1.2 - i * b * 0.32, groundY - b * 1.75 + i * b * 0.18, b * 0.16, b * 0.16);
  drawCube(ctx, b * 2, groundY - b * 1.9, b, 25, skin, t);
}

// Skin-Vorschau: großer Würfel, der leicht wippt
export function drawSkinPreview(canvas, id, t = 0) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const { b, groundY } = cubeScene(ctx, canvas.width, canvas.height, cubeTheme('cubejump-classic'), ['#343a73', '#5c3d99', '#2b1f5a']);
  const bob = Math.sin(t / 400) * b * 0.12;
  const skin = cubeSkin(id);
  drawCube(ctx, canvas.width / 2, groundY - b * 1.55 + bob, b * 2.3, Math.sin(t / 700) * 8, skin, t);
}

// Vorschau passend zum Artikel
export function drawPreview(canvas, id, t = 0) {
  if (id.startsWith('cube-')) drawSkinPreview(canvas, id, t);
  else if (id.startsWith('cubejump-')) drawCubePreview(canvas, id, t);
  else drawSnakePreview(canvas, id, t);
}

// Vorschau für den Shop: kleines Spielfeld mit einer S-förmigen Schlange
export function drawSnakePreview(canvas, id, t = 0) {
  const ctx = canvas.getContext('2d');
  const design = snakeDesign(id);
  const cols = 8;
  const rows = 5;
  const cell = canvas.width / cols;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      ctx.fillStyle = (x + y) % 2 ? design.board[1] : design.board[0];
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  const c = (x, y) => ({ x: (x + 0.5) * cell, y: (y + 0.5) * cell });
  const pts = [c(5.6, 1), c(4, 1), c(3, 1), c(2, 1), c(2, 2), c(2, 3), c(3, 3), c(4, 3), c(5, 3)].map((p) => ({ ...p }));
  // Kopf rechts oben, Körper als S-Kurve
  drawApple(ctx, (7 + 0.5) * cell, (1 + 0.55) * cell, cell * 0.34, design.apple);
  drawSnakeBody(ctx, pts, cell, design, t);
  drawSnakeEyes(ctx, pts[0], { x: 1, y: 0 }, cell);
}
