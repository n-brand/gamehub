# CLAUDE.md

## Git

- Commits must **never** use a real email address (e.g. personal Gmail or work address).
- Always commit with the GitHub noreply address:
  `Nicolas <227780975+n-brand@users.noreply.github.com>`
- This is set in the repo-local git config (`git config user.email`). Before committing, verify it with `git config user.email` and do not override it with `--author` or environment variables.
- **Der Nutzer wechselt manchmal mitten in der Arbeit den PC.** Deshalb in Schritten arbeiten, nach denen die Seite lauffähig bleibt, und den Abschnitt „Projektstand“ (In Arbeit / nächste Schritte) laufend aktuell halten, damit eine neue Sitzung auf dem anderen PC weitermachen kann. Sagt der Nutzer „Pause“: Stand festhalten, dann sofort committen und pushen – „Pause“ gilt als Freigabe für genau diesen einen Commit und Push.

## Befehle für den Nutzer

- Befehle, die der Nutzer selbst ausführen soll, immer für **PowerShell** schreiben, **ohne `&&`**, ein Befehl pro Codeblock.

## Supabase / SQL

- **Jeder SQL-Befehl, der im Supabase-SQL-Editor ausgeführt wird, liegt als Datei im Repo** unter `supabase/migrations/` (fortlaufend nummeriert: `001_economy.sql`, `002_….sql` …) und wird mit committet – nie nur im Chat oder in der Zwischenablage.
- Skripte so schreiben, dass sie gefahrlos erneut ausgeführt werden können (`create … if not exists`, `create or replace function`, Kataloge per `on conflict … do update`).
- Oben in jeder Datei vermerken, wofür sie ist und nach welcher Datei sie ausgeführt werden muss.

## Design-Grundsatz

- **Desktop first:** Layout und Spiele werden primär für große Desktop-Bildschirme gebaut; Spielfelder sollen den verfügbaren Platz groß ausnutzen. Mobil muss funktionieren, ist aber zweitrangig. Die Übersicht nutzt die Breite dynamisch (bis 2400px): Kachel-Raster mit `auto-fill` (min. 210px); Elemente eher kompakt halten (große Bildschirme). Spieleseite: `.game-stage` ist genau so hoch wie das Fenster unter der Kopfzeile; der Spielrahmen ist ein Size-Container, Spiele berechnen ihre Größe mit `cqi`/`cqh`, damit sie immer komplett sichtbar sind (nie bis zum unteren Rand).
- **Dark ist Standard**, Light per Umschalter oben rechts (gespeichert in `localStorage` unter `gamehub-theme`). Farben nur über CSS-Tokens in `:root` / `:root[data-theme="light"]`; neue UI immer in beiden Themes prüfen.
- **Illustrationsstil:** Flat Design (flache Vektorgrafik), farbige Flächen, abgerundete Formen, dezente Schatten/Glanzpunkte, kein Outline, keine Verläufe.
- **Karten:** Illustration oben in der Spielfarbe (`theme.bg`), Textbereich darunter eine Stufe dunkler (Mischung aus `bg` und `edge`).
- **Badges (NEU/BALD):** gelb bzw. hellblau; ist die Kartenfarbe der Badge-Farbe zu ähnlich, wird automatisch `badge--alt` gesetzt (Navy-Pille mit farbiger Schrift, ohne Rand, Logik in `badgeFor` in `app.js`).
- **Stil wie fontawesome.com:** heller grauer Hintergrund, Navy-Text, runde Schrift (Nunito), Karten mit dickem farbigem Rand unten, Pill-Badges (NEU/BALD), Links mit Pfeil.
- **Jede Spiele-Kachel hat eine eigene Illustration**, die zum Spiel passt (in `public/js/art.js`) und eine eigene Farbwelt (`theme` in `games.js`). Neue Spiele bekommen immer beides.
- **Spiele sollen hochwertig aussehen**, nicht nach simplen Blöcken (Vorbild Snake: Google Snake mit flüssiger Bewegung, Augen, Apfel).

## Projektstand

**Regel:** Nach jeder Änderung am Projekt diesen Abschnitt aktualisieren, damit er immer den aktuellen Stand widerspiegelt (was existiert, was in Arbeit ist, nächste Schritte).

