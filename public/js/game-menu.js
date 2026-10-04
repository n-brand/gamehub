// Spielmenü vor jedem Spiel: Kopfbereich mit Start, Galerien für Level und Designs (pro Shop-Slot)
// und die Erfolge des Spiels. renderMenu() gibt eine Cleanup-Funktion zurück.
import * as eco from './economy.js';
import { art } from './art.js';
import { drawPreview } from './designs.js';
import { COIN, DIAMOND, toast, TROPHY } from './ui-economy.js';

const STORE_KEY = 'gamehub-menu'; // zuletzt gewählte Stufe je Spiel
const ANIMATED = /rainbow|gold|neon|cube-/;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => new Intl.NumberFormat('de-DE').format(n || 0);

function loadChoices() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveChoice(gameId, levelId) {
  const all = loadChoices();
  all[gameId] = levelId;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    // Speicher nicht verfügbar
  }
}

// Helle Kartenfarbe → dunkle Schrift
function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? '#183153' : '#ffffff';
}

function priceText(item) {
  return item.price_diamonds
    ? `${DIAMOND}${fmt(item.price_diamonds)}`
    : `${COIN}${fmt(item.price_coins)}`;
}

/**
 * @param frame  Element, in das das Menü gezeichnet wird (der Spielrahmen)
 * @param game   Katalogeintrag aus games.js
 * @param opts   { stats: { levelId: 'Bestwert …' }, best: 'Rekord …', onPlay(levelId) }
 */
