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
