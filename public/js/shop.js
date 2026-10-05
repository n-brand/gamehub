// Shop (#/shop, #/shop/<id>): zeigt nur Designs, die man noch nicht besitzt – Angebote, je Spiel ein
// Abschnitt, darunter „Diamanten tauschen“ und ganz unten „Creator-Code“. Klick auf eine Kachel öffnet die
// Detailansicht (kaufen, danach ausrüsten). Preise rechnet pricing.js, gebucht wird nur auf dem Server.
// Spec: docs/superpowers/specs/2026-10-05-shop-v2-design.md
import * as eco from './economy.js';
import { GAMES } from './games.js';
import { drawPreview, isAnimated } from './designs.js';
import { priceOf, saleLeft, packageCoins } from './pricing.js';
import { COIN, DIAMOND, toast, openModal, loginPrompt } from './ui-economy.js';
import { esc, fmt } from './ui.js';
import { trialHash } from './trial.js';

const TICKET =
  '<svg class="i-ticket" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-2a2.5 2.5 0 0 0 0-5Z" fill="#9775fa"/><path d="M15 6.5v11" stroke="#e5dbff" stroke-width="1.6" stroke-dasharray="2 2"/><path d="m9 9.3.8 1.7 1.8.2-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.2Z" fill="#ffd43b"/></svg>';
const CHECK =
  '<svg class="i-check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PLAY =
  '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor"/></svg>';

const coinsText = (n) => `${fmt(n)} ${n === 1 ? 'Coin' : 'Coins'}`;
const diamondsText = (n) => `${fmt(n)} ${n === 1 ? 'Diamant' : 'Diamanten'}`;

const gameOf = (id) => GAMES.find((g) => g.id === id);
const slotLabel = (item) => gameOf(item.game)?.slots?.find((s) => s.id === item.slot)?.label || 'Design';
// „Würfelsprung · Würfel“
export const itemMeta = (item) => `${gameOf(item.game)?.title || item.game} · ${slotLabel(item)}`;

// Preis mit Münze/Diamant; bei Rabatt alter Preis durchgestrichen
export function priceHtml(item, { big = false } = {}) {
  const p = priceOf(item);
  const diamonds = p.diamonds > 0;
  const now = diamonds ? p.diamonds : p.coins;
  const list = diamonds ? p.listDiamonds : p.listCoins;
  return `<span class="price${big ? ' price--big' : ''}">${diamonds ? DIAMOND : COIN}${p.onSale ? `<s>${fmt(list)}</s>` : ''}<b>${fmt(now)}</b></span>`;
}

export const saleBadge = (item) => {
  const p = priceOf(item);
  return p.onSale ? `<span class="sale-badge">−${p.percent} %</span>` : '';
};

const exclusiveBadge = (item) => (item.exclusive ? '<span class="badge-exclusive">Exklusiv</span>' : '');

