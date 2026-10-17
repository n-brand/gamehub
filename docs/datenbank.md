# Datenbank (Supabase)

Die Supabase-Datenbank wird von **mehreren Projekten** genutzt. Jedes Projekt hat sein eigenes
Postgres-Schema; GameHub liegt komplett in **`gamehub`** und benutzt nichts aus `public`.

- **Quelle der Wahrheit:** die Dateien in [`supabase/migrations/`](../supabase/migrations/) (`001` … `999`).
  Diese Datei ist nur die Übersicht – bei Abweichungen gilt das SQL.
- Ausführen: immer alle zusammen über `node tools/sql-bundle.mjs` (eine Transaktion, `--probe` für einen
  Probelauf). Anleitung: [`supabase-setup.md`](supabase-setup.md).
- Tabellen und Spalten haben in der Datenbank Beschreibungen (`comment on …` in `999_gamehub_schema.sql`), sichtbar in Supabase Studio.
- Das Schema muss unter **Project Settings → Data API → Exposed schemas** freigegeben sein.
- Die Webseite verbindet sich mit `db: { schema: 'gamehub' }` (`public/js/economy.js`).

## Was GameHub mit anderen Projekten teilt

| Was | Wie |
|---|---|
| `auth.users` (Logins) | Gemeinsam für alle Projekte: wer sich bei GameHub mit Google anmeldet, ist überall derselbe Nutzer. |
| Trigger `gamehub_on_auth_user_created` auf `auth.users` | Legt beim ersten Login eine Zeile in `gamehub.profiles` an. Andere Projekte verwenden eigene, eindeutig benannte Trigger (Präfix = Projekt). |
| Google-Login-Einstellungen, Redirect-URLs | Gelten für die ganze Datenbank; neue Projekte ihre URLs zusätzlich eintragen. |
| Speicher, Verbindungen, Pausieren im Free Tier | Gelten für alle Projekte zusammen. |

## Tabellen

Clients dürfen nur **lesen**: Kataloge alle, Spielerdaten nur die eigenen Zeilen (Row Level Security).
Geschrieben wird ausschließlich über die Server-Funktionen unten.

| Tabelle | Art | Inhalt |
|---|---|---|
| `profiles` | Spieler | Coins, Diamanten, Glücksrad-Serie (`spin_streak`, `last_spin`) – 1 Zeile pro Login |
| `game_stats` | Spieler | Runden, Siege, Bestwert pro Spiel; `data` mit spielspezifischen Werten (`wins_<stufe>`, `max_tile`, `max_level`, `quads`, `perfect30`, `max_fruit`) |
| `user_achievements` | Spieler | Freigeschaltete Erfolge; `reward_pending` = Belohnung wartet aufs Abholen |
| `inventory` | Spieler | Gekaufte bzw. per Code erhaltene Shop-Artikel |
| `equipped` | Spieler | Ausgerüsteter Artikel pro Slot (`snake`, `cubejump-theme`, `cubejump-skin`, `watermelon`) |
| `code_redemptions` | Spieler | Eingelöste Creator-Codes (je Code einmal) |
| `reward_rules` | Katalog | Coins pro Runde je Spiel/Stufe/Ergebnis, Plausibilitätsgrenzen |
| `wheel_segments` | Katalog | Glücksrad-Felder mit Gewicht |
| `achievements` | Katalog | Erfolge mit Schwelle und Belohnung |
| `shop_items` | Katalog | Shop-Designs: Preis, Slot, `exclusive`, Rabatt (`sale_percent`, `sale_until`), Schild (`highlight`). Aussehen im Code: `public/js/designs.js`, `watermelon-art.js` |
| `shop_settings` | Katalog | z. B. `diamond_coin_rate` (Coins pro Diamant) |
| `exchange_packages` | Katalog | Tauschpakete Diamanten → Coins mit Bonus |
| `creator_codes` | geheim | Creator-Codes – für Spieler **nicht** lesbar (keine Policy, keine Rechte) |

## Server-Funktionen

| Funktion | Aufruf von | Zweck |
|---|---|---|
| `report_result(game, result, difficulty, score, duration_ms, extra)` | Webseite (angemeldet) | Runde werten: Plausibilität, Coins, Statistik, Erfolge |
| `claim_daily_spin()` | Webseite (angemeldet) | Glücksrad einmal pro Tag (Server würfelt) |
| `buy_item(item, coins, diamonds)` | Webseite (angemeldet) | Shop-Artikel zum angezeigten Preis kaufen |
| `equip_item(item)` | Webseite (angemeldet) | Design ausrüsten |
| `exchange_diamonds(package)` | Webseite (angemeldet) | Diamanten in Coins tauschen |
| `redeem_code(code)` | Webseite (angemeldet) | Creator-Code einlösen |
| `claim_achievement(achievement)` | Webseite (angemeldet) | Erfolgs-Belohnung abholen |
| `handle_new_user()` | Trigger auf `auth.users` | Profil beim ersten Login |
| `guard_exclusive_inventory()`, `guard_exclusive_equip()` | Trigger auf `inventory`/`equipped` | Exklusive Designs nur per Code |
| `ensure_profile`, `achievement_value`, `check_achievements`, `int_from`, `sale_price` | intern | Hilfsfunktionen, für Clients gesperrt |

## Änderungen

1. Neue Migration `supabase/migrations/00N_….sql` anlegen (oder eine bestehende wiederholbar anpassen),
   immer mit `gamehub.` vor jedem Namen und `set search_path = gamehub` bei Funktionen.
2. Bei neuen Tabellen/Spalten: Beschreibung in `999_gamehub_schema.sql` ergänzen und diese Übersicht
   aktualisieren. `999` vergibt die Leserechte auf alle Tabellen und läuft durch die Nummer immer zuletzt;
   neue Migrationen heißen `006_…`, `007_…` usw. Tabellen, die Spieler nicht lesen dürfen, dort wieder
   per `revoke` sperren (wie `creator_codes`).
3. Kataloge im Demo-Backend (`public/js/demo-backend.js`) mitziehen.
4. `node tools/sql-bundle.mjs --probe` ausführen lassen, dann ohne `--probe`.
