-- GameHub: Coins, Diamanten, Glücksrad, Erfolge und Shop
-- Einmal im Supabase-Dashboard ausführen: SQL Editor → New query → einfügen → Run.
-- Kann gefahrlos erneut ausgeführt werden (Kataloge werden dabei aktualisiert).
--
-- Grundprinzip: Clients dürfen Tabellen nur LESEN (eigene Zeilen bzw. öffentliche Kataloge).
-- Alle Änderungen an Kontoständen, Inventar und Erfolgen laufen über die Funktionen unten
-- (security definer), die Beträge selbst berechnen und Eingaben prüfen.

-- ---------- Tabellen ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  diamonds integer not null default 0 check (diamonds >= 0),
  spin_streak integer not null default 0,
  last_spin date,
  created_at timestamptz not null default now()
);

create table if not exists public.game_stats (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null,
  plays integer not null default 0,
  wins integer not null default 0,
  best_score integer not null default 0,
  data jsonb not null default '{}'::jsonb, -- wins_<stufe>, max_tile, max_level, quads, perfect30
  last_report timestamptz,
  primary key (user_id, game)
);

-- Coins pro Runde. difficulty '' gilt für alle Stufen; eine Regel mit passender Stufe hat Vorrang.
create table if not exists public.reward_rules (
  game text not null,
  difficulty text not null default '',
  result text not null check (result in ('win', 'draw', 'score')),
  coins integer not null default 0,     -- fester Betrag (win/draw)
  per_points integer,                   -- score: 1 Coin pro so viele Punkte
  max_coins integer,                    -- Obergrenze pro Runde
  min_seconds integer not null default 0, -- kürzeste plausible Spieldauer
  max_rate numeric,                     -- höchstens so viele Punkte pro Sekunde
  primary key (game, difficulty, result)
);

create table if not exists public.wheel_segments (
  idx integer primary key,
  coins integer not null default 0,
  diamonds integer not null default 0,
  weight integer not null check (weight > 0)
);