// Bewegte Vorschauen aller Canvas mit data-design in root animieren; gibt eine Stopp-Funktion zurück
function animatePreviews(root) {
  let raf = 0;
  const draw = (t, all) =>
    root.querySelectorAll('canvas[data-design]').forEach((c) => (all || isAnimated(c.dataset.design)) && drawPreview(c, c.dataset.design, t));
  draw(performance.now(), true);
  const loop = (t) => {
    raf = requestAnimationFrame(loop);
    draw(t, false);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

// ---------- Kacheln ----------

// Hervorhebung aus der Datenbank (shop_items.highlight, z. B. „Beliebt“): gelber Rand + Schild –
// nur solange man das Design noch nicht besitzt
const isFeatured = (item) => Boolean(item.highlight) && !(eco.state.user && eco.owns(item.id));
const highlightTag = (item, cls) => (isFeatured(item) ? `<span class="${cls}">${esc(item.highlight)}</span>` : '');

function tile(item, { meta = false } = {}) {
  const left = priceOf(item).onSale ? saleLeft(item) : '';
  const featured = isFeatured(item);
  return `
    <button type="button" class="shop-tile${featured ? ' is-featured' : ''}" data-item="${item.id}" aria-label="${esc(item.name)} – ${esc(itemMeta(item))}${featured ? ` (${esc(item.highlight)})` : ''}">
      ${highlightTag(item, 'tile-tag')}
      <span class="tile-preview"><canvas width="320" height="200" data-design="${item.id}"></canvas>${saleBadge(item)}</span>
      <span class="tile-info">
        <span class="tile-title">${esc(item.name)}</span>
        ${priceHtml(item)}
        ${meta ? `<span class="tile-meta">${esc(itemMeta(item))}</span>` : ''}
        ${left ? `<span class="tile-left">${left}</span>` : ''}
      </span>
    </button>`;
}

const tiles = (items, opts) => `<div class="shop-tiles">${items.map((i) => tile(i, opts)).join('')}</div>`;

// Was der Shop anbietet: nicht exklusiv, nicht gratis und (angemeldet) noch nicht im Besitz
function forSale() {
  const { user } = eco.state;
  return eco.state.catalog.items.filter((i) => !i.exclusive && !eco.isFree(i) && !(user && eco.owns(i.id)));
}

function gameSections(items) {
  return GAMES.filter((g) => items.some((i) => i.game === g.id))
    .map((g) => {
      const own = items.filter((i) => i.game === g.id);
      const slots = (g.slots || []).filter((s) => own.some((i) => i.slot === s.id));
      const body =
        slots.length > 1
          ? slots.map((s) => `<h3 class="shop-sub">${esc(s.label)}</h3>${tiles(own.filter((i) => i.slot === s.id))}`).join('')
          : tiles(own);
      return `<section class="shop-section"><h2 class="page-sub">${esc(g.title)}</h2>${body}</section>`;
    })
    .join('');
}

// ---------- Diamanten tauschen ----------

function exchangeSection() {
  const { user, profile } = eco.state;
  const { packages, rate } = eco.state.catalog;
  if (!packages.length) return '';
  const best = packages.reduce((a, b) => (b.bonus_percent > a.bonus_percent ? b : a));
  return `
    <section class="shop-section shop-extra" id="shop-exchange">
      <h2 class="page-sub">${DIAMOND} Diamanten tauschen</h2>
      <p class="shop-extra-text">1 Diamant = ${coinsText(rate)} – je größer das Paket, desto mehr Bonus. Coins lassen sich nicht zurücktauschen.</p>
      <div class="pkg-grid">
        ${packages
          .map((p) => {
            const isBest = p === best && p.bonus_percent > 0;
            const missing = p.diamonds - profile.diamonds;
            const action = !user
              ? '<button type="button" class="btn btn--sm" data-login>Anmelden zum Tauschen</button>'
              : missing > 0
                ? `<small class="pkg-missing">Dir fehlen ${diamondsText(missing)}</small>`
                : `<button type="button" class="btn btn--primary btn--sm" data-exchange="${p.id}">Tauschen</button>`;
            return `
          <article class="pkg${isBest ? ' is-best' : ''}">
            ${isBest ? '<span class="pkg-tag">Bester Wert</span>' : ''}
            <span class="pkg-diamonds">${DIAMOND}${fmt(p.diamonds)}</span>
            <span class="pkg-coins">${COIN}${fmt(packageCoins(p, rate))}</span>
            <span class="pkg-bonus${p.bonus_percent ? '' : ' is-base'}">${p.bonus_percent ? `+${p.bonus_percent} % Bonus` : 'Grundkurs'}</span>
            ${action}
          </article>`;
          })
          .join('')}
      </div>
    </section>`;
}

function confirmExchange(pkg) {
  const coins = packageCoins(pkg, eco.state.catalog.rate);
  const { el, close } = openModal(`
    <h2>Diamanten tauschen?</h2>
    <p class="modal-text">${diamondsText(pkg.diamonds)} in ${coinsText(coins)} tauschen? Das lässt sich nicht rückgängig machen.</p>
    <p class="item-error" data-error role="alert" hidden></p>
    <div class="modal-actions">
      <button type="button" class="btn" data-close>Abbrechen</button>
      <button type="button" class="btn btn--primary" data-confirm>Tauschen</button>
    </div>`);
  const btn = el.querySelector('[data-confirm]');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const data = await eco.exchange(pkg.id);
      toast({ icon: COIN, title: `+${coinsText(data.coins_gained)}`, text: `${diamondsText(data.diamonds_spent)} getauscht` });
      close();
    } catch (err) {
      const msg = el.querySelector('[data-error]');
      msg.textContent = err?.message || 'Tauschen hat nicht geklappt. Versuch es nochmal.';
      msg.hidden = false;
      btn.disabled = false;
    }
  });
}

