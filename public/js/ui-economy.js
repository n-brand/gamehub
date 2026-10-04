// Oberfläche für Coins, Diamanten, Glücksrad, Erfolge und Shop:
// Kopfzeile (Kontostand, Glücksrad, Login), Einblendungen, Glücksrad-Fenster und die Seiten #/shop und #/erfolge.
import * as eco from './economy.js';
import { GAMES } from './games.js';
import { drawSnakePreview } from './designs.js';

// ---------- Symbole ----------

export const COIN =
  '<svg class="i-coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#fcc419"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#f59f00" stroke-width="2"/><circle cx="9" cy="8.5" r="1.6" fill="#fff" opacity=".7"/></svg>';
export const DIAMOND =
  '<svg class="i-diamond" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3h11L22 9 12 21 2 9Z" fill="#66d9e8"/><path d="M2 9h20M8.5 3 7 9l5 12 5-12-1.5-6M7 9l5-6 5 6" fill="none" stroke="#15aabf" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const GIFT =
  '<svg class="i-gift" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.2C10.6 4.4 7.4 3.4 6.4 5.1c-.9 1.6 1.4 2.4 5.6 2.1Zm0 0c1.4-2.8 4.6-3.8 5.6-2.1.9 1.6-1.4 2.4-5.6 2.1Z" fill="#fcc419"/><rect x="3.5" y="11" width="17" height="10" rx="2" fill="#ff8787"/><rect x="2.5" y="7.5" width="19" height="4.5" rx="1.5" fill="#fa5252"/><rect x="10.5" y="7.5" width="3" height="13.5" fill="#fcc419"/></svg>';
const TROPHY =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v5a5 5 0 0 1-10 0Z" fill="currentColor"/><path d="M7 5H4v2a3 3 0 0 0 3 3m10-5h3v2a3 3 0 0 1-3 3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 12.5h3V17h-3Z" fill="currentColor"/><rect x="7" y="17" width="10" height="4" rx="1.2" fill="currentColor"/></svg>';

const fmt = (n) => new Intl.NumberFormat('de-DE').format(n || 0);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function rewardHtml({ coins = 0, diamonds = 0 }) {
  const parts = [];
  if (coins) parts.push(`<span class="reward">${COIN}${fmt(coins)}</span>`);
  if (diamonds) parts.push(`<span class="reward">${DIAMOND}${fmt(diamonds)}</span>`);
  return parts.join(' ');
}

function rewardText({ coins = 0, diamonds = 0 }) {
  const parts = [];
  if (coins) parts.push(`+${fmt(coins)} Coins`);
  if (diamonds) parts.push(`+${fmt(diamonds)} ${diamonds === 1 ? 'Diamant' : 'Diamanten'}`);
  return parts.join(' · ');
}

// ---------- Einblendungen (unten rechts) ----------

export function toast({ icon = '', title, text = '', kind = '', action = null, duration = 3600 }) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `${icon ? `<span class="toast-icon">${icon}</span>` : ''}<span class="toast-text"><b>${esc(title)}</b>${text ? `<small>${esc(text)}</small>` : ''}</span>`;
  const close = () => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 300);
  };
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn--primary btn--sm';
    b.textContent = action.label;
    b.addEventListener('click', () => {
      action.run();
      close();
    });
    el.append(b);
  }
  box.append(el);
  setTimeout(close, duration);
}

// ---------- Fenster (Glücksrad, Kaufen bestätigen) ----------