create table if not exists public.achievements (
  id text primary key,
  game text, -- null = allgemein
  name text not null,
  description text not null,
  stat text not null, -- plays_total | games_played | spin_streak | plays | wins | best_score | Schlüssel in game_stats.data
  threshold integer not null,
  reward_coins integer not null default 0,
  reward_diamonds integer not null default 0,
  sort integer not null default 0
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.shop_items (
  id text primary key,
  game text not null,
  slot text not null, -- Shop-Kategorie; pro Slot ist ein Artikel ausgerüstet (z. B. cubejump-theme, cubejump-skin)
  name text not null,
  price_coins integer not null default 0,
  price_diamonds integer not null default 0,
  sort integer not null default 0
);

create table if not exists public.inventory (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null references public.shop_items (id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.equipped (
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot text not null,
  item_id text not null references public.shop_items (id) on delete cascade,
  primary key (user_id, slot)
);

-- Aktualisierung älterer Fassungen dieses Skripts (Slots statt ein Design pro Spiel)
alter table public.shop_items add column if not exists slot text;
update public.shop_items set slot = game where slot is null;
do $
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'equipped' and column_name = 'game'
  ) then
    alter table public.equipped rename column game to slot;
  end if;
end;
$;

-- ---------- Zugriffsrechte (Row Level Security) ----------

alter table public.profiles enable row level security;
alter table public.game_stats enable row level security;
alter table public.reward_rules enable row level security;
alter table public.wheel_segments enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.shop_items enable row level security;
alter table public.inventory enable row level security;
alter table public.equipped enable row level security;

drop policy if exists "eigenes Profil lesen" on public.profiles;
create policy "eigenes Profil lesen" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "eigene Statistik lesen" on public.game_stats;
create policy "eigene Statistik lesen" on public.game_stats for select to authenticated using (user_id = auth.uid());

drop policy if exists "eigene Erfolge lesen" on public.user_achievements;
create policy "eigene Erfolge lesen" on public.user_achievements for select to authenticated using (user_id = auth.uid());

drop policy if exists "eigenes Inventar lesen" on public.inventory;
create policy "eigenes Inventar lesen" on public.inventory for select to authenticated using (user_id = auth.uid());

drop policy if exists "eigene Designs lesen" on public.equipped;
create policy "eigene Designs lesen" on public.equipped for select to authenticated using (user_id = auth.uid());

drop policy if exists "Katalog lesen" on public.reward_rules;
create policy "Katalog lesen" on public.reward_rules for select to anon, authenticated using (true);

drop policy if exists "Katalog lesen" on public.wheel_segments;
create policy "Katalog lesen" on public.wheel_segments for select to anon, authenticated using (true);

drop policy if exists "Katalog lesen" on public.achievements;
create policy "Katalog lesen" on public.achievements for select to anon, authenticated using (true);

drop policy if exists "Katalog lesen" on public.shop_items;
create policy "Katalog lesen" on public.shop_items for select to anon, authenticated using (true);

-- ---------- Hilfsfunktionen (nur intern) ----------

-- Profil bei der ersten Anmeldung anlegen
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.ensure_profile(p_uid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.profiles (id) values (p_uid) on conflict (id) do nothing;
$$;

-- Ganzzahl aus JSON lesen (fehlt oder keine Zahl → 0, begrenzt auf einen sinnvollen Bereich)
create or replace function public.int_from(p jsonb, k text)
returns integer
language sql
immutable
as $$
  select case
    when jsonb_typeof(p -> k) = 'number' then least(greatest((p ->> k)::numeric, 0), 1000000000)::integer
    else 0
  end;
$$;

-- Aktueller Wert einer Erfolgs-Statistik
create or replace function public.achievement_value(p_uid uuid, p_game text, p_stat text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v integer;
begin
  if p_game is null then
    if p_stat = 'plays_total' then
      select coalesce(sum(s.plays), 0) into v from public.game_stats s where s.user_id = p_uid;
    elsif p_stat = 'games_played' then
      select count(*) into v from public.game_stats s where s.user_id = p_uid and s.plays > 0;
    elsif p_stat = 'spin_streak' then
      select p.spin_streak into v from public.profiles p where p.id = p_uid;
    end if;
  else
    select case p_stat
             when 'plays' then s.plays
             when 'wins' then s.wins
             when 'best_score' then s.best_score
             else public.int_from(s.data, p_stat)
           end
      into v
      from public.game_stats s
     where s.user_id = p_uid and s.game = p_game;
  end if;
  return coalesce(v, 0);
end;
$$;

-- Neu erreichte Erfolge freischalten und belohnen (genau einmal). Gibt die neuen Erfolge zurück.
create or replace function public.check_achievements(p_uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_new jsonb := '[]'::jsonb;
begin
  for a in
    select x.*
      from public.achievements x
     where not exists (
             select 1 from public.user_achievements u
              where u.user_id = p_uid and u.achievement_id = x.id
           )
     order by x.sort
  loop
    if public.achievement_value(p_uid, a.game, a.stat) >= a.threshold then
      insert into public.user_achievements (user_id, achievement_id)
      values (p_uid, a.id)
      on conflict do nothing;
      if found then
        update public.profiles
           set coins = coins + a.reward_coins,
               diamonds = diamonds + a.reward_diamonds
         where id = p_uid;
        v_new := v_new || jsonb_build_array(jsonb_build_object(
          'id', a.id, 'name', a.name, 'coins', a.reward_coins, 'diamonds', a.reward_diamonds
        ));
      end if;
    end if;
  end loop;
  return v_new;
end;
$$;

-- ---------- Funktionen für die Webseite ----------

-- Runde melden: prüft Plausibilität, vergibt Coins, aktualisiert Statistik und Erfolge
create or replace function public.report_result(
  p_game text,
  p_result text,
  p_difficulty text default '',
  p_score integer default 0,
  p_duration_ms integer default 0,
  p_extra jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_diff text := coalesce(p_difficulty, '');
  v_score integer := greatest(coalesce(p_score, 0), 0);
  v_seconds numeric := greatest(coalesce(p_duration_ms, 0), 0) / 1000.0;
  v_extra jsonb := coalesce(p_extra, '{}'::jsonb);
  v_stats record;
  v_rule record;
  v_has_rule boolean;
  v_counted boolean := true;
  v_gain integer := 0;
  v_record boolean := false;
  v_data jsonb;
  v_new jsonb := '[]'::jsonb;
  v_coins integer;
  v_diamonds integer;
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet';
  end if;
  if p_game not in ('snake', '2048', 'connect4', 'pairs', 'minesweeper', 'bricks', 'blocks', 'cubejump') then
    raise exception 'Unbekanntes Spiel: %', p_game;
  end if;
  if p_result not in ('win', 'loss', 'draw', 'score') then
    raise exception 'Unbekanntes Ergebnis: %', p_result;
  end if;
  if v_diff not in ('', 'easy', 'medium', 'hard', 'ultra') then
    raise exception 'Unbekannte Stufe: %', v_diff;
  end if;
  if jsonb_typeof(v_extra) <> 'object' then
    v_extra := '{}'::jsonb;
  end if;

  perform public.ensure_profile(v_uid);
  insert into public.game_stats (user_id, game) values (v_uid, p_game) on conflict do nothing;
  select * into v_stats from public.game_stats where user_id = v_uid and game = p_game for update;

  -- Plausibilität 1: jede Runde dauert mindestens 2 Sekunden
  if v_seconds < 2 then
    v_counted := false;
  end if;
  -- Plausibilität 2: nicht mehr Spielzeit melden, als seit der letzten Meldung vergangen ist
  if v_stats.last_report is not null
     and extract(epoch from now() - v_stats.last_report) + 5 < v_seconds then
    v_counted := false;
  end if;

  select r.* into v_rule
    from public.reward_rules r
   where r.game = p_game and r.result = p_result and r.difficulty in (v_diff, '')
   order by r.difficulty desc
   limit 1;
  v_has_rule := found;

  -- Plausibilität 3: Mindestdauer und Punkte pro Sekunde laut Regel
  if v_has_rule then
    if v_seconds < v_rule.min_seconds then
      v_counted := false;
    end if;
    if v_rule.max_rate is not null and v_score > v_rule.max_rate * (v_seconds + 5) then
      v_counted := false;
    end if;
  end if;

  if v_counted then
    if v_has_rule then
      if v_rule.per_points is not null and v_rule.per_points > 0 then
        v_gain := v_score / v_rule.per_points;
      else
        v_gain := v_rule.coins;
      end if;
      if v_rule.max_coins is not null then
        v_gain := least(v_gain, v_rule.max_coins);
      end if;
    end if;
    -- Neuer persönlicher Rekord bei Punkte-Spielen
    if p_result = 'score' and v_stats.best_score > 0 and v_score > v_stats.best_score then
      v_gain := v_gain + 10;
      v_record := true;
    end if;
    -- 2048-Kachel erreicht
    if p_game = '2048' and public.int_from(v_extra, 'maxTile') >= 2048 then
      v_gain := v_gain + 50;
    end if;

    -- Statistik fortschreiben
    v_data := v_stats.data;
    if p_result = 'win' and v_diff <> '' then
      v_data := jsonb_set(v_data, array['wins_' || v_diff],
        to_jsonb(public.int_from(v_data, 'wins_' || v_diff) + 1));
    end if;
    if v_extra ? 'maxTile' then
      v_data := jsonb_set(v_data, '{max_tile}',
        to_jsonb(greatest(public.int_from(v_data, 'max_tile'), public.int_from(v_extra, 'maxTile'))));
    end if;
    if v_extra ? 'level' then
      v_data := jsonb_set(v_data, '{max_level}',
        to_jsonb(greatest(public.int_from(v_data, 'max_level'), public.int_from(v_extra, 'level'))));
    end if;
    if v_extra ? 'quads' then
      v_data := jsonb_set(v_data, '{quads}',
        to_jsonb(public.int_from(v_data, 'quads') + least(public.int_from(v_extra, 'quads'), 1000)));
    end if;
    if p_game = 'pairs' and v_diff = 'hard' and p_result = 'win'
       and public.int_from(v_extra, 'moves') between 15 and 25 then
      v_data := jsonb_set(v_data, '{perfect30}', to_jsonb(public.int_from(v_data, 'perfect30') + 1));
    end if;

    update public.game_stats
       set plays = plays + 1,
           wins = wins + case when p_result = 'win' then 1 else 0 end,
           best_score = greatest(best_score, v_score),
           data = v_data,
           last_report = now()
     where user_id = v_uid and game = p_game;

    if v_gain > 0 then
      update public.profiles set coins = coins + v_gain where id = v_uid;
    end if;
    v_new := public.check_achievements(v_uid);
  end if;

  select p.coins, p.diamonds into v_coins, v_diamonds from public.profiles p where p.id = v_uid;
  return jsonb_build_object(
    'counted', v_counted,
    'coins_gained', v_gain,
    'record', v_record,
    'coins', v_coins,
    'diamonds', v_diamonds,
    'achievements', v_new
  );
end;
$$;

-- Glücksrad: einmal pro Kalendertag (deutsche Zeit); der Server würfelt
create or replace function public.claim_daily_spin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Europe/Berlin')::date;
  v_factors numeric[] := array[1.0, 1.2, 1.4, 1.5, 1.6, 1.8, 2.0];
  v_profile record;
  v_streak integer;
  v_total integer;
  v_roll numeric;
  v_acc integer := 0;
  v_seg record;
  v_factor numeric;
  v_bonus integer := 0;
  v_coins integer;
  v_diamonds integer;
  v_new jsonb;
  v_bal_coins integer;
  v_bal_diamonds integer;
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet';
  end if;
  perform public.ensure_profile(v_uid);
  select * into v_profile from public.profiles where id = v_uid for update;
  if v_profile.last_spin = v_today then
    raise exception 'Heute schon gedreht' using errcode = 'P0001';
  end if;

  v_streak := case when v_profile.last_spin = v_today - 1 then v_profile.spin_streak + 1 else 1 end;

  select sum(weight) into v_total from public.wheel_segments;
  v_roll := random() * v_total;
  for v_seg in select * from public.wheel_segments order by idx loop
    v_acc := v_acc + v_seg.weight;
    exit when v_roll < v_acc;
  end loop;

  v_factor := v_factors[least(v_streak, 7)];
  v_coins := round(v_seg.coins * v_factor);
  if v_streak % 7 = 0 then
    v_bonus := 1; -- jeder 7. Tag in Folge: +1 Diamant
  end if;
  v_diamonds := v_seg.diamonds + v_bonus;

  update public.profiles
     set coins = coins + v_coins,
         diamonds = diamonds + v_diamonds,
         spin_streak = v_streak,
         last_spin = v_today
   where id = v_uid;

  v_new := public.check_achievements(v_uid);
  select p.coins, p.diamonds into v_bal_coins, v_bal_diamonds from public.profiles p where p.id = v_uid;

  return jsonb_build_object(
    'segment', v_seg.idx,
    'coins_gained', v_coins,
    'diamonds_gained', v_diamonds,
    'streak', v_streak,
    'streak_bonus', v_bonus,
    'factor', v_factor,
    'coins', v_bal_coins,
    'diamonds', v_bal_diamonds,
    'achievements', v_new
  );
end;
$$;

-- Artikel kaufen (Gratis-Artikel und bereits gekaufte werden nicht erneut berechnet)
create or replace function public.buy_item(p_item text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item record;
  v_profile record;
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
  select * into v_profile from public.profiles where id = v_uid for update;

  if (v_item.price_coins = 0 and v_item.price_diamonds = 0)
     or exists (select 1 from public.inventory where user_id = v_uid and item_id = p_item) then
    return jsonb_build_object('owned', true, 'coins', v_profile.coins, 'diamonds', v_profile.diamonds);
  end if;
  if v_profile.coins < v_item.price_coins or v_profile.diamonds < v_item.price_diamonds then
    raise exception 'Nicht genug Guthaben' using errcode = 'P0001';
  end if;

  update public.profiles
     set coins = coins - v_item.price_coins,
         diamonds = diamonds - v_item.price_diamonds
   where id = v_uid
  returning coins, diamonds into v_coins, v_diamonds;
  insert into public.inventory (user_id, item_id) values (v_uid, p_item);

  return jsonb_build_object('owned', true, 'coins', v_coins, 'diamonds', v_diamonds);
end;
$$;

-- Design ausrüsten (eins pro Slot, z. B. ein Theme und ein Würfel-Skin)
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
  if not (v_item.price_coins = 0 and v_item.price_diamonds = 0)
     and not exists (select 1 from public.inventory where user_id = v_uid and item_id = p_item) then
    raise exception 'Artikel nicht im Besitz' using errcode = 'P0001';
  end if;
  insert into public.equipped (user_id, slot, item_id)
  values (v_uid, v_item.slot, p_item)
  on conflict (user_id, slot) do update set item_id = excluded.item_id;
  return jsonb_build_object('slot', v_item.slot, 'item', p_item);
end;
$$;

-- ---------- Ausführungsrechte ----------
-- Interne Hilfsfunktionen sind für Clients gesperrt, die vier Seiten-Funktionen nur für Angemeldete.

revoke execute on function public.ensure_profile(uuid) from public, anon, authenticated;
revoke execute on function public.achievement_value(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.check_achievements(uuid) from public, anon, authenticated;

revoke execute on function public.report_result(text, text, text, integer, integer, jsonb) from public, anon;
revoke execute on function public.claim_daily_spin() from public, anon;
revoke execute on function public.buy_item(text) from public, anon;
revoke execute on function public.equip_item(text) from public, anon;
grant execute on function public.report_result(text, text, text, integer, integer, jsonb) to authenticated;
grant execute on function public.claim_daily_spin() to authenticated;
grant execute on function public.buy_item(text) to authenticated;
grant execute on function public.equip_item(text) to authenticated;

-- ---------- Kataloge (Startwerte, beim erneuten Ausführen aktualisiert) ----------

insert into public.reward_rules (game, difficulty, result, coins, per_points, max_coins, min_seconds, max_rate) values
  ('snake',       '',       'score',   0,    1, 100,  2,    4),
  ('2048',        '',       'score',   0,  200, 150,  5,  400),
  ('blocks',      '',       'score',   0,  250, 150,  5, 1500),
  ('bricks',      '',       'score',   0,  100, 100,  5,  800),
  ('pairs',       'easy',   'win',     5, null, null,  3, null),
  ('pairs',       'medium', 'win',    10, null, null,  6, null),
  ('pairs',       'hard',   'win',    20, null, null, 10, null),
  ('minesweeper', 'easy',   'win',    10, null, null,  2, null),
  ('minesweeper', 'medium', 'win',    40, null, null, 10, null),
  ('minesweeper', 'hard',   'win',   120, null, null, 25, null),
  ('connect4',    'easy',   'win',     5, null, null,  5, null),
  ('connect4',    'medium', 'win',    15, null, null,  5, null),
  ('connect4',    'hard',   'win',    40, null, null,  5, null),
  ('connect4',    'ultra',  'win',   100, null, null,  5, null),
  ('connect4',    'easy',   'draw',    2, null, null, 20, null),
  ('connect4',    'medium', 'draw',    7, null, null, 20, null),
  ('connect4',    'hard',   'draw',   20, null, null, 20, null),
  ('connect4',    'ultra',  'draw',   50, null, null, 20, null),
  ('cubejump',    'easy',   'win',    30, null, null, 28, null),
  ('cubejump',    'medium', 'win',    60, null, null, 27, null),
  ('cubejump',    'hard',   'win',   150, null, null, 26, null)
on conflict (game, difficulty, result) do update set
  coins = excluded.coins,
  per_points = excluded.per_points,
  max_coins = excluded.max_coins,
  min_seconds = excluded.min_seconds,
  max_rate = excluded.max_rate;

insert into public.wheel_segments (idx, coins, diamonds, weight) values
  (0,  25, 0, 25),
  (1,  50, 0, 22),
  (2,  75, 0, 18),
  (3, 100, 0, 14),
  (4, 150, 0, 10),
  (5, 250, 0,  6),
  (6,   0, 1,  4),
  (7,   0, 5,  1)
on conflict (idx) do update set coins = excluded.coins, diamonds = excluded.diamonds, weight = excluded.weight;

insert into public.achievements (id, game, name, description, stat, threshold, reward_coins, reward_diamonds, sort) values
  ('first-game',     null,          'Erste Runde',               'Spiele deine erste Runde.',                               'plays_total',  1,    50,  0,  10),
  ('all-games',      null,          'Allrounder',                'Spiele jedes der 8 Spiele mindestens einmal.',            'games_played', 8,   200,  0,  20),
  ('rounds-500',     null,          'Dauerbrenner',              'Spiele 500 Runden.',                                      'plays_total',  500,   0,  5,  30),
  ('streak-30',      null,          'Treue Seele',               'Drehe 30 Tage in Folge am Glücksrad.',                    'spin_streak',  30,    0, 10,  40),
  ('snake-25',       'snake',       'Hungrig',                   'Friss 25 Äpfel in einer Runde.',                          'best_score',   25,  100,  0, 100),
  ('snake-75',       'snake',       'Nimmersatt',                'Friss 75 Äpfel in einer Runde.',                          'best_score',   75,    0,  3, 110),
  ('2048-2048',      '2048',        'Geschafft!',                'Erreiche die 2048-Kachel.',                               'max_tile',     2048, 200, 0, 200),
  ('2048-4096',      '2048',        'Doppelt hält besser',       'Erreiche die 4096-Kachel.',                               'max_tile',     4096,  0,  5, 210),
  ('blocks-quad',    'blocks',      'Vierer',                    'Räume 4 Reihen auf einmal ab.',                           'quads',        1,   100,  0, 300),
  ('blocks-level10', 'blocks',      'Blockmeister',              'Erreiche Level 10.',                                      'max_level',    10,    0,  3, 310),
  ('bricks-level3',  'bricks',      'Mauerspecht',               'Erreiche Level 3.',                                       'max_level',    3,   150,  0, 400),
  ('bricks-all',     'bricks',      'Abrissbirne',               'Schaffe alle 5 Level.',                                   'max_level',    6,     0,  5, 410),
  ('pairs-10',       'pairs',       'Gutes Gedächtnis',          'Gewinne 10 Runden.',                                      'wins',         10,  100,  0, 500),
  ('pairs-perfect',  'pairs',       'Fotografisches Gedächtnis', 'Finde bei 30 Karten alle Paare in höchstens 25 Zügen.',   'perfect30',    1,     0,  3, 510),
  ('mines-medium',   'minesweeper', 'Minensucher',               'Gewinne auf Mittel.',                                     'wins_medium',  1,   150,  0, 600),
  ('mines-hard',     'minesweeper', 'Minenexperte',              'Gewinne auf Schwer.',                                     'wins_hard',    1,     0,  5, 610),
  ('c4-hard',        'connect4',    'Taktiker',                  'Besiege den Computer auf Schwer.',                        'wins_hard',    1,   200,  0, 700),
  ('c4-ultra',       'connect4',    'Unbesiegbar?',              'Besiege den Computer auf Ultra.',                         'wins_ultra',   1,     0, 10, 710),
  ('c4-100',         'connect4',    'Seriensieger',              'Gewinne 100-mal gegen den Computer (jede Stärke).',       'wins',         100,   0, 10, 720),
  ('jump-easy',      'cubejump',    'Erster Sprung',             'Schaffe in Würfelsprung das Level Leicht.',               'wins_easy',    1,   100,  0, 800),
  ('jump-medium',    'cubejump',    'Im Takt',                   'Schaffe in Würfelsprung das Level Mittel.',               'wins_medium',  1,   200,  0, 810),
  ('jump-hard',      'cubejump',    'Würfelmeister',             'Schaffe in Würfelsprung das Level Schwer.',               'wins_hard',    1,     0,  5, 820)
on conflict (id) do update set
  game = excluded.game,
  name = excluded.name,
  description = excluded.description,
  stat = excluded.stat,
  threshold = excluded.threshold,
  reward_coins = excluded.reward_coins,
  reward_diamonds = excluded.reward_diamonds,
  sort = excluded.sort;

insert into public.shop_items (id, game, slot, name, price_coins, price_diamonds, sort) values
  ('snake-classic',    'snake',    'snake',          'Klassisch',         0,  0,   0),
  ('snake-fire',       'snake',    'snake',          'Feuer',           400,  0,  10),
  ('snake-zebra',      'snake',    'snake',          'Zebra',           600,  0,  20),
  ('snake-neon',       'snake',    'snake',          'Neon',            800,  0,  30),
  ('snake-rainbow',    'snake',    'snake',          'Regenbogen',        0,  5,  40),
  ('snake-gold',       'snake',    'snake',          'Gold',              0, 10,  50),
  ('cubejump-classic', 'cubejump', 'cubejump-theme', 'Klassisch',         0,  0, 100),
  ('cubejump-sunset',  'cubejump', 'cubejump-theme', 'Sonnenuntergang', 400,  0, 110),
  ('cubejump-ice',     'cubejump', 'cubejump-theme', 'Eis',             600,  0, 120),
  ('cubejump-neon',    'cubejump', 'cubejump-theme', 'Neon',            800,  0, 130),
  ('cubejump-lava',    'cubejump', 'cubejump-theme', 'Lava',              0,  5, 140),
  ('cubejump-gold',    'cubejump', 'cubejump-theme', 'Gold',              0, 10, 150),
  ('cube-classic',     'cubejump', 'cubejump-skin',  'Klassisch',         0,  0, 200),
  ('cube-fire',        'cubejump', 'cubejump-skin',  'Feuer',           300,  0, 210),
  ('cube-ice',         'cubejump', 'cubejump-skin',  'Eiswürfel',       300,  0, 220),
  ('cube-slime',       'cubejump', 'cubejump-skin',  'Schleim',         500,  0, 230),
  ('cube-robot',       'cubejump', 'cubejump-skin',  'Roboter',         500,  0, 240),
  ('cube-ninja',       'cubejump', 'cubejump-skin',  'Ninja',           700,  0, 250),
  ('cube-diamond',     'cubejump', 'cubejump-skin',  'Diamant',           0,  5, 260),
  ('cube-crown',       'cubejump', 'cubejump-skin',  'König',             0,  8, 270)
on conflict (id) do update set
  game = excluded.game,
  slot = excluded.slot,
  name = excluded.name,
  price_coins = excluded.price_coins,
  price_diamonds = excluded.price_diamonds,
  sort = excluded.sort;
