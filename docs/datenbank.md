# Datenbank (Supabase)

Die Supabase-Datenbank wird von **mehreren Projekten** genutzt. Jedes Projekt hat sein eigenes
Postgres-Schema; GameHub liegt komplett in **`gamehub`** und benutzt nichts aus `public`.

- **Quelle der Wahrheit:** [`supabase/migrations/001_economy.sql`](../supabase/migrations/001_economy.sql).
  Diese Datei ist nur die Übersicht – bei Abweichungen gilt das SQL.
- Tabellen und Spalten haben in der Datenbank Beschreibungen (`comment on …`), sichtbar in Supabase Studio.
- Das Schema muss unter **Project Settings → Data API → Exposed schemas** freigegeben sein.
- Die Webseite verbindet sich mit `db: { schema: 'gamehub' }` (`public/js/economy.js`).

## Was GameHub mit anderen Projekten teilt

| Was | Wie |
|---|---|
| `auth.users` (Logins) | Gemeinsam für alle Projekte: wer sich bei GameHub mit Google anmeldet, ist überall derselbe Nutzer. |
| Trigger `gamehub_on_auth_user_created` auf `auth.users` | Legt beim ersten Login eine Zeile in `gamehub.profiles` an. Andere Projekte müssen eigene, eindeutig benannte Trigger verwenden. |
| Speicher, Verbindungen, Pausieren im Free Tier | Gelten für alle Projekte zusammen. |

## Tabellen

Clients dürfen nur **lesen**: Kataloge alle, Spielerdaten nur die eigenen Zeilen (Row Level Security).
Geschrieben wird ausschließlich über die Server-Funktionen unten.

| Tabelle | Art | Inhalt |
|---|---|---|
| `profiles` | Spieler | Coins, Diamanten, Glücksrad-Serie (`spin_streak`, `last_spin`) – 1 Zeile pro Login |
| `game_stats` | Spieler | Runden, Siege, Bestwert pro Spiel; `data` mit spielspezifischen Werten (`wins_<stufe>`, `max_tile`, `max_level`, `quads`, `perfect30`, `max_fruit`) |
| `user_achievements` | Spieler | Freigeschaltete Erfolge |
| `inventory` | Spieler | Gekaufte Shop-Artikel |
| `equipped` | Spieler | Ausgerüsteter Artikel pro Slot (`snake`, `cubejump-theme`, `cubejump-skin`, `watermelon`) |
| `reward_rules` | Katalog | Coins pro Runde je Spiel/Stufe/Ergebnis, Plausibilitätsgrenzen |
| `wheel_segments` | Katalog | Glücksrad-Felder mit Gewicht |
| `achievements` | Katalog | Erfolge mit Schwelle und Belohnung |
| `shop_items` | Katalog | Shop-Designs mit Preis und Slot (Aussehen im Code: `public/js/designs.js`, `watermelon-art.js`) |

## Server-Funktionen

| Funktion | Aufruf von | Zweck |
|---|---|---|
| `report_result(game, result, difficulty, score, duration_ms, extra)` | Webseite (angemeldet) | Runde werten: Plausibilität, Coins, Statistik, Erfolge |
| `claim_daily_spin()` | Webseite (angemeldet) | Glücksrad einmal pro Tag (Server würfelt) |
| `buy_item(item)` | Webseite (angemeldet) | Shop-Artikel kaufen |
| `equip_item(item)` | Webseite (angemeldet) | Design ausrüsten |
| `handle_new_user()` | Trigger | Profil beim ersten Login |
| `ensure_profile`, `achievement_value`, `check_achievements`, `int_from` | intern | Hilfsfunktionen, für Clients gesperrt |

## Änderungen

1. `001_economy.sql` anpassen (es kann beliebig oft erneut ausgeführt werden).
2. Bei neuen Tabellen/Spalten: `comment on …` ergänzen und diese Übersicht aktualisieren.
3. Kataloge im Demo-Backend (`public/js/demo-backend.js`) mitziehen.
4. Im Supabase SQL Editor ausführen.
