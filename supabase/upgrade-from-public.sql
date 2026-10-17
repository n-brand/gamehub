-- GameHub: Umzug von "public" in das Schema "gamehub" (einmalig, für die Live-Datenbank seit 2026-10-06).
-- Nicht einzeln ausführen, sondern über: node tools/sql-bundle.mjs --umzug
-- (setzt dieses Skript vor 001–999 und packt alles in eine Transaktion).
--
-- Was passiert:
-- 1. Alle GameHub-Tabellen werden samt Daten, Policies und Fremdschlüsseln nach "gamehub" verschoben.
-- 2. Die alten Funktionen in "public" und der alte Anmelde-Trigger werden entfernt
--    (001–999 legen sie danach in "gamehub" neu an).
-- Läuft ohne Wirkung durch, wenn keine GameHub-Tabellen (mehr) in "public" liegen; auch nach einem
-- teilweisen Umzug wiederholbar (bereits verschobene Tabellen werden übersprungen).

create schema if not exists gamehub;

do $$
declare
  t text;
  f record;
begin
  -- Nur weitermachen, wenn es wirklich die GameHub-Datenbank ist (reward_rules gibt es nur hier) –
  -- egal ob noch in public oder schon (teilweise) umgezogen. Am 2026-10-17 lief eine ältere Fassung dieses
  -- Skripts, die nur 9 Tabellen kannte: die 4 Shop-2.0-Tabellen blieben dabei in public und werden hier nachgeholt.
  if to_regclass('public.reward_rules') is null and to_regclass('gamehub.reward_rules') is null then
    raise notice 'Keine GameHub-Tabellen gefunden – nichts zu verschieben.';
    return;
  end if;

  foreach t in array array[
    'profiles', 'game_stats', 'reward_rules', 'wheel_segments', 'achievements', 'user_achievements',
    'shop_items', 'inventory', 'equipped', 'shop_settings', 'exchange_packages', 'creator_codes',
    'code_redemptions'
  ] loop
    if to_regclass('public.' || t) is not null then
      if to_regclass('gamehub.' || t) is not null then
        raise exception 'Tabelle % gibt es in public UND in gamehub – bitte von Hand klären', t;
      end if;
      execute format('alter table public.%I set schema gamehub', t);
      raise notice 'verschoben: %', t;
    end if;
  end loop;

  -- Alter Anmelde-Trigger mit allgemeinem Namen. Nur löschen, wenn er wirklich die GameHub-Funktion
  -- aufruft – ein anderes Projekt könnte denselben Namen verwenden.
  if exists (
    select 1 from pg_trigger tr
      join pg_proc p on p.oid = tr.tgfoid
      join pg_namespace n on n.oid = p.pronamespace
     where tr.tgrelid = 'auth.users'::regclass and tr.tgname = 'on_auth_user_created'
       and n.nspname = 'public' and p.proname = 'handle_new_user'
  ) then
    drop trigger on_auth_user_created on auth.users;
  end if;

  -- Alte GameHub-Funktionen in public entfernen (alle Varianten). cascade entfernt auch die Schutz-Trigger
  -- auf inventory/equipped; 002_shop.sql legt sie danach mit den neuen Funktionen wieder an.
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'handle_new_user', 'ensure_profile', 'int_from', 'achievement_value', 'check_achievements',
         'report_result', 'claim_daily_spin', 'buy_item', 'equip_item', 'sale_price',
         'guard_exclusive_inventory', 'guard_exclusive_equip', 'exchange_diamonds', 'redeem_code',
         'claim_achievement', 'demo_unlock_all', 'demo_reset'
       )
  loop
    execute format('drop function %s cascade', f.sig);
    raise notice 'Funktion entfernt: %', f.sig;
  end loop;
end;
$$;
