# CLAUDE.md

## Git

- Commits must **never** use a real email address (e.g. personal Gmail or work address).
- Always commit with the GitHub noreply address:
  `Nicolas <227780975+n-brand@users.noreply.github.com>`
- This is set in the repo-local git config (`git config user.email`). Before committing, verify it with `git config user.email` and do not override it with `--author` or environment variables.

## Design-Grundsatz

- **Desktop first:** Layout und Spiele werden primär für große Desktop-Bildschirme gebaut; Spielfelder sollen den verfügbaren Platz groß ausnutzen. Mobil muss funktionieren, ist aber zweitrangig.
- **Dark ist Standard**, Light per Umschalter oben rechts (gespeichert in `localStorage` unter `gamehub-theme`). Farben nur über CSS-Tokens in `:root` / `:root[data-theme="light"]`; neue UI immer in beiden Themes prüfen.
- **Illustrationsstil:** Flat Design (flache Vektorgrafik), farbige Flächen, abgerundete Formen, dezente Schatten/Glanzpunkte, kein Outline, keine Verläufe.
- **Stil wie fontawesome.com:** heller grauer Hintergrund, Navy-Text, runde Schrift (Nunito), Karten mit dickem farbigem Rand unten, Pill-Badges (NEU/BALD), Links mit Pfeil.
- **Jede Spiele-Kachel hat eine eigene Illustration**, die zum Spiel passt (in `public/js/art.js`) und eine eigene Farbwelt (`theme` in `games.js`). Neue Spiele bekommen immer beides.
- **Spiele sollen hochwertig aussehen**, nicht nach simplen Blöcken (Vorbild Snake: Google Snake mit flüssiger Bewegung, Augen, Apfel).

## Projektstand

**Regel:** Nach jeder Änderung am Projekt diesen Abschnitt aktualisieren, damit er immer den aktuellen Stand widerspiegelt (was existiert, was in Arbeit ist, nächste Schritte).

**Aktueller Stand (2026-10-03):**
- Grundgerüst der Plattform steht: reines HTML/CSS/JS ohne Build-Schritt und ohne npm-Abhängigkeiten.
- Lokal starten: `npm run dev` (bzw. `node server.js`) → http://localhost:4177
- Design im Font-Awesome-Stil umgesetzt (siehe Design-Grundsatz).
- Übersicht: Hero, 3 große Feature-Karten, Kategorie-Filter, Suche, „Zuletzt gespielt“, Favoriten, alle Spiele als illustrierte Kacheln. Geplante Spiele erscheinen als „Bald“-Kacheln (2048, Vier gewinnt, Memory, Minesweeper, Tetris, Breakout).
- Spieleseite: Spiel in farbigem Rahmen (Spielfarbe), Vollbild, Favorit, Beschreibung/Steuerung, ähnliche Spiele.
- Fertige Spiele: **Snake** im Google-Snake-Stil (17×15 Feld, flüssige Bewegung, Augen, Apfel, Tastatur/Wischen/Touch-Buttons, Pause, lokaler Highscore).
- Daten (zuletzt gespielt, Favoriten, Highscores) nur lokal im Browser (`localStorage`), noch kein Backend.
- Nächste Schritte: weitere Spiele (selbst bauen oder Open-Source übernehmen, siehe unten), später Backend (Supabase oder Cloudflare) für Accounts/Bestenlisten.

**Aufbau:**
- `server.js` – minimaler Dev-Server, liefert `public/` aus
- `public/index.html` – Single Page, Hash-Routing (`#/` Übersicht, `#/game/<id>` Spiel)
- `public/js/app.js` – Übersicht, Spieleseite, Routing
- `public/js/games.js` – Spiele-Katalog (neues Spiel hier eintragen)
- `public/js/storage.js` – localStorage (zuletzt gespielt, Favoriten, Highscores)
- `public/games/<id>.js` – ein Modul pro Spiel; exportiert `mount(container, api)` und gibt eine Cleanup-Funktion zurück
- `public/js/art.js` – SVG-Illustration pro Spiel für Kacheln/Feature-Karten
- `public/thumbs/` – Favicon

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

### Mögliche Technik (noch nicht entschieden)
- Frontend: Cloudflare Pages
- Backend/Daten: Supabase (Accounts, Highscores, Favoriten, Echtzeit für rundenbasierte Multiplayer-Spiele) oder komplett Cloudflare (Workers, D1, Durable Objects für Echtzeit-Multiplayer)
- Beides läuft im Free Tier
