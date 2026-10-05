-- GameHub: Shop 2.0 – Rabatte, exklusive Designs (nur per Creator-Code), Diamanten-Tausch in Paketen
-- und Creator-Codes. Spec: docs/superpowers/specs/2026-10-05-shop-v2-design.md
--
-- Reihenfolge: NACH 001_economy.sql ausführen (SQL Editor → New query → einfügen → Run).
-- Kann gefahrlos erneut ausgeführt werden. Wer 001 später erneut ausführt, führt danach auch diese
-- Datei erneut aus (001 enthält die alte Fassung von equip_item).
--
-- Werte selbst anpassen (Table Editor oder SQL), sie bleiben beim erneuten Ausführen erhalten:
--   Rabatt:     update public.shop_items set sale_percent = 30, sale_until = now() + interval '3 days' where id = 'snake-neon';
--   Rabatt aus: update public.shop_items set sale_percent = 0, sale_until = null where id = 'snake-neon';
--   Schild:     update public.shop_items set highlight = 'Beliebt' where id = 'snake-neon';  (entfernen: = null)
--   Kurs:       update public.shop_settings set value = 150 where key = 'diamond_coin_rate';
--   Pakete:     Tabelle exchange_packages (diamonds, bonus_percent)
--   Codes:      insert into public.creator_codes (code, coins, diamonds, items, expires_at, max_uses, note)
--               values ('SOMMER', 500, 0, array['snake-galaxy'], now() + interval '14 days', 1000, 'Sommer-Aktion');

-- ---------- Tabellen ----------

-- Artikel: exklusiv (nur per Code, nie kaufbar, nie gratis) und Rabatt in Prozent mit optionalem Ende
alter table public.shop_items add column if not exists exclusive boolean not null default false;
alter table public.shop_items add column if not exists sale_percent integer not null default 0;
alter table public.shop_items add column if not exists sale_until timestamptz;
alter table public.shop_items drop constraint if exists shop_items_sale_percent_check;
alter table public.shop_items add constraint shop_items_sale_percent_check check (sale_percent between 0 and 90);

-- Hervorhebung im Shop (gelber Rand + Schild, z. B. „Beliebt“); leer = keine. Beim ersten Ausführen bekommt
-- Snake „Neon“ das Schild – spätere eigene Änderungen bleiben beim erneuten Ausführen erhalten.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'shop_items' and column_name = 'highlight') then
    -- per execute, damit das update erst nach dem Anlegen der Spalte geprüft wird
    execute 'alter table public.shop_items add column highlight text';
    execute $q$update public.shop_items set highlight = 'Beliebt' where id = 'snake-neon'$q$;
  end if;
end;
$$;

-- Einstellungen des Shops (z. B. Grundkurs Diamant → Coins)
create table if not exists public.shop_settings (
  key text primary key,
  value integer not null
);

-- Tauschpakete: Coins = Diamanten × Kurs × (100 + Bonus) / 100
create table if not exists public.exchange_packages (
  id text primary key,
  diamonds integer not null check (diamonds > 0),
  bonus_percent integer not null default 0 check (bonus_percent between 0 and 100),
  sort integer not null default 0
);

