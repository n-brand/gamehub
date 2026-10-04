import { CATEGORIES, GAMES, getGame } from './games.js';
import * as store from './storage.js';
import { art } from './art.js';

const app = document.getElementById('app');
const search = document.getElementById('search');

let cleanupGame = null;
let activeCategory = null;

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function themeVars(game) {
  return `--bg:${game.theme.bg};--edge:${game.theme.edge};--ink:${game.theme.ink}`;
}

function badgeFor(game) {
  const text = game.available ? game.badge : 'Bald';
  return text ? `<span class="badge ${game.available ? '' : 'badge--soon'}">${escapeHtml(text)}</span>` : '';
}

const STAR_ON = '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor"/></svg>';
const STAR_OFF = '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

function favButton(game) {
  const on = store.isFavorite(game.id);
  const label = on ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen';
  return `<button class="fav-btn ${on ? 'is-on' : ''}" data-fav="${game.id}" title="${label}" aria-label="${label}" aria-pressed="${on}">${on ? STAR_ON : STAR_OFF}</button>`;
}

// Spielbare Spiele: Karte mit unsichtbarem Link über der ganzen Fläche (damit der
// Favoriten-Button daneben klickbar bleibt). Geplante Spiele: nur Kachel.
function cardTag(game, cls, inner) {
  return game.available
    ? `<div class="${cls} is-playable" style="${themeVars(game)}"><a class="card-link" href="#/game/${game.id}" aria-label="${escapeHtml(game.title)} spielen"></a>${inner}${favButton(game)}</div>`
    : `<div class="${cls} is-soon" style="${themeVars(game)}" title="Bald verfügbar">${inner}</div>`;
}

function tile(game) {
  return cardTag(
    game,
    'tile',
    `${badgeFor(game)}
     <div class="tile-art">${art(game)}</div>
     <div class="tile-foot">
       <span class="tile-name">${escapeHtml(game.title)}</span>
       <span class="tile-cats">${game.categories.join(' · ')}</span>
     </div>`,
  );
}

function featureCard(game) {
  return cardTag(
    game,
    'feature',
    `${badgeFor(game)}
     <div class="feature-art">${art(game)}</div>
     <div class="feature-body">
       <h3>${escapeHtml(game.title)}</h3>
       <p>${escapeHtml(game.teaser || '')}</p>
       <span class="feature-link">${game.available ? 'Jetzt spielen' : 'Bald verfügbar'} <span class="arrow">→</span></span>
     </div>`,
  );
}

function section(title, games) {
  if (!games.length) return '';
  return `<section><h2>${title}</h2><div class="grid">${games.map(tile).join('')}</div></section>`;
}

// ---------- Übersicht ----------

function renderOverview() {
  const q = search.value.trim().toLowerCase();
  let games = GAMES;
  if (activeCategory) games = games.filter((g) => g.categories.includes(activeCategory));
  if (q) games = games.filter((g) => g.title.toLowerCase().includes(q));
  // Spielbare Spiele zuerst
  games = [...games].sort((a, b) => Number(b.available) - Number(a.available));

  const byId = (id) => getGame(id);
  const recent = store.getRecent().map(byId).filter(Boolean);
  const favorites = store.getFavorites().map(byId).filter(Boolean);
  const filtering = q || activeCategory;

  app.innerHTML = `
    ${filtering ? '' : `<section class="hero"><h1>Spiel sofort los.</h1><p>Keine Installation, kein Login – einfach im Browser spielen.</p></section><div class="features">${GAMES.filter((g) => g.featured).map(featureCard).join('')}</div>`}
    <nav class="chips">
      <button class="chip ${activeCategory ? '' : 'chip--active'}" data-cat="">Alle</button>
      ${CATEGORIES.map((c) => `<button class="chip ${c === activeCategory ? 'chip--active' : ''}" data-cat="${c}">${c}</button>`).join('')}
    </nav>
    ${filtering ? '' : section('Zuletzt gespielt', recent)}
    ${filtering ? '' : section('Favoriten', favorites)}
    ${games.length ? section(filtering ? 'Ergebnisse' : 'Alle Spiele', games) : '<p class="empty">Keine Spiele gefunden.</p>'}
  `;

  app.querySelectorAll('.chip').forEach((btn) =>
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat || null;
      renderOverview();
    }),
  );
}

