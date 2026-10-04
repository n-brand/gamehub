// Paare finden – Karten aufdecken und gleiche Paare finden. mount(container) gibt eine Cleanup-Funktion zurück.

const LEVELS = {
  easy: { cols: 4, rows: 3 },
  medium: { cols: 5, rows: 4 },
  hard: { cols: 6, rows: 5 },
};
const STORE_KEY = 'gamehub-pairs';
const MISMATCH_MS = 900; // so lange bleibt ein falsches Paar offen
const GAP = 2; // Abstand zwischen Karten in cqi des Spielfelds

// Kartenmotive (flache Icons, viewBox 0 0 100 100)
const ICONS = [
  // Stern
  '<path d="M50 8 61.8 35.2 91 37.6 68.8 56.8 75.6 85.6 50 70.2 24.4 85.6 31.2 56.8 9 37.6 38.2 35.2Z" fill="#fcc419" stroke="#fcc419" stroke-width="6" stroke-linejoin="round"/>',
  // Herz
  '<path d="M50 86C20 64 8 48 8 32 8 18 19 9 31 9c9 0 15 5 19 12 4-7 10-12 19-12 12 0 23 9 23 23 0 16-12 32-42 54Z" fill="#fa5252"/>',
  // Mond
  '<path d="M43.3 14A38 38 0 1 0 80.2 66.3 32 32 0 0 1 43.3 14Z" fill="#845ef7"/>',
  // Sonne
  `<g fill="#ff922b"><circle cx="50" cy="50" r="21"/>${[0, 45, 90, 135, 180, 225, 270, 315]
    .map((a) => `<rect x="46" y="5" width="8" height="18" rx="4" transform="rotate(${a} 50 50)"/>`)
    .join('')}</g>`,
  // Blitz
  '<path d="M58 6 22 56h24l-6 38 38-52H54Z" fill="#fab005" stroke="#fab005" stroke-width="5" stroke-linejoin="round"/>',
  // Blatt
  '<path d="M16 84C14 40 44 14 88 12c0 44-26 74-72 72Z" fill="#40c057"/><path d="M18 82C38 62 56 42 74 26" stroke="#2b8a3e" stroke-width="5" fill="none" stroke-linecap="round"/>',
  // Tropfen
  '<path d="M50 8S20 44 20 62a30 30 0 0 0 60 0C80 44 50 8 50 8Z" fill="#339af0"/><ellipse cx="37" cy="64" rx="6" ry="10" fill="#fff" opacity=".45"/>',
  // Note
  '<g fill="#e64980"><ellipse cx="31" cy="76" rx="14" ry="11"/><ellipse cx="73" cy="68" rx="14" ry="11"/><rect x="38" y="18" width="7" height="58" rx="3"/><rect x="80" y="10" width="7" height="58" rx="3"/><path d="M38 18 87 8v16L38 34Z"/></g>',
  // Edelstein
  '<path d="M28 14h44l20 24-42 52L8 38Z" fill="#22b8cf"/><path d="M8 38h84M28 14l12 24 10 52 10-52 12-24M40 38l10-24 10 24" stroke="#0c8599" stroke-width="3" fill="none" stroke-linejoin="round"/>',
  // Krone
  '<path d="M14 74 10 28l22 20 18-30 18 30 22-20-4 46Z" fill="#f59f00" stroke="#f59f00" stroke-width="5" stroke-linejoin="round"/><rect x="12" y="78" width="76" height="10" rx="4" fill="#f59f00"/><circle cx="50" cy="56" r="6" fill="#fff" opacity=".6"/>',
  // Geist
  '<path d="M18 88V46a32 32 0 0 1 64 0v42l-11-8-11 8-10-8-10 8-11-8Z" fill="#7950f2"/><circle cx="38" cy="46" r="7" fill="#fff"/><circle cx="62" cy="46" r="7" fill="#fff"/><circle cx="40" cy="48" r="3.5" fill="#183153"/><circle cx="64" cy="48" r="3.5" fill="#183153"/>',
  // Kirschen
  '<path d="M34 64c4-24 14-40 32-52m0 0c-4 22 0 36 6 50" stroke="#2b8a3e" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M66 12c10-4 22 0 26 10-12 4-20 0-26-10Z" fill="#40c057"/><circle cx="32" cy="70" r="18" fill="#e03131"/><circle cx="72" cy="66" r="18" fill="#e03131"/><circle cx="26" cy="64" r="5" fill="#fff" opacity=".45"/><circle cx="66" cy="60" r="5" fill="#fff" opacity=".45"/>',
  // Fisch
  '<path d="M10 50c14-24 46-28 64-10l18-14v48L74 60C56 78 24 74 10 50Z" fill="#1c7ed6"/><circle cx="30" cy="46" r="5" fill="#fff"/><circle cx="31" cy="46" r="2.5" fill="#183153"/>',
  // Blume
  '<g fill="#f06595"><circle cx="50" cy="28" r="16"/><circle cx="70.9" cy="43.2" r="16"/><circle cx="62.9" cy="67.8" r="16"/><circle cx="37.1" cy="67.8" r="16"/><circle cx="29.1" cy="43.2" r="16"/></g><circle cx="50" cy="50" r="12" fill="#ffd43b"/>',
  // Planet
  '<ellipse cx="50" cy="50" rx="44" ry="13" fill="none" stroke="#fcc419" stroke-width="6" transform="rotate(-20 50 50)"/><circle cx="50" cy="50" r="26" fill="#5c7cfa"/><path d="M6 50a44 13 0 0 0 88 0" fill="none" stroke="#fcc419" stroke-width="6" transform="rotate(-20 50 50)"/>',
];

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // Speicher nicht verfügbar – Rekord gilt nur für diese Sitzung
  }
}