-- Creator-Codes (Codes immer in Großbuchstaben). Für Spieler nicht lesbar.
create table if not exists public.creator_codes (
  code text primary key check (code = upper(code)),
  coins integer not null default 0 check (coins >= 0),
  diamonds integer not null default 0 check (diamonds >= 0),
  items text[] not null default '{}',
  active boolean not null default true,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.code_redemptions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null references public.creator_codes (code) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- ---------- Zugriffsrechte (Row Level Security) ----------

alter table public.shop_settings enable row level security;
alter table public.exchange_packages enable row level security;
alter table public.creator_codes enable row level security;
alter table public.code_redemptions enable row level security;

drop policy if exists "Katalog lesen" on public.shop_settings;
create policy "Katalog lesen" on public.shop_settings for select to anon, authenticated using (true);

drop policy if exists "Katalog lesen" on public.exchange_packages;
create policy "Katalog lesen" on public.exchange_packages for select to anon, authenticated using (true);

drop policy if exists "eigene Einlösungen lesen" on public.code_redemptions;
create policy "eigene Einlösungen lesen" on public.code_redemptions for select to authenticated using (user_id = auth.uid());

-- creator_codes bekommt absichtlich keine Policy (= niemand liest) und zusätzlich keine Rechte
revoke all on table public.creator_codes from anon, authenticated;

-- ---------- Schutz exklusiver Designs ----------
-- Unabhängig von den Funktionen: exklusive Artikel kommen nur über redeem_code ins Inventar
-- und lassen sich nur ausrüsten, wenn man sie besitzt.

create or replace function public.guard_exclusive_inventory()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.shop_items where id = new.item_id and exclusive)
     and coalesce(current_setting('gamehub.grant_exclusive', true), '') <> 'on' then
    raise exception 'Dieses Design gibt es nur per Creator-Code.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_exclusive_guard on public.inventory;
create trigger inventory_exclusive_guard
  before insert or update on public.inventory
  for each row execute function public.guard_exclusive_inventory();

create or replace function public.guard_exclusive_equip()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.shop_items where id = new.item_id and exclusive)
     and not exists (select 1 from public.inventory where user_id = new.user_id and item_id = new.item_id) then
    raise exception 'Artikel nicht im Besitz' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists equipped_exclusive_guard on public.equipped;
create trigger equipped_exclusive_guard
  before insert or update on public.equipped
  for each row execute function public.guard_exclusive_equip();

-- ---------- Funktionen ----------

-- Preis mit aktivem Rabatt: mindestens 1, kaufmännisch gerundet (wie pricing.js im Browser)
create or replace function public.sale_price(p_price integer, p_percent integer, p_until timestamptz)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when p_price <= 0 then 0
    when p_percent > 0 and (p_until is null or p_until > now())
      then greatest(1, round(p_price * (100 - p_percent) / 100.0)::integer)
    else p_price
  end;
$$;

