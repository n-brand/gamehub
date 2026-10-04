// Lokale Speicherung (zuletzt gespielt, Favoriten, Highscores). Ohne Login nur im Browser.
const KEY = 'gamehub';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Speicher nicht verfügbar (privates Fenster o. Ä.) – ignorieren
  }
}

export function getRecent() {
  return load().recent || [];
}

export function addRecent(id) {
  const data = load();
  data.recent = [id, ...(data.recent || []).filter((x) => x !== id)].slice(0, 8);
  save(data);
}

export function getFavorites() {
  return load().favorites || [];
}

export function isFavorite(id) {
  return getFavorites().includes(id);
}

export function toggleFavorite(id) {
  const data = load();
  const favs = data.favorites || [];
  data.favorites = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
  save(data);
  return data.favorites.includes(id);
}

export function getHighscore(id) {
  return (load().highscores || {})[id] || 0;
}

export function submitScore(id, score) {
  const data = load();
  data.highscores = data.highscores || {};
  if (score > (data.highscores[id] || 0)) {
    data.highscores[id] = score;
    save(data);
    return true;
  }
  return false;
}
