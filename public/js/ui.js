// Gemeinsame Bausteine der Oberfläche.

// Text sicher in HTML einsetzen
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Zahlen (1.250 bzw. Kurzform 12,4K) stehen in format.js
export { fmt, fmtShort } from './format.js';

const FILTER_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16l-6.2 7.3v5.4l-3.6 1.8v-7.2Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const CHEVRON =
  '<svg class="dropdown-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHECK =
  '<svg class="dropdown-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ---------- Dropdown (Filter auf dem Handy statt der Chip-Reihe) ----------
// Chip-Knopf, der ein Menü im Stil der Seite aufklappt. Bei einer Auswahl feuert das Element
// das Ereignis „dropdown-change“ mit { name, value } (bubbelt, also per Delegation abfangen).
//   options: [[wert, beschriftung], …]
//   label:   Beschriftung, solange der leere Wert ('') gewählt ist (z. B. „Filter“); sonst steht die Auswahl im Knopf
//   align:   'end' = Menü rechtsbündig unter dem Knopf

export function dropdown({ name, options, value, label, ariaLabel, align = 'start' }) {
  const current = options.find(([v]) => v === value);
  const active = Boolean(value) && Boolean(current);
  return `
    <div class="dropdown${align === 'end' ? ' dropdown--end' : ''}" data-dropdown="${name}">
      <button type="button" class="chip dropdown-btn${active && label ? ' chip--active' : ''}" aria-haspopup="listbox" aria-expanded="false" aria-label="${ariaLabel}: ${current?.[1] ?? ''}">
        ${label ? FILTER_ICON : ''}<span>${active || !label ? current?.[1] ?? '' : label}</span>${CHEVRON}
      </button>
      <div class="dropdown-menu" role="listbox" aria-label="${ariaLabel}" hidden>
        ${options
          .map(
            ([v, text]) =>
              `<button type="button" class="dropdown-item" role="option" data-value="${v}" aria-selected="${v === value}">${text}${v === value ? CHECK : ''}</button>`,
          )
          .join('')}
      </div>
    </div>`;
}

function setOpen(root, open) {
  const btn = root.querySelector('.dropdown-btn');
  root.querySelector('.dropdown-menu').hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
}

function closeAll(except) {
  document.querySelectorAll('.dropdown').forEach((root) => root !== except && setOpen(root, false));
}

document.addEventListener('click', (e) => {
  const item = e.target.closest('.dropdown-item');
  const btn = e.target.closest('.dropdown-btn');
  if (item) {
    const root = item.closest('.dropdown');
    setOpen(root, false);
    root.dispatchEvent(new CustomEvent('dropdown-change', { bubbles: true, detail: { name: root.dataset.dropdown, value: item.dataset.value } }));
  } else if (btn) {
    const root = btn.closest('.dropdown');
    const open = btn.getAttribute('aria-expanded') !== 'true';
    closeAll(root);
    setOpen(root, open);
    // Mit der Tastatur geöffnet: gleich die aktuelle Auswahl fokussieren
    if (open && e.detail === 0) root.querySelector('[aria-selected="true"], .dropdown-item')?.focus();
  } else {
    closeAll();
  }
});

document.addEventListener('keydown', (e) => {
  const root = e.target.closest?.('.dropdown');
  if (!root) return;
  const items = [...root.querySelectorAll('.dropdown-item')];
  const i = items.indexOf(e.target);
  if (e.key === 'Escape') {
    setOpen(root, false);
    root.querySelector('.dropdown-btn').focus();
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (root.querySelector('.dropdown-menu').hidden) setOpen(root, true);
    const next = i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  }
});
