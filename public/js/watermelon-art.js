// Aussehen von Watermelon Drop: 11 Stufen pro Motiv-Set (Früchte, Bälle, Planeten) und die Shop-Designs.
// drawObject() zeichnet eine Stufe mit Mittelpunkt (0, 0) und Radius r – Drehen/Verschieben macht der Aufrufer.
// Alles flach: Grundfläche, dunklere Schattensichel, heller Glanzpunkt, keine Verläufe, keine Umrisse.

export const TIER_COUNT = 11;

// Shop-Designs (Slot "watermelon"): Hintergrund, Kiste und welches Motiv-Set fällt
const DESIGNS = {
  'watermelon-classic': {
    set: 'fruits',
    bg: '#fff4e6', dots: '#ffe8cc', cloud: '#ffffff', cloudShade: '#e9ecef',
    wall: '#e8590c', wallTop: '#ff922b', inside: '#fff9db', guide: 'rgba(232, 89, 12, 0.35)',
    line: '#e03131', ink: '#183153',
  },
  'watermelon-night': {
    set: 'fruits',
    bg: '#14213d', dots: '#ffffff', stars: true, cloud: '#dbe4ff', cloudShade: '#91a7ff',
    wall: '#4c6ef5', wallTop: '#748ffc', inside: '#1d2d55', guide: 'rgba(219, 228, 255, 0.3)',
    line: '#ff6b6b', ink: '#ffffff',
  },
  'watermelon-balls': {
    set: 'balls',
    bg: '#ffd8a8', dots: '#ffc078', floorLines: true, cloud: '#ffffff', cloudShade: '#e9ecef',
    wall: '#1c7ed6', wallTop: '#4dabf7', inside: '#e7f5ff', guide: 'rgba(28, 126, 214, 0.35)',
    line: '#e03131', ink: '#183153',
  },
  'watermelon-planets': {
    set: 'planets',
    bg: '#0b1026', dots: '#ffffff', stars: true, cloud: '#e5dbff', cloudShade: '#b197fc',
    wall: '#7048e8', wallTop: '#9775fa', inside: '#151c3f', guide: 'rgba(229, 219, 255, 0.28)',
    line: '#ff6b6b', ink: '#ffffff',
  },
};

export const SET_NAMES = {
  fruits: ['Kirsche', 'Erdbeere', 'Traube', 'Mandarine', 'Kaki', 'Apfel', 'Birne', 'Pfirsich', 'Ananas', 'Melone', 'Wassermelone'],
  balls: ['Murmel', 'Tischtennisball', 'Golfball', 'Billardkugel', 'Tennisball', 'Baseball', 'Bowlingkugel', 'Volleyball', 'Fußball', 'Basketball', 'Wasserball'],
  planets: ['Pluto', 'Mond', 'Merkur', 'Mars', 'Venus', 'Erde', 'Neptun', 'Uranus', 'Saturn', 'Jupiter', 'Sonne'],
};

// Ziel des Spiels im Satz „Schaffst du …?“
export const SET_GOALS = { fruits: 'die Wassermelone', balls: 'den Wasserball', planets: 'die Sonne' };

// Hauptfarbe je Stufe (Saftspritzer, Partikel)
const MAIN = {
  fruits: ['#e03131', '#f03e3e', '#7950f2', '#ffa94d', '#e8590c', '#fa5252', '#c0eb75', '#ffa8a8', '#fcc419', '#8ce99a', '#40c057'],
  balls: ['#4dabf7', '#ff922b', '#f1f3f5', '#212529', '#c0eb75', '#f8f9fa', '#5f3dc4', '#4dabf7', '#f8f9fa', '#f76707', '#fa5252'],
  planets: ['#e6c9a8', '#ced4da', '#a6a09b', '#e8590c', '#ffe066', '#339af0', '#3b5bdb', '#66d9e8', '#fcc419', '#ffa94d', '#ffd43b'],
};

export function wmDesign(id) {
  return DESIGNS[id] || DESIGNS['watermelon-classic'];
}

export function tierColor(set, tier) {
  return (MAIN[set] || MAIN.fruits)[tier];
}

// ---------- Bausteine ----------

const TAU = Math.PI * 2;

