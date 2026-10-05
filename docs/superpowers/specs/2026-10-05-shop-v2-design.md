# Shop 2.0 – Design

Stand: 2026-10-05 · Status: vom Nutzer freigegeben („bau es genau so“), gebaut – `002` in Supabase noch auszuführen

Erweitert `2026-10-04-coins-shop-design.md`. Neu: Shop zeigt nur Nicht-Besessenes, kompakte Kacheln mit
Detailansicht, Rabattaktionen, Diamanten-Tausch in Paketen, Creator-Codes mit exklusiven Designs und eine
Profilseite mit „Meine Sammlung“. Die frühere Regel „kein Umtausch“ ist damit aufgehoben (nur Diamanten → Coins).

## Entscheidungen (vom Nutzer)

- Shop listet **nur Artikel, die man nicht besitzt** (Gratis-Designs nie).
- **Eine Seite**: Angebote oben, darunter ein Abschnitt pro Spiel, dann **„Diamanten tauschen“**, ganz unten
  **„Creator-Code“** – auf PC und Handy gleich (keine Seitenleiste, keine Abkürzungs-Knöpfe).
- Kleine Kacheln (PC 5–7 pro Reihe, Handy 2), Klick öffnet die **Detailansicht**.
- **Rabatt pro Artikel** (% + Enddatum), reduzierte Artikel zusätzlich im Abschnitt „Angebote“.
- **Tausch nur in Paketen**, größere Pakete mit mehr Bonus; Grundkurs **1 Diamant = 150 Coins**.
- **Creator-Codes** geben exklusive Designs und/oder Coins/Diamanten; pro Spieler einmal; optional Ablaufdatum
  und Höchstzahl an Einlösungen.
- **Profil mit „Meine Sammlung“** (alle eigenen Designs zum Ausrüsten), zusätzlich zum Spielmenü.
- Start-Inhalte: exklusive Designs **Snake „Galaxie“** und **Würfelsprung-Theme „Galaxie“**, Beispiel-Code
  **`GAMEHUB`** (beide Designs + 300 Coins).

## Shop-Seite (`#/shop`, `public/js/shop.js`)

- Kopf „Shop“ + kurzer Satz; abgemeldet zusätzlich der Anmelde-Hinweis.
- **Angebote** (nur wenn Rabatte laufen): alle sichtbaren reduzierten Artikel.
- **Je Spiel ein Abschnitt** (Reihenfolge wie im Katalog), Würfelsprung mit Unterüberschriften je Slot
  („Themes“, „Würfel“ aus `games.js` `slots`). Spiel ohne offene Artikel → Abschnitt entfällt; alles besessen →
  „Du hast alle Designs – neue kommen bald.“
- **Kachel**: animierte Vorschau (8:5), Name, Preis. Rabatt: rotes Badge „−30 %“ auf der Vorschau, alter Preis
  durchgestrichen, neuer fett, Restzeit („noch 2 Tage“, unter 24 h „noch 5 Std.“). Ganze Kachel ist ein Knopf.
- Seite darf breiter sein als die bisherigen 1240px (wie Übersicht), Raster `minmax(170px, 1fr)`; bis 700px
  genau 2 Spalten.
- **Hervorhebung** (Nachtrag): `shop_items.highlight` (Text, z. B. „Beliebt“) → gelber Rand wie „Bester Wert“
  beim Tausch und gelbes Schild oben mittig auf der Kachel sowie in der Detailansicht. Start: Snake „Neon“.
- Sichtbar = nicht exklusiv, nicht gratis, nicht besessen (abgemeldet: alle kaufbaren).

## Detailansicht (Fenster)

- Große animierte Vorschau, Name, „Spiel · Slot“, Preis (bei Rabatt mit Badge, altem Preis, Restzeit).
- Angemeldet + genug Guthaben: „Danach hast du noch …“ und Knopf **„Kaufen für 560 Coins“** – kauft direkt
  (kein zweites Bestätigungsfenster).
- Zu wenig: „Dir fehlen noch 150 Coins.“ Fehlen Coins und es sind Diamanten da: Link „Diamanten tauschen“
  (schließt das Fenster, springt zu `#shop-exchange`).
- Abgemeldet: „Mit Google anmelden“.
- Nach dem Kauf: „Gekauft – <Name> gehört jetzt dir.“ mit **„Ausrüsten“** und **„Zurück zum Shop“**.
  Gekauftes wird **nicht** mehr automatisch ausgerüstet.
- Fehler (Server, Preis geändert) stehen im Fenster, Knopf wieder aktiv. „Der Preis hat sich geändert“ lädt
  den Katalog neu.
