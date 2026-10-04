// Coins, Diamanten, Glücksrad, Erfolge und Shop – das einzige Modul mit Backend-Zugriff.
// Die Oberfläche hört über onChange() auf Ereignisse; Spiele melden Runden über reportResult().
// Alle Wertänderungen passieren auf dem Server (Supabase-Funktionen, siehe supabase/migrations).
//
// Ereignisse: { type: 'state' } | { type: 'reward', coins, record } | { type: 'achievement', name, coins, diamonds }
//             | { type: 'guest', coins } | { type: 'error', message }

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const AFTER_LOGIN_KEY = 'gamehub-after-login';
const GAMES = ['snake', '2048', 'connect4', 'pairs', 'minesweeper', 'bricks', 'blocks', 'cubejump'];

// Demo-Modus zum Ausprobieren ohne Supabase (Daten nur im Browser): ?demo=1 an die Adresse hängen,
// ?demo=alles startet angemeldet mit allen Designs und reichlich Guthaben.
const demoParam = new URLSearchParams(location.search).get('demo');
const demo = !SUPABASE_URL && demoParam !== null;
export const enabled = demo || Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const emptyProfile = () => ({ coins: 0, diamonds: 0, spin_streak: 0, last_spin: null });

export const state = {
  ready: false,
  demo,
  user: null, // { id, name, avatar }
  profile: emptyProfile(),
  inventory: new Set(),
  equipped: {}, // Spiel → Artikel-ID
  stats: {}, // Spiel → { plays, wins, best_score, data }
  unlocked: new Map(), // Erfolg-ID → Datum
  catalog: { items: [], achievements: [], wheel: [], rules: [] },
};

let client = null;
let currentUid = null;
const listeners = new Set();

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(event) {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch (err) {
      console.error(err);
    }
  }
}

// ---------- Start, Login ----------

export async function init() {
  if (!enabled || client) return;
  try {
    if (demo) {
      const { createDemoClient } = await import('./demo-backend.js');
      client = createDemoClient({ ownAll: demoParam === 'alles' || demoParam === 'all' });
    } else {
      const { createClient } = await import(SUPABASE_JS);
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
    }
    // Im Callback keine Supabase-Aufrufe abwarten (kann sonst hängen) → entkoppeln
    client.auth.onAuthStateChange((_event, session) => setTimeout(() => applySession(session), 0));
    const [{ data }] = await Promise.all([client.auth.getSession(), loadCatalog()]);
    await applySession(data.session);
  } catch (err) {
    console.error('Backend nicht erreichbar', err);
  }
  state.ready = true;
  emit({ type: 'state' });
}

async function applySession(session) {
  const user = session?.user ?? null;
  const uid = user?.id ?? null;
  if (uid === currentUid) return;
  currentUid = uid;
  if (user) {
    const meta = user.user_metadata || {};
    state.user = {
      id: user.id,
      name: meta.full_name || meta.name || user.email || 'Spieler',
      avatar: meta.avatar_url || meta.picture || '',
    };
    await loadPlayer();
    restoreAfterLogin();
  } else {
    state.user = null;
    state.profile = emptyProfile();
    state.inventory = new Set();
    state.equipped = {};
    state.stats = {};
    state.unlocked = new Map();
  }
  emit({ type: 'state' });
}