function openModal(html, { className = '' } = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal ${className}" role="dialog" aria-modal="true"><button type="button" class="modal-close" data-close aria-label="Schließen">×</button>${html}</div>`;
  const close = () => {
    document.removeEventListener('keydown', onKey);
    backdrop.classList.add('is-out');
    setTimeout(() => backdrop.remove(), 200);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  return { el: backdrop.querySelector('.modal'), close };
}

function loginPrompt(text) {
  const { el, close } = openModal(`
    <h2>Anmelden</h2>
    <p class="modal-text">${esc(text)}</p>
    <button type="button" class="btn btn--primary" data-login-now>Mit Google anmelden</button>`);
  el.querySelector('[data-login-now]').addEventListener('click', () => {
    close();
    eco.signIn();
  });
}

// ---------- Kopfzeile ----------

let shownCoins = null;

function renderAccount() {
  const box = document.getElementById('account');
  const nav = document.getElementById('topnav');
  if (!box) return;
  box.hidden = false;
  if (nav) nav.hidden = false;
  if (!eco.state.ready) {
    box.innerHTML = '';
    return;
  }
  const u = eco.state.user;
  // Täglicher Bonus: Geschenk, das wackelt und einen Punkt trägt, solange der Bonus abholbar ist
  const available = eco.canSpin();
  const dot = available ? '<span class="dot" aria-label="Bonus verfügbar"></span>' : '';
  const wheel = `<button type="button" class="icon-btn wheel-btn ${available ? 'has-bonus' : ''}" data-open-wheel title="Täglicher Bonus" aria-label="Täglicher Bonus">${GIFT}${dot}</button>`;
  if (!u) {
    box.innerHTML = `${wheel}<button type="button" class="btn btn--primary btn--sm" data-login>Mit Google anmelden</button>`;
    shownCoins = null;
    return;
  }
  const { coins, diamonds } = eco.state.profile;
  const avatar = u.avatar
    ? `<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer">`
    : `<span>${esc(u.name.slice(0, 1).toUpperCase())}</span>`;
  box.innerHTML = `
    ${wheel}
    <a class="wallet" href="#/shop" title="Dein Guthaben – zum Shop">
      <span class="wallet-item">${COIN}<b>${fmt(coins)}</b></span>
      <span class="wallet-item">${DIAMOND}<b>${fmt(diamonds)}</b></span>
    </a>
    <div class="user-menu">
      <button type="button" class="avatar" data-user-menu aria-haspopup="true" aria-expanded="false" title="${esc(u.name)}">${avatar}</button>
      <div class="menu" hidden>
        <span class="menu-name">${esc(u.name)}</span>
        ${eco.state.demo ? '<span class="menu-note">Demo-Modus: Daten nur in diesem Browser</span>' : ''}
        <a href="#/shop">Shop</a>
        <a href="#/erfolge">Erfolge</a>
        <button type="button" data-logout>Abmelden</button>
      </div>
    </div>`;
  if (shownCoins !== null && coins > shownCoins) {
    const wallet = box.querySelector('.wallet');
    wallet.classList.add('is-bump');
    setTimeout(() => wallet.classList.remove('is-bump'), 600);
  }
  shownCoins = coins;
}

let guestHinted = false;

export function initEconomyUI() {
  try {
    guestHinted = sessionStorage.getItem('gamehub-guest-hint') === '1';
  } catch {
    // Speicher nicht verfügbar
  }

  eco.onChange((e) => {
    if (e.type === 'state') {
      renderAccount();
    } else if (e.type === 'reward' && e.coins > 0) {
      toast({ icon: COIN, title: `+${fmt(e.coins)} Coins`, text: e.record ? 'Neuer Rekord – 10 Coins extra!' : '' });
    } else if (e.type === 'achievement') {
      toast({ icon: TROPHY, kind: 'toast--gold', title: `Erfolg: ${e.name}`, text: rewardText(e), duration: 5500 });
    } else if (e.type === 'guest' && !guestHinted) {
      guestHinted = true;
      try {
        sessionStorage.setItem('gamehub-guest-hint', '1');
      } catch {
        // Speicher nicht verfügbar
      }
      toast({
        icon: COIN,
        title: 'Coins sammeln?',
        text: e.coins > 0 ? `Diese Runde hätte dir ${fmt(e.coins)} Coins gebracht.` : 'Melde dich an für Coins, Erfolge und Designs.',
        action: { label: 'Anmelden', run: eco.signIn },
        duration: 8000,
      });
    } else if (e.type === 'error') {
      toast({ kind: 'toast--error', title: e.message });
    }
  });

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-login]')) {
      eco.signIn();
    } else if (t.closest('[data-logout]')) {
      eco.signOut();
    } else if (t.closest('[data-open-wheel]')) {
      openWheel();
    } else if (t.closest('[data-user-menu]')) {
      const btn = t.closest('[data-user-menu]');
      const menu = btn.nextElementSibling;
      menu.hidden = !menu.hidden;
      btn.setAttribute('aria-expanded', String(!menu.hidden));
    }
    // Menü schließen, wenn außerhalb geklickt wird
    if (!t.closest('.user-menu')) {
      document.querySelectorAll('.user-menu .menu').forEach((m) => (m.hidden = true));
    }
  });

  renderAccount();
}

