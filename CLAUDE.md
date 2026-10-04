# CLAUDE.md

## Git

- Commits must **never** use a real email address (e.g. personal Gmail or work address).
- Always commit with the GitHub noreply address:
  `Nicolas <227780975+n-brand@users.noreply.github.com>`
- This is set in the repo-local git config (`git config user.email`). Before committing, verify it with `git config user.email` and do not override it with `--author` or environment variables.

## Befehle für den Nutzer

- Befehle, die der Nutzer selbst ausführen soll, immer für **PowerShell** schreiben, **ohne `&&`**, ein Befehl pro Codeblock.

## Design-Grundsatz

- **Desktop first:** Layout und Spiele werden primär für große Desktop-Bildschirme gebaut; Spielfelder sollen den verfügbaren Platz groß ausnutzen. Mobil muss funktionieren, ist aber zweitrangig. Die Übersicht nutzt die Breite dynamisch (bis 2400px): Kachel-Raster mit `auto-fill` (min. 210px), Feature-Karten max. 380px breit und zentriert; Elemente eher kompakt halten (große Bildschirme). Spieleseite: `.game-stage` ist genau so hoch wie das Fenster unter der Kopfzeile; der Spielrahmen ist ein Size-Container, Spiele berechnen ihre Größe mit `cqi`/`cqh`, damit sie immer komplett sichtbar sind (nie bis zum unteren Rand).
- **Dark ist Standard**, Light per Umschalter oben rechts (gespeichert in `localStorage` unter `gamehub-theme`). Farben nur über CSS-Tokens in `:root` / `:root[data-theme="light"]`; neue UI immer in beiden Themes prüfen.
- **Illustrationsstil:** Flat Design (flache Vektorgrafik), farbige Flächen, abgerundete Formen, dezente Schatten/Glanzpunkte, kein Outline, keine Verläufe.
- **Karten:** Illustration oben in der Spielfarbe (`theme.bg`), Textbereich darunter eine Stufe dunkler (Mischung aus `bg` und `edge`).
- **Badges (NEU/BALD):** gelb bzw. hellblau; ist die Kartenfarbe der Badge-Farbe zu ähnlich, wird automatisch `badge--alt` gesetzt (Navy-Pille mit farbiger Schrift, ohne Rand, Logik in `badgeFor` in `app.js`).
- **Stil wie fontawesome.com:** heller grauer Hintergrund, Navy-Text, runde Schrift (Nunito), Karten mit dickem farbigem Rand unten, Pill-Badges (NEU/BALD), Links mit Pfeil.
- **Jede Spiele-Kachel hat eine eigene Illustration**, die zum Spiel passt (in `public/js/art.js`) und eine eigene Farbwelt (`theme` in `games.js`). Neue Spiele bekommen immer beides.
- **Spiele sollen hochwertig aussehen**, nicht nach simplen Blöcken (Vorbild Snake: Google Snake mit flüssiger Bewegung, Augen, Apfel).

## Projektstand

**Regel:** Nach jeder Änderung am Projekt diesen Abschnitt aktualisieren, damit er immer den aktuellen Stand widerspiegelt (was existiert, was in Arbeit ist, nächste Schritte).

