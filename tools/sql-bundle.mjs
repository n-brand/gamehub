// Fügt alle Supabase-Migrationen zu EINEM Skript zusammen (eine Transaktion: alles oder nichts)
// und schreibt es nach supabase/bundle.sql (nicht im Repo). Danach im Supabase SQL Editor einfügen und ausführen.
//
//   node tools/sql-bundle.mjs                  alle Migrationen 001–999 (z. B. nach Änderungen an Preisen)
//   node tools/sql-bundle.mjs --umzug          vorher die Tabellen von public nach gamehub verschieben (einmalig)
//   ... --probe                                Probelauf: läuft komplett durch, nimmt dann ALLES zurück
//
// Achtung: 001 setzt die Kataloge (Preise, Coins pro Spiel, Erfolge) auf die Werte im SQL zurück.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase');
const args = new Set(process.argv.slice(2));
const probe = args.has('--probe');

const files = [];
if (args.has('--umzug')) files.push('upgrade-from-public.sql');
files.push(...readdirSync(join(root, 'migrations')).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort().map((f) => `migrations/${f}`));

const parts = files.map((f) => `-- ======================= ${f} =======================\n\n${readFileSync(join(root, f), 'utf8').trim()}\n`);

const head = `-- GameHub: ${files.join(', ')}
-- Erzeugt von tools/sql-bundle.mjs${probe ? ' (PROBELAUF – es wird nichts gespeichert)' : ''}
-- Eine Transaktion: Bricht irgendetwas ab, bleibt die Datenbank unverändert.

begin;
`;

const tail = probe
  ? `
-- ======================= Probelauf-Ende =======================
-- Absichtlicher Abbruch mit Zusammenfassung → alles wird zurückgenommen.
do $$
declare
  v_tables integer;
  v_players integer;
  v_left text := '';
  v_other text;
  r record;
  n bigint;
begin
  select count(*) into v_tables from pg_tables where schemaname = 'gamehub';
  select count(*) into v_players from gamehub.profiles;
  -- Was liegt nach dem Umzug noch in public (mit Zeilenzahl)? GameHub-Namen werden markiert.
  for r in select tablename from pg_tables where schemaname = 'public' order by tablename loop
    execute format('select count(*) from public.%I', r.tablename) into n;
    v_left := v_left || r.tablename || ' (' || n || ' Zeilen'
      || case when r.tablename in ('profiles', 'game_stats', 'reward_rules', 'wheel_segments', 'achievements',
           'user_achievements', 'shop_items', 'inventory', 'equipped', 'shop_settings', 'exchange_packages',
           'creator_codes', 'code_redemptions') then ', GameHub-Name!' else '' end || '), ';
  end loop;
  select string_agg(nspname, ', ' order by nspname) into v_other from pg_namespace
   where nspname not like 'pg\\_%' and nspname not in ('information_schema', 'public', 'gamehub');
  raise exception E'PROBELAUF OK – nichts gespeichert.\\nTabellen in gamehub: %, Spieler: %\\nNoch in public: %\\nAndere Schemas: %',
    v_tables, v_players, coalesce(nullif(v_left, ''), 'nichts'), v_other;
end;
$$;
`
  : '\ncommit;\n';

const out = join(root, 'bundle.sql');
writeFileSync(out, head + '\n' + parts.join('\n') + tail);
console.log(`${probe ? 'Probelauf' : 'Echter Lauf'}: ${files.length} Dateien → ${out}`);
