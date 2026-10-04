// Prüft die Physik von Watermelon Drop ohne Browser: lässt mit festem Zufall viele Früchte fallen und
// meldet Ausbrecher, NaN, zu starke Überlappungen, zitternde Stapel und die Rechenzeit.
// Aufruf: node tools/check-watermelon.mjs

import { createWorld, dropFruit, stepWorld, overflowTop, RADII, BOX_W, BOX_H, STEP, DROP_TIERS } from '../public/games/watermelon.js';

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function worstOverlap(world) {
  let worst = 0;
  const b = world.bodies;
  for (let i = 0; i < b.length; i++) {
    for (let j = i + 1; j < b.length; j++) {
      const d = Math.hypot(b[j].x - b[i].x, b[j].y - b[i].y);
      const depth = b[i].r + b[j].r - d;
      if (depth > 0) worst = Math.max(worst, depth / Math.min(b[i].r, b[j].r));
    }
  }
  return worst;
}

function check(world) {
  for (const b of world.bodies) {
    if (![b.x, b.y, b.vx, b.vy, b.angle].every(Number.isFinite)) return `NaN bei Frucht ${b.id}`;
    if (b.x < b.r - 1 || b.x > BOX_W - b.r + 1 || b.y > BOX_H - b.r + 1) return `Frucht ${b.id} außerhalb der Kiste (${b.x.toFixed(1)}, ${b.y.toFixed(1)})`;
  }
  return null;
}

let failed = false;
let stepTime = 0;
let steps = 0;

for (const seed of [1, 2, 3, 4, 5, 6]) {
  Math.random = mulberry32(seed);
  const world = createWorld();
  let drops = 0;
  let danger = 0;
  let worst = 0;
  let error = null;
  let maxBodies = 0;
  while (drops < 400 && !error) {
    const tier = Math.floor(Math.random() * DROP_TIERS);
    // Halb zufällig, halb dorthin, wo die gleiche Frucht schon liegt (wie ein Spieler)
    const same = world.bodies.filter((b) => b.tier === tier);
    const target = same.length && Math.random() < 0.6 ? same[Math.floor(Math.random() * same.length)].x : Math.random() * BOX_W;
    dropFruit(world, tier, Math.min(Math.max(target, RADII[tier]), BOX_W - RADII[tier]));
    drops++;
    for (let i = 0; i < 36; i++) {
      const t0 = performance.now();
      stepWorld(world);
      stepTime += performance.now() - t0;
      steps++;
      error = check(world);
      if (error) break;
      danger = overflowTop(world) < 0 ? danger + STEP : 0;
    }
    worst = Math.max(worst, worstOverlap(world));
    maxBodies = Math.max(maxBodies, world.bodies.length);
    if (danger >= 2.5) break;
  }
  // Ruhetest: 6 s ohne neue Früchte – danach darf sich nichts mehr nennenswert bewegen
  let restSpeed = 0;
  if (!error) {
    for (let i = 0; i < 360; i++) stepWorld(world);
    restSpeed = Math.max(0, ...world.bodies.map((b) => Math.hypot(b.vx, b.vy)));
    error = check(world);
  }
  const settled = worstOverlap(world);
  const ok = !error && worst < 0.25 && settled < 0.06 && restSpeed < 5;
  if (!ok) failed = true;
  console.log(
    `${ok ? '✓' : '✗'} Seed ${seed}: ${drops} Früchte, ${world.score} Punkte, größte Stufe ${world.maxTier + 1}/11, ` +
      `bis ${maxBodies} gleichzeitig, Überlappung max ${(worst * 100).toFixed(1)} % / in Ruhe ${(settled * 100).toFixed(1)} %, ` +
      `Restbewegung ${restSpeed.toFixed(1)}${error ? ` – ${error}` : ''}`,
  );
}

console.log(`Rechenzeit: ${((stepTime / steps) * 1000).toFixed(0)} µs pro Schritt (1/60 s)`);
if (failed) process.exit(1);
