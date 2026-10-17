-- GameHub: Rechte und Beschreibungen für das eigene Schema "gamehub".
-- Die Datenbank teilen sich mehrere Projekte; GameHub nutzt nichts aus "public".
--
-- Reihenfolge: läuft durch die Nummer 999 immer als letzte Datei (am einfachsten alles zusammen:
-- node tools/sql-bundle.mjs). Kann gefahrlos erneut ausgeführt werden.
-- Das Schema muss außerdem unter Project Settings → Data API → Exposed schemas eingetragen sein.

-- ---------- Leserechte ----------
-- In "public" vergibt Supabase Leserechte auf neue Tabellen automatisch, in einem eigenen Schema nicht.
-- Welche Zeilen jemand sieht, regeln weiterhin die Policies (Row Level Security).
grant usage on schema gamehub to anon, authenticated;
revoke all on all tables in schema gamehub from anon, authenticated;
grant select on all tables in schema gamehub to anon, authenticated;
-- Creator-Codes sind für Spieler nie lesbar (zusätzlich zur fehlenden Policy)
revoke all on table gamehub.creator_codes from anon, authenticated;

-- ---------- Beschreibungen (erscheinen in Supabase Studio bei Tabellen und Spalten) ----------

comment on table gamehub.profiles is 'Kontostand pro Spieler (1 Zeile pro Login). Nur über Server-Funktionen änderbar.';
comment on column gamehub.profiles.coins is 'Normale Währung';
comment on column gamehub.profiles.diamonds is 'Premium-Währung (selten: Glücksrad, große Erfolge, Codes)';
comment on column gamehub.profiles.spin_streak is 'Tage in Folge am Glücksrad gedreht';
comment on column gamehub.profiles.last_spin is 'Letzter Dreh (Kalendertag, deutsche Zeit)';

comment on table gamehub.game_stats is 'Statistik pro Spieler und Spiel, geschrieben von report_result';
comment on column gamehub.game_stats.data is 'Spielspezifische Werte: wins_<stufe>, max_tile, max_level, quads, perfect30, max_fruit';
comment on column gamehub.game_stats.last_report is 'Zeit der letzten gewerteten Runde (Plausibilitätsprüfung)';

comment on table gamehub.reward_rules is 'Katalog: Coins pro Runde. difficulty '''' gilt für alle Stufen.';
comment on column gamehub.reward_rules.per_points is 'Bei result=score: 1 Coin pro so viele Punkte';
comment on column gamehub.reward_rules.min_seconds is 'Kürzere Runden werden nicht gewertet';
comment on column gamehub.reward_rules.max_rate is 'Mehr Punkte pro Sekunde werden nicht gewertet';

comment on table gamehub.wheel_segments is 'Katalog: Felder des Glücksrads mit Gewicht (Wahrscheinlichkeit)';
comment on table gamehub.achievements is 'Katalog: Erfolge. game null = allgemein; stat = welcher Wert zählt';
comment on table gamehub.user_achievements is 'Freigeschaltete Erfolge pro Spieler';
comment on column gamehub.user_achievements.reward_pending is 'Belohnung wartet aufs Abholen (claim_achievement)';

comment on table gamehub.shop_items is 'Katalog: Shop-Designs. Aussehen im Code (designs.js), hier Preis, Slot, Rabatt';
comment on column gamehub.shop_items.slot is 'Wo der Artikel ausgerüstet wird, z. B. snake, cubejump-skin, watermelon';
comment on column gamehub.shop_items.exclusive is 'Nur per Creator-Code erhältlich, nie kaufbar';
comment on column gamehub.shop_items.sale_percent is 'Rabatt in Prozent (0 = keiner), gilt bis sale_until';
comment on column gamehub.shop_items.highlight is 'Schild im Shop, z. B. „Beliebt“ (leer = keins)';
comment on table gamehub.inventory is 'Gekaufte bzw. per Code erhaltene Shop-Artikel pro Spieler';
comment on table gamehub.equipped is 'Ausgerüsteter Artikel pro Spieler und Slot';

comment on table gamehub.shop_settings is 'Shop-Einstellungen, z. B. diamond_coin_rate (Coins pro Diamant)';
comment on table gamehub.exchange_packages is 'Katalog: Tauschpakete Diamanten → Coins mit Bonus';
comment on table gamehub.creator_codes is 'Creator-Codes (Großbuchstaben). Für Spieler NICHT lesbar.';
comment on table gamehub.code_redemptions is 'Welcher Spieler welchen Code eingelöst hat (je Code einmal)';

-- API (PostgREST) sofort neu laden, damit verschobene Tabellen und Funktionen erreichbar sind
notify pgrst, 'reload schema';