**Aktueller Stand (2026-10-05):**
- Grundgerüst der Plattform steht: reines HTML/CSS/JS ohne Build-Schritt und ohne npm-Abhängigkeiten.
- Lokal starten: `npm run dev` (bzw. `node server.js`) → http://localhost:4177
- Online: https://n-brand.github.io/gamehub/ – GitHub Actions (`.github/workflows/pages.yml`) veröffentlicht `public/` bei jedem Push auf `main`. Pfade in `public/` müssen relativ sein (Seite läuft unter `/gamehub/`).
- Design im Font-Awesome-Stil umgesetzt (siehe Design-Grundsatz).
- Navigation in der Kopfzeile (ab 901px sichtbar): „Games“ (Controller-Icon, immer da, aktiv auf Übersicht und Spieleseiten), „Shop“ (Tasche) und „Inventar“ (Truhe) – die beiden nur mit Wirtschaft (`data-eco`, eingeblendet in `ui-economy.js`). Das Profil-Menü (Avatar) enthält nur noch den Namen (Link zum Inventar), im Demo-Modus die Demo-Knöpfe und „Abmelden“.
- Übersicht (ohne Hero-Überschrift, auf Wunsch entfernt 2026-10-05): Kategorie-Filter (mit „★ Favoriten“ als zweitem Knopf nach „Alle“; ab 901px Breite klebt die Leiste beim Scrollen unter der Kopfzeile, `.chips--sticky`, auf dem Handy bewusst nicht), alle Spiele als illustrierte Kacheln (die 4 großen Feature-Karten wurden am 2026-10-05 auf Wunsch entfernt). „Zuletzt gespielt“ (max. 5) und Favoriten stehen nicht als eigene Abschnitte auf der Startseite, sondern klappen als Liste unter dem Suchfeld auf, sobald man hineinklickt (solange noch nichts getippt ist); auf dem Handy (Suchfeld ausgeblendet) sind Favoriten über den Filter-Knopf erreichbar. Footer auf allen Seiten mit © Nicolas Brand, Datenschutz und Impressum. Favoriten lassen sich direkt auf Kacheln per Stern (oben links, erscheint beim Hovern; markierte immer sichtbar) setzen und entfernen. Alle 9 Spiele sind spielbar; neue geplante Spiele können wieder als „Bald“-Kacheln (`available: false`) eingetragen werden.
- Spieleseite: Spiel in farbigem Rahmen (Spielfarbe), Vollbild, Favorit, Beschreibung/Steuerung, ähnliche Spiele.
- **Spielmenü vor jedem Spiel** (`public/js/game-menu.js`): Illustration, Rekord, „Spielen“ (oder Enter), Level-Galerie mit eigener Farbe pro Stufe (←/→ wechselt, Auswahl gemerkt in `localStorage` unter `gamehub-menu`), Design-Galerien pro Slot (eigene Designs direkt ausrüsten, gesperrte zeigen den Preis und führen zum Shop) und die Erfolge des Spiels mit Fortschritt. „☰ Menü“ in der Kopfzeile führt während des Spiels zurück. Level-Auswahl gibt es bei Würfelsprung, Vier gewinnt (Gegner inkl. „Zu zweit“), Paare finden und Minesweeper; die Spiele selbst haben dafür keine eigenen Umschalter mehr.
- Fertige Spiele: **Watermelon Drop** (Suika-Prinzip, neutraler Name; Früchte aus der Wolke fallen lassen, zwei gleiche verschmelzen zur nächstgrößeren, 11 Stufen von Kirsche bis Wassermelone, zwei Wassermelonen verschwinden; Punkte 1, 3, 6, 10 … pro Verschmelzung; ragt eine Frucht 2,5 s über den Rand, ist die Kiste voll. Eigene Kreis-Physik mit Teilschritten, Reibung und Rollen als reine Funktionen `createWorld/dropFruit/stepWorld` – nach Physik-Änderungen **immer** `node tools/check-watermelon.mjs` ausführen (prüft Ausbrecher, Überlappung, Ruhe der Stapel, Rechenzeit). Grafik in `public/js/watermelon-art.js` (Früchte mit Gesichtern, Bälle, Planeten), Kreislauf-Anzeige, Effekte, Klänge per Web Audio, Spielstand in `localStorage` unter `gamehub-watermelon`; Shop-Designs Früchte/Mitternacht/Bälle/Planeten), **Würfelsprung** (Geometry-Dash-Prinzip, neutraler Name wegen Marke; 3 feste Level Leicht/Mittel/Schwer à ca. 30 s, immer gleich; Stacheln, Blöcke, Sprungplatten, Ringe; Fortschritt in %, Versuche, Neustart nach 0,9 s; synthetischer Beat per Web Audio; Bestwert pro Level in `localStorage` unter `gamehub-cubejump`; Shop-Themes über `api.getDesign`. Physik als reine Funktionen `buildLevel/newRun/stepRun` – nach Level-Änderungen **immer** `node tools/check-cubejump-levels.mjs` ausführen, das prüft per Suche, dass jedes Level schaffbar ist), **Blockfall** (Tetris-Prinzip; SRS-Drehung mit Wall Kicks, 7er-Beutel, Geisterstein, Halten, 3er-Vorschau, DAS/ARR, Einrast-Verzögerung, Level alle 10 Reihen, Touch-Tasten, Rekord über `api.submitScore`), **Mauerbrecher** (Breakout-Prinzip; Canvas 960×720 skaliert, 5 Level-Layouts mit harten Steinen, Kapseln: breit/mehr Bälle/Leben, Partikel, Rekord über `api.submitScore`), **Minesweeper** (9×9/16×16/30×16, erster Klick sicher, Rechtsklick/langes Drücken/Flaggen-Modus, Zahl-Klick, Aufdecken als Welle, Bestzeit pro Stufe in `localStorage` unter `gamehub-minesweeper`), **Paare finden** (Memory-Prinzip, Name wegen Ravensburger-Marke „memory“; 12/20/30 Karten, 3D-Umdrehen, Rekord = wenigste Züge pro Größe in `localStorage` unter `gamehub-pairs`), **Vier gewinnt** (gegen Computer in 4 Stärken – Leicht/Mittel/Schwer: Negamax mit Alpha-Beta, 600 ms; Ultra: Merktabelle (Zobrist), Drohungs-Logik, Paritäts-Bewertung, bis 2 s, schlägt Schwer ohne Niederlage – oder zu zweit; Berechnung im Web Worker (dieselbe Datei als Modul-Worker); Steine fallen hinter das SVG-Brett mit Löchern, Gewinnreihe leuchtet, Startspieler wechselt, Einstellungen in `localStorage` unter `gamehub-connect4`), **2048** (klassische Regeln, gleitende Kacheln mit Verschmelz-Animation, Punkte/Rekord, Sieg bei 2048 mit Weiterspielen, Spielstand wird in `localStorage` unter `gamehub-2048-state` gespeichert), **Snake** im Google-Snake-Stil (17×15 Feld, flüssige Bewegung, Augen, Apfel, Tastatur/Wischen/Touch-Buttons, Pause, lokaler Highscore).
- Zuletzt gespielt, Favoriten und lokale Rekorde bleiben im Browser (`localStorage`).
- **Mobil (2026-10-05, gemessen bei 320×568, 360×640, 375×667, 414×896 und 768×1024):** Keine Ansicht ragt über den Bildschirm, jedes Spiel passt ohne Scrollen ins Bild. Bis 900px: ☰-Knopf (`#menu-toggle`, Logik in `app.js`) klappt unter der Kopfzeile Suche (mit „Zuletzt gespielt“/Favoriten), Navigation und Hell/Dunkel auf; bis 520px wandert auch das Profil (Name, Abmelden) ins ☰-Menü (`.account { display: contents }`), damit Logo, Geschenk, Guthaben und ☰ auch angemeldet mit 99.999 Coins in 320px passen. Bis 700px: Filter als Dropdown (`dropdown()` in `public/js/ui.js`, Übersicht rechts neben der Überschrift, Shop statt der Spiel-Chips), Spieleseite einzeilig (Zurück · Titel · Icon-Knöpfe), Seitenüberschriften kleiner. Unter 360px: kein Zurück-Knopf, Kopfzeile enger. `--topbar-h` folgt der echten Kopfzeilenhöhe je Breakpoint. Im schmalen Spielrahmen stehen die Punkte (`.gp-stats`) kompakt in einer Zeile; Blockfall hat ein eigenes Raster, Vier gewinnt schmalere Spielerkarten. Vollbild: Wrapper `.game-fs` (Rahmen + „Vollbild beenden“-Knopf, nur im Vollbild sichtbar, weil es auf dem Handy kein Esc gibt); auf dem iPhone (kein Element-Vollbild) ist der Vollbild-Knopf ausgeblendet. Favorit-Knopf ist aktiv gelb gefüllt (`.btn.is-on`). Noch nicht auf einem echten Gerät angefasst (Touch-Gefühl, Klänge, echtes Vollbild – der Test-Browser unterstützt kein Vollbild).
- **Coins, Diamanten, Glücksrad, Erfolge und Shop** (erste Version gebaut, Spec: `docs/superpowers/specs/2026-10-04-coins-shop-design.md`): Supabase-Backend mit Google-Login; alle 9 Spiele melden Runden über `api.reportResult` (Würfelsprung nur geschaffte Level), Snake, Würfelsprung und Watermelon Drop nutzen Shop-Designs über `api.getDesign(slot)`. Designs liegen in Slots (`shop_items.slot`, `equipped` je `(user_id, slot)`): `snake`, `cubejump-theme` (9 Umgebungen), `cubejump-skin` (15 Würfel-Skins: Klassisch, Feuer, Eiswürfel, Schleim, Roboter, Ninja, Diamant, König, Pirat, Alien, Katze, Panda, Kürbis, Magma und exklusiv Galaxie; Theme und Skin frei kombinierbar) und `watermelon` (Früchte, Mitternacht, Bälle, Planeten). Nach Änderungen an Spielen, Preisen oder Erfolgen das SQL-Skript in Supabase erneut ausführen und den Katalog in `demo-backend.js` mitziehen. **Noch nicht live:** Der Nutzer muss das Supabase-Projekt anlegen und Google-Login einrichten (Anleitung `docs/supabase-setup.md`), dann `public/js/config.js` füllen. Ohne Konfiguration ist alles ausgeblendet; zum Ausprobieren `?demo=1` an die Adresse hängen (Demo-Backend im Browser; seit Supabase eingerichtet ist, nur noch auf localhost); `?demo=alles` startet angemeldet mit allen Designs und 99.999 Coins/999 Diamanten; im Demo-Profil-Menü „Alles freischalten“ und „Demo zurücksetzen“. Der Nutzer will die Werte (Coins, Preise, Chancen) nach dem Test selbst anpassen.
- **In Arbeit: Supabase-Einrichtung** (2026-10-05): Projekt „GameHub“ in der privaten Organisation „Nicolas Brand“ angelegt (Free, Region Europe). „Automatically expose new tables“ bleibt an, weil das SQL keine eigenen `grant select` auf Tabellen vergibt. `001_economy.sql` wurde erfolgreich ausgeführt. Google-Login eingerichtet (Google-Cloud-Projekt „GameHub“, Consent Screen im Modus „Testing“ mit dem Nutzer als Testnutzer, OAuth-Client „Webanwendung“ mit Quellen `https://n-brand.github.io` und `http://localhost:4177`, Provider in Supabase aktiv). `public/js/config.js` ist gefüllt (Project URL + Publishable Key), der echte Google-Login funktioniert lokal. Als Nächstes: Push, damit es live ist; später App auf „In production“ stellen und den Google-Clientschlüssel erneuern (er stand im Chat-Verlauf).