// ---------- Creator-Code ----------

function codeSection(draft, error) {
  const { user } = eco.state;
  return `
    <section class="shop-section shop-extra" id="shop-code">
      <h2 class="page-sub">${TICKET} Creator-Code</h2>
      <p class="shop-extra-text">Hast du einen Code von einem Creator? Löse ihn hier ein und hol dir exklusive Designs, die es nicht im Shop gibt.</p>
      <form class="code-form" data-code-form novalidate>
        <label class="sr-only" for="creator-code">Creator-Code</label>
        <input id="creator-code" class="code-input" name="code" type="text" maxlength="32" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Code eingeben" value="${esc(draft)}" ${user ? '' : 'disabled'}>
        ${user ? '<button type="submit" class="btn btn--primary">Einlösen</button>' : '<button type="button" class="btn" data-login>Anmelden zum Einlösen</button>'}
      </form>
      <p class="code-error" role="alert" ${error ? '' : 'hidden'}>${esc(error)}</p>
    </section>`;
}

function equipControl(item) {
  return eco.getEquipped(item.slot) === item.id
    ? '<span class="equipped-label">Ausgerüstet ✓</span>'
    : `<button type="button" class="btn btn--sm" data-equip-id="${item.id}">Ausrüsten</button>`;
}

// Was man bekommen hat – mit Ausrüsten pro Design
function openCodeResult(data) {
  const items = (data.items || []).map((id) => eco.state.catalog.items.find((i) => i.id === id)).filter(Boolean);
  const rows = () =>
    items
      .map(
        (i) => `
      <li class="reward-row">
        <canvas width="160" height="100" data-design="${i.id}"></canvas>
        <span class="reward-name"><b>${esc(i.name)} ${exclusiveBadge(i)}</b><small>${esc(itemMeta(i))}${(data.new_items || []).includes(i.id) ? '' : ' · hattest du schon'}</small></span>
        <span data-equip-slot="${i.id}">${equipControl(i)}</span>
      </li>`,
      )
      .join('');
  let stop = () => {};
  const { el } = openModal(
    `
    <p class="item-done">${CHECK} Code ${esc(data.code)} eingelöst</p>
    <p class="modal-text">Das hast du bekommen:</p>
    <ul class="reward-list">
      ${rows()}
      ${data.coins_gained ? `<li class="reward-row"><span class="reward-icon">${COIN}</span><b>+${coinsText(data.coins_gained)}</b></li>` : ''}
      ${data.diamonds_gained ? `<li class="reward-row"><span class="reward-icon">${DIAMOND}</span><b>+${diamondsText(data.diamonds_gained)}</b></li>` : ''}
    </ul>
    <div class="modal-actions"><button type="button" class="btn btn--primary" data-close>Zurück zum Shop</button></div>`,
    { className: 'modal--code', onClose: () => stop() },
  );
  stop = animatePreviews(el);
  el.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-equip-id]');
    if (!btn) return;
    btn.disabled = true;
    try {
      await eco.equip(btn.dataset.equipId);
      // Kein Hinweis nötig: die Zeile zeigt danach „Ausgerüstet ✓“. Alle Knöpfe neu setzen (ein Slot = ein Design)
      el.querySelectorAll('[data-equip-slot]').forEach((slot) => {
        const it = items.find((i) => i.id === slot.dataset.equipSlot);
        if (it) slot.innerHTML = equipControl(it);
      });
    } catch (err) {
      btn.disabled = false;
      toast({ kind: 'toast--error', title: err?.message || 'Ausrüsten fehlgeschlagen.' });
    }
  });
}

// ---------- Detailansicht ----------

