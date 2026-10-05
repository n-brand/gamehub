import { CATEGORIES, GAMES, getGame } from './games.js';
import * as store from './storage.js';
import { art } from './art.js';
import * as economy from './economy.js';
import { initEconomyUI, renderShop, renderAchievements } from './ui-economy.js';
import { renderMenu } from './game-menu.js';
import { renderLegal } from './legal.js';
import { dropdown } from './ui.js';

const app = document.getElementById('app');
const search = document.getElementById('search');

let cleanupGame = null; // Aufräumen der aktuellen Seite (Spiel, Shop, Erfolge)
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

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Farben fast gleich? (Abstand im RGB-Raum)
function similarColors(a, b) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2) < 70;
}

function badgeFor(game) {
  const soon = !game.available;
  const text = soon ? 'Bald' : game.badge;
  if (!text) return '';
  const accent = getComputedStyle(document.documentElement).getPropertyValue(soon ? '--blue' : '--yellow').trim();
  const classes = ['badge', soon && 'badge--soon', similarColors(game.theme.bg, accent) && 'badge--alt'].filter(Boolean);
  return `<span class="${classes.join(' ')}">${escapeHtml(text)}</span>`;
}

const STAR_ON = '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor"/></svg>';
const STAR_OFF = '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const GRID_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/></svg>';
const EXIT_FULLSCREEN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
const FULLSCREEN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

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

function section(title, games) {
  if (!games.length) return '';
  return `<section><h2>${title}</h2><div class="grid">${games.map(tile).join('')}</div></section>`;
}

// ---------- Übersicht ----------

const FAV = '★'; // Filter „Favoriten“ in der Chip-Reihe (activeCategory === FAV)

function renderOverview() {
  const q = search.value.trim().toLowerCase();
  let games = GAMES;
  if (activeCategory === FAV) {
    const favs = store.getFavorites();
    games = games.filter((g) => favs.includes(g.id));
  } else if (activeCategory) {
    games = games.filter((g) => g.categories.includes(activeCategory));
  }
  if (q) games = games.filter((g) => g.title.toLowerCase().includes(q));
  // Spielbare Spiele zuerst
  games = [...games].sort((a, b) => Number(b.available) - Number(a.available));

  const title = q ? 'Ergebnisse' : activeCategory === FAV ? 'Favoriten' : activeCategory || 'Alle Spiele';
  const empty =
    activeCategory === FAV && !q
      ? '<p class="empty">Noch keine Favoriten – tippe auf den Stern einer Spiele-Kachel.</p>'
      : '<p class="empty">Keine Spiele gefunden.</p>';

  const filters = [['', 'Alle Spiele'], [FAV, '★ Favoriten'], ...CATEGORIES.map((c) => [c, c])];
  app.innerHTML = `
    <nav class="chips chips--sticky chips--collapse">
      <button class="chip ${activeCategory ? '' : 'chip--active'}" data-cat="">Alle</button>
      <button class="chip ${activeCategory === FAV ? 'chip--active' : ''}" data-cat="${FAV}">★ Favoriten</button>
      ${CATEGORIES.map((c) => `<button class="chip ${c === activeCategory ? 'chip--active' : ''}" data-cat="${c}">${c}</button>`).join('')}
    </nav>
    <section>
      <div class="section-head">
        <h2>${title}</h2>
        ${dropdown({ name: 'cat', options: filters, value: activeCategory || '', label: 'Filter', ariaLabel: 'Spiele filtern', align: 'end' })}
      </div>
      ${games.length ? `<div class="grid">${games.map(tile).join('')}</div>` : empty}
    </section>
  `;

  app.querySelectorAll('.chip[data-cat]').forEach((btn) =>
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat || null;
      renderOverview();
    }),
  );
}

// Filter-Dropdown auf dem Handy (statt der Chip-Reihe)
app.addEventListener('dropdown-change', (e) => {
  if (e.detail.name !== 'cat') return;
  activeCategory = e.detail.value || null;
  renderOverview();
});

