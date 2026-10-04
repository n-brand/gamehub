// Prüft, ob jedes Würfelsprung-Level schaffbar ist: Eine Tiefensuche probiert Sprungzeitpunkte
// (Entscheidung alle 25 ms, wie eine präzise Spielerin) mit derselben Physik wie das Spiel.
// Aufruf: node tools/check-cubejump-levels.mjs

import { LEVELS, buildLevel, newRun, stepRun, STEP } from '../public/games/cubejump.js';

const DECISION_STEPS = 6; // 6 × 1/240 s = 25 ms
const MAX_NODES = 3_000_000;

const clone = (s) => ({ ...s, used: s.used.slice(), events: [] });

function solve(level) {
  const visited = new Set();
  let nodes = 0;
  let furthest = 0;
  const presses = [];

  function dfs(s, step) {
    if (++nodes > MAX_NODES) throw new Error('Suche zu groß');
    furthest = Math.max(furthest, s.px);
    const key = `${Math.round(s.px * 8)}|${Math.round(s.py * 20)}|${Math.round(s.vy * 2)}|${s.grounded ? 1 : 0}|${s.buffer > 0 ? 1 : 0}`;
    if (visited.has(key)) return false;
    visited.add(key);
    for (const press of [false, true]) {
      const t = clone(s);
      let i = 0;
      for (; i < DECISION_STEPS; i++) {
        stepRun(t, level, STEP, false, press && i === 0);
        if (t.dead || t.finished) break;
      }
      if (t.dead) continue;
      if (t.finished || dfs(t, step + DECISION_STEPS)) {
        if (press) presses.push(step);
        return true;
      }
    }
    return false;
  }

  const ok = dfs(newRun(level), 0);
  return { ok, nodes, furthest, presses: presses.reverse() };
}

let failed = false;
for (const def of LEVELS) {
  const level = buildLevel(def);
  const seconds = level.length / (10.4 * level.speed);
  const { ok, nodes, furthest, presses } = solve(level);
  if (ok) {
    console.log(`✓ ${def.name}: schaffbar – ${level.length} Blöcke, ${seconds.toFixed(1)} s, ${presses.length} Sprünge (${nodes} Zustände geprüft)`);
  } else {
    failed = true;
    const near = level.obstacles.filter((o) => Math.abs(o.x - furthest) < 6).map((o) => `${o.type}@${o.x}${o.y ? `/${o.y}` : ''}`);
    console.log(`✗ ${def.name}: NICHT schaffbar – weiteste Position ${furthest.toFixed(1)} von ${level.length}. In der Nähe: ${near.join(', ')}`);
  }
}
process.exit(failed ? 1 : 0);
