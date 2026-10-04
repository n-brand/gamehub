# Coins, Glücksrad, Erfolge und Shop – Design

Stand: 2026-10-04 · Status: freigegeben zum Bau einer ersten Version („bauen, danach anpassen“)

## Ziel

Spieler sammeln in allen Spielen Coins (je nach Schwierigkeit und Ergebnis), drehen täglich ein Glücksrad,
schalten Erfolge frei und kaufen im Shop Designs. Es gibt zwei Währungen: **Coins** und **Diamanten**
(Premium). Alles läuft über ein Supabase-Backend mit Google-Login.

## Entscheidungen (vom Nutzer)

- Shop verkauft zunächst **Designs**, erst einmal **nur für Snake**; später weitere Artikelarten möglich.
- Diamanten gibt es **nur selten im Spiel**: Glücksrad-Jackpot, Glücksrad-Serie, „krasse“ Erfolge.
  Kein Echtgeld, kein Umtausch.
- Backend **sofort mit Supabase**, Login **mit Google** (Discord/GitHub später möglich).
- Ohne Login sind alle Spiele spielbar; Coins, Glücksrad, Erfolge und Shop brauchen Login.
- **Kein Tageslimit** für Coins.
- Glücksrad öffnet sich **nur über das Symbol** in der Kopfzeile (kein Auto-Popup).
- „100 Siege gegen den Computer“ bei Vier gewinnt zählt **jede Stärke**.
- Zahlen sind Startwerte; der Nutzer passt sie nach der ersten Version an.

## Aufbau

- Frontend bleibt statisch (GitHub Pages, kein Build). Supabase-Client per CDN
  (`@supabase/supabase-js@2`, jsDelivr ESM).
- `public/js/config.js`: Supabase-URL und öffentlicher Anon-Key. Leer = Wirtschaft ausgeblendet,
  Seite funktioniert wie bisher.
- `public/js/economy.js`: einziges Modul mit Supabase-Zugriff. Login/Logout, Profil (Kontostände),
  Inventar, ausgerüstete Designs, Kataloge, `reportResult`, `spin`, `buy`, `equip`; Ereignisse für die
  Oberfläche.
- Spiele melden Runden über `api.reportResult({ result, difficulty, score, durationMs, extra })`.
  `result`: `win` | `loss` | `draw` | `score`. Spiele kennen keine Coin-Beträge.
- Alle Wertänderungen passieren in Postgres-Funktionen (`security definer`):
  `report_result`, `claim_daily_spin`, `buy_item`, `equip_item`. Tabellen sind per RLS nur lesbar
  (eigene Zeilen bzw. öffentliche Kataloge); direktes Schreiben ist für Clients gesperrt.
- Datenbank als SQL im Repo: `supabase/migrations/001_economy.sql`, ausgeführt im Supabase-SQL-Editor.

## Datenmodell

| Tabelle | Inhalt |
|---|---|
| `profiles` | `id` (= auth.users.id), `coins`, `diamonds`, `spin_streak`, `last_spin` |
| `game_stats` | je Nutzer und Spiel: `plays`, `wins`, `best_score`, `data` (jsonb: `wins_<stufe>`, `max_tile`, `max_level`, `quads`, `perfect30`), `last_report` |
| `reward_rules` | Katalog: Coins je Spiel/Stufe/Ergebnis, Punkte-Teiler, Obergrenze, Mindestdauer, max. Punkte pro Sekunde |
| `wheel_segments` | Katalog: 8 Glücksrad-Felder mit Coins/Diamanten und Gewicht |
| `achievements` | Katalog: Spiel (oder allgemein), Statistik-Schlüssel, Schwelle, Belohnung |
| `user_achievements` | freigeschaltete Erfolge mit Datum |
| `shop_items` | Katalog: Artikel-ID, Spiel, Name, Preis in Coins oder Diamanten |
| `inventory` | gekaufte Artikel |
| `equipped` | aktives Design je Spiel |