**Aktueller Stand (2026-10-04):**
- Grundgerüst der Plattform steht: reines HTML/CSS/JS ohne Build-Schritt und ohne npm-Abhängigkeiten.
- Lokal starten: `npm run dev` (bzw. `node server.js`) → http://localhost:4177
- Online: https://n-brand.github.io/gamehub/ – GitHub Actions (`.github/workflows/pages.yml`) veröffentlicht `public/` bei jedem Push auf `main`. Pfade in `public/` müssen relativ sein (Seite läuft unter `/gamehub/`).
- Design im Font-Awesome-Stil umgesetzt (siehe Design-Grundsatz).
- Übersicht: Hero, 3 große Feature-Karten, Kategorie-Filter, Suche, „Zuletzt gespielt“, Favoriten, alle Spiele als illustrierte Kacheln. Favoriten lassen sich direkt auf Kacheln/Feature-Karten per Stern (oben links, erscheint beim Hovern; markierte immer sichtbar) setzen und entfernen. Alle 7 Spiele sind spielbar; neue geplante Spiele können wieder als „Bald“-Kacheln (`available: false`) eingetragen werden.
- Spieleseite: Spiel in farbigem Rahmen (Spielfarbe), Vollbild, Favorit, Beschreibung/Steuerung, ähnliche Spiele.
- Fertige Spiele: **Blockfall** (Tetris-Prinzip; SRS-Drehung mit Wall Kicks, 7er-Beutel, Geisterstein, Halten, 3er-Vorschau, DAS/ARR, Einrast-Verzögerung, Level alle 10 Reihen, Touch-Tasten, Rekord über `api.submitScore`), **Mauerbrecher** (Breakout-Prinzip; Canvas 960×720 skaliert, 5 Level-Layouts mit harten Steinen, Kapseln: breit/mehr Bälle/Leben, Partikel, Rekord über `api.submitScore`), **Minesweeper** (9×9/16×16/30×16, erster Klick sicher, Rechtsklick/langes Drücken/Flaggen-Modus, Zahl-Klick, Aufdecken als Welle, Bestzeit pro Stufe in `localStorage` unter `gamehub-minesweeper`), **Paare finden** (Memory-Prinzip, Name wegen Ravensburger-Marke „memory“; 12/20/30 Karten, 3D-Umdrehen, Rekord = wenigste Züge pro Größe in `localStorage` unter `gamehub-pairs`), **Vier gewinnt** (gegen Computer in 4 Stärken – Leicht/Mittel/Schwer: Negamax mit Alpha-Beta, 600 ms; Ultra: Merktabelle (Zobrist), Drohungs-Logik, Paritäts-Bewertung, bis 2 s, schlägt Schwer ohne Niederlage – oder zu zweit; Berechnung im Web Worker (dieselbe Datei als Modul-Worker); Steine fallen hinter das SVG-Brett mit Löchern, Gewinnreihe leuchtet, Startspieler wechselt, Einstellungen in `localStorage` unter `gamehub-connect4`), **2048** (klassische Regeln, gleitende Kacheln mit Verschmelz-Animation, Punkte/Rekord, Sieg bei 2048 mit Weiterspielen, Spielstand wird in `localStorage` unter `gamehub-2048-state` gespeichert), **Snake** im Google-Snake-Stil (17×15 Feld, flüssige Bewegung, Augen, Apfel, Tastatur/Wischen/Touch-Buttons, Pause, lokaler Highscore).
- Zuletzt gespielt, Favoriten und lokale Rekorde bleiben im Browser (`localStorage`).
- **Coins, Diamanten, Glücksrad, Erfolge und Shop** (erste Version gebaut, Spec: `docs/superpowers/specs/2026-10-04-coins-shop-design.md`): Supabase-Backend mit Google-Login; alle 7 Spiele melden Runden über `api.reportResult`, Snake nutzt Shop-Designs über `api.getDesign`. **Noch nicht live:** Der Nutzer muss das Supabase-Projekt anlegen und Google-Login einrichten (Anleitung `docs/supabase-setup.md`), dann `public/js/config.js` füllen. Ohne Konfiguration ist alles ausgeblendet; zum Ausprobieren `?demo=1` an die Adresse hängen (Demo-Backend im Browser). Der Nutzer will die Werte (Coins, Preise, Chancen) nach dem Test selbst anpassen.
- Nächste Schritte: Supabase einrichten und mit echtem Login testen, Werte anpassen, Datenschutzerklärung, Designs für weitere Spiele.

**Aufbau:**
- `server.js` – minimaler Dev-Server, liefert `public/` aus
- `public/index.html` – Single Page, Hash-Routing (`#/` Übersicht, `#/game/<id>` Spiel)
- `public/js/app.js` – Übersicht, Spieleseite, Routing
- `public/js/games.js` – Spiele-Katalog (neues Spiel hier eintragen)
- `public/js/storage.js` – localStorage (zuletzt gespielt, Favoriten, Highscores)
- `public/games/<id>.js` – ein Modul pro Spiel; exportiert `mount(container, api)` und gibt eine Cleanup-Funktion zurück
- `public/js/art.js` – SVG-Illustration pro Spiel für Kacheln/Feature-Karten
- Gemeinsame Spiel-Bausteine in `style.css` (`.gp`, `.gp-panel`, `.gp-stats`, `.gp-seg`, `.gp-overlay` …): Bedienfeld neben dem Spielfeld, wird bei schmalem Rahmen per Container-Query darübergesetzt. Neue Spiele nutzen diese Bausteine.
- `public/thumbs/` – Favicon
- `public/js/config.js` – Supabase-URL und öffentlicher Anon-Key (leer = Wirtschaft ausgeblendet)
- `public/js/economy.js` – einziges Modul mit Backend-Zugriff (Login, Kontostand, reportResult, Glücksrad, Kaufen, Ausrüsten); Ereignisse für die Oberfläche
- `public/js/ui-economy.js` – Kopfzeile (Kontostand, Geschenk-Symbol für den täglichen Bonus/Glücksrad, Login), Einblendungen, Glücksrad-Fenster, Seiten `#/shop` und `#/erfolge`
- `public/js/designs.js` – Aussehen der Shop-Designs (Spiel und Shop-Vorschau)
- `public/js/demo-backend.js` – Demo-Backend für `?demo=1` (Kataloge bei Änderungen am SQL mitziehen)
- `supabase/migrations/001_economy.sql` – Tabellen, RLS, Server-Funktionen (`report_result`, `claim_daily_spin`, `buy_item`, `equip_item`), Kataloge; im Supabase-SQL-Editor ausführen
- Spiel-API (`mount(container, api)`): `getHighscore`, `submitScore` (lokal), `reportResult({ result, difficulty, score, durationMs, extra })`, `getDesign()`