// ---------- Glücksrad ----------

const WHEEL_COLORS = ['#ffd43b', '#74c0fc', '#ff8787', '#8ce99a', '#b197fc', '#ffa94d', '#f783ac', '#183153'];
let wheelRotation = 0;

function wheelSvg(segments) {
  const C = 160;
  const R = 148;
  const step = 360 / segments.length;
  const rad = (deg) => ((deg - 90) * Math.PI) / 180; // 0° = oben, im Uhrzeigersinn
  let slices = '';
  let labels = '';
  segments.forEach((s, i) => {
    const a0 = rad(i * step);
    const a1 = rad((i + 1) * step);
    const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
    slices += `<path d="M${C} ${C}L${C + R * Math.cos(a0)} ${C + R * Math.sin(a0)}A${R} ${R} 0 0 1 ${C + R * Math.cos(a1)} ${C + R * Math.sin(a1)}Z" fill="${color}"/>`;
    const mid = i * step + step / 2;
    const am = rad(mid);
    const dark = color === '#183153';
    const ink = dark ? '#ffd43b' : '#183153';
    const icon = s.diamonds
      ? `<path d="M-7 -3h14l4 5-11 13-11-13Z" transform="translate(0 6) scale(.8)" fill="#66d9e8" stroke="#15aabf" stroke-width="1.5"/>`
      : `<circle cx="0" cy="12" r="7.5" fill="#fcc419" stroke="#f59f00" stroke-width="2"/>`;
    labels += `<g transform="translate(${C + R * 0.64 * Math.cos(am)} ${C + R * 0.64 * Math.sin(am)}) rotate(${mid})">
      <text y="-4" text-anchor="middle" font-size="${s.diamonds ? 22 : 20}" font-weight="900" fill="${ink}">${s.diamonds || s.coins}</text>${icon}</g>`;
  });
  let ticks = '';
  for (let i = 0; i < segments.length; i++) {
    const a = rad(i * step);
    ticks += `<circle cx="${C + (R + 4) * Math.cos(a)}" cy="${C + (R + 4) * Math.sin(a)}" r="4" fill="#fff"/>`;
  }
  return `<svg viewBox="0 0 320 320" aria-hidden="true">
    <circle cx="${C}" cy="${C}" r="${R + 10}" fill="#183153"/>
    ${slices}${ticks}${labels}
    <circle cx="${C}" cy="${C}" r="26" fill="#fff"/><circle cx="${C}" cy="${C}" r="18" fill="#ffd43b"/>
  </svg>`;
}

// Zeit bis Mitternacht in Deutschland
function untilMidnight() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const left = 24 * 60 - (Number(parts.hour) * 60 + Number(parts.minute));
  return `${Math.floor(left / 60)} Std. ${left % 60} Min.`;
}

const STREAK_FACTORS = [1.0, 1.2, 1.4, 1.5, 1.6, 1.8, 2.0];
const factorText = (f) => `×${String(f).replace('.', ',')}`;