- **Shop 2.0 gebaut** (2026-10-05, Spec `docs/superpowers/specs/2026-10-05-shop-v2-design.md`): Shop (`#/shop`) zeigt nur Nicht-Besessenes als kompakte Kacheln (PC bis 7 pro Reihe, Handy 2), Angebote oben, je Spiel ein Abschnitt, dann „Diamanten tauschen“ (Pakete 1/5/10/25 mit 0/10/20/30 % Bonus, Grundkurs 150) und ganz unten „Creator-Code“. Klick auf eine Kachel → Detailansicht (Kaufen zum angezeigten Preis, danach „Ausrüsten“ / „Zurück zum Shop“, kein Auto-Ausrüsten). Rabatt pro Artikel (`sale_percent`, `sale_until`) mit Badge, durchgestrichenem Preis und Restzeit. Hervorhebung pro Artikel (`shop_items.highlight`, z. B. „Beliebt“ bei Snake „Neon“): gelber Rand + Schild oben auf der Kachel und in der Detailansicht. Creator-Codes (pro Spieler einmal, optional Ablauf/Höchstzahl) geben Designs und/oder Coins/Diamanten; exklusive Designs (`exclusive`) nie im Shop/kaufbar, Start: Galaxie-Set (Snake-Design, Würfelsprung-Theme und Würfel-Skin `cube-galaxy` mit Sternen) und Code `GAMEHUB`. **Inventar** `#/inventar` (Navigation oben, ersetzt die frühere Erfolge-Seite und das Profil; `#/profil` und `#/erfolge` leiten dorthin weiter, `#/erfolge` springt zu den Erfolgen): Profilbild, Name, Kontostand, „Meine Designs“ (alle eigenen Designs zum Ausrüsten) und „Erfolge“ – beide als Aufklapper, bei jedem Öffnen eingeklappt (über `#/erfolge` sind die Erfolge offen; eingeklappt zeigt die Überschrift „N zum Abholen“) – (kompakte Karten, PC 4 Spalten, Balken und Zahl in einer Zeile). **Belohnungen werden manuell abgeholt** (`003_achievement_claims.sql`): beim Freischalten kurze Meldung (PC unten rechts, Handy oben unter der Kopfzeile, damit sie im Spiel keine Touch-Tasten verdeckt) mit „Zum Inventar“, gelber Punkt an „Inventar“ (Handy: am ☰-Knopf), bis alles abgeholt ist; im Inventar gelb umrandete Karten mit „Abholen“, ab 2 wartenden „Alle abholen“; im Spielmenü „Abholen“-Schild. Einblendungen ersetzen sich per `key` und sind auf 3 begrenzt. Spielmenü: exklusive Designs nur im Besitz, gesperrte Designs mit Rabattpreis und Klick → `#/shop/<id>`. Getestet: `node tools/check-shop.mjs` (34 Prüfungen), alle Abläufe im Demo-Modus am PC und bei 320–414px (kein Überlauf). **Offen:** `supabase/migrations/002_shop.sql` in Supabase ausführen (bis dahin blendet der Shop Tausch/Code aus, Kauf fällt auf das alte `buy_item` zurück), dann mit echtem Login testen und pushen (die Live-Seite hat bis zum Push den alten Shop, der die Galaxie-Designs nach 002 fälschlich als gratis zeigt).
- **Neue Designs** (2026-10-05, `004_new_skins.sql`): Snake „Tiger“/„Lava“, Themes „Wüste“/„Synthwave“, Würfel „Pirat“, „Alien“, „Katze“, „Panda“, „Kürbis“ und „Magma“. Neu gestaltet (nur `designs.js`, kein SQL nötig – die Datenbank kennt nur Name, Preis, Besitz): **Ninja** (Kapuze/Maske mit Sehschlitz, rotes Stirnband mit drehendem Wurfstern, zwei wehende Bänder) und **Feuer** (flackernde Flammenkrone und aufsteigende Glut werden ohne die Würfeldrehung gezeichnet und lodern so auch im Salto nach oben; Hitzeverlauf zur Oberseite in der Welt, glühende Pupillen, freches Grinsen). `tools/check-shop.mjs` prüft mit einem aufzeichnenden Canvas, dass jedes Würfel-Merkmal (Augen, Mund, Muster, Glut, Funkeln) auch gezeichnet wird und die Feuer-Flammen bei jeder Drehung oben bleiben. Der Schließen-Knopf der Fenster liegt über dem Vorschaubild (vorher verdeckte das Bild ihn in der Detailansicht, auf dem Handy fast ganz). **Offen:** aktuelle `004_new_skins.sql` in Supabase ausführen (wiederholbar; am 2026-10-05 mit den vier neuen Würfeln in die Zwischenablage kopiert).
- **Ausprobieren** (2026-10-05): In der Detailansicht steht bei nicht gekauften Designs „▶ Ausprobieren“ (auch ohne Anmeldung oder mit zu wenig Guthaben, nie bei exklusiven) → `#/game/<spiel>/probe/<design>`. Das Spiel startet ohne Spielmenü auf der leichtesten Stufe, das Probe-Design gilt nur in seinem Slot (beim Würfel-Skin bleibt z. B. das ausgerüstete Theme). Über dem Spielfeld die Leiste „PROBE <Name> · ohne Coins und Erfolge“ mit Restzeit und „Kaufen“; der Zurück-Link führt zum Shop. Runden werden nicht gemeldet (keine Coins, keine Erfolge, zählt nicht als „zuletzt gespielt“; lokale Rekorde der Spiele bleiben möglich). Nach einer gemeldeten Runde (1,5 s später, damit man das Ende sieht) oder nach 60 s – die Uhr läuft erst ab dem ersten Klick/Tastendruck – ersetzt die Karte „Gefällt dir …?“ (Preis, „Jetzt kaufen“ → Detailansicht, „Zurück zum Shop“) das Spiel. Würfelsprung meldet nur geschaffte Level, dort endet die Probe meist über die Zeit. Logik in `public/js/trial.js`, getestet in `tools/check-shop.mjs`; Ablauf im Demo-Modus am PC und bei 320/375 px geprüft (Zeit-Ende mit Würfelsprung, Runden-Ende mit Snake, Kontostand unverändert).

