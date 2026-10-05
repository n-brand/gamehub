-- GameHub: Erfolge manuell abholen. Beim Freischalten wird die Belohnung nicht mehr sofort gutgeschrieben,
-- sondern als abholbar markiert (reward_pending); der Spieler holt sie im Inventar ab (claim_achievement).
--
-- Reihenfolge: NACH 001_economy.sql und 002_shop.sql ausführen (SQL Editor → New query → einfügen → Run).
-- Kann gefahrlos erneut ausgeführt werden. Wer 001 später erneut ausführt, führt danach auch 002 und 003
-- erneut aus (001 enthält die alte Fassung von check_achievements, die sofort gutschreibt).
-- Doppelte Auszahlung ist trotzdem ausgeschlossen: abholen lässt sich nur, was als reward_pending markiert ist.

-- ---------- Tabelle ----------

-- Bereits freigeschaltete Erfolge wurden schon ausgezahlt → reward_pending = false (Standard)
alter table public.user_achievements add column if not exists reward_pending boolean not null default false;
alter table public.user_achievements add column if not exists claimed_at timestamptz;

-- ---------- Funktionen ----------

-- Neu erreichte Erfolge freischalten – Belohnung wartet auf das Abholen
create or replace function public.check_achievements(p_uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_pending boolean;
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
      v_pending := a.reward_coins > 0 or a.reward_diamonds > 0;
      insert into public.user_achievements (user_id, achievement_id, reward_pending)
      values (p_uid, a.id, v_pending)
      on conflict do nothing;
      if found then
        v_new := v_new || jsonb_build_array(jsonb_build_object(
          'id', a.id, 'name', a.name, 'coins', a.reward_coins, 'diamonds', a.reward_diamonds, 'pending', v_pending
        ));
      end if;
    end if;
  end loop;
  return v_new;
end;
$$;

-- Belohnung eines freigeschalteten Erfolgs abholen (genau einmal)
create or replace function public.claim_achievement(p_achievement text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row record;
  v_ach record;
  v_coins integer;
  v_diamonds integer;
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet';
  end if;
  select * into v_row from public.user_achievements
   where user_id = v_uid and achievement_id = p_achievement
     for update;
  if not found then
    raise exception 'Diesen Erfolg hast du noch nicht freigeschaltet.' using errcode = 'P0001';
  end if;
  if not v_row.reward_pending then
    raise exception 'Diese Belohnung hast du schon abgeholt.' using errcode = 'P0001';
  end if;
  select * into v_ach from public.achievements where id = p_achievement;

  update public.user_achievements
     set reward_pending = false, claimed_at = now()
   where user_id = v_uid and achievement_id = p_achievement;
  update public.profiles
     set coins = coins + coalesce(v_ach.reward_coins, 0),
         diamonds = diamonds + coalesce(v_ach.reward_diamonds, 0)
   where id = v_uid
  returning coins, diamonds into v_coins, v_diamonds;

  return jsonb_build_object('id', p_achievement,
                            'coins_gained', coalesce(v_ach.reward_coins, 0),
                            'diamonds_gained', coalesce(v_ach.reward_diamonds, 0),
                            'coins', v_coins, 'diamonds', v_diamonds);
end;
$$;

-- ---------- Ausführungsrechte ----------

revoke execute on function public.check_achievements(uuid) from public, anon, authenticated;
revoke execute on function public.claim_achievement(text) from public, anon;
grant execute on function public.claim_achievement(text) to authenticated;