function circle(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function ellipse(ctx, x, y, rx, ry, rot, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fill();
}

// Kugel: Grundfarbe, dunklere Sichel unten rechts, Glanz oben links
function ball(ctx, r, base, shade, shine = 'rgba(255, 255, 255, 0.45)') {
  circle(ctx, 0, 0, r, shade);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();
  circle(ctx, -r * 0.1, -r * 0.1, r * 0.98, base);
  ctx.restore();
  if (shine) ellipse(ctx, -r * 0.42, -r * 0.45, r * 0.24, r * 0.14, -0.7, shine);
}

// Alles weitere nur innerhalb der Kugel zeichnen
function clipped(ctx, r, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();
  fn();
  ctx.restore();
}

function leaf(ctx, x, y, len, rot, fill, vein) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
  ctx.fill();
  if (vein) {
    ctx.strokeStyle = vein;
    ctx.lineWidth = Math.max(0.8, len * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(len * 0.12, 0);
    ctx.lineTo(len * 0.8, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function stem(ctx, x0, y0, x1, y1, bend, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1);
  ctx.stroke();
}

// Niedliches Gesicht (Früchte)
function face(ctx, r, { y = 0.12, gap = 0.3, cheek = null, ink = '#183153', mouth = 'smile' } = {}) {
  const eyeR = Math.max(1.1, r * 0.085);
  const ey = r * y;
  for (const sx of [-1, 1]) {
    ellipse(ctx, sx * r * gap, ey, eyeR, eyeR * 1.25, 0, ink);
    circle(ctx, sx * r * gap - eyeR * 0.3, ey - eyeR * 0.45, eyeR * 0.42, '#ffffff');
    if (cheek) ellipse(ctx, sx * r * (gap + 0.17), ey + r * 0.2, r * 0.1, r * 0.06, 0, cheek);
  }
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(0.9, r * 0.055);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mouth === 'open') {
    ctx.arc(0, ey + r * 0.16, r * 0.1, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.arc(0, ey + r * 0.1, r * 0.1, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}

// ---------- Früchte ----------

const FRUITS = [
  // Kirsche
  (ctx, r) => {
    stem(ctx, r * 0.05, -r * 0.8, r * 0.5, -r * 1.55, -r * 0.35, Math.max(1.2, r * 0.13), '#5c940d');
    leaf(ctx, r * 0.45, -r * 1.45, r * 0.75, -0.35, '#51cf66');
    ball(ctx, r, '#e03131', '#c92a2a');
    face(ctx, r, { y: 0.15, gap: 0.32 });
  },
  // Erdbeere
  (ctx, r) => {
    ball(ctx, r, '#f03e3e', '#c92a2a');
    clipped(ctx, r, () => {
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          if ((i + j) % 2) continue;
          const x = i * r * 0.36 + (j % 2 ? r * 0.18 : 0);
          const y = j * r * 0.36 + r * 0.08;
          if (Math.abs(x) < r * 0.5 && y > -r * 0.1 && y < r * 0.4) continue; // Platz fürs Gesicht
          ellipse(ctx, x, y, r * 0.05, r * 0.08, 0.3, '#ffe066');
        }
      }
    });
    for (let i = 0; i < 5; i++) leaf(ctx, 0, -r * 0.82, r * 0.55, -Math.PI / 2 + (i - 2) * 0.62, i % 2 ? '#2f9e44' : '#40c057');
    face(ctx, r, { y: 0.12 });
  },
  // Traube
  (ctx, r) => {
    stem(ctx, 0, -r * 0.85, r * 0.15, -r * 1.25, r * 0.1, Math.max(1.2, r * 0.12), '#8c6b4f');
    ball(ctx, r, '#7950f2', '#6741d9');
    face(ctx, r, { cheek: '#9775fa', ink: '#1b1340' });
  },
  // Mandarine
  (ctx, r) => {
    ball(ctx, r, '#ffa94d', '#fd7e14');
    clipped(ctx, r, () => {
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4;
        const d = r * (0.35 + ((i * 37) % 10) / 18);
        circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r * 0.035, '#ffc078');
      }
    });
    circle(ctx, 0, -r * 0.88, r * 0.2, '#fd7e14');
    leaf(ctx, r * 0.05, -r * 0.98, r * 0.6, -0.5, '#40c057', '#2f9e44');
    face(ctx, r, { cheek: '#ff8787' });
  },
  // Kaki
  (ctx, r) => {
    ball(ctx, r, '#f76707', '#d9480f');
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(0, -r * 0.8);
      ctx.rotate(i * (Math.PI / 2) + Math.PI / 4);
      ellipse(ctx, r * 0.22, 0, r * 0.24, r * 0.12, 0, '#5c940d');
      ctx.restore();
    }
    circle(ctx, 0, -r * 0.8, r * 0.09, '#2b8a3e');
    face(ctx, r, { cheek: '#ff8787', y: 0.18 });
  },
  // Apfel
  (ctx, r) => {
    stem(ctx, 0, -r * 0.7, r * 0.12, -r * 1.2, -r * 0.05, Math.max(1.4, r * 0.1), '#5c3a1a');
    leaf(ctx, r * 0.1, -r * 1.05, r * 0.6, -0.4, '#51cf66', '#2f9e44');
    ball(ctx, r, '#fa5252', '#e03131');
    ellipse(ctx, 0, -r * 0.86, r * 0.18, r * 0.08, 0, '#c92a2a');
    face(ctx, r, { y: 0.16, cheek: '#ffa8a8', mouth: 'open' });
  },
  // Birne
  (ctx, r) => {
    stem(ctx, 0, -r * 0.8, -r * 0.1, -r * 1.25, r * 0.12, Math.max(1.4, r * 0.1), '#5c3a1a');
    ball(ctx, r, '#c0eb75', '#94d82d');
    clipped(ctx, r, () => {
      for (let i = 0; i < 16; i++) {
        const a = i * 2.1 + 0.4;
        const d = r * (0.3 + ((i * 53) % 10) / 15);
        circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r * 0.03, '#82c91e');
      }
    });
    leaf(ctx, -r * 0.08, -r * 1.12, r * 0.5, -2.6, '#51cf66');
    face(ctx, r, { cheek: '#ffd8a8' });
  },
  // Pfirsich
  (ctx, r) => {
    ball(ctx, r, '#ffc9c9', '#ff8787', 'rgba(255, 255, 255, 0.5)');
    clipped(ctx, r, () => {
      ellipse(ctx, r * 0.45, r * 0.3, r * 0.55, r * 0.5, 0, '#ffa8a8');
      ctx.strokeStyle = '#fa5252';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.05, -r * 0.95);
      ctx.quadraticCurveTo(-r * 0.45, -r * 0.4, -r * 0.42, r * 0.05);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    leaf(ctx, 0, -r * 0.92, r * 0.55, -0.45, '#51cf66', '#2f9e44');
    leaf(ctx, 0, -r * 0.92, r * 0.45, -2.5, '#40c057');
    face(ctx, r, { y: 0.18, gap: 0.26, cheek: '#ff8787' });
  },
  // Ananas
  (ctx, r) => {
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.32;
      leaf(ctx, 0, -r * 0.82, r * (0.75 - Math.abs(i - 3) * 0.1), a, i % 2 ? '#2b8a3e' : '#37b24d');
    }
    ball(ctx, r, '#fcc419', '#f59f00');
    clipped(ctx, r, () => {
      ctx.strokeStyle = '#f08c00';
      ctx.lineWidth = Math.max(1, r * 0.045);
      const step = r * 0.42;
      for (let k = -4; k <= 4; k++) {
        ctx.beginPath();
        ctx.moveTo(k * step - r * 1.2, -r * 1.2);
        ctx.lineTo(k * step + r * 1.2, r * 1.2);
        ctx.moveTo(k * step + r * 1.2, -r * 1.2);
        ctx.lineTo(k * step - r * 1.2, r * 1.2);
        ctx.stroke();
      }
    });
    ellipse(ctx, 0, r * 0.22, r * 0.5, r * 0.32, 0, '#fcc419');
    face(ctx, r, { y: 0.16, gap: 0.27 });
  },
  // Melone (Netzmelone)
  (ctx, r) => {
    ball(ctx, r, '#8ce99a', '#51cf66');
    clipped(ctx, r, () => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = Math.max(1, r * 0.03);
      ctx.lineJoin = 'round';
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath();
        for (let s = -6; s <= 6; s++) {
          const y = s * r * 0.2;
          const x = k * r * 0.34 + Math.sin(s * 1.7 + k) * r * 0.08;
          if (s === -6) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.beginPath();
        for (let s = -6; s <= 6; s++) {
          const x = s * r * 0.2;
          const y = k * r * 0.34 + Math.cos(s * 1.3 + k * 2) * r * 0.08;
          if (s === -6) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    });
    ellipse(ctx, 0, r * 0.22, r * 0.46, r * 0.3, 0, '#8ce99a');
    stem(ctx, -r * 0.2, -r * 0.95, r * 0.2, -r * 0.95, -r * 0.1, Math.max(1.5, r * 0.08), '#2b8a3e');
    stem(ctx, 0, -r * 0.92, 0, -r * 1.12, 0, Math.max(1.5, r * 0.08), '#2b8a3e');
    face(ctx, r, { y: 0.16, gap: 0.24 });
  },
  // Wassermelone
  (ctx, r) => {
    ball(ctx, r, '#51cf66', '#37b24d', 'rgba(255, 255, 255, 0.35)');
    clipped(ctx, r, () => {
      ctx.fillStyle = '#2b8a3e';
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath();
        const x0 = k * r * 0.48;
        ctx.moveTo(x0 - r * 0.07, -r * 1.1);
        for (let s = -5; s <= 5; s++) ctx.lineTo(x0 + (s % 2 ? r * 0.08 : -r * 0.04), s * r * 0.22);
        ctx.lineTo(x0 + r * 0.07, r * 1.1);
        for (let s = 5; s >= -5; s--) ctx.lineTo(x0 + r * 0.14 + (s % 2 ? r * 0.06 : -r * 0.02), s * r * 0.22);
        ctx.closePath();
        ctx.fill();
      }
    });
    ellipse(ctx, 0, r * 0.2, r * 0.42, r * 0.3, 0, '#51cf66');
    stem(ctx, 0, -r * 0.95, r * 0.1, -r * 1.15, r * 0.12, Math.max(1.5, r * 0.06), '#2b8a3e');
    face(ctx, r, { y: 0.14, gap: 0.22, cheek: '#ff8787', mouth: 'open' });
  },
];