- Deep-Link `#/shop/<id>` (aus dem Spielmenü) öffnet die Detailansicht; die Adresse wird danach per
  `history.replaceState` auf `#/shop` zurückgesetzt.

## Diamanten tauschen (Abschnitt `#shop-exchange`)

- Pakete aus `exchange_packages` (Start: 1/5/10/25 Diamanten mit 0/10/20/30 % Bonus →
  150 / 825 / 1.800 / 4.875 Coins). Coins = round(Diamanten × Kurs × (100 + Bonus) / 100).
- Jede Karte: Diamanten, Coins, „+10 % Bonus“ bzw. „Grundkurs“; größtes Paket „Bester Wert“.
- Zu wenig Diamanten: „Dir fehlen N Diamanten“ statt Knopf. Abgemeldet: „Anmelden zum Tauschen“.
- Vor dem Tausch Bestätigung („… lässt sich nicht rückgängig machen“), danach „+825 Coins“.
- Browser schickt nur die Paket-ID; der Server rechnet.

## Creator-Code (letzter Abschnitt `#shop-code`)

- Eingabefeld (Groß/Klein egal) + „Einlösen“. Fehler darunter (Texte vom Server):
  „Diesen Code gibt es nicht.“, „Dieser Code ist abgelaufen.“, „Diesen Code hast du schon eingelöst.“,
  „Dieser Code wurde schon zu oft eingelöst.“
- Erfolg → Fenster „Code GAMEHUB eingelöst – Das hast du bekommen:“ mit je Design Vorschau, Name,
  „Spiel · Slot“, „Ausrüsten“ (bzw. „Ausgerüstet ✓“, „hattest du schon“), Zeilen für Coins/Diamanten und
  „Zurück zum Shop“.
- Exklusive Designs: lila Badge „Exklusiv“, nie im Shop, nie kaufbar, nie gratis.

## Nachtrag: Inventar statt Profil und Erfolge-Seite

- Navigation oben: Games · Shop · **Inventar** (Truhe). `#/inventar` (`public/js/inventory.js`) zeigt Kopf mit
  Profilbild, Name, Kontostand, dann „Meine Designs“ (wie unten beim Profil beschrieben) und „Erfolge“.
  `#/profil` und `#/erfolge` leiten weiter (`#/erfolge` springt zu den Erfolgen).
- Profil-Menü: nur Name (Link zum Inventar), Demo-Knöpfe, „Abmelden“ – keine Einzel-Links mehr.
- Erfolge kompakt: Karten ab 270px (PC 4 Spalten), kleines Icon, Beschreibung max. 2 Zeilen, Balken und
  Zahl in einer Zeile.
- Ausrüsten im Inventar und im Code-Ergebnis ohne Einblendung (Kachel/Zeile zeigt „Ausgerüstet ✓“);
  Einblendungen mit `key` ersetzen sich, höchstens 3 gleichzeitig.
- Galaxie-Set um den Würfel-Skin `cube-galaxy` (Sterne, Leuchten) erweitert, ebenfalls in `GAMEHUB`.

## Nachtrag: Erfolge manuell abholen (`003_achievement_claims.sql`)

- Beim Freischalten keine sofortige Gutschrift mehr: `user_achievements.reward_pending = true`; abholen über
  `claim_achievement(p_achievement)` (genau einmal, nur wenn `reward_pending`).
- Meldung beim Freischalten: PC unten rechts, Handy oben unter der Kopfzeile, mit „Zum Inventar“ (`#/erfolge`).
- Gelber Punkt an „Inventar“ (Handy zusätzlich am ☰-Knopf), solange `state.pending` nicht leer ist.
- Inventar: abholbare Erfolge gelb umrandet mit „Abholen“, Banner „N Belohnungen warten“ und ab 2 „Alle abholen“;
  Spielmenü zeigt ein „Abholen“-Schild am Erfolg.

## Profil (`#/profil`, ursprünglich `profile.js` – aufgegangen im Inventar)

- Kopf: Profilbild, Name, Kontostand. Darunter **„Meine Sammlung“**: alle besessenen Designs (inkl. Gratis-
  und exklusiven) nach Spiel und Slot, Kacheln wie im Shop; ausgerüstet = grüner Rahmen „Ausgerüstet ✓“,
  sonst „Ausrüsten“. Pro Slot „3 von 7“ (gezählt: nicht exklusive + eigene exklusive).
- Erreichbar über das Profil-Menü (Name als Link + Eintrag „Profil“) bzw. auf dem Handy über die
  Profil-Zeile im ☰-Menü. Abgemeldet: Anmelde-Hinweis.

## Spielmenü (`game-menu.js`)