// Favoriten-Stern auf Kacheln (Übersicht und „Ähnliche Spiele“)
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
    // Übersicht neu aufbauen (Stern, Favoriten-Filter), Scrollposition behalten
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
        <a href="#/" class="back" aria-label="Alle Spiele"><span aria-hidden="true">←</span><span class="back-label"> Alle Spiele</span></a>
        <h1>${escapeHtml(game.title)}</h1>
        <div class="game-actions">
          <button class="btn" id="menu" hidden title="Spielmenü" aria-label="Spielmenü">${GRID_ICON}<span class="btn-label">Menü</span></button>
          <button class="btn" id="fav" aria-label="Favorit"></button>
          <button class="btn" id="fullscreen" title="Vollbild" aria-label="Vollbild">${FULLSCREEN_ICON}<span class="btn-label">Vollbild</span></button>
        </div>
      </div>
      <div class="game-fs" id="fs">
        <div class="game-frame" id="frame" style="${themeVars(game)}"></div>
        <button class="fs-exit" id="fs-exit" type="button" title="Vollbild beenden" aria-label="Vollbild beenden">${EXIT_FULLSCREEN_ICON}</button>
      </div>
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
  const updateFav = (on) => {
    favBtn.classList.toggle('is-on', on);
    favBtn.setAttribute('aria-pressed', String(on));
    favBtn.title = on ? 'Aus den Favoriten entfernen' : 'Zu den Favoriten hinzufügen';
    favBtn.innerHTML = `${on ? STAR_ON : STAR_OFF}<span class="btn-label">Favorit</span>`;
  };
  updateFav(store.isFavorite(id));
  favBtn.addEventListener('click', () => updateFav(store.toggleFavorite(id)));

  const frame = app.querySelector('#frame');
  const fullscreenBtn = app.querySelector('#fullscreen');
  // iPhone-Safari kann einzelne Elemente nicht im Vollbild zeigen – Knopf dann weglassen
  fullscreenBtn.hidden = !document.fullscreenEnabled;
  // Vollbild für Rahmen + Beenden-Knopf (der Rahmen selbst wird von den Spielen neu befüllt)
  const fsBox = app.querySelector('#fs');
  fullscreenBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else fsBox.requestFullscreen?.();
  });
  // Auf dem Handy gibt es kein Esc – deshalb ein sichtbarer Knopf, nur im Vollbild eingeblendet
  app.querySelector('#fs-exit').addEventListener('click', () => document.fullscreenElement && document.exitFullscreen());

  const mod = await import(`../games/${id}.js`);
  // Seite könnte inzwischen gewechselt sein
  if (!frame.isConnected) return;

  const menuBtn = app.querySelector('#menu');
  const api = {
    getHighscore: () => store.getHighscore(id),
    submitScore: (score) => store.submitScore(id, score),
    // Runde ans Portal melden (Coins, Erfolge) – result: 'win' | 'loss' | 'draw' | 'score'
    reportResult: (result) => economy.reportResult(id, result),
    // Ausgerüsteter Shop-Artikel eines Slots (Standard: Slot = Spiel-ID)
    getDesign: (slot = id) => economy.getEquipped(slot),
  };

  // Erst das Spielmenü (Level, Designs, Erfolge), dann das Spiel mit der gewählten Stufe
  const showMenu = () => {
    cleanupGame?.();
    menuBtn.hidden = true;
    const best = store.getHighscore(id);
    cleanupGame = renderMenu(frame, game, {
      stats: mod.levelStats?.() || {},
      best: best ? `Rekord: ${best}` : '',
      onPlay: (level) => {
        cleanupGame?.();
        menuBtn.hidden = false;
        cleanupGame = mod.mount(frame, { ...api, level });
      },
    });
  };
  menuBtn.addEventListener('click', showMenu);
  showMenu();
}

// ---------- Routing ----------

function route() {
  if (cleanupGame) {
    cleanupGame();
    cleanupGame = null;
  }
  const match = location.hash.match(/^#\/game\/([\w-]+)/);
  let nav = '#/'; // aktiver Menüpunkt: „Games“ gilt für Übersicht und Spieleseiten
  if (match) {
    renderGame(match[1]);
  } else if (location.hash === '#/shop' && economy.enabled) {
    cleanupGame = renderShop(app);
    nav = '#/shop';
  } else if (location.hash === '#/impressum' || location.hash === '#/datenschutz') {
    renderLegal(app, location.hash.slice(2));
    nav = null;
  } else if (location.hash === '#/erfolge' && economy.enabled) {
    cleanupGame = renderAchievements(app);
    nav = '#/erfolge';
  } else {
    renderOverview();
  }
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === nav));
  // Seitenwechsel schließt das ☰-Menü – außer beim Tippen in die Suche (die wechselt selbst zur Übersicht)
  if (document.activeElement !== search) setMenu(false);
  window.scrollTo(0, 0);
}