// ---------- Bälle ----------

function seam(ctx, r, color, width, side) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(side * r * 1.25, 0, r * 0.85, 0, TAU);
  ctx.stroke();
}

const BALLS = [
  // Murmel
  (ctx, r) => {
    ball(ctx, r, '#4dabf7', '#1c7ed6', 'rgba(255, 255, 255, 0.7)');
    ctx.strokeStyle = '#d0ebff';
    ctx.lineWidth = Math.max(1.2, r * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.5);
    ctx.bezierCurveTo(0, -r * 0.1, r * 0.1, r * 0.4, r * 0.55, -r * 0.2);
    ctx.stroke();
  },
  // Tischtennisball
  (ctx, r) => {
    ball(ctx, r, '#ff922b', '#f76707');
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.98, r * 0.3, 0.3, 0, Math.PI);
    ctx.stroke();
  },
  // Golfball
  (ctx, r) => {
    ball(ctx, r, '#f8f9fa', '#dee2e6', 'rgba(255, 255, 255, 0.9)');
    clipped(ctx, r, () => {
      const s = r * 0.32;
      for (let y = -3; y <= 3; y++) {
        for (let x = -3; x <= 3; x++) {
          const px = (x + (y % 2 ? 0.5 : 0)) * s;
          const py = y * s * 0.87;
          if (px * px + py * py < r * r * 0.85) circle(ctx, px, py, r * 0.07, '#ced4da');
        }
      }
    });
  },
  // Billardkugel (die Acht)
  (ctx, r) => {
    ball(ctx, r, '#343a40', '#212529', 'rgba(255, 255, 255, 0.35)');
    circle(ctx, 0, 0, r * 0.46, '#f8f9fa');
    ctx.fillStyle = '#212529';
    ctx.font = `900 ${r * 0.62}px Nunito, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('8', 0, r * 0.04);
  },
  // Tennisball
  (ctx, r) => {
    ball(ctx, r, '#d8f5a2', '#a9e34b');
    clipped(ctx, r, () => {
      seam(ctx, r, '#ffffff', Math.max(1.2, r * 0.1), -1);
      seam(ctx, r, '#ffffff', Math.max(1.2, r * 0.1), 1);
    });
  },
  // Baseball
  (ctx, r) => {
    ball(ctx, r, '#ffffff', '#e9ecef', 'rgba(255, 255, 255, 0.9)');
    clipped(ctx, r, () => {
      for (const side of [-1, 1]) {
        seam(ctx, r, '#fa5252', Math.max(1, r * 0.05), side);
        ctx.lineWidth = Math.max(1, r * 0.04);
        for (let i = -4; i <= 4; i++) {
          const a = (side === 1 ? Math.PI : 0) + i * 0.17;
          const cx = side * r * 1.25 + Math.cos(a) * r * 0.85;
          const cy = Math.sin(a) * r * 0.85;
          ctx.beginPath();
          ctx.moveTo(cx - Math.cos(a + 0.6) * r * 0.08, cy - Math.sin(a + 0.6) * r * 0.08);
          ctx.lineTo(cx + Math.cos(a + 0.6) * r * 0.08, cy + Math.sin(a + 0.6) * r * 0.08);
          ctx.stroke();
        }
      }
    });
  },
  // Bowlingkugel
  (ctx, r) => {
    ball(ctx, r, '#5f3dc4', '#4527a0');
    clipped(ctx, r, () => {
      ellipse(ctx, r * 0.3, r * 0.35, r * 0.5, r * 0.18, 0.6, '#7048e8');
      ellipse(ctx, -r * 0.45, r * 0.1, r * 0.3, r * 0.1, -0.4, '#7048e8');
    });
    circle(ctx, -r * 0.18, -r * 0.3, r * 0.1, '#1b1340');
    circle(ctx, r * 0.14, -r * 0.34, r * 0.1, '#1b1340');
    circle(ctx, 0, r * 0.02, r * 0.12, '#1b1340');
  },
  // Volleyball
  (ctx, r) => {
    ball(ctx, r, '#ffffff', '#e9ecef', 'rgba(255, 255, 255, 0.9)');
    clipped(ctx, r, () => {
      ctx.fillStyle = '#4dabf7';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(r * 0.5, -r * 0.2, r * 0.7, -r * 0.7, r * 0.4, -r * 1.1);
      ctx.lineTo(r * 1.2, -r * 1.1);
      ctx.lineTo(r * 1.2, r * 0.2);
      ctx.bezierCurveTo(r * 0.8, r * 0.1, r * 0.4, r * 0.1, 0, 0);
      ctx.fill();
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-r * 0.2, r * 0.5, -r * 0.7, r * 0.7, -r * 1.2, r * 0.5);
      ctx.lineTo(-r * 1.2, r * 1.2);
      ctx.lineTo(r * 0.2, r * 1.2);
      ctx.bezierCurveTo(r * 0.1, r * 0.7, r * 0.1, r * 0.4, 0, 0);
      ctx.fill();
      ctx.strokeStyle = '#adb5bd';
      ctx.lineWidth = Math.max(1, r * 0.035);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-r * 0.4, -r * 0.3, -r * 0.6, -r * 0.6, -r * 0.5, -r * 1.1);
      ctx.stroke();
    });
  },
  // Fußball
  (ctx, r) => {
    ball(ctx, r, '#ffffff', '#e9ecef', 'rgba(255, 255, 255, 0.9)');
    const pentagon = (cx, cy, s, rot) => {
      ctx.fillStyle = '#212529';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = rot + (i * TAU) / 5 - Math.PI / 2;
        ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
      }
      ctx.closePath();
      ctx.fill();
    };
    clipped(ctx, r, () => {
      pentagon(0, 0, r * 0.3, 0);
      for (let i = 0; i < 5; i++) {
        const a = (i * TAU) / 5 - Math.PI / 2;
        pentagon(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3, Math.PI / 5 + a);
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = Math.max(1, r * 0.03);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
        ctx.lineTo(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68);
        ctx.stroke();
      }
    });
  },
  // Basketball
  (ctx, r) => {
    ball(ctx, r, '#fd7e14', '#e8590c');
    clipped(ctx, r, () => {
      ctx.strokeStyle = '#212529';
      ctx.lineWidth = Math.max(1, r * 0.045);
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.moveTo(0, -r);
      ctx.lineTo(0, r);
      ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * r * 1.15, 0, r * 0.8, 0, TAU);
        ctx.stroke();
      }
    });
  },
  // Wasserball
  (ctx, r) => {
    const colors = ['#fa5252', '#ffffff', '#4dabf7', '#ffffff', '#fcc419', '#ffffff'];
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, (i * TAU) / 6 - Math.PI / 2, ((i + 1) * TAU) / 6 - Math.PI / 2);
      ctx.closePath();
      ctx.fill();
    });
    clipped(ctx, r, () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.beginPath();
      ctx.arc(-r * 0.12, -r * 0.12, r * 1.02, 0, TAU);
      ctx.arc(0, 0, r * 1.2, 0, TAU, true);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.arc(-r * 0.1, -r * 0.1, r * 0.98, 0, TAU, true);
      ctx.fill();
    });
    circle(ctx, 0, 0, r * 0.14, '#f1f3f5');
    ellipse(ctx, -r * 0.42, -r * 0.45, r * 0.24, r * 0.14, -0.7, 'rgba(255, 255, 255, 0.5)');
  },
];

// ---------- Planeten ----------

function craters(ctx, r, color, list) {
  for (const [x, y, s] of list) circle(ctx, x * r, y * r, s * r, color);
}

function bands(ctx, r, list) {
  clipped(ctx, r, () => {
    for (const [y, h, color] of list) {
      ctx.fillStyle = color;
      ctx.fillRect(-r, y * r, r * 2, h * r);
    }
  });
}

const PLANETS = [
  // Pluto
  (ctx, r) => {
    ball(ctx, r, '#e6c9a8', '#c9a27e');
    ctx.fillStyle = '#f8ecd9';
    ctx.beginPath();
    ctx.moveTo(r * 0.1, r * 0.55);
    ctx.bezierCurveTo(-r * 0.5, r * 0.15, -r * 0.2, -r * 0.35, r * 0.1, -r * 0.05);
    ctx.bezierCurveTo(r * 0.4, -r * 0.35, r * 0.7, r * 0.15, r * 0.1, r * 0.55);
    ctx.fill();
  },
  // Mond
  (ctx, r) => {
    ball(ctx, r, '#dee2e6', '#adb5bd');
    craters(ctx, r, '#ced4da', [[-0.3, -0.2, 0.2], [0.35, 0.25, 0.25], [-0.2, 0.45, 0.13], [0.3, -0.45, 0.1]]);
  },
  // Merkur
  (ctx, r) => {
    ball(ctx, r, '#a6a09b', '#868079');
    craters(ctx, r, '#8f8983', [[0.2, -0.3, 0.18], [-0.35, 0.15, 0.22], [0.4, 0.4, 0.12], [-0.1, -0.55, 0.08], [0.05, 0.3, 0.09]]);
  },
  // Mars
  (ctx, r) => {
    ball(ctx, r, '#e8590c', '#c2410c');
    clipped(ctx, r, () => {
      ellipse(ctx, -r * 0.2, r * 0.15, r * 0.45, r * 0.2, 0.3, '#d9480f');
      ellipse(ctx, r * 0.4, -r * 0.25, r * 0.25, r * 0.12, -0.2, '#d9480f');
      ellipse(ctx, 0, -r * 0.98, r * 0.5, r * 0.2, 0, '#fff4e6');
    });
  },
  // Venus
  (ctx, r) => {
    ball(ctx, r, '#ffe066', '#fab005');
    clipped(ctx, r, () => {
      ctx.strokeStyle = '#fff3bf';
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.lineCap = 'round';
      for (const [y, a] of [[-0.45, 0.4], [0, -0.3], [0.45, 0.3]]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, y * r);
        ctx.quadraticCurveTo(0, (y + a) * r, r * 0.7, y * r);
        ctx.stroke();
      }
    });
  },
  // Erde
  (ctx, r) => {
    ball(ctx, r, '#339af0', '#1c7ed6');
    clipped(ctx, r, () => {
      ctx.fillStyle = '#51cf66';
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.5);
      ctx.bezierCurveTo(-r * 0.1, -r * 0.8, r * 0.1, -r * 0.2, -r * 0.2, 0);
      ctx.bezierCurveTo(-r * 0.4, r * 0.2, -r * 0.1, r * 0.6, -r * 0.4, r * 0.7);
      ctx.bezierCurveTo(-r * 0.9, r * 0.4, -r * 0.9, -r * 0.2, -r * 0.6, -r * 0.5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.2);
      ctx.bezierCurveTo(r * 0.8, -r * 0.4, r * 0.9, r * 0.2, r * 0.5, r * 0.5);
      ctx.bezierCurveTo(r * 0.3, r * 0.6, r * 0.1, r * 0.2, r * 0.3, -r * 0.2);
      ctx.fill();
      ellipse(ctx, 0, -r * 0.98, r * 0.6, r * 0.2, 0, '#ffffff');
      ellipse(ctx, r * 0.1, r * 0.25, r * 0.35, r * 0.07, -0.2, 'rgba(255, 255, 255, 0.7)');
    });
  },
  // Neptun
  (ctx, r) => {
    ball(ctx, r, '#4263eb', '#364fc7');
    bands(ctx, r, [[-0.35, 0.12, '#5c7cfa'], [0.25, 0.1, '#3b5bdb']]);
    ellipse(ctx, r * 0.3, r * 0.05, r * 0.18, r * 0.1, 0, '#2b3fae');
  },
  // Uranus
  (ctx, r) => {
    ball(ctx, r, '#66d9e8', '#3bc9db');
    bands(ctx, r, [[-0.2, 0.08, '#99e9f2'], [0.3, 0.06, '#99e9f2']]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.25, r * 1.2, 0.2, 0, TAU);
    ctx.stroke();
  },
  // Saturn
  (ctx, r) => {
    const ring = (front) => {
      ctx.strokeStyle = front ? '#e9c46a' : '#c9a227';
      ctx.lineWidth = r * 0.16;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.38, r * 0.34, -0.25, front ? 0 : Math.PI, front ? Math.PI : TAU);
      ctx.stroke();
    };
    ring(false);
    ball(ctx, r, '#fcc419', '#f59f00');
    bands(ctx, r, [[-0.55, 0.14, '#ffd43b'], [-0.1, 0.12, '#fab005'], [0.35, 0.16, '#ffe066']]);
    ring(true);
  },
  // Jupiter
  (ctx, r) => {
    ball(ctx, r, '#ffd8a8', '#ffa94d');
    bands(ctx, r, [
      [-0.75, 0.16, '#e8a46a'], [-0.42, 0.14, '#fff4e6'], [-0.18, 0.2, '#d9895b'],
      [0.12, 0.12, '#fff4e6'], [0.34, 0.18, '#e8a46a'], [0.64, 0.12, '#d9895b'],
    ]);
    ellipse(ctx, r * 0.35, r * 0.43, r * 0.2, r * 0.12, 0, '#c92a2a');
  },
  // Sonne
  (ctx, r, t = 0) => {
    ctx.fillStyle = '#ffe066';
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12 + t / 4000;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.12) * r * 0.95, Math.sin(a - 0.12) * r * 0.95);
      ctx.lineTo(Math.cos(a) * r * 1.22, Math.sin(a) * r * 1.22);
      ctx.lineTo(Math.cos(a + 0.12) * r * 0.95, Math.sin(a + 0.12) * r * 0.95);
      ctx.fill();
    }
    ball(ctx, r, '#ffd43b', '#fcc419', 'rgba(255, 255, 255, 0.55)');
    clipped(ctx, r, () => {
      circle(ctx, r * 0.3, r * 0.3, r * 0.12, '#fab005');
      circle(ctx, -r * 0.35, r * 0.2, r * 0.08, '#fab005');
      circle(ctx, r * 0.05, -r * 0.4, r * 0.06, '#fab005');
    });
  },
];

const SETS = { fruits: FRUITS, balls: BALLS, planets: PLANETS };

// Wie weit Stiele, Blätter, Ringe oder Strahlen über den Kreis hinausragen (für Bild-Zwischenspeicher)
export const OVERHANG = 1.6;

export function drawObject(ctx, set, tier, r, t = 0) {
  (SETS[set] || FRUITS)[tier](ctx, r, t);
}

// ---------- Hintergrund und Kiste (gemeinsam für Spiel und Vorschau) ----------

// Hintergrund in Weltkoordinaten zeichnen: x0..x1, y0..y1
export function drawBackdrop(ctx, design, x0, y0, x1, y1) {
  ctx.fillStyle = design.bg;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  if (design.stars) {
    for (let i = 0; i < 60; i++) {
      const x = x0 + ((i * 97) % 100) / 100 * (x1 - x0);
      const y = y0 + ((i * 61 + 13) % 100) / 100 * (y1 - y0);
      circle(ctx, x, y, (i % 3) + 1.2, i % 4 ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.7)');
    }
  } else if (design.floorLines) {
    ctx.fillStyle = design.dots;
    for (let y = y0; y < y1; y += 70) ctx.fillRect(x0, y, x1 - x0, 6);
  } else {
    for (let y = y0 + 20; y < y1; y += 56) {
      for (let x = x0 + ((y / 56) % 2 ? 28 : 0); x < x1; x += 56) circle(ctx, x, y, 5, design.dots);
    }
  }
}

// Kiste: Innenraum und U-förmige Wand. Innen x 0..w, Boden bei h, Wände ragen bis rimY nach oben.
export function drawBox(ctx, design, w, h, rimY, wall) {
  ctx.fillStyle = design.inside;
  ctx.fillRect(0, rimY, w, h - rimY);
  ctx.fillStyle = design.wall;
  roundRect(ctx, -wall, rimY - wall * 0.5, wall, h - rimY + wall * 1.5, wall * 0.5);
  roundRect(ctx, w, rimY - wall * 0.5, wall, h - rimY + wall * 1.5, wall * 0.5);
  roundRect(ctx, -wall, h, w + wall * 2, wall, wall * 0.5);
  ctx.fillStyle = design.wallTop;
  roundRect(ctx, -wall, rimY - wall * 0.5, wall, wall, wall * 0.5);
  roundRect(ctx, w, rimY - wall * 0.5, wall, wall, wall * 0.5);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// Wolke, an der die nächste Frucht hängt
export function drawCloud(ctx, design, x, y, s) {
  ellipse(ctx, x, y + s * 0.18, s * 1.05, s * 0.42, 0, design.cloudShade);
  circle(ctx, x - s * 0.5, y, s * 0.42, design.cloud);
  circle(ctx, x + s * 0.05, y - s * 0.22, s * 0.55, design.cloud);
  circle(ctx, x + s * 0.55, y + s * 0.02, s * 0.38, design.cloud);
  ellipse(ctx, x, y + s * 0.12, s * 0.95, s * 0.3, 0, design.cloud);
  const ink = '#183153';
  circle(ctx, x - s * 0.2, y - s * 0.05, s * 0.07, ink);
  circle(ctx, x + s * 0.25, y - s * 0.05, s * 0.07, ink);
  ctx.strokeStyle = ink;
  ctx.lineWidth = s * 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x + s * 0.02, y + s * 0.05, s * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
}

// ---------- Shop-/Menü-Vorschau ----------

export function drawWatermelonPreview(canvas, id, t = 0) {
  const ctx = canvas.getContext('2d');
  const design = wmDesign(id);
  const w = canvas.width;
  const h = canvas.height;
  const s = h / 100; // Vorschau in 100er-Einheiten der Höhe
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(s, s);
  const vw = w / s;
  drawBackdrop(ctx, design, 0, 0, vw, 100);
  const boxW = Math.min(vw - 30, 120);
  ctx.translate((vw - boxW) / 2, 0);
  drawBox(ctx, design, boxW, 94, 26, 5);
  // [x-Anteil der Kiste, Stufe, y, Radius] – grob gestapelt wie im Spiel
  const objects = [
    [0.25, 10, 68, 26], [0.667, 8, 75, 19], [0.883, 5, 80, 14],
    [0.517, 3, 50, 11], [0.833, 1, 58, 8], [0.075, 0, 37, 6],
  ];
  for (const [fx, tier, y, r] of objects) {
    ctx.save();
    ctx.translate(fx * boxW, y);
    ctx.rotate(Math.sin(tier * 1.7) * 0.25);
    drawObject(ctx, design.set, tier, r, t);
    ctx.restore();
  }
  const bob = Math.sin(t / 500) * 1.5;
  ctx.save();
  ctx.translate(boxW * 0.6, 19 + bob);
  drawObject(ctx, design.set, 2, 6.5, t);
  ctx.restore();
  drawCloud(ctx, design, boxW * 0.6, 8 + bob, 7.5);
  ctx.restore();
}