- Exklusive Designs nur, wenn man sie besitzt.
- Gesperrte Designs zeigen den aktuellen Preis (bei Rabatt mit „−30 %“), Klick → `#/shop/<id>`.

## Datenbank: `supabase/migrations/002_shop.sql`

Läuft nach `001`; gefahrlos erneut ausführbar. Wer `001` erneut ausführt, führt danach auch `002` aus.

- `shop_items`: `exclusive boolean default false`, `sale_percent integer default 0` (0–90),
  `sale_until timestamptz` (leer = ohne Ende).
- `shop_settings (key, value)` – `diamond_coin_rate = 150`; öffentlich lesbar.
- `exchange_packages (id, diamonds, bonus_percent, sort)`; öffentlich lesbar.
- `creator_codes (code, coins, diamonds, items text[], active, expires_at, max_uses, uses, note)` – **für
  Clients nicht lesbar** (RLS ohne Policy + revoke).
- `code_redemptions (user_id, code, redeemed_at)` – eigene Zeilen lesbar.
- `sale_price(price, percent, until)`: ohne aktiven Rabatt = Preis; sonst max(1, round(Preis × (100 − %) / 100)).
- `buy_item(p_item, p_coins, p_diamonds)` ersetzt `buy_item(text)`: rechnet den Rabattpreis, lehnt exklusive
  Artikel ab, kauft nur zum erwarteten Preis („Der Preis hat sich geändert.“).
- `equip_item(text)`: gratis = nicht exklusiv und Preis 0; exklusiv nur mit Inventar.
- `exchange_diamonds(p_package)`, `redeem_code(p_code)` (sperrt die Code-Zeile `for update`).
- Schutz unabhängig von Funktionsversionen: Trigger auf `inventory` (exklusive Artikel nur über
  `redeem_code`) und `equipped` (exklusive nur mit Inventar).
- Startdaten: Galaxie-Designs (Katalog, `on conflict do update`), Kurs, Pakete und `GAMEHUB`
  (`on conflict do nothing`, damit eigene Änderungen erhalten bleiben).

## Code im Browser

- `public/js/pricing.js` – reine Funktionen: `isFreeItem`, `saleActive`, `priceOf`, `saleLeft`,
  `packageCoins`. Genutzt von Shop, Spielmenü, Profil und Demo-Backend; in Node testbar.
- `economy.js`: `isFree` beachtet `exclusive`; Katalog lädt zusätzlich Pakete und Kurs; `buy` schickt den
  erwarteten Preis und rüstet nicht mehr aus; neu `exchange(paketId)`, `redeemCode(code)`, `reloadCatalog()`;
  Demo-Modus `?demo=1` auch mit Supabase-Konfiguration, aber nur auf localhost.
- `ui-economy.js` behält Kopfzeile, Einblendungen, Glücksrad und Erfolge; exportiert `openModal`
  (mit `onClose`) und `loginPrompt`. Der alte Shop-Code entfällt.
- `designs.js`: `snake-galaxy`, `cubejump-galaxy`, `isAnimated(id)` statt doppelter Regex.
- `app.js`: Routen `#/shop`, `#/shop/<id>`, `#/profil`.
- `demo-backend.js` spiegelt Spalten, Tabellen, Trigger-Regeln und RPCs; exportiert seinen Katalog für Tests.

## Tests

- `tools/check-shop.mjs` (Node): Preise/Rabatt/Rundung/Restzeit/Pakete und die Demo-RPCs (Kauf zum
  Preis, Preis geändert, exklusiv nicht kaufbar, zu wenig Guthaben, Tausch, Code einmalig/abgelaufen/
  aufgebraucht/unbekannt, Ausrüsten exklusiv nur nach Code).
- Browser im Demo-Modus: PC und 320–414px, Überlauf-Messung, alle Abläufe.
- Nach `002` in Supabase: kurzer Testplan mit echtem Login für den Nutzer.

## Umsetzungsschritte (für den Wiedereinstieg)

1. Spec (diese Datei) ✓
2. `tools/check-shop.mjs` + `pricing.js` + Demo-Backend ✓ (22 Prüfungen grün)
3. `002_shop.sql` ✓ (noch nicht in Supabase ausgeführt)
4. `economy.js`, `designs.js` (Galaxie) ✓
5. `shop.js`, `profile.js`, `ui-economy.js` aufräumen, `app.js`-Routen, `game-menu.js` ✓
6. CSS (PC + Handy) ✓ (320–414px ohne Überlauf)
7. Browser-Prüfung, Doku (`CLAUDE.md`, `docs/supabase-setup.md`) ✓ – offen: `002` in Supabase ausführen, echter Login-Test