// Favoriten-Stern auf Kacheln und Feature-Karten (Übersicht und „Ähnliche Spiele“)
app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-fav]');
  if (!btn) return;
  e.preventDefault();
  const id = btn.dataset.fav;
  store.toggleFavorite(id);
  if (location.hash.startsWith('#/game/')) {
    // „Ähnliche Spiele“ enthält das aktuelle Spiel nie, also nur den geklickten Stern tauschen
    btn.outerHTML = favButton(getGame(id));
  } else {
    // Abschnitt „Favoriten“ neu aufbauen, Scrollposition behalten
    const y = window.scrollY;
    renderOverview();
    window.scrollTo(0, y);
  }
});

// ---------- Spieleseite ----------

async function renderGame(id) {
  const game = getGame(id);
  if (!game || !game.available) {
    location.hash = '#/';
    return;
  }
  store.addRecent(id);

  const others = GAMES.filter((g) => g.id !== id && g.categories.some((c) => game.categories.includes(c)));

  app.innerHTML = `
    <div class="game-page">
      <div class="game-stage">
      <div class="game-head">
        <a href="#/" class="back">← Alle Spiele</a>
        <h1>${escapeHtml(game.title)}</h1>
        <div class="game-actions">
          <button class="btn" id="fav"></button>
          <button class="btn" id="fullscreen">⛶ Vollbild</button>
        </div>
      </div>
      <div class="game-frame" id="frame" style="${themeVars(game)}"></div>
      </div>
      <div class="game-info">
        <p>${escapeHtml(game.description)}</p>
        <p><strong>Steuerung:</strong> ${escapeHtml(game.controls)}</p>
        <p class="cats">${game.categories.map((c) => `<span class="cat">${c}</span>`).join('')}</p>
      </div>
      ${section('Ähnliche Spiele', others)}
    </div>
  `;

  const favBtn = app.querySelector('#fav');
  const updateFav = (on) => (favBtn.textContent = on ? '★ Favorit' : '☆ Favorit');
  updateFav(store.isFavorite(id));
  favBtn.addEventListener('click', () => updateFav(store.toggleFavorite(id)));

  const frame = app.querySelector('#frame');
  app.querySelector('#fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else frame.requestFullscreen?.();
  });

  const mod = await import(`../games/${id}.js`);
  // Seite könnte inzwischen gewechselt sein
  if (!frame.isConnected) return;
  cleanupGame = mod.mount(frame, {
    getHighscore: () => store.getHighscore(id),
    submitScore: (score) => store.submitScore(id, score),
  });
}

// ---------- Routing ----------

function route() {
  if (cleanupGame) {
    cleanupGame();
    cleanupGame = null;
  }
  const match = location.hash.match(/^#\/game\/([\w-]+)/);
  if (match) {
    renderGame(match[1]);
  } else {
    renderOverview();
  }
  window.scrollTo(0, 0);
}

search.addEventListener('input', () => {
  if (location.hash.startsWith('#/game/')) location.hash = '#/';
  else renderOverview();
});

// ---------- Theme (Standard: dark) ----------

const themeBtn = document.getElementById('theme-toggle');
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>';

function updateThemeButton() {
  const light = document.documentElement.dataset.theme === 'light';
  // Zeigt das Ziel-Theme an
  themeBtn.innerHTML = light ? MOON : SUN;
  themeBtn.title = light ? 'Dunkles Design' : 'Helles Design';
  themeBtn.setAttribute('aria-label', themeBtn.title);
}

themeBtn.addEventListener('click', () => {
  const light = document.documentElement.dataset.theme !== 'light';
  if (light) document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem('gamehub-theme', light ? 'light' : 'dark');
  } catch {
    // Speicher nicht verfügbar – Theme gilt dann nur für diese Sitzung
  }
  updateThemeButton();
});
updateThemeButton();

window.addEventListener('hashchange', route);
route();