const fmtTime = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Weniger Züge sind besser, bei Gleichstand zählt die Zeit
const isBetter = (a, b) => !b || a.moves < b.moves || (a.moves === b.moves && a.time < b.time);

export function mount(container) {
  const data = load();
  data.best = data.best || {};
  let level = LEVELS[data.level] ? data.level : 'medium';

  container.innerHTML = `
    <div class="gp pairs">
      <div class="gp-panel">
        <div class="gp-stats">
          <div class="gp-stat"><span>Züge</span><b data-moves>0</b></div>
          <div class="gp-stat"><span>Zeit</span><b data-time>0:00</b></div>
          <div class="gp-stat"><span>Paare</span><b data-found>0</b></div>
          <div class="gp-stat"><span>Rekord</span><b data-best>–</b></div>
        </div>
        <div class="gp-group">
          <span class="gp-label">Karten</span>
          <div class="gp-seg" role="group" aria-label="Anzahl Karten">
            ${Object.entries(LEVELS)
              .map(([key, l]) => `<button type="button" data-level="${key}">${l.cols * l.rows}</button>`)
              .join('')}
          </div>
        </div>
        <button type="button" class="btn btn--primary" data-new>Neues Spiel</button>
        <p class="gp-hint">Finde alle Paare mit möglichst wenigen Zügen.</p>
      </div>
      <div class="pairs-field" data-field>
        <div class="pairs-grid" data-grid></div>
        <div class="gp-overlay" data-overlay hidden>
          <p data-msg></p>
          <small data-sub></small>
          <div class="gp-overlay-actions"><button type="button" class="btn btn--primary" data-again>Nochmal</button></div>
        </div>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const field = $('[data-field]');
  const grid = $('[data-grid]');
  const overlay = $('[data-overlay]');

  let cards = []; // { icon, el, open, matched }
  let first = null;
  let second = null;
  let moves = 0;
  let found = 0;
  let startTime = 0;
  let endTime = 0;
  let round = 0;
  let ticker = 0;
  let closeTimer = 0;
  let wrongTimer = 0;
  const timers = new Set();

  // setTimeout, das beim Rundenwechsel automatisch verfällt
  function schedule(fn, ms) {
    const token = round;
    const id = setTimeout(() => {
      timers.delete(id);
      if (token === round) fn();
    }, ms);
    timers.add(id);
    return id;
  }

  function cancel(id) {
    clearTimeout(id);
    timers.delete(id);
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers.clear();
    clearInterval(ticker);
  }

  function elapsed() {
    if (!startTime) return 0;
    return (endTime || performance.now()) - startTime;
  }

  function renderStats() {
    const { cols, rows } = LEVELS[level];
    $('[data-moves]').textContent = moves;
    $('[data-time]').textContent = fmtTime(elapsed());
    $('[data-found]').textContent = `${found}/${(cols * rows) / 2}`;
    const best = data.best[level];
    $('[data-best]').textContent = best ? `${best.moves} Züge` : '–';
    container.querySelectorAll('[data-level]').forEach((b) => {
      const on = b.dataset.level === level;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
  }

  function newGame() {
    round++;
    clearTimers();
    const { cols, rows } = LEVELS[level];
    // Höhe/Breite des Felds (Karten 3:4, Abstand GAP % der Breite) → passt in den Rahmen
    const cardW = (100 - (cols - 1) * GAP) / cols;
    const ratio = (rows * cardW * (4 / 3) + (rows - 1) * GAP) / 100;
    field.style.setProperty('--ratio', ratio);
    field.style.setProperty('--cols', cols);

    const icons = shuffle(ICONS).slice(0, (cols * rows) / 2);
    cards = shuffle([...icons, ...icons]).map((icon) => ({ icon, el: null, open: false, matched: false }));
    grid.classList.remove('is-won');
    grid.innerHTML = cards
      .map(
        (c, i) => `
        <button type="button" class="pc" style="--i:${i}" data-i="${i}" aria-label="Karte ${i + 1}">
          <span class="pc-inner">
            <span class="pc-face pc-back"></span>
            <span class="pc-face pc-front"><svg viewBox="0 0 100 100" aria-hidden="true">${c.icon}</svg></span>
          </span>
        </button>`,
      )
      .join('');
    grid.querySelectorAll('.pc').forEach((el, i) => (cards[i].el = el));

    first = second = null;
    moves = 0;
    found = 0;
    startTime = endTime = 0;
    overlay.hidden = true;
    renderStats();
  }

  function closePair() {
    cancel(closeTimer);
    cancel(wrongTimer);
    [first, second].forEach((c) => {
      if (!c) return;
      c.open = false;
      c.el.classList.remove('is-open', 'is-wrong');
      c.el.setAttribute('aria-label', `Karte ${Number(c.el.dataset.i) + 1}`);
    });
    first = second = null;
  }

  function flip(i) {
    const card = cards[i];
    if (!card || card.open || card.matched || !overlay.hidden) return;
    // Falsches Paar noch offen? Sofort zudecken, damit man zügig weiterspielen kann
    if (first && second) closePair();

    card.open = true;
    card.el.classList.add('is-open');
    card.el.setAttribute('aria-label', 'Aufgedeckte Karte');
    if (!startTime) {
      startTime = performance.now();
      ticker = setInterval(renderStats, 250);
    }
    if (!first) {
      first = card;
      return;
    }

    second = card;
    moves++;
    if (first.icon === second.icon) {
      const pair = [first, second];
      first = second = null;
      pair.forEach((c) => (c.matched = true));
      found++;
      schedule(() => pair.forEach((c) => c.el.classList.add('is-matched')), 320);
      if (found === cards.length / 2) win();
    } else {
      const pair = [first, second];
      wrongTimer = schedule(() => pair.forEach((c) => c.el.classList.add('is-wrong')), 380);
      closeTimer = schedule(closePair, MISMATCH_MS);
    }
    renderStats();
  }

  function win() {
    endTime = performance.now();
    clearInterval(ticker);
    const result = { moves, time: Math.round(elapsed()) };
    const record = isBetter(result, data.best[level]);
    if (record) {
      data.best[level] = result;
      save(data);
    }
    renderStats();
    schedule(() => grid.classList.add('is-won'), 450);
    schedule(() => {
      $('[data-msg]').textContent = record ? 'Neuer Rekord!' : 'Geschafft!';
      $('[data-sub]').textContent = `${moves} Züge · ${fmtTime(result.time)}`;
      overlay.hidden = false;
    }, 1300);
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.pc');
    if (btn) flip(Number(btn.dataset.i));
  });

  // Pfeiltasten bewegen den Fokus über die Karten (Enter/Leertaste deckt auf)
  grid.addEventListener('keydown', (e) => {
    const btn = e.target.closest('.pc');
    if (!btn) return;
    const { cols } = LEVELS[level];
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
    if (!step) return;
    e.preventDefault();
    cards[Number(btn.dataset.i) + step]?.el.focus();
  });

  container.querySelectorAll('[data-level]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.level === level) return;
      level = b.dataset.level;
      data.level = level;
      save(data);
      newGame();
    }),
  );
  $('[data-new]').addEventListener('click', newGame);
  $('[data-again]').addEventListener('click', newGame);

  newGame();

  return () => {
    round++;
    clearTimers();
  };
}