export function renderMenu(frame, game, { stats = {}, best = '', onPlay }) {
  const levels = game.levels || [];
  const slots = game.slots || [];
  let level = loadChoices()[game.id];
  if (!levels.some((l) => l.id === level)) level = levels[0]?.id;
  let raf = 0;

  const play = () => {
    if (level) saveChoice(game.id, level);
    onPlay(level);
  };

  function levelCards() {
    if (!levels.length) return '';
    return `
      <section class="gm-section">
        <h3>${game.id === 'connect4' ? 'Gegner' : 'Level'}</h3>
        <div class="gm-gallery">
          ${levels
            .map(
              (l, i) => `
            <button type="button" class="gm-card gm-level ${l.id === level ? 'is-selected' : ''}" data-level="${l.id}" style="--c:${l.color};--ink:${inkFor(l.color)}">
              <span class="gm-level-dots">${'●'.repeat(Math.min(i + 1, 4))}</span>
              <b>${esc(l.name)}</b>
              <small>${esc(l.sub || '')}</small>
              ${stats[l.id] ? `<span class="gm-stat">${esc(stats[l.id])}</span>` : ''}
              <span class="gm-check" aria-hidden="true">✓</span>
            </button>`,
            )
            .join('')}
        </div>
      </section>`;
  }

  function designCards(slot) {
    const items = eco.state.catalog.items.filter((i) => i.slot === slot.id);
    if (!items.length) return '';
    const equipped = eco.getEquipped(slot.id);
    return `
      <section class="gm-section">
        <h3>${esc(slot.label)} <a class="gm-shop-link" href="#/shop">Zum Shop →</a></h3>
        <div class="gm-gallery">
          ${items
            .map((item) => {
              const owned = eco.owns(item.id) && (eco.isFree(item) || eco.state.user);
              const on = item.id === equipped;
              return `
              <button type="button" class="gm-card gm-design ${on ? 'is-selected' : ''} ${owned ? '' : 'is-locked'}" data-item="${item.id}" title="${owned ? 'Ausrüsten' : 'Im Shop kaufen'}">
                <canvas width="320" height="200" data-preview="${item.id}"></canvas>
                <span class="gm-design-name">${esc(item.name)}</span>
                <span class="gm-design-state">${on ? 'Ausgerüstet ✓' : owned ? 'Ausrüsten' : priceText(item)}</span>
              </button>`;
            })
            .join('')}
        </div>
      </section>`;
  }

  function achievementCards() {
    const list = eco.state.catalog.achievements.filter((a) => a.game === game.id);
    if (!eco.enabled || !list.length) return '';
    const done = list.filter((a) => eco.state.unlocked.has(a.id)).length;
    return `
      <section class="gm-section">
        <h3>Erfolge <span class="gm-count">${done}/${list.length}</span></h3>
        <div class="gm-achievements">
          ${list
            .map((a) => {
              const unlocked = eco.state.unlocked.has(a.id);
              const value = Math.min(a.threshold, eco.achievementValue(a));
              const pct = unlocked ? 100 : Math.round((value / a.threshold) * 100);
              const reward = a.reward_diamonds ? `${DIAMOND}${a.reward_diamonds}` : `${COIN}${fmt(a.reward_coins)}`;
              return `
              <div class="gm-ach ${unlocked ? 'is-done' : ''} ${a.reward_diamonds ? 'is-epic' : ''}">
                <span class="gm-ach-icon">${TROPHY}</span>
                <div class="gm-ach-body">
                  <b>${esc(a.name)}</b>
                  <small>${esc(a.description)}</small>
                  <span class="gm-ach-bar"><span style="width:${pct}%"></span></span>
                </div>
                <span class="gm-ach-reward">${reward}</span>
              </div>`;
            })
            .join('')}
        </div>
        ${eco.state.user ? '' : '<p class="gm-hint">Melde dich an, um Erfolge zu sammeln.</p>'}
      </section>`;
  }

  function render() {
    const scroll = frame.querySelector('.gm')?.scrollTop || 0;
    frame.innerHTML = `
      <div class="gm" style="--accent:${game.theme.bg}">
        <div class="gm-hero">
          <div class="gm-art">${art(game)}</div>
          <div class="gm-info">
            <h2>${esc(game.title)}</h2>
            <p>${esc(game.teaser || game.description)}</p>
            ${best ? `<span class="gm-best">${esc(best)}</span>` : ''}
            <div class="gm-play-row">
              <button type="button" class="btn btn--primary gm-play" data-play>▶ Spielen</button>
              <small>oder Enter drücken</small>
            </div>
          </div>
        </div>
        ${levelCards()}
        ${slots.map(designCards).join('')}
        ${achievementCards()}
      </div>`;
    frame.querySelector('.gm').scrollTop = scroll;
    frame.querySelectorAll('canvas[data-preview]').forEach((c) => drawPreview(c, c.dataset.preview, performance.now()));
  }

  function onClick(e) {
    if (e.target.closest('[data-play]')) {
      play();
      return;
    }
    const lv = e.target.closest('[data-level]');
    if (lv) {
      level = lv.dataset.level;
      saveChoice(game.id, level);
      frame.querySelectorAll('[data-level]').forEach((b) => b.classList.toggle('is-selected', b === lv));
      return;
    }
    const card = e.target.closest('[data-item]');
    if (card) {
      const item = eco.state.catalog.items.find((i) => i.id === card.dataset.item);
      if (!item) return;
      const owned = eco.owns(item.id) && (eco.isFree(item) || eco.state.user);
      if (!eco.state.user && !eco.isFree(item)) {
        toast({ title: 'Anmelden zum Ausrüsten', text: 'Designs gibt es mit einem Konto.', action: { label: 'Anmelden', run: eco.signIn } });
      } else if (!owned) {
        toast({ title: `${item.name} gibt es im Shop`, text: 'Kauf es dort mit Coins oder Diamanten.', action: { label: 'Zum Shop', run: () => (location.hash = '#/shop') } });
      } else if (eco.state.user) {
        eco.equip(item.id).catch((err) => toast({ kind: 'toast--error', title: err?.message || 'Ausrüsten fehlgeschlagen.' }));
      }
    }
  }

  function onKey(e) {
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
    if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      play();
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && levels.length) {
      e.preventDefault();
      const i = levels.findIndex((l) => l.id === level);
      const next = levels[Math.max(0, Math.min(levels.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))];
      level = next.id;
      saveChoice(game.id, level);
      frame.querySelectorAll('[data-level]').forEach((b) => {
        const on = b.dataset.level === level;
        b.classList.toggle('is-selected', on);
        if (on) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    }
  }

  // Bewegte Designs in der Vorschau animieren
  const animate = (t) => {
    raf = requestAnimationFrame(animate);
    frame.querySelectorAll('canvas[data-preview]').forEach((c) => ANIMATED.test(c.dataset.preview) && drawPreview(c, c.dataset.preview, t));
  };

  frame.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
  const off = eco.onChange((e) => e.type === 'state' && render());
  render();
  raf = requestAnimationFrame(animate);

  return () => {
    off();
    cancelAnimationFrame(raf);
    frame.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKey);
    frame.innerHTML = '';
  };
}