// Nach dem Google-Login zurück zur vorherigen Seite und den Login-Code aus der Adresse entfernen
function restoreAfterLogin() {
  let hash = null;
  try {
    hash = sessionStorage.getItem(AFTER_LOGIN_KEY);
    sessionStorage.removeItem(AFTER_LOGIN_KEY);
  } catch {
    // Speicher nicht verfügbar
  }
  const params = new URLSearchParams(location.search);
  if (params.has('code')) {
    params.delete('code');
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${hash || location.hash}`);
    if (hash) dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (hash && hash !== location.hash) {
    location.hash = hash;
  }
}

export async function signIn() {
  if (!client) return;
  try {
    sessionStorage.setItem(AFTER_LOGIN_KEY, location.hash || '#/');
  } catch {
    // Speicher nicht verfügbar – dann landet man nach dem Login auf der Startseite
  }
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname + location.search },
  });
  if (error) emit({ type: 'error', message: 'Anmeldung fehlgeschlagen.' });
}

export async function signOut() {
  await client?.auth.signOut();
}

// ---------- Daten laden ----------

async function loadCatalog() {
  const [items, achievements, wheel, rules] = await Promise.all([
    client.from('shop_items').select('*').order('sort'),
    client.from('achievements').select('*').order('sort'),
    client.from('wheel_segments').select('*').order('idx'),
    client.from('reward_rules').select('*'),
  ]);
  state.catalog = {
    items: items.data || [],
    achievements: achievements.data || [],
    wheel: wheel.data || [],
    rules: rules.data || [],
  };
}

async function loadPlayer() {
  if (!client || !state.user) return;
  const [profile, inventory, equipped, unlocked, stats] = await Promise.all([
    client.from('profiles').select('coins, diamonds, spin_streak, last_spin').eq('id', state.user.id).maybeSingle(),
    client.from('inventory').select('item_id'),
    client.from('equipped').select('game, item_id'),
    client.from('user_achievements').select('achievement_id, unlocked_at'),
    client.from('game_stats').select('game, plays, wins, best_score, data'),
  ]);
  state.profile = profile.data || emptyProfile();
  state.inventory = new Set((inventory.data || []).map((r) => r.item_id));
  state.equipped = Object.fromEntries((equipped.data || []).map((r) => [r.game, r.item_id]));
  state.unlocked = new Map((unlocked.data || []).map((r) => [r.achievement_id, r.unlocked_at]));
  state.stats = Object.fromEntries((stats.data || []).map((r) => [r.game, r]));
}

export async function refresh() {
  await loadPlayer();
  emit({ type: 'state' });
}

// ---------- Abfragen für die Oberfläche ----------

export const isFree = (item) => !item.price_coins && !item.price_diamonds;

export function owns(itemId) {
  const item = state.catalog.items.find((i) => i.id === itemId);
  return Boolean(item) && (isFree(item) || state.inventory.has(itemId));
}

// Aktives Design eines Spiels (ohne Login: das Gratis-Design)
export function getEquipped(game) {
  const id = state.user && state.equipped[game];
  if (id) return id;
  return state.catalog.items.find((i) => i.game === game && isFree(i))?.id || `${game}-classic`;
}

export function todayBerlin() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
}

function yesterdayBerlin() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() - 864e5));
}

export const canSpin = () => Boolean(state.user) && state.profile.last_spin !== todayBerlin();

// Laufende Serie (verpasster Tag = Serie vorbei, auch wenn der Server sie erst beim nächsten Dreh zurücksetzt)
export function currentStreak() {
  const last = state.profile.last_spin;
  return last === todayBerlin() || last === yesterdayBerlin() ? state.profile.spin_streak || 0 : 0;
}

// Fortschritt eines Erfolgs (gleiche Regeln wie achievement_value in der Datenbank)
export function achievementValue(a) {
  if (!a.game) {
    const all = Object.values(state.stats);
    if (a.stat === 'plays_total') return all.reduce((n, s) => n + (s.plays || 0), 0);
    if (a.stat === 'games_played') return all.filter((s) => s.plays > 0).length;
    if (a.stat === 'spin_streak') return currentStreak();
    return 0;
  }
  const s = state.stats[a.game];
  if (!s) return 0;
  if (a.stat === 'plays' || a.stat === 'wins' || a.stat === 'best_score') return s[a.stat] || 0;
  return Number(s.data?.[a.stat]) || 0;
}

// Geschätzte Coins für Gäste („diese Runde hätte dir … gebracht“)
export function estimateCoins(game, result, difficulty = '', score = 0) {
  const rule = state.catalog.rules
    .filter((r) => r.game === game && r.result === result && (r.difficulty === difficulty || r.difficulty === ''))
    .sort((a, b) => b.difficulty.localeCompare(a.difficulty))[0];
  if (!rule) return 0;
  let coins = rule.per_points ? Math.floor(score / rule.per_points) : rule.coins;
  if (rule.max_coins != null) coins = Math.min(coins, rule.max_coins);
  return coins;
}

// ---------- Aktionen ----------

function applyBalance(data) {
  if (typeof data?.coins === 'number') {
    state.profile = { ...state.profile, coins: data.coins, diamonds: data.diamonds };
  }
}

function announceAchievements(list) {
  for (const a of list || []) emit({ type: 'achievement', ...a });
}

// Runde melden. result: 'win' | 'loss' | 'draw' | 'score'
export async function reportResult(game, { result, difficulty = '', score = 0, durationMs = 0, extra = {} } = {}) {
  if (!client || !GAMES.includes(game)) return null;
  if (!state.user) {
    emit({ type: 'guest', coins: estimateCoins(game, result, difficulty, score) });
    return null;
  }
  const { data, error } = await client.rpc('report_result', {
    p_game: game,
    p_result: result,
    p_difficulty: difficulty,
    p_score: Math.max(0, Math.round(score)),
    p_duration_ms: Math.max(0, Math.round(durationMs)),
    p_extra: extra,
  });
  if (error) {
    console.error(error);
    emit({ type: 'error', message: 'Coins konnten nicht gutgeschrieben werden.' });
    return null;
  }
  applyBalance(data);
  if (data.counted) {
    emit({ type: 'reward', coins: data.coins_gained, record: data.record });
    announceAchievements(data.achievements);
    loadPlayer().then(() => emit({ type: 'state' })); // Statistik und Erfolge nachladen
  }
  emit({ type: 'state' });
  return data;
}

// Glücksrad drehen. Der Kontostand wird erst nach der Animation übernommen (applySpin).
export async function spin() {
  if (!client || !state.user) throw new Error('Nicht angemeldet');
  const { data, error } = await client.rpc('claim_daily_spin');
  if (error) {
    await refresh();
    throw error;
  }
  state.profile = { ...state.profile, last_spin: todayBerlin() };
  emit({ type: 'state' });
  return data;
}

export function applySpin(data) {
  state.profile = { ...state.profile, coins: data.coins, diamonds: data.diamonds, spin_streak: data.streak, last_spin: todayBerlin() };
  announceAchievements(data.achievements);
  emit({ type: 'state' });
}

export async function buy(itemId) {
  const { data, error } = await client.rpc('buy_item', { p_item: itemId });
  if (error) throw error;
  applyBalance(data);
  state.inventory.add(itemId);
  emit({ type: 'state' });
}

// Nur im Demo-Modus: alles freischalten bzw. die Demo-Daten zurücksetzen
export async function demoUnlockAll() {
  if (!demo || !client) return;
  await client.rpc('demo_unlock_all');
  await refresh();
}

export async function demoReset() {
  if (!demo || !client) return;
  await client.rpc('demo_reset');
  await refresh();
}

export async function equip(itemId) {
  const { data, error } = await client.rpc('equip_item', { p_item: itemId });
  if (error) throw error;
  state.equipped = { ...state.equipped, [data.game]: data.item };
  emit({ type: 'state' });
}
