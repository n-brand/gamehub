// Erzeugt die PWA-Symbole (public/icons/*.png) ohne Abhängigkeiten: flaches Gamepad auf Navy.
// Aufruf: node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const OUT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public', 'icons');
const BG = [14, 26, 43];
const BODY = [255, 212, 59];
const DARK = [24, 49, 83];
const BLUE = [116, 192, 252];

// Formen im Einheitsquadrat (0..1); Rückgabe: Farbe oder null
const inRRect = (x, y, x0, y0, x1, y1, r) => {
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= x0 && x <= x1 && y >= y0 && y <= y1;
};
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

function shade(x, y, rounded) {
  if (rounded && !inRRect(x, y, 0, 0, 1, 1, 0.22)) return null;
  // Gamepad: Körper + zwei Griffe, Kreuz links, zwei Knöpfe rechts
  if (inRRect(x, y, 0.16, 0.32, 0.84, 0.64, 0.14) || inCircle(x, y, 0.27, 0.62, 0.13) || inCircle(x, y, 0.73, 0.62, 0.13)) {
    if (inRRect(x, y, 0.25, 0.43, 0.43, 0.49, 0.02) || inRRect(x, y, 0.31, 0.37, 0.37, 0.55, 0.02)) return DARK;
    if (inCircle(x, y, 0.64, 0.49, 0.045)) return BLUE;
    if (inCircle(x, y, 0.72, 0.43, 0.045)) return DARK;
    return BODY;
  }
  return BG;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function png(size, { rounded, scale }) {
  const SS = 3; // Supersampling gegen Treppen
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const u = (px + (sx + 0.5) / SS) / size;
        const v = (py + (sy + 0.5) / SS) / size;
        // scale < 1: Motiv schrumpft zur Mitte (Sicherheitszone für maskierbare Symbole)
        const c = shade((u - 0.5) / scale + 0.5, (v - 0.5) / scale + 0.5, rounded) ?? null;
        const cc = rounded && !inRRect(u, v, 0, 0, 1, 1, 0.22) ? null : c ?? BG;
        if (cc) { r += cc[0]; g += cc[1]; b += cc[2]; a += 255; }
      }
      const n = SS * SS;
      const o = py * (size * 4 + 1) + 1 + px * 4;
      raw[o] = a ? Math.round(r / (a / 255)) : 0;
      raw[o + 1] = a ? Math.round(g / (a / 255)) : 0;
      raw[o + 2] = a ? Math.round(b / (a / 255)) : 0;
      raw[o + 3] = Math.round(a / n);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
const files = {
  'icon-192.png': png(192, { rounded: true, scale: 1.2 }),
  'icon-512.png': png(512, { rounded: true, scale: 1.2 }),
  'icon-maskable-512.png': png(512, { rounded: false, scale: 0.95 }), // volle Fläche, Betriebssystem schneidet zu
  'apple-touch-icon.png': png(180, { rounded: false, scale: 1.1 }), // iOS rundet selbst ab
};
for (const [name, buf] of Object.entries(files)) writeFileSync(join(OUT, name), buf);
console.log('Symbole geschrieben:', Object.keys(files).join(', '));
