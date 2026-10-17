-- GameHub: Umzug von "public" in das Schema "gamehub" – NUR nötig, wenn eine ältere Fassung von
-- migrations/001_economy.sql schon ausgeführt wurde (Tabellen liegen dann in "public").
-- Reihenfolge: 1. dieses Skript, 2. migrations/001_economy.sql (legt Funktionen, Rechte und Kataloge neu an).
-- Daten bleiben erhalten: die Tabellen werden nur verschoben, nicht neu angelegt.
-- Wurde das alte Skript nie ausgeführt, tut dieses Skript nichts.

create schema if not exists gamehub;

do $$
declare
  t text;
begin
  -- Nur weitermachen, wenn es wirklich die GameHub-Tabellen sind (reward_rules + wheel_segments gibt es nur hier)
  if to_regclass('public.reward_rules') is null or to_regclass('public.wheel_segments') is null then
    raise notice 'Keine alten GameHub-Tabellen in public gefunden – nichts zu tun.';
    return;
  end if;

  foreach t in array array[
    'profiles', 'game_stats', 'reward_rules', 'wheel_segments', 'achievements',
    'user_achievements', 'shop_items', 'inventory', 'equipped'
  ] loop
    if to_regclass('public.' || t) is not null and to_regclass('gamehub.' || t) is null then
      execute format('alter table public.%I set schema gamehub', t);
      raise notice 'verschoben: %', t;
    end if;
  end loop;

  -- Alter Anmelde-Trigger (allgemeiner Name) → wird von 001_economy.sql als gamehub_on_auth_user_created neu angelegt.
  -- Nur löschen, wenn er wirklich die alte GameHub-Funktion aufruft (ein anderes Projekt könnte denselben Namen nutzen).
  if exists (
    select 1 from pg_trigger tr
      join pg_proc p on p.oid = tr.tgfoid
      join pg_namespace n on n.oid = p.pronamespace
     where tr.tgrelid = 'auth.users'::regclass and tr.tgname = 'on_auth_user_created'
       and n.nspname = 'public' and p.proname = 'handle_new_user'
  ) then
    drop trigger on_auth_user_created on auth.users;
  end if;

  -- Alte Funktionen in public entfernen (die neuen entstehen in gamehub)
  drop function if exists public.report_result(text, text, text, integer, integer, jsonb);
  drop function if exists public.claim_daily_spin();
  drop function if exists public.buy_item(text);
  drop function if exists public.equip_item(text);
  drop function if exists public.check_achievements(uuid);
  drop function if exists public.achievement_value(uuid, text, text);
  drop function if exists public.int_from(jsonb, text);
  drop function if exists public.ensure_profile(uuid);
  drop function if exists public.handle_new_user();
end;
$$;
