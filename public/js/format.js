// Zahlen für die Oberfläche – reine Funktionen, in Node prüfbar (tools/check-shop.mjs).

// Zahl mit deutschem Tausenderpunkt (1.250)
export const fmt = (n) => new Intl.NumberFormat('de-DE').format(n || 0);

// Kurzform für knappe Stellen (Kontostand in der Kopfzeile): bis 9.999 voll, dann 12,4K / 100K / 1,2M.
// Überzählige Stellen werden abgeschnitten (nie gerundet), damit nie mehr angezeigt wird, als man hat.
export function fmtShort(n) {
  const v = Math.max(0, Math.floor(n || 0));
  if (v < 10000) return fmt(v);
  const [unit, size] = v >= 1e6 ? ['M', 1e6] : ['K', 1e3];
  const digits = v / size < 100 ? 1 : 0;
  // mit ganzen Zahlen abschneiden (12.900 → 129 → 12,9 – ohne Gleitkomma-Ausreißer wie 128,999…)
  const step = size / 10 ** digits;
  const cut = Math.floor(v / step) / 10 ** digits;
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(cut)}${unit}`;
}