function openDetail(item) {
  let stop = () => {};
  const { el, close } = openModal(
    `
    <div class="item-preview"><canvas width="640" height="400" data-design="${item.id}"></canvas>${saleBadge(item)}${exclusiveBadge(item)}</div>
    <h2>${esc(item.name)}</h2>
    <p class="item-meta">${esc(itemMeta(item))}${highlightTag(item, 'item-tag')}</p>
    <div data-detail-body></div>`,
    { className: 'modal--item', onClose: () => stop() },
  );
  stop = animatePreviews(el);
  const body = el.querySelector('[data-detail-body]');
  // Gelber Rahmen für hervorgehobene Designs, solange man sie nicht besitzt
  el.classList.toggle('is-featured', isFeatured(item));

  const showBuy = (error = '') => {
    const { user, profile } = eco.state;
    const p = priceOf(item);
    const diamonds = p.diamonds > 0;
    const price = diamonds ? p.diamonds : p.coins;
    const have = diamonds ? profile.diamonds : profile.coins;
    const amount = (n) => (diamonds ? diamondsText(n) : coinsText(n));
    const left = p.onSale ? saleLeft(item) : '';
    let note;
    let action;
    if (!user) {
      note = 'Melde dich an, um Designs zu kaufen.';
      action = '<button type="button" class="btn btn--primary" data-login-now>Mit Google anmelden</button>';
    } else if (have < price) {
      note = `Dir fehlen noch ${amount(price - have)}.`;
      if (!diamonds && profile.diamonds > 0 && eco.state.catalog.packages.length) {
        note += ' <button type="button" class="link-btn" data-goto-exchange>Diamanten tauschen</button>';
      }
      action = `<button type="button" class="btn" disabled>Kaufen für ${amount(price)}</button>`;
    } else {
      note = `Danach hast du noch ${amount(have - price)}.`;
      action = `<button type="button" class="btn btn--primary" data-buy-now>Kaufen für ${amount(price)}</button>`;
    }
    // Ausprobieren: eine Probe-Runde ohne Coins (auch ohne Anmeldung oder wenn das Guthaben nicht reicht)
    const tryOut = item.exclusive ? '' : `<button type="button" class="btn btn--try" data-try-now>${PLAY}Ausprobieren</button>`;
    body.innerHTML = `
      <div class="item-price">${priceHtml(item, { big: true })}${p.onSale ? `<span class="item-sale">−${p.percent} %${left ? ` · ${left}` : ''}</span>` : ''}</div>
      <p class="item-note">${note}</p>
      ${error ? `<p class="item-error" role="alert">${esc(error)}</p>` : ''}
      <div class="modal-actions">${action}${tryOut}<button type="button" class="btn" data-close>Schließen</button></div>`;
  };

  const showOwned = (justBought) => {
    // Gehört jetzt dir → keine Hervorhebung mehr
    el.classList.remove('is-featured');
    el.querySelector('.item-tag')?.remove();
    body.innerHTML = `
      <p class="item-done">${CHECK} ${justBought ? 'Gekauft' : 'Gehört dir schon'}</p>
      <p class="item-note">${esc(item.name)} ${justBought ? 'gehört jetzt dir.' : 'ist in deiner Sammlung.'}</p>
      <div class="modal-actions">
        ${eco.getEquipped(item.slot) === item.id ? '<span class="equipped-label">Ausgerüstet ✓</span>' : '<button type="button" class="btn btn--primary" data-equip-now>Ausrüsten</button>'}
        <button type="button" class="btn" data-close>Zurück zum Shop</button>
      </div>`;
  };

  body.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.closest('[data-buy-now]')) {
      const btn = t.closest('[data-buy-now]');
      btn.disabled = true;
      try {
        await eco.buy(item.id);
        showOwned(true);
      } catch (err) {
        showBuy(err?.message || 'Kauf fehlgeschlagen. Versuch es nochmal.');
      }
    } else if (t.closest('[data-equip-now]')) {
      const btn = t.closest('[data-equip-now]');
      btn.disabled = true;
      try {
        await eco.equip(item.id);
        // Das Fenster schließt sich – deshalb hier eine kurze Bestätigung (ersetzt eine vorherige)
        toast({ title: `${item.name} ist ausgerüstet`, key: 'equip' });
        close();
      } catch (err) {
        btn.disabled = false;
        toast({ kind: 'toast--error', title: err?.message || 'Ausrüsten fehlgeschlagen.' });
      }
    } else if (t.closest('[data-try-now]')) {
      close();
      location.hash = trialHash(item);
    } else if (t.closest('[data-goto-exchange]')) {
      close();
      document.getElementById('shop-exchange')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (t.closest('[data-login-now]')) {
      close();
      eco.signIn();
    }
  });

  if (eco.state.user && eco.owns(item.id)) showOwned(false);
  else showBuy();
}

