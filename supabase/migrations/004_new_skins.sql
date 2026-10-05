-- GameHub: neue Shop-Designs – Snake „Tiger“ und „Lava“, Würfelsprung-Themes „Wüste“ und „Synthwave“,
-- Würfel-Skins „Pirat“, „Alien“, „Katze“, „Panda“, „Kürbis“ und „Magma“.
-- Aussehen: public/js/designs.js (im Demo-Backend mitgezogen). Neu gestaltete bestehende Designs
-- (z. B. Ninja, Feuer) brauchen kein SQL – die Datenbank kennt nur Name, Preis und Besitz.
--
-- Reihenfolge: nach 001, 002 und 003 ausführen (SQL Editor → New query → einfügen → Run).
-- Kann gefahrlos erneut ausgeführt werden (Katalog wird dabei aktualisiert, Rabatte/Schilder bleiben).

insert into public.shop_items (id, game, slot, name, price_coins, price_diamonds, sort) values
  ('snake-tiger', 'snake', 'snake', 'Tiger', 500, 0, 52),
  ('snake-lava', 'snake', 'snake', 'Lava', 0, 6, 54),
  ('cubejump-desert', 'cubejump', 'cubejump-theme', 'Wüste', 500, 0, 152),
  ('cubejump-synth', 'cubejump', 'cubejump-theme', 'Synthwave', 900, 0, 154),
  ('cube-pirate', 'cubejump', 'cubejump-skin', 'Pirat', 600, 0, 272),
  ('cube-alien', 'cubejump', 'cubejump-skin', 'Alien', 0, 6, 274),
  ('cube-cat', 'cubejump', 'cubejump-skin', 'Katze', 400, 0, 276),
  ('cube-panda', 'cubejump', 'cubejump-skin', 'Panda', 600, 0, 277),
  ('cube-pumpkin', 'cubejump', 'cubejump-skin', 'Kürbis', 500, 0, 278),
  ('cube-magma', 'cubejump', 'cubejump-skin', 'Magma', 0, 7, 279)
on conflict (id) do update set
  game = excluded.game, slot = excluded.slot, name = excluded.name, price_coins = excluded.price_coins,
  price_diamonds = excluded.price_diamonds, sort = excluded.sort;
