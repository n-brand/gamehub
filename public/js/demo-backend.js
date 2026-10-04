// Demo-Backend für ?demo=1: ahmt die Supabase-Schnittstelle im Browser nach (Daten in localStorage),
// damit sich Coins, Glücksrad, Erfolge und Shop ohne eigenes Supabase-Projekt ausprobieren lassen.
// Die Regeln entsprechen vereinfacht supabase/migrations/001_economy.sql – Kataloge bei Änderungen dort
// hier mitziehen. Nur zum Testen gedacht: alles liegt im Browser und ist frei veränderbar.

const KEY = 'gamehub-demo-db';
const USER = { id: 'demo-user', email: 'demo@gamehub.local', user_metadata: { full_name: 'Demo-Spieler' } };
const FACTORS = [1.0, 1.2, 1.4, 1.5, 1.6, 1.8, 2.0];

const CATALOG = {
  reward_rules: [
    ['snake', '', 'score', 0, 1, 100, 2],
    ['2048', '', 'score', 0, 200, 150, 5],
    ['blocks', '', 'score', 0, 250, 150, 5],
    ['bricks', '', 'score', 0, 100, 100, 5],
    ['pairs', 'easy', 'win', 5, null, null, 3],
    ['pairs', 'medium', 'win', 10, null, null, 6],
    ['pairs', 'hard', 'win', 20, null, null, 10],
    ['minesweeper', 'easy', 'win', 10, null, null, 2],
    ['minesweeper', 'medium', 'win', 40, null, null, 10],
    ['minesweeper', 'hard', 'win', 120, null, null, 25],
    ['connect4', 'easy', 'win', 5, null, null, 5],
    ['connect4', 'medium', 'win', 15, null, null, 5],
    ['connect4', 'hard', 'win', 40, null, null, 5],
    ['connect4', 'ultra', 'win', 100, null, null, 5],
    ['connect4', 'easy', 'draw', 2, null, null, 20],
    ['connect4', 'medium', 'draw', 7, null, null, 20],
    ['connect4', 'hard', 'draw', 20, null, null, 20],
    ['connect4', 'ultra', 'draw', 50, null, null, 20],
    ['cubejump', 'easy', 'win', 30, null, null, 28],
    ['cubejump', 'medium', 'win', 60, null, null, 27],
    ['cubejump', 'hard', 'win', 150, null, null, 26],
  ].map(([game, difficulty, result, coins, per_points, max_coins, min_seconds]) => ({ game, difficulty, result, coins, per_points, max_coins, min_seconds })),
  wheel_segments: [
    [0, 25, 0, 25], [1, 50, 0, 22], [2, 75, 0, 18], [3, 100, 0, 14],
    [4, 150, 0, 10], [5, 250, 0, 6], [6, 0, 1, 4], [7, 0, 5, 1],
  ].map(([idx, coins, diamonds, weight]) => ({ idx, coins, diamonds, weight })),
  achievements: [
    ['first-game', null, 'Erste Runde', 'Spiele deine erste Runde.', 'plays_total', 1, 50, 0, 10],
    ['all-games', null, 'Allrounder', 'Spiele jedes der 8 Spiele mindestens einmal.', 'games_played', 8, 200, 0, 20],
    ['rounds-500', null, 'Dauerbrenner', 'Spiele 500 Runden.', 'plays_total', 500, 0, 5, 30],
    ['streak-30', null, 'Treue Seele', 'Drehe 30 Tage in Folge am Glücksrad.', 'spin_streak', 30, 0, 10, 40],
    ['snake-25', 'snake', 'Hungrig', 'Friss 25 Äpfel in einer Runde.', 'best_score', 25, 100, 0, 100],
    ['snake-75', 'snake', 'Nimmersatt', 'Friss 75 Äpfel in einer Runde.', 'best_score', 75, 0, 3, 110],
    ['2048-2048', '2048', 'Geschafft!', 'Erreiche die 2048-Kachel.', 'max_tile', 2048, 200, 0, 200],
    ['2048-4096', '2048', 'Doppelt hält besser', 'Erreiche die 4096-Kachel.', 'max_tile', 4096, 0, 5, 210],
    ['blocks-quad', 'blocks', 'Vierer', 'Räume 4 Reihen auf einmal ab.', 'quads', 1, 100, 0, 300],
    ['blocks-level10', 'blocks', 'Blockmeister', 'Erreiche Level 10.', 'max_level', 10, 0, 3, 310],
    ['bricks-level3', 'bricks', 'Mauerspecht', 'Erreiche Level 3.', 'max_level', 3, 150, 0, 400],
    ['bricks-all', 'bricks', 'Abrissbirne', 'Schaffe alle 5 Level.', 'max_level', 6, 0, 5, 410],
    ['pairs-10', 'pairs', 'Gutes Gedächtnis', 'Gewinne 10 Runden.', 'wins', 10, 100, 0, 500],
    ['pairs-perfect', 'pairs', 'Fotografisches Gedächtnis', 'Finde bei 30 Karten alle Paare in höchstens 25 Zügen.', 'perfect30', 1, 0, 3, 510],
    ['mines-medium', 'minesweeper', 'Minensucher', 'Gewinne auf Mittel.', 'wins_medium', 1, 150, 0, 600],
    ['mines-hard', 'minesweeper', 'Minenexperte', 'Gewinne auf Schwer.', 'wins_hard', 1, 0, 5, 610],
    ['c4-hard', 'connect4', 'Taktiker', 'Besiege den Computer auf Schwer.', 'wins_hard', 1, 200, 0, 700],
    ['c4-ultra', 'connect4', 'Unbesiegbar?', 'Besiege den Computer auf Ultra.', 'wins_ultra', 1, 0, 10, 710],
    ['c4-100', 'connect4', 'Seriensieger', 'Gewinne 100-mal gegen den Computer (jede Stärke).', 'wins', 100, 0, 10, 720],
    ['jump-easy', 'cubejump', 'Erster Sprung', 'Schaffe in Würfelsprung das Level Leicht.', 'wins_easy', 1, 100, 0, 800],
    ['jump-medium', 'cubejump', 'Im Takt', 'Schaffe in Würfelsprung das Level Mittel.', 'wins_medium', 1, 200, 0, 810],
    ['jump-hard', 'cubejump', 'Würfelmeister', 'Schaffe in Würfelsprung das Level Schwer.', 'wins_hard', 1, 0, 5, 820],
  ].map(([id, game, name, description, stat, threshold, reward_coins, reward_diamonds, sort]) => ({
    id, game, name, description, stat, threshold, reward_coins, reward_diamonds, sort,
  })),
  shop_items: [
    ['snake-classic', 'snake', 'snake', 'Klassisch', 0, 0, 0],
    ['snake-fire', 'snake', 'snake', 'Feuer', 400, 0, 10],
    ['snake-zebra', 'snake', 'snake', 'Zebra', 600, 0, 20],
    ['snake-neon', 'snake', 'snake', 'Neon', 800, 0, 30],
    ['snake-rainbow', 'snake', 'snake', 'Regenbogen', 0, 5, 40],
    ['snake-gold', 'snake', 'snake', 'Gold', 0, 10, 50],
    ['cubejump-classic', 'cubejump', 'cubejump-theme', 'Klassisch', 0, 0, 100],
    ['cubejump-sunset', 'cubejump', 'cubejump-theme', 'Sonnenuntergang', 400, 0, 110],
    ['cubejump-ice', 'cubejump', 'cubejump-theme', 'Eis', 600, 0, 120],
    ['cubejump-neon', 'cubejump', 'cubejump-theme', 'Neon', 800, 0, 130],
    ['cubejump-lava', 'cubejump', 'cubejump-theme', 'Lava', 0, 5, 140],
    ['cubejump-gold', 'cubejump', 'cubejump-theme', 'Gold', 0, 10, 150],
    ['cube-classic', 'cubejump', 'cubejump-skin', 'Klassisch', 0, 0, 200],
    ['cube-fire', 'cubejump', 'cubejump-skin', 'Feuer', 300, 0, 210],
    ['cube-ice', 'cubejump', 'cubejump-skin', 'Eiswürfel', 300, 0, 220],
    ['cube-slime', 'cubejump', 'cubejump-skin', 'Schleim', 500, 0, 230],
    ['cube-robot', 'cubejump', 'cubejump-skin', 'Roboter', 500, 0, 240],
    ['cube-ninja', 'cubejump', 'cubejump-skin', 'Ninja', 700, 0, 250],
    ['cube-diamond', 'cubejump', 'cubejump-skin', 'Diamant', 0, 5, 260],
    ['cube-crown', 'cubejump', 'cubejump-skin', 'König', 0, 8, 270],
  ].map(([id, game, slot, name, price_coins, price_diamonds, sort]) => ({ id, game, slot, name, price_coins, price_diamonds, sort })),
};

