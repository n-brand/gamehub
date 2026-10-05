// Preise im Shop – reine Funktionen ohne Seiteneffekte, genutzt von Shop, Spielmenü, Profil und
// Demo-Backend und in Node prüfbar (tools/check-shop.mjs). Die gleichen Regeln rechnet der Server
// (supabase/migrations/002_shop.sql: sale_price, buy_item, exchange_diamonds).

const HOUR = 3600e3;
const DAY = 24 * HOUR;

// Gratis = kostet nichts und ist nicht exklusiv (exklusive Designs gibt es nur per Creator-Code)
export function isFreeItem(item) {
  return !item.exclusive && !item.price_coins && !item.price_diamonds;
}

// Rabatt aktiv: Prozentsatz gesetzt und Enddatum (falls vorhanden) noch nicht erreicht
export function saleActive(item, now = Date.now()) {
  return item.sale_percent > 0 && (!item.sale_until || Date.parse(item.sale_until) > now);
}

function salePrice(price, item, now) {
  if (!(price > 0)) return 0;
  if (!saleActive(item, now)) return price;
  return Math.max(1, Math.round((price * (100 - item.sale_percent)) / 100));
}

// Aktueller Preis eines Artikels mit Listenpreis und Rabatt-Angaben
export function priceOf(item, now = Date.now()) {
  const onSale = saleActive(item, now);
  return {
    coins: salePrice(item.price_coins, item, now),
    diamonds: salePrice(item.price_diamonds, item, now),
    listCoins: item.price_coins || 0,
    listDiamonds: item.price_diamonds || 0,
    onSale,
    percent: onSale ? item.sale_percent : 0,
  };
}

// Restzeit eines Rabatts als Text („noch 2 Tage“, „noch 1 Tag“, „noch 5 Std.“); ohne Enddatum leer
export function saleLeft(item, now = Date.now()) {
  if (!item.sale_until || !saleActive(item, now)) return '';
  const ms = Date.parse(item.sale_until) - now;
  if (ms >= 2 * DAY) return `noch ${Math.floor(ms / DAY)} Tage`;
  if (ms >= DAY) return 'noch 1 Tag';
  return `noch ${Math.ceil(ms / HOUR)} Std.`;
}

// Coins für ein Tauschpaket: Diamanten × Kurs, plus Bonus in Prozent
export function packageCoins(pkg, rate) {
  return Math.round((pkg.diamonds * rate * (100 + pkg.bonus_percent)) / 100);
}
