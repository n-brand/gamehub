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
  v_public integer;
begin
  select count(*) into v_tables from pg_tables where schemaname = 'gamehub';
  select count(*) into v_players from gamehub.profiles;
  select count(*) into v_public from pg_tables where schemaname = 'public'
   and tablename in ('profiles', 'shop_items', 'reward_rules', 'creator_codes');
  raise exception 'PROBELAUF OK – nichts gespeichert. Tabellen in gamehub: %, Spieler: %, GameHub-Tabellen noch in public: %',
    v_tables, v_players, v_public;
end;
$$;
`
  : '\ncommit;\n';

const out = join(root, 'bundle.sql');
writeFileSync(out, head + '\n' + parts.join('\n') + tail);
console.log(`${probe ? 'Probelauf' : 'Echter Lauf'}: ${files.length} Dateien → ${out}`);