Profile werden per Trigger bei der ersten Anmeldung angelegt (Funktionen legen sie zur Sicherheit
ebenfalls an). Artikel mit Preis 0 gelten als Besitz ohne Inventar-Zeile.

## Coins pro Runde (Startwerte)

| Spiel | Coins |
|---|---|
| Snake | 1 pro Apfel (max. 100) |
| 2048 | 1 pro 200 Punkte (max. 150), +50 bei erreichter 2048 |
| Blockfall | 1 pro 250 Punkte (max. 150) |
| Mauerbrecher | 1 pro 100 Punkte (max. 100) |
| Paare finden | Sieg: 12 Karten 5 · 20 Karten 10 · 30 Karten 20 |
| Minesweeper | Sieg: Leicht 10 · Mittel 40 · Schwer 120 |
| Vier gewinnt (gegen Computer) | Sieg: Leicht 5 · Mittel 15 · Schwer 40 · Ultra 100; Unentschieden die Hälfte |

- Neuer persönlicher Rekord bei Punkte-Spielen: +10 Coins.
- Vier gewinnt „Zu zweit“ wird nicht gemeldet (keine Coins, keine Erfolge).
- Plausibilität (Runde wird sonst nicht gewertet, auch nicht für Erfolge):
  Mindestdauer je Regel; Punkte pro Sekunde begrenzt; gemeldete Spielzeit darf seit der letzten
  Meldung desselben Spiels nicht mehr als die vergangene Echtzeit betragen (verhindert Massen-Meldungen).

## Glücksrad

- Einmal pro Kalendertag (Europe/Berlin), Server würfelt und schreibt gut; das Rad dreht im Browser
  ca. 4 s auf das Ergebnis.
- Felder (gleich groß gezeichnet, Chancen per Info einsehbar): 25 / 50 / 75 / 100 / 150 / 250 Coins,
  1 Diamant, 5 Diamanten – Gewichte 25 / 22 / 18 / 14 / 10 / 6 / 4 / 1 %.
- Serie: Faktor auf Coins 1,0 · 1,2 · 1,4 · 1,5 · 1,6 · 1,8 · 2,0 (ab Tag 7); jeder 7. Tag in Folge
  +1 Diamant; ein verpasster Tag setzt zurück.
- Zugang über ein Geschenk-Symbol in der Kopfzeile; solange der Bonus abholbar ist, wackelt es und trägt einen roten Punkt.

## Erfolge

| Spiel | Erfolg | Belohnung |
|---|---|---|
| Allgemein | Erste Runde gespielt | 50 Coins |
| Allgemein | Alle 7 Spiele gespielt | 200 Coins |
| Allgemein | 500 Runden insgesamt | 5 Diamanten |
| Allgemein | 30 Tage Glücksrad-Serie | 10 Diamanten |
| Snake | 25 Äpfel in einer Runde | 100 Coins |
| Snake | 75 Äpfel in einer Runde | 3 Diamanten |
| 2048 | 2048-Kachel | 200 Coins |
| 2048 | 4096-Kachel | 5 Diamanten |
| Blockfall | 4 Reihen auf einmal | 100 Coins |
| Blockfall | Level 10 | 3 Diamanten |
| Mauerbrecher | Level 3 erreichen | 150 Coins |
| Mauerbrecher | Alle 5 Level schaffen (Level 6 erreicht) | 5 Diamanten |
| Paare finden | 10 Runden gewonnen | 100 Coins |
| Paare finden | 30 Karten in höchstens 25 Zügen | 3 Diamanten |
| Minesweeper | Mittel gewinnen | 150 Coins |
| Minesweeper | Schwer gewinnen | 5 Diamanten |
| Vier gewinnt | Schwer besiegen | 200 Coins |
| Vier gewinnt | Ultra besiegen | 10 Diamanten |
| Vier gewinnt | 100 Siege gegen den Computer (jede Stärke) | 10 Diamanten |