- **Datenschutzerklärung als eigene Seite** (2026-10-06): Google prüft für den OAuth-Zustimmungsbildschirm (Branding-Überprüfung) die Startseite und `https://n-brand.github.io/gamehub/datenschutz.html` direkt – Hash-Adressen wie `#/datenschutz` findet die Prüfung nicht. Deshalb liegt die Datenschutzerklärung als statische Seite in `public/datenschutz.html` (GameHub-Design über `css/style.css`, ohne JavaScript; Inhalt = frühere Fassung aus `legal.js` plus Angaben für Google: abgefragte Berechtigungen openid/email/profile, Verwendungszweck, keine Weitergabe/kein Verkauf, Google API Services User Data Policy inkl. Limited Use, Widerruf über myaccount.google.com/connections, Löschung binnen 30 Tagen). `#/datenschutz` leitet per `location.replace` dorthin weiter; `legal.js` enthält nur noch das Impressum (mit Verweis). Startseite: Footer-Link `datenschutz.html` steht statisch im HTML, zusätzlich `<link rel="privacy-policy">` mit der vollen Adresse im Kopf. Wichtig: Nur `public/` wird veröffentlicht – Dateien im Repo-Hauptordner sind online nicht erreichbar (daran scheiterte die erste Fassung im Hauptordner mit „reagiert nicht“). Ausprobiert lokal am PC und bei 375 px, hell/dunkel. **Offen:** Kontakt-E-Mail statt Platzhalter eintragen; Eigentümerschaft der Startseite in der Google Search Console bestätigen (URL-Präfix `https://n-brand.github.io/gamehub/`, Methode HTML-Tag → Meta-Tag `google-site-verification` in `public/index.html`; den Code muss der Nutzer liefern), danach in der Google Cloud Console die Überprüfung erneut anstoßen (Google: 24 h nach der Bestätigung warten).
- Supabase: Der Nutzer hat am 2026-10-06 `alter function public.int_from set search_path = ''` ausgeführt (Sicherheitshinweis „Function Search Path Mutable“) → festgehalten als `005_int_from_search_path.sql`; `001` legt `int_from` jetzt gleich mit festem `search_path` an.