const today = (offset = 0) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + offset * 864e5));

const freshDb = () => ({
  loggedIn: false,
  profile: { coins: 0, diamonds: 0, spin_streak: 0, last_spin: null },
  game_stats: {},
  inventory: [],
  equipped: {},
  user_achievements: [],
});

function load() {
  try {
    const db = JSON.parse(localStorage.getItem(KEY));
    if (db) return db;
  } catch {
    // kaputte oder fehlende Daten → neu anfangen
  }
  return freshDb();
}

// ownAll: angemeldet starten und alles besitzen (?demo=alles)
export function createDemoClient({ ownAll = false } = {}) {
  const db = load();
  const authListeners = new Set();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      // Speicher nicht verfügbar – Demo gilt nur bis zum Neuladen
    }
  };

  // Alle Designs besitzen und reichlich Guthaben haben
  const unlockAll = () => {
    db.loggedIn = true;
    db.inventory = CATALOG.shop_items.filter((i) => i.price_coins || i.price_diamonds).map((i) => i.id);
    db.profile.coins = Math.max(db.profile.coins, 99999);
    db.profile.diamonds = Math.max(db.profile.diamonds, 999);
    save();
  };
  if (ownAll) unlockAll();

  const tableRows = (table) => {
    if (CATALOG[table]) return CATALOG[table];
    if (!db.loggedIn) return [];
    switch (table) {
      case 'profiles':
        return [{ id: USER.id, ...db.profile }];
      case 'inventory':
        return db.inventory.map((item_id) => ({ item_id }));
      case 'equipped':
        return Object.entries(db.equipped).map(([slot, item_id]) => ({ slot, item_id }));
      case 'user_achievements':
        return db.user_achievements;
      case 'game_stats':
        return Object.entries(db.game_stats).map(([game, s]) => ({ game, ...s }));
      default:
        return [];
    }
  };

  // Minimaler Abfrage-Baustein: select/eq/order/maybeSingle, mit await auflösbar
  function from(table) {
    const filters = [];
    let orderBy = null;
    const run = () => {
      let rows = tableRows(table).filter((r) => filters.every(([col, val]) => r[col] === val));
      if (orderBy) rows = [...rows].sort((a, b) => (a[orderBy] > b[orderBy] ? 1 : -1));
      return rows;
    };
    const builder = {
      select: () => builder,
      eq: (col, val) => {
        filters.push([col, val]);
        return builder;
      },
      order: (col) => {
        orderBy = col;
        return builder;
      },
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then: (resolve, reject) => Promise.resolve({ data: run(), error: null }).then(resolve, reject),
    };
    return builder;
  }

  const int = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);

  function statValue(a) {
    if (!a.game) {
      const all = Object.values(db.game_stats);
      if (a.stat === 'plays_total') return all.reduce((n, s) => n + s.plays, 0);
      if (a.stat === 'games_played') return all.filter((s) => s.plays > 0).length;
      if (a.stat === 'spin_streak') return db.profile.spin_streak;
      return 0;
    }
    const s = db.game_stats[a.game];
    if (!s) return 0;
    if (['plays', 'wins', 'best_score'].includes(a.stat)) return s[a.stat];
    return int(s.data[a.stat]);
  }

  function checkAchievements() {
    const fresh = [];
    for (const a of CATALOG.achievements) {
      if (db.user_achievements.some((u) => u.achievement_id === a.id)) continue;
      if (statValue(a) >= a.threshold) {
        db.user_achievements.push({ achievement_id: a.id, unlocked_at: new Date().toISOString() });
        db.profile.coins += a.reward_coins;
        db.profile.diamonds += a.reward_diamonds;
        fresh.push({ id: a.id, name: a.name, coins: a.reward_coins, diamonds: a.reward_diamonds });
      }
    }
    return fresh;
  }

  const fail = (message) => ({ data: null, error: { message } });

  const rpcs = {
    report_result({ p_game, p_result, p_difficulty = '', p_score = 0, p_duration_ms = 0, p_extra = {} }) {
      const seconds = p_duration_ms / 1000;
      const stats = (db.game_stats[p_game] ||= { plays: 0, wins: 0, best_score: 0, data: {} });
      const rule = CATALOG.reward_rules
        .filter((r) => r.game === p_game && r.result === p_result && (r.difficulty === p_difficulty || r.difficulty === ''))
        .sort((a, b) => b.difficulty.localeCompare(a.difficulty))[0];
      const counted = seconds >= 2 && (!rule || seconds >= rule.min_seconds);
      let gain = 0;
      let record = false;
      let fresh = [];
      if (counted) {
        if (rule) {
          gain = rule.per_points ? Math.floor(p_score / rule.per_points) : rule.coins;
          if (rule.max_coins != null) gain = Math.min(gain, rule.max_coins);
        }
        if (p_result === 'score' && stats.best_score > 0 && p_score > stats.best_score) {
          gain += 10;
          record = true;
        }
        if (p_game === '2048' && int(p_extra.maxTile) >= 2048) gain += 50;
        const d = stats.data;
        if (p_result === 'win' && p_difficulty) d[`wins_${p_difficulty}`] = int(d[`wins_${p_difficulty}`]) + 1;
        if ('maxTile' in p_extra) d.max_tile = Math.max(int(d.max_tile), int(p_extra.maxTile));
        if ('level' in p_extra) d.max_level = Math.max(int(d.max_level), int(p_extra.level));
        if ('quads' in p_extra) d.quads = int(d.quads) + int(p_extra.quads);
        if (p_game === 'pairs' && p_difficulty === 'hard' && p_result === 'win' && int(p_extra.moves) >= 15 && int(p_extra.moves) <= 25) {
          d.perfect30 = int(d.perfect30) + 1;
        }
        stats.plays++;
        if (p_result === 'win') stats.wins++;
        stats.best_score = Math.max(stats.best_score, p_score);
        db.profile.coins += gain;
        fresh = checkAchievements();
      }
      return { data: { counted, coins_gained: gain, record, coins: db.profile.coins, diamonds: db.profile.diamonds, achievements: fresh }, error: null };
    },

    claim_daily_spin() {
      const p = db.profile;
      if (p.last_spin === today()) return fail('Heute schon gedreht');
      const streak = p.last_spin === today(-1) ? p.spin_streak + 1 : 1;
      const total = CATALOG.wheel_segments.reduce((n, s) => n + s.weight, 0);
      let roll = Math.random() * total;
      const seg = CATALOG.wheel_segments.find((s) => (roll -= s.weight) < 0) || CATALOG.wheel_segments.at(-1);
      const factor = FACTORS[Math.min(streak, 7) - 1];
      const coins = Math.round(seg.coins * factor);
      const bonus = streak % 7 === 0 ? 1 : 0;
      const diamonds = seg.diamonds + bonus;
      p.coins += coins;
      p.diamonds += diamonds;
      p.spin_streak = streak;
      p.last_spin = today();
      const fresh = checkAchievements();
      return {
        data: { segment: seg.idx, coins_gained: coins, diamonds_gained: diamonds, streak, streak_bonus: bonus, factor, coins: p.coins, diamonds: p.diamonds, achievements: fresh },
        error: null,
      };
    },

    buy_item({ p_item }) {
      const item = CATALOG.shop_items.find((i) => i.id === p_item);
      if (!item) return fail('Unbekannter Artikel');
      const p = db.profile;
      const free = !item.price_coins && !item.price_diamonds;
      if (!free && !db.inventory.includes(p_item)) {
        if (p.coins < item.price_coins || p.diamonds < item.price_diamonds) return fail('Nicht genug Guthaben');
        p.coins -= item.price_coins;
        p.diamonds -= item.price_diamonds;
        db.inventory.push(p_item);
      }
      return { data: { owned: true, coins: p.coins, diamonds: p.diamonds }, error: null };
    },

    equip_item({ p_item }) {
      const item = CATALOG.shop_items.find((i) => i.id === p_item);
      if (!item) return fail('Unbekannter Artikel');
      const free = !item.price_coins && !item.price_diamonds;
      if (!free && !db.inventory.includes(p_item)) return fail('Artikel nicht im Besitz');
      db.equipped[item.slot] = p_item;
      return { data: { slot: item.slot, item: p_item }, error: null };
    },

    // Nur im Demo-Modus: alles freischalten bzw. von vorn beginnen (angemeldet bleiben)
    demo_unlock_all() {
      unlockAll();
      return { data: true, error: null };
    },

    demo_reset() {
      Object.assign(db, freshDb(), { loggedIn: true });
      return { data: true, error: null };
    },
  };

  const notify = (event, session) => authListeners.forEach((cb) => cb(event, session));

  return {
    from,
    async rpc(name, params = {}) {
      if (!db.loggedIn) return fail('Nicht angemeldet');
      const result = rpcs[name]?.(params) ?? fail(`Unbekannte Funktion ${name}`);
      save();
      return result;
    },
    auth: {
      getSession: async () => ({ data: { session: db.loggedIn ? { user: USER } : null } }),
      onAuthStateChange(cb) {
        authListeners.add(cb);
        return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
      },
      async signInWithOAuth() {
        db.loggedIn = true;
        save();
        notify('SIGNED_IN', { user: USER });
        return { error: null };
      },
      async signOut() {
        db.loggedIn = false;
        save();
        notify('SIGNED_OUT', null);
        return { error: null };
      },
    },
  };
}