## Open-Source-Spiele (Recherche 2026-10)

Mögliche Kandidaten mit freier Lizenz (MIT/BSD/Apache) zum Übernehmen oder als Vorlage:
- 2048: gabrielecirulli/2048 (MIT)
- Tetris-artig: jakesgordon/javascript-tetris (MIT)
- Minesweeper: pwmarcz/kaboom, DavidNHill/JSMinesweeper (MIT)
- Memory: taniarascia/memory (MIT)
- Wordle-artig: WebDevSimplified/wordle-clone (MIT)
- Breakout: end3r/Gamedev-Canvas-workshop (Public Domain)
- Endless Runner: wayou/t-rex-runner (BSD-3)
- Vier gewinnt: kenrick95/c4 (MIT)
- Schach: jhlywa/chess.js (BSD-2) + oakmac/chessboardjs (MIT)
- Schiffe versenken: billmei/battleboat (MIT)
- Tower Defense: oldj/html5-tower-defense (MIT)
- Listen: proyecto26/awesome-jsgames, michelpereira/awesome-open-source-games

Regeln:
- Nur Repos mit Lizenz nutzen (keine LICENSE = nicht erlaubt). GPL nur isoliert und mit Quellcode-Offenlegung.
- Lizenz/Credits pro Spiel anzeigen.
- Grafiken/Sounds sind oft separat lizenziert → prüfen, ggf. durch CC0 (kenney.nl) ersetzen.
- Markennamen vermeiden (Tetris, Wordle, Flappy Bird, Pac-Man, Connect Four, Battleship …) → eigene Namen wählen.
- Übernommene Spiele müssen optisch an das GameHub-Design angepasst werden.

## Idee

Eine Browser-Spieleplattform, **funktional ähnlich wie Poki** (nicht im Design). Spiele laufen sofort im Browser, ohne Installation und ohne Pflicht-Login.

### Plattform-Funktionen (wie Poki)
- Startseite mit Spiele-Katalog als Kacheln (Vorschaubild, Name)
- Kategorien/Tags (Puzzle, Action, Geschick, Multiplayer, Klassiker …)
- Suche
- Spieleseite: Spiel startet direkt im Browser, Vollbild-Button, Beschreibung, Steuerung
- „Zuletzt gespielt“ und Favoriten (ohne Login lokal im Browser, mit Login geräteübergreifend)
- Bewertung (Daumen hoch/runter) und Anzeige beliebter/neuer Spiele
- Ähnliche Spiele unter dem aktuellen Spiel vorschlagen
- Optional: Accounts, Highscores/Bestenlisten, Erfolge
- Mobil spielbar (Touch-Steuerung)

### Spielideen
Einfach (guter Einstieg):
- Snake
- 2048
- Memory
- Minesweeper
- Tic-Tac-Toe (gegen KI oder zu zweit)
- Flappy-Bird-Klon
- Breakout/Arkanoid

Mittel:
- Tetris-Klon
- Sudoku
- Endless Runner (Jump & Run)
- Wortspiele (Wordle-Klon, Galgenmännchen)
- Match-3 (Candy-Crush-Prinzip)
- Tower Defense (einfach)

Multiplayer (später):
- Vier gewinnt / Schach / Dame online
- Schiffe versenken
- Quiz-Duell
- Kleines Echtzeit-Spiel (z. B. agar.io-ähnlich)

### Technik
- **Backend: Supabase** mit Google-Login – umgesetzt für Coins, Glücksrad, Erfolge und Shop (alle Wertänderungen nur über Server-Funktionen, Clients lesen nur). Später auch für geräteübergreifende Favoriten/„Zuletzt gespielt“, Bestenlisten und Echtzeit-Multiplayer.
- Frontend-Hosting: GitHub Pages (per GitHub Actions)
- Beides läuft im Free Tier (Achtung: Supabase pausiert Free-Projekte nach ca. 1 Woche Inaktivität)
