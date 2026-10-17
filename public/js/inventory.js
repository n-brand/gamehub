// Inventar (#/inventar): Profilbild, Name und Kontostand, „Meine Designs“ (alle eigenen Designs inkl. Gratis-
// und exklusiver, zum Ausrüsten) und „Erfolge“ mit Fortschritt – alles an einem Ort.
// Spec: docs/superpowers/specs/2026-10-05-shop-v2-design.md
import * as eco from './economy.js';
import { GAMES } from './games.js';
import { drawPreview, isAnimated } from './designs.js';
import { COIN, DIAMOND, toast, achievementsHtml, achievementSummary, rewardText } from './ui-economy.js';
import { esc, fmt } from './ui.js';

function designTile(item) {
  const on = eco.getEquipped(item.slot) === item.id;
  return `
    <button type="button" class="shop-tile${on ? ' is-equipped' : ''}" data-equip-id="${item.id}" aria-pressed="${on}" aria-label="${esc(item.name)}${on ? ' – ausgerüstet' : ' ausrüsten'}">
      <span class="tile-preview"><canvas width="320" height="200" data-design="${item.id}"></canvas>${item.exclusive ? '<span class="badge-exclusive">Exklusiv</span>' : ''}</span>
      <span class="tile-info">
        <span class="tile-title">${esc(item.name)}</span>
        <span class="tile-state">${on ? 'Ausgerüstet ✓' : 'Ausrüsten'}</span>
      </span>
    </button>`;
}

// Pro Slot die eigenen Designs; gezählt werden alle nicht exklusiven plus eigene exklusive
function designsHtml() {
  const groups = GAMES.flatMap((g) =>
    (g.slots || []).map((slot) => {
      const all = eco.state.catalog.items.filter((i) => i.slot === slot.id && (!i.exclusive || eco.owns(i.id)));
      return { game: g, slot, owned: all.filter((i) => eco.owns(i.id)), total: all.length };
    }),
  ).filter((x) => x.owned.length);
  if (!groups.length) return '<p class="empty">Deine Designs werden geladen …</p>';
  return groups
    .map(
      ({ game, slot, owned, total }) => `
      <h3 class="collection-head">${esc(game.title)}${game.slots.length > 1 ? ` · ${esc(slot.label)}` : ''} <span class="collection-count">${owned.length} von ${total}</span></h3>
      <div class="shop-tiles">${owned.map(designTile).join('')}</div>`,
    )
    .join('');
}