**Offene Punkte:**
- **Nächstes Spiel: Level-Devil-Prinzip** (vom Nutzer gewünscht, noch nicht begonnen): Plattformer, bei dem sich das Level hinterhältig verändert (Boden bricht weg, Stacheln tauchen auf, das Ziel weicht aus). Neutralen Namen wählen, „Level Devil“ ist ein bestehendes Spiel. Wie die anderen Spiele: Katalog-Eintrag mit Illustration, Spielmenü (Level), `reportResult`, Regeln/Erfolge in SQL und Demo-Backend, „Allrounder“ auf 10 Spiele.
- **Supabase einrichten** (macht der Nutzer, Anleitung `docs/supabase-setup.md`): Projekt, SQL, Google-Login und `config.js` sind erledigt (2026-10-05). Login lokal getestet. Offen: Consent Screen auf „In production“ stellen (sonst können sich nur Testnutzer anmelden), Google-Clientschlüssel erneuern. Nach späteren Änderungen am SQL-Skript (Preise, Erfolge, neue Spiele) die aktuelle Fassung erneut im SQL-Editor ausführen.
- **Werte anpassen** (Coins pro Spiel, Preise, Glücksrad-Chancen): will der Nutzer nach dem Testen selbst machen.
- **Impressum/Datenschutz ausfüllen**: Footer auf allen Seiten (© Nicolas Brand, Links `datenschutz.html` und `#/impressum`; Datenschutz in `public/datenschutz.html`, Impressum in `public/js/legal.js`) ist gebaut. Offen: Anschrift und E-Mail in den gelb markierten Platzhaltern (`<mark>`) eintragen – E-Mail in beiden Dateien, Anschrift nur im Impressum –, Supabase-DPA im Dashboard abschließen (Text erwähnt einen Auftragsverarbeitungsvertrag), Angaben prüfen. Erst danach Google-Login auf „In production“ stellen. Optional: Nunito selbst hosten statt Google Fonts (vermeidet IP-Übertragung an Google).
- **Watermelon Drop**: Klänge auf einem echten Gerät anhören (im Test-Browser nicht hörbar).
- **Idee: Eigene Illustration für jeden Erfolg** (vom Nutzer gewünscht, später): statt des einheitlichen Pokal-Symbols pro Erfolg ein eigenes, cooles Motiv im Flat-Stil der Seite (z. B. Schlange mit Apfel für „Hungrig“, 2048-Kachel für „Geschafft!“, Wassermelone für „Melonenmeister“), freigeschaltet farbig, gesperrt ausgegraut. Umsetzungsidee: SVG pro Erfolg-ID in einem eigenen Modul (wie `art.js`), genutzt im Inventar, im Spielmenü und in der Einblendung beim Freischalten.
- **Idee: Video-Vorschau beim Hovern** (vom Nutzer gewünscht, noch nicht begonnen): Fährt man mit der Maus über eine Spiele-Kachel, spielt statt der Illustration ein kurzer Clip aus dem Spiel (ca. 5 Sekunden, Schleife, ohne Ton). Umsetzungsidee: pro Spiel ein kleines Video (WebM/MP4, wenige 100 KB) in `public/videos/`, erst beim Hovern laden (`preload="none"`, `muted`, `loop`, `playsinline`), Illustration bleibt als Standbild davor und blendet weich über; Clips direkt aus dem Spiel aufnehmen (Canvas `captureStream()` + `MediaRecorder`) oder per Bildschirmaufnahme. Auf dem Handy gibt es kein Hovern – dort weglassen (oder später beim Antippen im Spielmenü zeigen); bei `prefers-reduced-motion` nicht abspielen.
- Später: Designs für weitere Spiele (2048, Blockfall, Mauerbrecher …), geräteübergreifende Favoriten/„Zuletzt gespielt“, Bestenlisten, Multiplayer.

