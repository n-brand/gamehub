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

// ---------- Würfelsprung-Themes ----------
// sky = Himmel oben/unten (null = Farben des Levels), ground/line = Boden und Bodenkante,
// obstacle/outline/shine = Hindernisse (shine als "r, g, b" für Glanz im Takt), shapes = Hintergrundformen,
// cube = [Körper, Kante unten, Innenfläche, Gesicht], glow = Leuchten, sparkle = Funkeln

export const CUBE_THEMES = {
  'cubejump-classic': {
    sky: null, ground: null, line: '#ffffff', obstacle: '#1b1e3b', shine: '255, 255, 255', shapes: '#ffffff',
    cube: ['#ffd43b', '#f08c00', '#ffe066', '#183153'], trail: 'rgba(255, 255, 255, 0.8)',
  },
  'cubejump-sunset': {
    sky: ['#5f3dc4', '#ff922b'], ground: '#862e9c', line: '#ffd8a8', obstacle: '#3b1f5a', shine: '255, 216, 168', shapes: '#ffd8a8',
    cube: ['#ff922b', '#d9480f', '#ffc078', '#3b1f5a'], trail: 'rgba(255, 216, 168, 0.85)',
  },
  'cubejump-ice': {
    sky: ['#4dabf7', '#e7f5ff'], ground: '#1c7ed6', line: '#ffffff', obstacle: '#1864ab', shine: '231, 245, 255', shapes: '#ffffff',
    cube: ['#f8f9fa', '#74c0fc', '#ffffff', '#1864ab'], trail: 'rgba(255, 255, 255, 0.9)',
  },
  'cubejump-neon': {
    sky: ['#0b0d1f', '#1a1240'], ground: '#0b0d1f', line: '#22d3ee', obstacle: '#0b0d1f', outline: '#f72585', shine: '247, 37, 133', shapes: '#22d3ee',
    cube: ['#22d3ee', '#0e7490', '#a5f3fc', '#0b0d1f'], trail: 'rgba(34, 211, 238, 0.9)', glow: '#22d3ee',
  },
  'cubejump-lava': {
    sky: ['#2b0505', '#7a1010'], ground: '#e8590c', line: '#ffd43b', obstacle: '#1a0303', shine: '255, 146, 43', shapes: '#ff922b',
    cube: ['#fa5252', '#a61e1e', '#ff8787', '#1a0303'], trail: 'rgba(255, 146, 43, 0.9)', glow: '#ff922b',
  },
  'cubejump-gold': {
    sky: ['#0d0d0d', '#2b2b2b'], ground: '#161616', line: '#fcc419', obstacle: '#000000', outline: '#fcc419', shine: '252, 196, 25', shapes: '#fcc419',
    cube: ['#fcc419', '#b07d00', '#ffe066', '#111111'], trail: 'rgba(252, 196, 25, 0.9)', sparkle: true,
  },
};

export function cubeTheme(id) {
  return CUBE_THEMES[id] || CUBE_THEMES['cubejump-classic'];
}

// Würfel mit Mittelpunkt (cx, cy), Kantenlänge size, Drehung in Grad
export function drawCube(ctx, cx, cy, size, angle, theme, t = 0) {
  const [body, shade, inner, face] = theme.cube;
  const s = size;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angle * Math.PI) / 180);
  if (theme.glow) {
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = s * 0.45;
  }
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.16);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s * 0.89, s * 0.16);
  ctx.fill();
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.roundRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.52, s * 0.09);
  ctx.fill();
  ctx.fillStyle = face;
  ctx.fillRect(-s * 0.2, -s * 0.15, s * 0.12, s * 0.14);
  ctx.fillRect(s * 0.08, -s * 0.15, s * 0.12, s * 0.14);
  ctx.fillRect(-s * 0.16, s * 0.08, s * 0.32, s * 0.07);
  if (theme.sparkle) {
    const phase = (t / 900) % 1;
    const glow = Math.sin(phase * Math.PI);
    const r = s * 0.22 * glow;
    const x = s * 0.28;
    const y = -s * 0.3;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * glow})`;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }
  ctx.restore();
}

// Shop-Vorschau: Himmel, Boden, Stacheln, Ring und springender Würfel
export function drawCubePreview(canvas, id, t = 0) {
  const ctx = canvas.getContext('2d');
  const theme = cubeTheme(id);
  const w = canvas.width;
  const h = canvas.height;
  const b = h / 5;
  const groundY = h - b * 1.1;
  const [top, bottom] = theme.sky || ['#7048e8', '#f06595'];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
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
  ctx.fillStyle = theme.ground || '#5f3dc4';
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = theme.line;
  ctx.fillRect(0, groundY - 2, w, 4);
  // Stacheln
  for (const x of [b * 3.2, b * 4.2]) {
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
  // Ring
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffd43b';
  ctx.beginPath();
  ctx.arc(b * 6.6, groundY - b * 2.3, b * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  // Spur und Würfel
  ctx.fillStyle = theme.trail;
  for (let i = 0; i < 4; i++) ctx.fillRect(b * 1.2 - i * b * 0.32, groundY - b * 1.75 + i * b * 0.18, b * 0.16, b * 0.16);
  drawCube(ctx, b * 2, groundY - b * 1.9, b, 25, theme, t);
}

// Vorschau passend zum Spiel des Artikels
export function drawPreview(canvas, id, t = 0) {
  if (id.startsWith('cubejump-')) drawCubePreview(canvas, id, t);
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