const CHEVRON =
  '<svg class="inv-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function renderInventory(container, { focus = null } = {}) {
  let raf = 0;
  let focused = false;
  // Beide Bereiche sind bei jedem Öffnen eingeklappt. Kommt man über #/erfolge (Meldung „Zum Inventar“,
  // „Abholen“ im Spielmenü), sind die Erfolge gleich offen.
  const open = { designs: false, achievements: focus === 'achievements' };

  // Aufklapp-Überschrift eines Bereichs
  const head = (key, title, extra = '') => `
    <h2 class="inv-head">
      <button type="button" class="inv-toggle" data-toggle="${key}" aria-expanded="${open[key]}" aria-controls="inv-body-${key}">
        <span class="inv-title">${title}</span>${extra}${CHEVRON}
      </button>
    </h2>`;

  const render = () => {
    cancelAnimationFrame(raf);
    const { user, profile } = eco.state;
    const { done, total } = achievementSummary();
    const owned = eco.state.catalog.items.filter((i) => eco.owns(i.id)).length;
    const waiting = eco.pendingCount();
    const top = user
      ? `
        <div class="profile-head">
          <span class="profile-avatar">${user.avatar ? `<img src="${esc(user.avatar)}" alt="" referrerpolicy="no-referrer">` : esc(user.name.slice(0, 1).toUpperCase())}</span>
          <div class="profile-who">
            <h1>${esc(user.name)}</h1>
            <p class="profile-balance"><span class="price">${COIN}<b>${fmt(profile.coins)}</b></span><span class="price">${DIAMOND}<b>${fmt(profile.diamonds)}</b></span></p>
          </div>
        </div>`
      : `
        <div class="page-head"><h1>Inventar</h1><p>Deine Designs, Erfolge und dein Kontostand.</p></div>
        <div class="page-cta">Melde dich an, um Designs und Erfolge zu sammeln. <button type="button" class="btn btn--primary btn--sm" data-login>Mit Google anmelden</button></div>`;
    container.innerHTML = `
      <section class="page page--wide inventory">
        ${top}
        <div class="inv-sections">
        ${
          user
            ? `<section class="inv-section" id="inv-designs">
          ${head('designs', 'Meine Designs', owned ? `<span class="collection-count">${owned} ${owned === 1 ? 'Design' : 'Designs'}</span>` : '')}
          <div class="inv-body" id="inv-body-designs" ${open.designs ? '' : 'hidden'}>
            ${designsHtml()}
            <p class="profile-more">Mehr Designs gibt es im <a href="#/shop">Shop</a>.</p>
          </div>
        </section>`
            : ''
        }
        <section class="inv-section" id="inv-achievements">
          ${head(
            'achievements',
            'Erfolge',
            `${total ? `<span class="collection-count">${done} von ${total}</span>` : ''}${waiting ? `<span class="inv-pending">${waiting} zum Abholen</span>` : ''}`,
          )}
          <div class="inv-body" id="inv-body-achievements" ${open.achievements ? '' : 'hidden'}>
            ${
              waiting
                ? `<div class="claim-banner">
              <span><b>${waiting === 1 ? '1 Belohnung wartet' : `${waiting} Belohnungen warten`}</b> – hol sie dir ab.</span>
              ${waiting > 1 ? '<button type="button" class="btn btn--primary btn--sm" data-claim-all>Alle abholen</button>' : ''}
            </div>`
                : ''
            }
            ${total ? '<p class="shop-extra-text">Erfolge mit Diamanten sind die härtesten.</p>' : ''}
            ${achievementsHtml()}
          </div>
        </section>
        </div>
      </section>`;
    // Nur sichtbare Vorschauen zeichnen (eingeklappte Bereiche nicht)
    const draw = (t, all) =>
      container
        .querySelectorAll('.inv-body:not([hidden]) canvas[data-design]')
        .forEach((c) => (all || isAnimated(c.dataset.design)) && drawPreview(c, c.dataset.design, t));
    draw(performance.now(), true);
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      draw(t, false);
    };
    raf = requestAnimationFrame(loop);
    // Alte Adresse #/erfolge: direkt zu den Erfolgen springen (einmalig, sobald sie da sind)
    // (nach dem Seitenwechsel, der selbst nach oben scrollt)
    if (focus === 'achievements' && !focused && total) {
      focused = true;
      setTimeout(() => container.querySelector('#inv-achievements')?.scrollIntoView({ block: 'start' }));
    }
  };

  // Belohnungen abholen – eine Einblendung pro Klick (ersetzt die vorherige)
  const claim = async (ids) => {
    let coins = 0;
    let diamonds = 0;
    for (const id of ids) {
      try {
        const data = await eco.claimAchievement(id);
        coins += data.coins_gained;
        diamonds += data.diamonds_gained;
      } catch (err) {
        toast({ kind: 'toast--error', title: err?.message || 'Abholen hat nicht geklappt.' });
        break;
      }
    }
    if (coins || diamonds) {
      const name = ids.length === 1 ? eco.state.catalog.achievements.find((a) => a.id === ids[0])?.name : '';
      toast({ icon: diamonds ? DIAMOND : COIN, title: rewardText({ coins, diamonds }), text: name ? `Belohnung für „${name}“` : 'Alle Belohnungen abgeholt', key: 'claim' });
    }
  };

  const onClick = async (e) => {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const key = toggle.dataset.toggle;
      open[key] = !open[key];
      render();
      container.querySelector(`[data-toggle="${key}"]`)?.focus();
      return;
    }
    const claimBtn = e.target.closest('[data-claim]');
    if (claimBtn) {
      claimBtn.disabled = true;
      await claim([claimBtn.dataset.claim]);
      return;
    }
    if (e.target.closest('[data-claim-all]')) {
      e.target.closest('[data-claim-all]').disabled = true;
      await claim([...eco.state.pending]);
      return;
    }
    const btn = e.target.closest('[data-equip-id]');
    if (!btn || btn.classList.contains('is-equipped')) return;
    btn.disabled = true;
    try {
      // Kein Hinweis nötig: die Kachel zeigt danach selbst „Ausgerüstet ✓“
      await eco.equip(btn.dataset.equipId);
    } catch (err) {
      btn.disabled = false;
      toast({ kind: 'toast--error', title: err?.message || 'Ausrüsten fehlgeschlagen.' });
    }
  };

  container.addEventListener('click', onClick);
  const off = eco.onChange((e) => e.type === 'state' && render());
  render();
  return () => {
    off();
    cancelAnimationFrame(raf);
    container.removeEventListener('click', onClick);
  };
}