-- Kaufen (ersetzt buy_item(text) aus 001): Rabattpreis, keine exklusiven Artikel, und nur zu dem Preis,
-- den der Spieler gesehen hat (p_coins/p_diamonds) – sonst „Der Preis hat sich geändert.“
drop function if exists public.buy_item(text);
create or replace function public.buy_item(p_item text, p_coins integer default null, p_diamonds integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item record;
  v_profile record;
  v_price_coins integer;
  v_price_diamonds integer;
  v_coins integer;
  v_diamonds integer;
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet';
  end if;
  perform public.ensure_profile(v_uid);
  select * into v_item from public.shop_items where id = p_item;
  if not found then
    raise exception 'Unbekannter Artikel: %', p_item;
  end if;
  if v_item.exclusive then
    raise exception 'Dieses Design gibt es nur per Creator-Code.' using errcode = 'P0001';
  end if;
  select * into v_profile from public.profiles where id = v_uid for update;

  v_price_coins := public.sale_price(v_item.price_coins, v_item.sale_percent, v_item.sale_until);
  v_price_diamonds := public.sale_price(v_item.price_diamonds, v_item.sale_percent, v_item.sale_until);

  if (v_item.price_coins = 0 and v_item.price_diamonds = 0)
     or exists (select 1 from public.inventory where user_id = v_uid and item_id = p_item) then
    return jsonb_build_object('owned', true, 'coins', v_profile.coins, 'diamonds', v_profile.diamonds);
  end if;
  if p_coins is not null and (p_coins <> v_price_coins or coalesce(p_diamonds, 0) <> v_price_diamonds) then
    raise exception 'Der Preis hat sich geändert.' using errcode = 'P0001';
  end if;
  if v_profile.coins < v_price_coins or v_profile.diamonds < v_price_diamonds then
    raise exception 'Nicht genug Guthaben' using errcode = 'P0001';
  end if;

  update public.profiles
     set coins = coins - v_price_coins,
         diamonds = diamonds - v_price_diamonds
   where id = v_uid
  returning coins, diamonds into v_coins, v_diamonds;
  insert into public.inventory (user_id, item_id) values (v_uid, p_item);

  return jsonb_build_object('owned', true, 'coins', v_coins, 'diamonds', v_diamonds,
                            'paid_coins', v_price_coins, 'paid_diamonds', v_price_diamonds);
end;
$$;

-- Ausrüsten: gratis = Preis 0 und nicht exklusiv, alles andere nur aus dem Inventar
create or replace function public.equip_item(p_item text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item record;
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet';
  end if;
  perform public.ensure_profile(v_uid);
  select * into v_item from public.shop_items where id = p_item;
  if not found then
    raise exception 'Unbekannter Artikel: %', p_item;
  end if;
  if not (v_item.price_coins = 0 and v_item.price_diamonds = 0 and not v_item.exclusive)
     and not exists (select 1 from public.inventory where user_id = v_uid and item_id = p_item) then
    raise exception 'Artikel nicht im Besitz' using errcode = 'P0001';
  end if;
  insert into public.equipped (user_id, slot, item_id)
  values (v_uid, v_item.slot, p_item)
  on conflict (user_id, slot) do update set item_id = excluded.item_id;
  return jsonb_build_object('slot', v_item.slot, 'item', p_item);
end;
$$;

-- Diamanten in Coins tauschen – nur ganze Pakete, die Coins rechnet der Server
create or replace function public.exchange_diamonds(p_package text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pkg record;
  v_rate integer;
  v_gain integer;
  v_profile record;
  v_coins integer;
  v_diamonds integer;
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet';
  end if;
  perform public.ensure_profile(v_uid);
  select * into v_pkg from public.exchange_packages where id = p_package;
  if not found then
    raise exception 'Unbekanntes Paket' using errcode = 'P0001';
  end if;
  select value into v_rate from public.shop_settings where key = 'diamond_coin_rate';
  v_rate := coalesce(v_rate, 150);
  v_gain := round(v_pkg.diamonds * v_rate * (100 + v_pkg.bonus_percent) / 100.0)::integer;

  select * into v_profile from public.profiles where id = v_uid for update;
  if v_profile.diamonds < v_pkg.diamonds then
    raise exception 'Nicht genug Diamanten' using errcode = 'P0001';
  end if;

  update public.profiles
     set diamonds = diamonds - v_pkg.diamonds,
         coins = coins + v_gain
   where id = v_uid
  returning coins, diamonds into v_coins, v_diamonds;

  return jsonb_build_object('coins_gained', v_gain, 'diamonds_spent', v_pkg.diamonds,
                            'coins', v_coins, 'diamonds', v_diamonds);
end;
$$;

-- Creator-Code einlösen: pro Spieler einmal; Ablaufdatum und Höchstzahl prüfen; Designs ins Inventar,
-- Coins und Diamanten gutschreiben. Die Code-Zeile wird gesperrt, damit max_uses auch bei gleichzeitigen
-- Einlösungen hält.
create or replace function public.redeem_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code record;
  v_item text;
  v_items text[] := '{}';
  v_new text[] := '{}';
  v_coins integer;
  v_diamonds integer;
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet';
  end if;
  perform public.ensure_profile(v_uid);
  select * into v_code from public.creator_codes
   where code = upper(btrim(coalesce(p_code, ''))) and active
     for update;
  if not found then
    raise exception 'Diesen Code gibt es nicht.' using errcode = 'P0001';
  end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then
    raise exception 'Dieser Code ist abgelaufen.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.code_redemptions where user_id = v_uid and code = v_code.code) then
    raise exception 'Diesen Code hast du schon eingelöst.' using errcode = 'P0001';
  end if;
  if v_code.max_uses is not null and v_code.uses >= v_code.max_uses then
    raise exception 'Dieser Code wurde schon zu oft eingelöst.' using errcode = 'P0001';
  end if;

  insert into public.code_redemptions (user_id, code) values (v_uid, v_code.code);
  update public.creator_codes set uses = uses + 1 where code = v_code.code;

  -- Nur hier dürfen exklusive Designs ins Inventar (siehe guard_exclusive_inventory)
  perform set_config('gamehub.grant_exclusive', 'on', true);
  foreach v_item in array v_code.items loop
    if exists (select 1 from public.shop_items where id = v_item) then
      v_items := v_items || v_item;
      insert into public.inventory (user_id, item_id) values (v_uid, v_item) on conflict do nothing;
      if found then
        v_new := v_new || v_item;
      end if;
    end if;
  end loop;
  perform set_config('gamehub.grant_exclusive', 'off', true);

  update public.profiles
     set coins = coins + v_code.coins,
         diamonds = diamonds + v_code.diamonds
   where id = v_uid
  returning coins, diamonds into v_coins, v_diamonds;

  return jsonb_build_object('code', v_code.code, 'items', to_jsonb(v_items), 'new_items', to_jsonb(v_new),
                            'coins_gained', v_code.coins, 'diamonds_gained', v_code.diamonds,
                            'coins', v_coins, 'diamonds', v_diamonds);
end;
$$;

-- ---------- Ausführungsrechte ----------

revoke execute on function public.sale_price(integer, integer, timestamptz) from public, anon, authenticated;
revoke execute on function public.guard_exclusive_inventory() from public, anon, authenticated;
revoke execute on function public.guard_exclusive_equip() from public, anon, authenticated;

revoke execute on function public.buy_item(text, integer, integer) from public, anon;
revoke execute on function public.equip_item(text) from public, anon;
revoke execute on function public.exchange_diamonds(text) from public, anon;
revoke execute on function public.redeem_code(text) from public, anon;
grant execute on function public.buy_item(text, integer, integer) to authenticated;
grant execute on function public.equip_item(text) to authenticated;
grant execute on function public.exchange_diamonds(text) to authenticated;
grant execute on function public.redeem_code(text) to authenticated;

-- ---------- Startwerte ----------

-- Galaxie-Würfel kam nachträglich dazu: beim ersten Mal an einen schon vorhandenen Code GAMEHUB anhängen
-- (bevor der Würfel unten in den Katalog kommt – danach greift das nicht mehr, eigene Änderungen bleiben)
do $$
begin
  if not exists (select 1 from public.shop_items where id = 'cube-galaxy') then
    update public.creator_codes set items = array_append(items, 'cube-galaxy')
     where code = 'GAMEHUB' and not ('cube-galaxy' = any (items));
  end if;
end;
$$;

-- Exklusive Designs (Katalog: beim erneuten Ausführen aktualisiert)
insert into public.shop_items (id, game, slot, name, price_coins, price_diamonds, sort, exclusive) values
  ('snake-galaxy', 'snake', 'snake', 'Galaxie', 0, 0, 60, true),
  ('cubejump-galaxy', 'cubejump', 'cubejump-theme', 'Galaxie', 0, 0, 160, true),
  ('cube-galaxy', 'cubejump', 'cubejump-skin', 'Galaxie', 0, 0, 280, true)
on conflict (id) do update set
  game = excluded.game, slot = excluded.slot, name = excluded.name, price_coins = excluded.price_coins,
  price_diamonds = excluded.price_diamonds, sort = excluded.sort, exclusive = excluded.exclusive;

-- Einstellbare Werte: nur beim ersten Ausführen anlegen, eigene Änderungen bleiben erhalten
insert into public.shop_settings (key, value) values ('diamond_coin_rate', 150)
on conflict (key) do nothing;

insert into public.exchange_packages (id, diamonds, bonus_percent, sort) values
  ('p1', 1, 0, 10),
  ('p5', 5, 10, 20),
  ('p10', 10, 20, 30),
  ('p25', 25, 30, 40)
on conflict (id) do nothing;

insert into public.creator_codes (code, coins, diamonds, items, note) values
  ('GAMEHUB', 300, 0, array['snake-galaxy', 'cubejump-galaxy', 'cube-galaxy'], 'Beispiel-Code: alle drei Galaxie-Designs und 300 Coins')
on conflict (code) do nothing;