// ---------- Seite ----------

export function renderShop(container, { item: initialItem = null } = {}) {
  let stop = () => {};
  let codeDraft = '';
  let codeError = '';
  let busy = false;

  const render = () => {
    stop();
    const all = eco.state.catalog.items;
    const items = forSale();
    const offers = items.filter((i) => priceOf(i).onSale);
    const { user } = eco.state;
    let catalog;
    if (!eco.state.ready) catalog = '<p class="empty">Der Shop wird geladen …</p>';
    else if (!all.length) catalog = '<p class="empty">Der Shop ist gerade nicht erreichbar.</p>';
    else if (!items.length) catalog = '<p class="shop-done">Du hast alle Designs – neue kommen bald.</p>';
    else catalog = gameSections(items);
    container.innerHTML = `
      <section class="page page--wide shop">
        <div class="page-head">
          <h1>Shop</h1>
          <p>Designs für deine Spiele – bezahlt mit Coins oder Diamanten.</p>
        </div>
        ${user ? '' : '<div class="page-cta">Melde dich an, um Coins zu sammeln und Designs zu kaufen. <button type="button" class="btn btn--primary btn--sm" data-login>Mit Google anmelden</button></div>'}
        ${offers.length ? `<section class="shop-section shop-offers"><h2 class="page-sub">Angebote</h2>${tiles(offers, { meta: true })}</section>` : ''}
        ${catalog}
        ${exchangeSection()}
        ${codeSection(codeDraft, codeError)}
      </section>`;
    stop = animatePreviews(container);
  };

  const onClick = (e) => {
    const card = e.target.closest('[data-item]');
    const pkgBtn = e.target.closest('[data-exchange]');
    if (card) {
      const item = eco.state.catalog.items.find((i) => i.id === card.dataset.item);
      if (item) openDetail(item);
    } else if (pkgBtn) {
      const pkg = eco.state.catalog.packages.find((p) => p.id === pkgBtn.dataset.exchange);
      if (pkg) confirmExchange(pkg);
    }
  };

  const onInput = (e) => {
    if (e.target.id !== 'creator-code') return;
    codeDraft = e.target.value;
    if (codeError) {
      codeError = '';
      container.querySelector('.code-error').hidden = true;
    }
  };

  const onSubmit = async (e) => {
    if (!e.target.matches('[data-code-form]')) return;
    e.preventDefault();
    if (busy) return;
    if (!eco.state.user) {
      loginPrompt('Melde dich an, um Creator-Codes einzulösen.');
      return;
    }
    const code = codeDraft.trim();
    if (!code) {
      codeError = 'Gib zuerst einen Code ein.';
      render();
      return;
    }
    busy = true;
    e.target.querySelector('button[type="submit"]').disabled = true;
    try {
      const data = await eco.redeemCode(code);
      codeDraft = '';
      codeError = '';
      render();
      openCodeResult(data);
    } catch (err) {
      codeError = err?.message || 'Der Code konnte nicht eingelöst werden.';
      render();
    }
    busy = false;
  };

  container.addEventListener('click', onClick);
  container.addEventListener('input', onInput);
  container.addEventListener('submit', onSubmit);
  const off = eco.onChange((e) => e.type === 'state' && render());
  render();

  // Deep-Link aus dem Spielmenü: #/shop/<id> öffnet die Detailansicht, Adresse danach wieder #/shop.
  // Beim direkten Aufruf ist der Katalog evtl. noch nicht geladen → auf das erste fertige Laden warten.
  let offInitial = () => {};
  if (initialItem) {
    history.replaceState(null, '', `${location.pathname}${location.search}#/shop`);
    const openInitial = () => {
      const item = eco.state.catalog.items.find((i) => i.id === initialItem);
      if (item && !item.exclusive) openDetail(item);
    };
    if (eco.state.ready) openInitial();
    else {
      offInitial = eco.onChange((e) => {
        if (e.type !== 'state' || !eco.state.ready) return;
        offInitial();
        openInitial();
      });
    }
  }

  return () => {
    off();
    offInitial();
    stop();
    container.removeEventListener('click', onClick);
    container.removeEventListener('input', onInput);
    container.removeEventListener('submit', onSubmit);
  };
}