Der Server prüft nach jeder gewerteten Runde und nach dem Glücksrad; Belohnung genau einmal.
Seite `#/erfolge` mit Fortschrittsbalken; Freischaltung als Einblendung.

## Shop (erste Version: Snake)

| ID | Design | Preis |
|---|---|---|
| `snake-classic` | Klassisch (blau auf Grün) | gratis |
| `snake-fire` | Feuer (Verlauf Rot → Gelb) | 400 Coins |
| `snake-zebra` | Zebra (weiß-schwarz gestreift) | 600 Coins |
| `snake-neon` | Neon (leuchtend grün, dunkles Feld, Glow) | 800 Coins |
| `snake-rainbow` | Regenbogen (wandernder Farbverlauf) | 5 Diamanten |
| `snake-gold` | Gold (goldener Verlauf mit Funkeln) | 10 Diamanten |

- Seite `#/shop`: Kategorien je Spiel, Kacheln mit Live-Vorschau, Kaufen (mit Bestätigung) /
  Ausrüsten / Ausgerüstet.
- Aussehen der Designs liegt im Code (`public/js/designs.js`, auch für die Vorschau genutzt),
  Preise und Besitz in der Datenbank.

### Nachtrag: Würfelsprung-Themes

| ID | Theme | Preis |
|---|---|---|
| `cubejump-classic` | Klassisch (Level-Farben) | gratis |
| `cubejump-sunset` | Sonnenuntergang | 400 Coins |
| `cubejump-ice` | Eis | 600 Coins |
| `cubejump-neon` | Neon (leuchtend) | 800 Coins |
| `cubejump-lava` | Lava | 5 Diamanten |
| `cubejump-gold` | Gold (funkelnd) | 10 Diamanten |

Würfelsprung-Belohnung pro geschafftem Level: Leicht 30, Mittel 60, Schwer 150 Coins; Erfolge für jedes Level (Schwer: 5 Diamanten). „Allrounder“ zählt jetzt 8 Spiele.

## Oberfläche

- Kopfzeile: Kontostand (Coins, Diamanten), Geschenk-Symbol für den täglichen Bonus (wackelt mit Punkt, solange abholbar), Links „Shop“ und „Erfolge“,
  „Mit Google anmelden“ bzw. Profilbild mit Abmelden.
- Einblendungen unten rechts: „+40 Coins“, „Erfolg freigeschaltet …“.
- Gäste: nach einer Runde einmal pro Sitzung „Mit Google anmelden und Coins sammeln“.

## Fehlerfälle

- Keine Konfiguration → Wirtschaft ausgeblendet, Seite funktioniert wie bisher.
- Netzwerk-/Serverfehler beim Melden → Hinweis „Coins konnten nicht gutgeschrieben werden“
  (keine Warteschlange in Version 1).
- Nicht plausible Runde → keine Coins, keine Erfolge, kein Fehlerdialog.
- Glücksrad bereits gedreht → Zustand neu laden, Symbol ohne Punkt.
- Zu wenig Guthaben → Kaufen-Knopf deaktiviert.

## Etappen

1. Fundament: Supabase-Anbindung, Google-Login, Kontostand, Ergebnis-Meldung aller 7 Spiele,
   Einblendungen.
2. Glücksrad und Erfolge-Seite.
3. Shop und Snake-Designs.

## Einrichtung durch den Nutzer

Anleitung in `docs/supabase-setup.md`: Projekt anlegen (Region Frankfurt), SQL ausführen,
Google-Login einrichten, URLs eintragen, `config.js` füllen.

## Offen / später

- Datenschutzerklärung (Pflicht bei öffentlichem Login mit personenbezogenen Daten).
- Weitere Login-Anbieter, weitere Shop-Kategorien, Bestenlisten.