function confetti(container) {
  const colors = ['#ffd43b', '#74c0fc', '#ff8787', '#8ce99a', '#b197fc', '#ffa94d'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('span');
    p.className = 'confetti';
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.3}s`;
    p.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
    p.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    container.append(p);
    setTimeout(() => p.remove(), 2600);
  }
}

export function openWheel() {
  if (!eco.state.user) {
    loginPrompt('Melde dich an, um jeden Tag am Glücksrad zu drehen und Coins und Diamanten zu gewinnen.');
    return;
  }
  const segments = [...eco.state.catalog.wheel].sort((a, b) => a.idx - b.idx);
  if (!segments.length) {
    toast({ kind: 'toast--error', title: 'Glücksrad gerade nicht erreichbar.' });
    return;
  }
  const total = segments.reduce((n, s) => n + s.weight, 0);
  const streak = eco.currentStreak();
  const nextStreak = eco.canSpin() ? streak + 1 : streak;
  const factor = STREAK_FACTORS[Math.min(Math.max(nextStreak, 1), 7) - 1];

  const { el } = openModal(
    `
    <h2>Täglicher Bonus</h2>
    <p class="modal-text" data-wheel-info></p>
    <div class="wheel">
      <span class="wheel-pointer" aria-hidden="true"></span>
      <div class="wheel-rotor" data-rotor>${wheelSvg(segments)}</div>
      <div class="confetti-box" data-confetti></div>
    </div>
    <p class="wheel-result" data-result aria-live="polite"></p>
    <button type="button" class="btn btn--primary wheel-spin" data-spin>Drehen</button>
    <details class="wheel-odds">
      <summary>Gewinnchancen</summary>
      <ul>${segments
        .map((s) => `<li>${s.diamonds ? `${s.diamonds} ${s.diamonds === 1 ? 'Diamant' : 'Diamanten'}` : `${s.coins} Coins`}<span>${((s.weight / total) * 100).toFixed(0)} %</span></li>`)
        .join('')}</ul>
      <p>Serie: Wer an aufeinanderfolgenden Tagen dreht, bekommt mehr Coins (bis ×2 ab Tag 7). Jeder 7. Tag in Folge bringt zusätzlich 1 Diamant.</p>
    </details>`,
    { className: 'modal--wheel' },
  );

  const rotor = el.querySelector('[data-rotor]');
  const info = el.querySelector('[data-wheel-info]');
  const result = el.querySelector('[data-result]');
  const btn = el.querySelector('[data-spin]');
  wheelRotation %= 360;
  rotor.style.transition = 'none';
  rotor.style.transform = `rotate(${wheelRotation}deg)`;

  const updateInfo = () => {
    if (eco.canSpin()) {
      info.textContent = nextStreak > 1 ? `Serie: Tag ${nextStreak} – Coins ${factorText(factor)}` : 'Einmal pro Tag drehen und gewinnen!';
      btn.disabled = false;
      btn.textContent = 'Drehen';
    } else {
      info.textContent = `Serie: ${eco.currentStreak()} ${eco.currentStreak() === 1 ? 'Tag' : 'Tage'} – komm morgen wieder!`;
      btn.disabled = true;
      btn.textContent = `Nächster Dreh in ${untilMidnight()}`;
    }
  };
  updateInfo();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    let data;
    try {
      data = await eco.spin();
    } catch {
      result.textContent = 'Heute wurde schon gedreht.';
      updateInfo();
      return;
    }
    const step = 360 / segments.length;
    const i = segments.findIndex((s) => s.idx === data.segment);
    const center = i * step + step / 2;
    // Mindestens 5 Umdrehungen vorwärts, dann genau auf das Feld (mit etwas Zufall innerhalb des Felds)
    const base = wheelRotation + 360 * 5;
    const delta = (((-center - base) % 360) + 360) % 360;
    wheelRotation = base + delta + (Math.random() - 0.5) * step * 0.6;
    void rotor.offsetWidth;
    rotor.style.transition = 'transform 4.2s cubic-bezier(0.12, 0.6, 0.08, 1)';
    rotor.style.transform = `rotate(${wheelRotation}deg)`;
    await wait(4300);

    const parts = [];
    if (data.coins_gained) parts.push(`+${fmt(data.coins_gained)} Coins${data.factor > 1 ? ` (${factorText(data.factor)})` : ''}`);
    const segDiamonds = data.diamonds_gained - data.streak_bonus;
    if (segDiamonds) parts.push(`+${segDiamonds} ${segDiamonds === 1 ? 'Diamant' : 'Diamanten'}${segDiamonds >= 5 ? ' – Jackpot!' : ''}`);
    if (data.streak_bonus) parts.push(`+${data.streak_bonus} Diamant Serien-Bonus`);
    result.innerHTML = parts.map(esc).join('<br>');
    confetti(el.querySelector('[data-confetti]'));
    eco.applySpin(data);
    updateInfo();
  });
}

// ---------- Seite: Shop ----------

const ANIMATED = new Set(['snake-rainbow', 'snake-gold', 'snake-neon']);

function priceHtml(item) {
  if (eco.isFree(item)) return '<span class="price">Gratis</span>';
  return `<span class="price">${item.price_diamonds ? DIAMOND : COIN}${fmt(item.price_diamonds || item.price_coins)}</span>`;
}

function shopButton(item) {
  const { user, profile } = eco.state;
  if (!user) return '<button type="button" class="btn" data-login>Anmelden zum Kaufen</button>';
  const equipped = eco.getEquipped(item.game) === item.id;
  if (equipped) return '<button type="button" class="btn is-equipped" disabled>Ausgerüstet ✓</button>';
  if (eco.owns(item.id)) return `<button type="button" class="btn" data-equip="${item.id}">Ausrüsten</button>`;
  const missingCoins = item.price_coins - profile.coins;
  const missingDiamonds = item.price_diamonds - profile.diamonds;
  if (missingCoins > 0 || missingDiamonds > 0) {
    const missing = missingDiamonds > 0 ? `${fmt(missingDiamonds)} ${missingDiamonds === 1 ? 'Diamant' : 'Diamanten'}` : `${fmt(missingCoins)} Coins`;
    return `<button type="button" class="btn" disabled>Kaufen</button><small class="shop-note">Dir fehlen noch ${missing}.</small>`;
  }
  return `<button type="button" class="btn btn--primary" data-buy="${item.id}">Kaufen</button>`;
}

function confirmBuy(item) {
  const { profile } = eco.state;
  const diamonds = item.price_diamonds > 0;
  const price = diamonds ? item.price_diamonds : item.price_coins;
  const unit = diamonds ? (price === 1 ? 'Diamant' : 'Diamanten') : 'Coins';
  const rest = (diamonds ? profile.diamonds : profile.coins) - price;
  const { el, close } = openModal(`
    <h2>${esc(item.name)} kaufen?</h2>
    <p class="modal-text">Kostet ${fmt(price)} ${unit}. Danach hast du noch ${fmt(rest)} ${unit}.</p>
    <div class="modal-actions">
      <button type="button" class="btn" data-close>Abbrechen</button>
      <button type="button" class="btn btn--primary" data-confirm>Kaufen</button>
    </div>`);
  el.querySelector('[data-confirm]').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await eco.buy(item.id);
      await eco.equip(item.id);
      toast({ icon: COIN, title: `${item.name} gekauft`, text: 'Ist jetzt ausgerüstet.' });
    } catch (err) {
      toast({ kind: 'toast--error', title: err?.message || 'Kauf fehlgeschlagen.' });
    }
    close();
  });
}

export function renderShop(container) {
  let activeGame = 'snake';
  let raf = 0;

  const render = () => {
    const games = [...new Set(eco.state.catalog.items.map((i) => i.game))];
    if (games.length && !games.includes(activeGame)) activeGame = games[0];
    const items = eco.state.catalog.items.filter((i) => i.game === activeGame);
    const gameTitle = (id) => GAMES.find((g) => g.id === id)?.title || id;
    container.innerHTML = `
      <section class="page">
        <div class="page-head">
          <h1>Shop</h1>
          <p>Designs für deine Spiele – bezahlt mit Coins oder Diamanten.</p>
        </div>
        ${eco.state.user ? '' : '<div class="page-cta">Melde dich an, um Coins zu sammeln und Designs zu kaufen. <button type="button" class="btn btn--primary btn--sm" data-login>Mit Google anmelden</button></div>'}
        ${games.length > 1 ? `<nav class="chips">${games.map((g) => `<button class="chip ${g === activeGame ? 'chip--active' : ''}" data-shop-game="${g}">${esc(gameTitle(g))}</button>`).join('')}</nav>` : `<h2 class="page-sub">${esc(gameTitle(activeGame))}</h2>`}
        ${items.length ? '' : '<p class="empty">Der Shop ist gerade nicht erreichbar.</p>'}
        <div class="shop-grid">
          ${items
            .map(
              (item) => `
            <article class="shop-card ${eco.getEquipped(item.game) === item.id && eco.state.user ? 'is-equipped' : ''}">
              <canvas class="shop-preview" width="320" height="200" data-design="${item.id}"></canvas>
              <div class="shop-body">
                <div class="shop-title"><h3>${esc(item.name)}</h3>${priceHtml(item)}</div>
                ${shopButton(item)}
              </div>
            </article>`,
            )
            .join('')}
        </div>
      </section>`;
    container.querySelectorAll('canvas[data-design]').forEach((c) => drawSnakePreview(c, c.dataset.design, performance.now()));
  };

  const onClick = (e) => {
    const buyBtn = e.target.closest('[data-buy]');
    const equipBtn = e.target.closest('[data-equip]');
    const gameBtn = e.target.closest('[data-shop-game]');
    if (buyBtn) {
      const item = eco.state.catalog.items.find((i) => i.id === buyBtn.dataset.buy);
      if (item) confirmBuy(item);
    } else if (equipBtn) {
      eco.equip(equipBtn.dataset.equip).catch((err) => toast({ kind: 'toast--error', title: err?.message || 'Ausrüsten fehlgeschlagen.' }));
    } else if (gameBtn) {
      activeGame = gameBtn.dataset.shopGame;
      render();
    }
  };

  // Bewegte Designs (Regenbogen, Gold, Neon) in der Vorschau animieren
  const animate = (t) => {
    raf = requestAnimationFrame(animate);
    container.querySelectorAll('canvas[data-design]').forEach((c) => {
      if (ANIMATED.has(c.dataset.design)) drawSnakePreview(c, c.dataset.design, t);
    });
  };

  container.addEventListener('click', onClick);
  const off = eco.onChange((e) => e.type === 'state' && render());
  render();
  raf = requestAnimationFrame(animate);
  return () => {
    off();
    cancelAnimationFrame(raf);
    container.removeEventListener('click', onClick);
  };
}

// ---------- Seite: Erfolge ----------

export function renderAchievements(container) {
  const render = () => {
    const list = eco.state.catalog.achievements;
    const done = list.filter((a) => eco.state.unlocked.has(a.id)).length;
    const groups = [null, ...GAMES.map((g) => g.id)]
      .map((game) => ({ game, items: list.filter((a) => (a.game || null) === game) }))
      .filter((g) => g.items.length);
    const title = (game) => (game ? GAMES.find((g) => g.id === game)?.title || game : 'Allgemein');
    const date = (iso) => new Date(iso).toLocaleDateString('de-DE');

    container.innerHTML = `
      <section class="page">
        <div class="page-head">
          <h1>Erfolge</h1>
          <p>${list.length ? `${done} von ${list.length} freigeschaltet. Erfolge mit Diamanten sind die härtesten.` : 'Erfolge sind gerade nicht erreichbar.'}</p>
        </div>
        ${eco.state.user ? '' : '<div class="page-cta">Melde dich an, um Erfolge zu sammeln. <button type="button" class="btn btn--primary btn--sm" data-login>Mit Google anmelden</button></div>'}
        ${groups
          .map(
            (g) => `
          <h2 class="page-sub">${esc(title(g.game))}</h2>
          <div class="ach-list">
            ${g.items
              .map((a) => {
                const unlocked = eco.state.unlocked.get(a.id);
                const value = Math.min(a.threshold, eco.achievementValue(a));
                const pct = unlocked ? 100 : Math.round((value / a.threshold) * 100);
                const epic = a.reward_diamonds > 0;
                return `
                <article class="ach ${unlocked ? 'is-done' : ''} ${epic ? 'is-epic' : ''}">
                  <span class="ach-icon">${TROPHY}</span>
                  <div class="ach-body">
                    <h3>${esc(a.name)}</h3>
                    <p>${esc(a.description)}</p>
                    <div class="ach-bar"><span style="width:${pct}%"></span></div>
                    <small>${unlocked ? `Freigeschaltet am ${date(unlocked)}` : `${fmt(value)} / ${fmt(a.threshold)}`}</small>
                  </div>
                  <span class="ach-reward">${rewardHtml({ coins: a.reward_coins, diamonds: a.reward_diamonds })}</span>
                </article>`;
              })
              .join('')}
          </div>`,
          )
          .join('')}
      </section>`;
  };
  const off = eco.onChange((e) => e.type === 'state' && render());
  render();
  return off;
}