**Aufbau:**
- `server.js` – minimaler Dev-Server, liefert `public/` aus
- `public/index.html` – Single Page, Hash-Routing (`#/` Übersicht, `#/game/<id>` Spiel, `#/game/<id>/probe/<design>` Probe-Runde)
- `public/js/app.js` – Übersicht, Spieleseite, Routing
- `public/js/games.js` – Spiele-Katalog (neues Spiel hier eintragen); optional `levels` (Galerie im Menü, jede Stufe mit `color`/`ink`) und `slots` (Design-Plätze im Menü/Shop)
- `public/js/game-menu.js` – Menü vor jedem Spiel (Level, Designs, Erfolge)
- `public/js/legal.js` – Impressum (`#/impressum`)
- `public/datenschutz.html` – Datenschutzerklärung als eigene Seite ohne # (für Google-OAuth-Prüfung und Suchmaschinen); `#/datenschutz` leitet hierher weiter
- `public/js/ui.js` – gemeinsame Bausteine der Oberfläche (Dropdown für Filter auf dem Handy, feuert `dropdown-change`)
- `public/js/storage.js` – localStorage (zuletzt gespielt, Favoriten, Highscores)
- `public/games/<id>.js` – ein Modul pro Spiel; exportiert `mount(container, api)` und gibt eine Cleanup-Funktion zurück
- `public/js/art.js` – SVG-Illustration pro Spiel für Kacheln und Spielmenü
- Gemeinsame Spiel-Bausteine in `style.css` (`.gp`, `.gp-panel`, `.gp-stats`, `.gp-seg`, `.gp-overlay` …): Bedienfeld neben dem Spielfeld, wird bei schmalem Rahmen per Container-Query darübergesetzt. Neue Spiele nutzen diese Bausteine.
- `public/thumbs/` – Favicon
- `public/js/config.js` – Supabase-URL und öffentlicher Anon-Key (leer = Wirtschaft ausgeblendet)
- `public/js/economy.js` – einziges Modul mit Backend-Zugriff (Login, Kontostand, reportResult, Glücksrad, `buy` zum erwarteten Preis, `equip`, `exchange`, `redeemCode`, `reloadCatalog`); Katalog inkl. Tauschpakete und Kurs; Ereignisse für die Oberfläche
- `public/js/format.js` – Zahlenformat: `fmt` (1.250) und `fmtShort` für den Kontostand in der Kopfzeile (bis 9.999 voll, dann 12,4K / 100K / 1,2M – Stellen werden abgeschnitten, nie gerundet, z. B. 99.999 → 99,9K; volle Zahl im Tooltip)
- `public/js/pricing.js` – reine Preisfunktionen (Gratis/Rabatt/Restzeit/Paket-Coins), genutzt von Shop, Spielmenü, Profil und Demo-Backend
- `public/js/ui-economy.js` – Kopfzeile (Kontostand, Geschenk-Symbol für den täglichen Bonus/Glücksrad, Login, Profil-Menü), Einblendungen, Fenster (`openModal` mit `onClose`, `loginPrompt`), Glücksrad-Fenster, Erfolge-Liste (`achievementsHtml`, `achievementSummary`)
- `public/js/shop.js` – Shop `#/shop` und `#/shop/<id>` (Kacheln, Angebote, Detailansicht, Diamanten-Tausch, Creator-Code samt Ergebnis-Fenster); exportiert `priceHtml`, `saleBadge`, `itemMeta`
- `public/js/inventory.js` – Inventar `#/inventar` (Kontostand, „Meine Designs“, Erfolge)
- `public/js/trial.js` – Probe-Runde („Ausprobieren“): `trialApi` (Probe-Design im eigenen Slot, Runden beenden die Probe statt Coins zu geben), `trialHash`, `TRIAL_SECONDS`; Leiste, Uhr und Abschluss-Karte in `app.js`
- `public/js/designs.js` – Aussehen der Shop-Designs/Themes (Spiel und Shop-Vorschau; `drawPreview` wählt passend zum Spiel, `isAnimated` für bewegte Vorschauen). Würfel-Skins bestehen aus Merkmalen (`eyes`, `mouth`, `deco`, `embers`, `sparkle` … – Liste im Kommentar über `CUBE_SKINS`); `drawCube` zeichnet Feuer-Flammen und Glut ohne die Drehung, alles andere dreht mit
- `tools/check-cubejump-levels.mjs` – prüft, dass alle Würfelsprung-Level schaffbar sind
- `tools/check-watermelon.mjs` – prüft die Physik von Watermelon Drop (6 Läufe mit festem Zufall)
- `public/js/watermelon-art.js` – Motive (Früchte, Bälle, Planeten), Kiste, Wolke und Shop-Vorschau von Watermelon Drop
- `public/js/demo-backend.js` – Demo-Backend für `?demo=1` (Kataloge und Regeln bei Änderungen am SQL mitziehen; exportiert `DEMO_CATALOG` für Tests)
- `tools/check-shop.mjs` – prüft Preise/Rabatte/Pakete, die Shop-Funktionen des Demo-Backends und das Zeichnen der Würfel (aufzeichnender Canvas) – nach Änderungen an Shop-Regeln oder Designs **immer** ausführen
- `supabase/migrations/001_economy.sql` – Tabellen, RLS, Server-Funktionen (`report_result`, `claim_daily_spin`, `buy_item`, `equip_item`), Kataloge; im Supabase-SQL-Editor ausführen
- `supabase/migrations/004_new_skins.sql` – neue Shop-Designs (nach 003): Snake „Tiger“ (500 Coins) und „Lava“ (6 Diamanten), Würfelsprung-Themes „Wüste“ (500) und „Synthwave“ (900), Würfel-Skins „Pirat“ (600, Augenklappe + Kopftuch), „Alien“ (6 Diamanten, Antennen), „Katze“ (400), „Panda“ (600), „Kürbis“ (500) und „Magma“ (7 Diamanten); `tools/check-shop.mjs` prüft, dass jedes Katalog-Design ein Aussehen in `designs.js`/`watermelon-art.js` hat
- `supabase/migrations/005_int_from_search_path.sql` – fester, leerer `search_path` für `public.int_from` (nach 001–004; vom Nutzer am 2026-10-06 ausgeführt)
- `supabase/migrations/003_achievement_claims.sql` – Erfolge manuell abholen (nach 002): `user_achievements.reward_pending`/`claimed_at`, `check_achievements` schreibt nicht mehr sofort gut, neues `claim_achievement(p_achievement)`; doppelte Auszahlung ausgeschlossen (nur `reward_pending` lässt sich abholen)
- `supabase/migrations/002_shop.sql` – Shop 2.0 (nach 001): Rabatt-/Exklusiv-Spalten, `shop_settings`, `exchange_packages`, `creator_codes` (für Spieler nicht lesbar), `code_redemptions`, neues `buy_item(p_item, p_coins, p_diamonds)`, `equip_item`, `exchange_diamonds`, `redeem_code`, Schutz-Trigger für exklusive Designs; oben in der Datei Beispiele für Rabatte und Codes
- Spiel-API (`mount(container, api)`): `getHighscore`, `submitScore` (lokal), `reportResult({ result, difficulty, score, durationMs, extra })`, `getDesign(slot = Spiel-ID)`, `level` (im Menü gewählte Stufe). Spiele mit Leveln exportieren zusätzlich `levelStats()` → `{ levelId: 'Bestwert …' }` für die Menü-Karten.

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
