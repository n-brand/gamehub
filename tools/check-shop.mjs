// Prüft die Shop-Regeln ohne Browser: Preise mit Rabatt (pricing.js) und die Server-Funktionen des
// Demo-Backends (Kauf, Diamanten-Tausch, Creator-Codes, Ausrüsten). Die gleichen Regeln stehen in
// supabase/migrations/002_shop.sql – nach Änderungen dort oder hier immer ausführen.
// Außerdem: Jedes Design im Katalog hat ein Aussehen, und jedes Würfel-Merkmal wird auch gezeichnet.
// Aufruf: node tools/check-shop.mjs

import assert from 'node:assert/strict';

// Das Demo-Backend speichert in localStorage – in Node durch einen Speicher im Arbeitsspeicher ersetzt
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
};

const { isFreeItem, priceOf, saleLeft, packageCoins } = await import('../public/js/pricing.js');
const { fmtShort } = await import('../public/js/format.js');
const { SNAKE_DESIGNS, CUBE_THEMES, CUBE_SKINS, drawCube } = await import('../public/js/designs.js');
const { wmDesign } = await import('../public/js/watermelon-art.js');
const { createDemoClient, DEMO_CATALOG } = await import('../public/js/demo-backend.js');

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`✗ ${name}\n    ${err.message.split('\n').join('\n    ')}`);
  }
}

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const NOW = Date.parse('2026-10-05T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString();

// ---------- Preise ----------

await test('Ohne Rabatt gilt der Listenpreis', () => {
  const p = priceOf({ price_coins: 800, price_diamonds: 0, sale_percent: 0, sale_until: null }, NOW);
  assert.equal(p.coins, 800);
  assert.equal(p.diamonds, 0);
  assert.equal(p.onSale, false);
});

await test('Rabatt senkt den Preis (−30 % von 800 Coins = 560)', () => {
  const p = priceOf({ price_coins: 800, price_diamonds: 0, sale_percent: 30, sale_until: iso(NOW + DAY) }, NOW);
  assert.equal(p.coins, 560);
  assert.equal(p.listCoins, 800);
  assert.equal(p.onSale, true);
  assert.equal(p.percent, 30);
});

await test('Rabattpreis wird gerundet (−30 % von 5 Diamanten = 4)', () => {
  const p = priceOf({ price_coins: 0, price_diamonds: 5, sale_percent: 30, sale_until: null }, NOW);
  assert.equal(p.diamonds, 4);
  assert.equal(p.coins, 0);
});

await test('Rabattpreis ist mindestens 1 (−90 % von 1 Coin)', () => {
  assert.equal(priceOf({ price_coins: 1, price_diamonds: 0, sale_percent: 90, sale_until: null }, NOW).coins, 1);
});

await test('Abgelaufener Rabatt gilt nicht mehr', () => {
  const p = priceOf({ price_coins: 800, price_diamonds: 0, sale_percent: 30, sale_until: iso(NOW - 1) }, NOW);
  assert.equal(p.coins, 800);
  assert.equal(p.onSale, false);
});

await test('Rabatt ohne Enddatum gilt dauerhaft', () => {
  assert.equal(priceOf({ price_coins: 600, price_diamonds: 0, sale_percent: 50, sale_until: null }, NOW).coins, 300);
});

await test('Gratis heißt Preis 0 und nicht exklusiv', () => {
  assert.equal(isFreeItem({ price_coins: 0, price_diamonds: 0, exclusive: false }), true);
  assert.equal(isFreeItem({ price_coins: 0, price_diamonds: 0, exclusive: true }), false);
  assert.equal(isFreeItem({ price_coins: 400, price_diamonds: 0, exclusive: false }), false);
});

await test('Restzeit eines Rabatts in Tagen bzw. Stunden', () => {
  const left = (ms) => saleLeft({ sale_percent: 30, sale_until: iso(NOW + ms) }, NOW);
  assert.equal(left(2.5 * DAY), 'noch 2 Tage');
  assert.equal(left(30 * HOUR), 'noch 1 Tag');
  assert.equal(left(5 * HOUR), 'noch 5 Std.');
  assert.equal(left(20 * 60e3), 'noch 1 Std.');
  assert.equal(saleLeft({ sale_percent: 30, sale_until: null }, NOW), '');
});

await test('Tauschpakete: Diamanten × Kurs × Bonus', () => {
  assert.equal(packageCoins({ diamonds: 1, bonus_percent: 0 }, 150), 150);
  assert.equal(packageCoins({ diamonds: 5, bonus_percent: 10 }, 150), 825);
  assert.equal(packageCoins({ diamonds: 10, bonus_percent: 20 }, 150), 1800);
  assert.equal(packageCoins({ diamonds: 25, bonus_percent: 30 }, 150), 4875);
});

await test('Kurzschreibweise für große Zahlen in der Kopfzeile (abgeschnitten, nie gerundet)', () => {
  assert.equal(fmtShort(12999), '12,9K');
  assert.equal(fmtShort(0), '0');
  assert.equal(fmtShort(999), '999');
  assert.equal(fmtShort(9999), '9.999');
  assert.equal(fmtShort(10000), '10K');
  assert.equal(fmtShort(12480), '12,4K');
  assert.equal(fmtShort(12900), '12,9K');
  assert.equal(fmtShort(1290000), '1,2M');
  assert.equal(fmtShort(99999), '99,9K');
  assert.equal(fmtShort(100056), '100K');
  assert.equal(fmtShort(999999), '999K');
  assert.equal(fmtShort(1234567), '1,2M');
  assert.equal(fmtShort(250000000), '250M');
});

// ---------- Demo-Backend (gleiche Regeln wie die Supabase-Funktionen) ----------

const freshDb = (overrides = {}) => ({
  loggedIn: true,
  profile: { coins: 0, diamonds: 0, spin_streak: 0, last_spin: null },
  game_stats: {},
  inventory: [],
  equipped: {},
  user_achievements: [],
  ...overrides,
});

function demoWith({ coins = 0, diamonds = 0, inventory = [] } = {}) {
  storage.clear();
  storage.set('gamehub-demo-db', JSON.stringify(freshDb({ profile: { coins, diamonds, spin_streak: 0, last_spin: null }, inventory })));
  return createDemoClient();
}

const item = (id) => DEMO_CATALOG.shop_items.find((i) => i.id === id);
function withSale(id, percent, fn) {
  const it = item(id);
  const before = { sale_percent: it.sale_percent, sale_until: it.sale_until };
  Object.assign(it, { sale_percent: percent, sale_until: iso(Date.now() + DAY) });
  return Promise.resolve(fn()).finally(() => Object.assign(it, before));
}

await test('Katalog: Pakete, Kurs und exklusive Galaxie-Designs', async () => {
  const client = demoWith();
  const { data: packages } = await client.from('exchange_packages').select('*').order('sort');
  assert.deepEqual(packages.map((p) => [p.id, p.diamonds, p.bonus_percent]), [['p1', 1, 0], ['p5', 5, 10], ['p10', 10, 20], ['p25', 25, 30]]);
  const { data: settings } = await client.from('shop_settings').select('*');
  assert.equal(settings.find((s) => s.key === 'diamond_coin_rate')?.value, 150);
  assert.equal(item('snake-galaxy')?.exclusive, true);
  assert.equal(item('cubejump-galaxy')?.exclusive, true);
  assert.equal(item('cube-galaxy')?.exclusive, true);
  assert.equal(item('cube-galaxy')?.slot, 'cubejump-skin');
});

await test('Katalog: Snake „Neon“ ist als beliebt hervorgehoben, andere Designs nicht', () => {
  assert.equal(item('snake-neon').highlight, 'Beliebt');
  assert.equal(item('snake-fire').highlight, null);
});

await test('Neue Shop-Designs (Tiger, Lava, Wüste, Synthwave, Pirat, Alien, Katze, Panda, Kürbis, Magma) – kaufbar', () => {
  const fresh = ['snake-tiger', 'snake-lava', 'cubejump-desert', 'cubejump-synth', 'cube-pirate', 'cube-alien', 'cube-cat', 'cube-panda', 'cube-pumpkin', 'cube-magma'];
  for (const id of fresh) {
    const it = item(id);
    assert.ok(it, `${id} fehlt im Katalog`);
    assert.equal(it.exclusive, false, `${id} sollte im Shop stehen`);
    assert.ok(it.price_coins > 0 || it.price_diamonds > 0, `${id} braucht einen Preis`);
  }
});

await test('Jedes Design im Katalog hat ein Aussehen (designs.js / watermelon-art.js)', () => {
  const missing = DEMO_CATALOG.shop_items
    .filter((i) => {
      if (i.slot === 'snake') return !SNAKE_DESIGNS[i.id];
      if (i.slot === 'cubejump-theme') return !CUBE_THEMES[i.id];
      if (i.slot === 'cubejump-skin') return !CUBE_SKINS[i.id];
      if (i.slot === 'watermelon') return i.id !== 'watermelon-classic' && wmDesign(i.id) === wmDesign('gibt-es-nicht');
      return true;
    })
    .map((i) => i.id);
  assert.deepEqual(missing, []);
});

// Aufzeichnender Canvas für Zeichentests: merkt sich alle Aufrufe und die Bildschirmlage der Punkte
function recordCanvas() {
  const calls = [];
  const points = [];
  const stack = [];
  let m = [1, 0, 0, 1, 0, 0];
  const at = (x, y) => points.push([m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
  const box = (x, y, w, h) => [at(x, y), at(x + w, y), at(x, y + h), at(x + w, y + h)];
  const gradient = { addColorStop() {} };
  const ops = {
    save: () => stack.push(m),
    restore: () => (m = stack.pop() ?? m),
    translate: (x, y) => (m = [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]),
    rotate: (r) => {
      const [c, s] = [Math.cos(r), Math.sin(r)];
      m = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, m[2] * c - m[0] * s, m[3] * c - m[1] * s, m[4], m[5]];
    },
    moveTo: at,
    lineTo: at,
    quadraticCurveTo: (cx, cy, x, y) => at(x, y),
    bezierCurveTo: (c1x, c1y, c2x, c2y, x, y) => at(x, y),
    arc: (x, y) => at(x, y),
    ellipse: (x, y) => at(x, y),
    roundRect: box,
    fillRect: box,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  };
  const ctx = new Proxy({}, {
    get: (target, prop) => (prop in target ? target[prop] : (...args) => {
      calls.push([prop, ...args]);
      return ops[prop]?.(...args);
    }),
    set: (target, prop, value) => {
      calls.push([prop, value]);
      target[prop] = value;
      return true;
    },
  });
  return { ctx, calls, points };
}

await test('Würfel: jedes Merkmal (Augen, Mund, Muster, Glut, Funkeln) wird auch gezeichnet', () => {
  const draw = (skin) => {
    const { ctx, calls } = recordCanvas();
    drawCube(ctx, 0, 0, 100, 0, skin, 1234);
    return JSON.stringify(calls);
  };
  const missing = [];
  for (const [id, skin] of Object.entries(CUBE_SKINS)) {
    for (const key of ['eyes', 'mouth', 'deco', 'embers', 'sparkle']) {
      if (!skin[key]) continue;
      const without = { ...skin, [key]: typeof skin[key] === 'boolean' ? false : 'unbekannt' };
      if (draw(skin) === draw(without)) missing.push(`${id}: ${key} = ${skin[key]}`);
    }
  }
  assert.deepEqual(missing, []);
});

await test('Feuer-Würfel: Flammen lodern bei jeder Drehung im Sprung nach oben', () => {
  // Würfel mit Kantenlänge 100 um (0, 0): Oberkante bei y = -50, schräg gedreht höchstens bei y ≈ -71
  const flamesOnly = { ...CUBE_SKINS['cube-fire'], embers: false };
  for (const angle of [0, 45, 90, 180, 270]) {
    const { ctx, points } = recordCanvas();
    drawCube(ctx, 0, 0, 100, angle, flamesOnly, 1234);
    const top = Math.min(...points.map(([, y]) => y));
    assert.ok(top < -85, `Bei ${angle}° reichen die Flammen nur bis y = ${Math.round(top)}`);
  }
});

// ---------- Probe-Runde („Ausprobieren“ in der Detailansicht) ----------

const FIRE = { id: 'cube-fire', game: 'cubejump', slot: 'cubejump-skin' };

await test('Probe-Runde: Design ersetzt nur seinen eigenen Slot, sonst bleibt das Ausgerüstete', async () => {
  const { trialApi } = await import('../public/js/trial.js');
  const equipped = { 'cubejump-theme': 'cubejump-neon', 'cubejump-skin': 'cube-classic', snake: 'snake-classic' };
  const api = { getDesign: (slot) => equipped[slot], reportResult() {} };
  const cube = trialApi(api, FIRE, { onRoundEnd() {} });
  assert.equal(cube.getDesign('cubejump-skin'), 'cube-fire');
  assert.equal(cube.getDesign('cubejump-theme'), 'cubejump-neon');
  // Spiele mit nur einem Slot fragen ohne Slot (= Spiel-ID)
  const snake = trialApi(api, { id: 'snake-neon', game: 'snake', slot: 'snake' }, { onRoundEnd() {} });
  assert.equal(snake.getDesign(), 'snake-neon');
});

await test('Probe-Runde: gibt keine Coins oder Erfolge, eine gemeldete Runde beendet die Probe', async () => {
  const { trialApi } = await import('../public/js/trial.js');
  let reported = 0;
  let ended = 0;
  const api = { getDesign: () => null, reportResult: () => reported++ };
  const trial = trialApi(api, FIRE, { level: 'easy', onRoundEnd: () => ended++ });
  trial.reportResult({ result: 'win', difficulty: 'easy' });
  assert.equal(reported, 0, 'Runde wurde ans Portal gemeldet');
  assert.equal(ended, 1);
  assert.equal(trial.level, 'easy');
});

await test('Probe-Runde: Link führt zum Spiel des Designs, höchstens 60 Sekunden', async () => {
  const { trialHash, TRIAL_SECONDS } = await import('../public/js/trial.js');
  assert.equal(trialHash(FIRE), '#/game/cubejump/probe/cube-fire');
  assert.equal(TRIAL_SECONDS, 60);
});

await test('Creator-Codes sind für Spieler nicht lesbar', async () => {
  const { data } = await demoWith().from('creator_codes').select('*');
  assert.deepEqual(data, []);
});

await test('Kauf zum angezeigten Rabattpreis', async () => {
  await withSale('snake-neon', 30, async () => {
    const client = demoWith({ coins: 1000 });
    const { data, error } = await client.rpc('buy_item', { p_item: 'snake-neon', p_coins: 560, p_diamonds: 0 });
    assert.equal(error, null);
    assert.equal(data.coins, 440);
    const { data: inv } = await client.from('inventory').select('item_id');
    assert.ok(inv.some((r) => r.item_id === 'snake-neon'));
  });
});

await test('Kauf zu einem veralteten Preis wird abgelehnt', async () => {
  await withSale('snake-neon', 30, async () => {
    const client = demoWith({ coins: 1000 });
    const { error } = await client.rpc('buy_item', { p_item: 'snake-neon', p_coins: 800, p_diamonds: 0 });
    assert.equal(error?.message, 'Der Preis hat sich geändert.');
    const { data: profile } = await client.from('profiles').select('*').maybeSingle();
    assert.equal(profile.coins, 1000);
  });
});

await test('Exklusive Designs kann man nicht kaufen', async () => {
  const { error } = await demoWith({ coins: 99999, diamonds: 999 }).rpc('buy_item', { p_item: 'snake-galaxy', p_coins: 0, p_diamonds: 0 });
  assert.equal(error?.message, 'Dieses Design gibt es nur per Creator-Code.');
});

await test('Kauf mit zu wenig Guthaben wird abgelehnt', async () => {
  const { error } = await demoWith({ coins: 100 }).rpc('buy_item', { p_item: 'snake-fire', p_coins: 400, p_diamonds: 0 });
  assert.equal(error?.message, 'Nicht genug Guthaben');
});

await test('Tausch: Paket mit 5 Diamanten gibt 825 Coins', async () => {
  const client = demoWith({ coins: 10, diamonds: 7 });
  const { data, error } = await client.rpc('exchange_diamonds', { p_package: 'p5' });
  assert.equal(error, null);
  assert.equal(data.coins_gained, 825);
  assert.equal(data.coins, 835);
  assert.equal(data.diamonds, 2);
});

await test('Tausch mit zu wenig Diamanten wird abgelehnt', async () => {
  const client = demoWith({ diamonds: 3 });
  const { error } = await client.rpc('exchange_diamonds', { p_package: 'p5' });
  assert.equal(error?.message, 'Nicht genug Diamanten');
  const { data: profile } = await client.from('profiles').select('*').maybeSingle();
  assert.equal(profile.diamonds, 3);
});

await test('Code GAMEHUB gibt alle drei Galaxie-Designs und 300 Coins (Groß/Klein egal)', async () => {
  const client = demoWith({ coins: 50 });
  const { data, error } = await client.rpc('redeem_code', { p_code: ' gamehub ' });
  assert.equal(error, null);
  assert.deepEqual([...data.items].sort(), ['cube-galaxy', 'cubejump-galaxy', 'snake-galaxy']);
  assert.deepEqual([...data.new_items].sort(), ['cube-galaxy', 'cubejump-galaxy', 'snake-galaxy']);
  assert.equal(data.coins_gained, 300);
  assert.equal(data.coins, 350);
  const { data: inv } = await client.from('inventory').select('item_id');
  assert.ok(inv.some((r) => r.item_id === 'snake-galaxy'));
});

await test('Ein Code lässt sich nur einmal einlösen', async () => {
  const client = demoWith();
  await client.rpc('redeem_code', { p_code: 'GAMEHUB' });
  const { error } = await client.rpc('redeem_code', { p_code: 'GAMEHUB' });
  assert.equal(error?.message, 'Diesen Code hast du schon eingelöst.');
});

await test('Unbekannte Codes werden abgelehnt', async () => {
  const { error } = await demoWith().rpc('redeem_code', { p_code: 'GIBTSNICHT' });
  assert.equal(error?.message, 'Diesen Code gibt es nicht.');
});

await test('Abgelaufene und aufgebrauchte Codes werden abgelehnt', async () => {
  DEMO_CATALOG.creator_codes.push(
    { code: 'TEST-ALT', coins: 10, diamonds: 0, items: [], active: true, expires_at: iso(Date.now() - DAY), max_uses: null, uses: 0 },
    { code: 'TEST-VOLL', coins: 10, diamonds: 0, items: [], active: true, expires_at: null, max_uses: 1, uses: 1 },
  );
  try {
    const client = demoWith();
    assert.equal((await client.rpc('redeem_code', { p_code: 'test-alt' })).error?.message, 'Dieser Code ist abgelaufen.');
    assert.equal((await client.rpc('redeem_code', { p_code: 'test-voll' })).error?.message, 'Dieser Code wurde schon zu oft eingelöst.');
  } finally {
    DEMO_CATALOG.creator_codes.splice(-2, 2);
  }
});

await test('Exklusive Designs lassen sich erst nach dem Code ausrüsten', async () => {
  const client = demoWith();
  assert.equal((await client.rpc('equip_item', { p_item: 'snake-galaxy' })).error?.message, 'Artikel nicht im Besitz');
  await client.rpc('redeem_code', { p_code: 'GAMEHUB' });
  const { data, error } = await client.rpc('equip_item', { p_item: 'snake-galaxy' });
  assert.equal(error, null);
  assert.deepEqual(data, { slot: 'snake', item: 'snake-galaxy' });
});

// ---------- Erfolge manuell abholen (003_achievement_claims.sql) ----------

// Erste Snake-Runde mit 5 Äpfeln: 5 Coins für die Runde, Erfolg „Erste Runde“ wird freigeschaltet
const firstRound = (client) =>
  client.rpc('report_result', { p_game: 'snake', p_result: 'score', p_score: 5, p_duration_ms: 10000 });

await test('Freigeschaltete Erfolge schreiben die Belohnung nicht sofort gut', async () => {
  const client = demoWith();
  const { data, error } = await firstRound(client);
  assert.equal(error, null);
  assert.equal(data.coins, 5);
  assert.deepEqual(data.achievements.map((a) => [a.id, a.pending]), [['first-game', true]]);
  const { data: rows } = await client.from('user_achievements').select('*');
  assert.equal(rows.find((r) => r.achievement_id === 'first-game')?.reward_pending, true);
});

await test('Abholen schreibt die Belohnung genau einmal gut', async () => {
  const client = demoWith();
  await firstRound(client);
  const { data, error } = await client.rpc('claim_achievement', { p_achievement: 'first-game' });
  assert.equal(error, null);
  assert.equal(data.coins_gained, 50);
  assert.equal(data.coins, 55);
  const again = await client.rpc('claim_achievement', { p_achievement: 'first-game' });
  assert.equal(again.error?.message, 'Diese Belohnung hast du schon abgeholt.');
  const { data: rows } = await client.from('user_achievements').select('*');
  assert.equal(rows.find((r) => r.achievement_id === 'first-game')?.reward_pending, false);
});

await test('Nicht freigeschaltete Erfolge kann man nicht abholen', async () => {
  const { error } = await demoWith().rpc('claim_achievement', { p_achievement: 'snake-75' });
  assert.equal(error?.message, 'Diesen Erfolg hast du noch nicht freigeschaltet.');
});

if (failed) {
  console.log(`\n${failed} Prüfung(en) fehlgeschlagen`);
  process.exit(1);
}
console.log('\nAlle Prüfungen bestanden');