search.addEventListener('input', () => {
  updateSearchPop();
  if (location.hash.startsWith('#/game/')) location.hash = '#/';
  else renderOverview();
});

// ---------- „Zuletzt gespielt“ und Favoriten unter dem Suchfeld ----------
// Klappt beim Klick ins Suchfeld auf, solange noch nichts getippt ist.

const searchPop = document.getElementById('search-pop');

function updateSearchPop() {
  const open = document.activeElement === search && !search.value.trim();
  searchPop.hidden = !open;
  if (!open) return;
  const games = (ids) => ids.map((id) => getGame(id)).filter(Boolean);
  const list = (items) =>
    items
      .map(
        (g) => `<a class="recent-item" href="#/game/${g.id}" style="${themeVars(g)}">
          <span class="recent-thumb" aria-hidden="true">${art(g)}</span>${escapeHtml(g.title)}
        </a>`,
      )
      .join('');
  const recent = games(store.getRecent()).slice(0, 5);
  const favorites = games(store.getFavorites());
  searchPop.innerHTML = `
    <h3>Zuletzt gespielt</h3>
    ${recent.length ? list(recent) : '<p>Noch nichts gespielt – such dir ein Spiel aus.</p>'}
    ${favorites.length ? `<h3>Favoriten</h3>${list(favorites)}` : ''}`;
}

search.addEventListener('focus', updateSearchPop);
// Mausklick in die Liste nimmt dem Suchfeld nicht den Fokus (sonst schließt sie vor dem Klick)
searchPop.addEventListener('mousedown', (e) => e.preventDefault());
search.addEventListener('blur', () => {
  // Per Tab in die Liste wechseln lässt sie offen
  setTimeout(() => {
    if (!searchPop.contains(document.activeElement)) searchPop.hidden = true;
  });
});
searchPop.addEventListener('focusout', (e) => {
  if (!searchPop.contains(e.relatedTarget) && e.relatedTarget !== search) searchPop.hidden = true;
});
searchPop.addEventListener('click', (e) => {
  if (e.target.closest('.recent-item')) {
    searchPop.hidden = true;
    search.blur();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!searchPop.hidden) {
    searchPop.hidden = true;
    search.blur();
  }
  setMenu(false);
});
// Enter schließt auf dem Handy die Tastatur, die Ergebnisse stehen schon darunter
search.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') search.blur();
});

// ---------- Menü auf Tablet und Handy (☰) ----------
// Suche, Navigation und Hell/Dunkel klappen unter der Kopfzeile auf (Layout in style.css).

const topbar = document.getElementById('topbar');
const menuToggle = document.getElementById('menu-toggle');

function setMenu(open) {
  topbar.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
}

menuToggle.addEventListener('click', () => setMenu(!topbar.classList.contains('is-open')));
// Links (Navigation, Zuletzt gespielt, Logo, Guthaben) schließen das Menü, ebenso ein Klick daneben
topbar.addEventListener('click', (e) => {
  if (e.target.closest('a')) setMenu(false);
});
document.addEventListener('click', (e) => {
  if (!topbar.contains(e.target)) setMenu(false);
});
matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
  if (e.matches) setMenu(false);
});

// ---------- Theme (Standard: dark) ----------

const themeBtn = document.getElementById('theme-toggle');
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>';

function updateThemeButton() {
  const light = document.documentElement.dataset.theme === 'light';
  // Zeigt das Ziel-Theme an (Beschriftung nur im ☰-Menü sichtbar)
  themeBtn.title = light ? 'Dunkles Design' : 'Helles Design';
  themeBtn.innerHTML = `${light ? MOON : SUN}<span class="theme-label">${themeBtn.title}</span>`;
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

// Coins, Glücksrad, Erfolge und Shop (nur wenn Supabase eingerichtet ist oder ?demo=1)
if (economy.enabled) {
  initEconomyUI();
  economy.init();
}
