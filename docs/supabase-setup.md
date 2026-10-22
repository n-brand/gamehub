# Supabase einrichten (Coins, Glücksrad, Erfolge, Shop, Google-Login)

Dauer: etwa 20–30 Minuten. Alles läuft im kostenlosen Tarif.

> **Vorher ausprobieren:** Mit `?demo=1` an der Adresse (z. B. `http://localhost:4177/?demo=1`) läuft
> alles mit einem Demo-Backend im Browser – ohne Supabase und ohne echten Login. Ist Supabase schon
> eingerichtet, funktioniert das nur lokal (localhost); auf der Live-Seite wird `?demo` ignoriert.
> Mit `?demo=alles` startet die Demo angemeldet, mit allen Designs und reichlich Coins und Diamanten.
> Im Profil-Menü der Demo gibt es außerdem „Alles freischalten“ und „Demo zurücksetzen“.

## 1. Supabase-Projekt anlegen

1. Auf <https://supabase.com> anmelden (z. B. mit GitHub) und **New project** wählen.
2. Name: `gamehub`, Region: **Central EU (Frankfurt)**.
3. Ein sicheres Datenbank-Passwort erzeugen und gut aufbewahren (wird für die Webseite nicht gebraucht).
4. Unter **Security** „Enable Data API“ **eingeschaltet lassen**. „Automatically expose new tables“ ist für
   GameHub egal: das SQL vergibt die Leserechte im Schema `gamehub` selbst (`999_gamehub_schema.sql`),
   geschützt über Row Level Security. „Enable automatic RLS“ ist egal, die GitHub-Verknüpfung leer lassen.
5. Warten, bis das Projekt fertig ist (1–2 Minuten).

## 2. Datenbank anlegen

Die Datenbank kann von mehreren Projekten genutzt werden. GameHub legt alles im eigenen Schema
**`gamehub`** an (nicht in `public`), Übersicht der Tabellen: [`docs/datenbank.md`](datenbank.md).
Gibt es schon ein Supabase-Projekt für andere Projekte, Abschnitt 1 überspringen und dieses verwenden.

Alle Migrationen (`supabase/migrations/001_…` bis `999_…`) werden **zusammen** ausgeführt – als eine
Transaktion: bricht etwas ab, bleibt die Datenbank unverändert.

1. Skript erzeugen und in die Zwischenablage kopieren (PowerShell):

   ```powershell
   node C:\Source\gamehub\tools\sql-bundle.mjs
   ```

   ```powershell
   Get-Content C:\Source\gamehub\supabase\bundle.sql -Raw -Encoding UTF8 | Set-Clipboard
   ```

2. Im Supabase-Dashboard links **SQL Editor** → **New query** → einfügen → **Run**.
   Erwartet: „Success. No rows returned“.
3. **Schema freigeben:** **Project Settings → Data API** → **Exposed schemas** → `gamehub` hinzufügen und
   speichern. Ohne diesen Schritt meldet die Webseite „schema must be one of …“.
   (Supabase benennt die Menüpunkte gelegentlich um.)
4. Unter **Table Editor** oben das Schema `gamehub` wählen – dort stehen die Tabellen mit Beschreibungen.

**Probelauf:** `node C:\Source\gamehub\tools\sql-bundle.mjs --probe` erzeugt dasselbe Skript, das am Ende
absichtlich mit „PROBELAUF OK – nichts gespeichert …“ abbricht. So lässt sich jede Änderung gefahrlos testen.

**Erneut ausführen** (nach Änderungen an Preisen, Erfolgen, neuen Spielen): wie oben. Achtung: `001` setzt die
Kataloge (Preise, Coins pro Spiel, Erfolge) auf die Werte im SQL zurück; Rabatte, Schilder, Tauschkurs und
Spielerdaten bleiben erhalten. Wer Werte direkt im Table Editor ändert, trägt sie auch im SQL nach.

### Umzug einer bestehenden Datenbank von `public` nach `gamehub` (einmalig)

Für die Live-Datenbank, in der GameHub bis 2026-10 in `public` lag. Verschiebt alle Tabellen samt Daten,
entfernt die alten Funktionen und legt alles in `gamehub` neu an.

1. Probelauf: `node C:\Source\gamehub\tools\sql-bundle.mjs --umzug --probe`, kopieren, ausführen.
   Erwartet ist eine Fehlermeldung, die mit „PROBELAUF OK“ beginnt (mit Anzahl Tabellen und Spieler).
   Jede andere Fehlermeldung: nichts wurde geändert, Meldung an Claude geben.
2. Echt: `node C:\Source\gamehub\tools\sql-bundle.mjs --umzug`, kopieren, ausführen.
3. Sofort `gamehub` bei **Exposed schemas** eintragen und die neue Webseite pushen. Bis dahin funktionieren
   Login-Funktionen der Live-Seite nicht (sie sucht die Tabellen noch in `public`); Spiele laufen weiter.
4. Zurück (nur falls nach dem echten Lauf etwas nicht stimmt): Tabellen mit
   `alter table gamehub.<name> set schema public` zurückschieben, dann die alten Dateien `001`–`005` aus dem
   Git-Stand vor dem Umzug (Commit `0732796`) nacheinander ausführen und die Webseite auf denselben Stand
   zurücksetzen. Bricht der Lauf selbst ab, ist nichts zu tun – die Transaktion nimmt alles zurück.

## 3. Google-Login einrichten

### 3a. Google Cloud

1. <https://console.cloud.google.com/projectcreate> öffnen und ein **neues Projekt** anlegen (Name z. B. `GameHub`).
   Das Angebot „Google Cloud mit 300 $ Guthaben testen“ **nicht** annehmen: Für den Login sind weder
   der Testzeitraum noch eine Kreditkarte nötig.
2. **APIs & Services → OAuth consent screen** (bzw. „Google Auth Platform“):
   - App-Name `GameHub`, Support-E-Mail auswählen, Zielgruppe **External**.
   - Solange die App im Modus „Testing“ ist, können sich nur eingetragene **Test users** anmelden –
     dort die eigene Google-Adresse eintragen. Für alle Besucher: App auf **In production** stellen
     (für die Standard-Berechtigungen Name/E-Mail ist keine Prüfung durch Google nötig).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://n-brand.github.io` und `http://localhost:4177`
   - Authorized redirect URIs: die **Callback URL** aus Supabase (Schritt 3b, Form
     `https://<projekt-id>.supabase.co/auth/v1/callback`)
4. **Client ID** und **Client Secret** kopieren.

### 3b. Supabase

1. **Authentication → Sign In / Providers → Google**: aktivieren, Client ID und Client Secret einfügen,
   speichern. Hier steht auch die **Callback URL** für Schritt 3a.
2. **Authentication → URL Configuration**:
   - Site URL: `https://n-brand.github.io/gamehub/`
   - Redirect URLs: `https://n-brand.github.io/gamehub/**` und `http://localhost:4177/**`

## 4. Webseite verbinden

1. Im Supabase-Dashboard **Project Settings → API** (bzw. „API Keys“) öffnen.
2. **Project URL** und den **anon / publishable**-Schlüssel kopieren.
3. In [`public/js/config.js`](../public/js/config.js) eintragen:

   ```js
   export const SUPABASE_URL = 'https://<projekt-id>.supabase.co';
   export const SUPABASE_ANON_KEY = '<anon-key>';
   ```

   Der Anon-/Publishable-Key ist für den Browser gedacht und darf öffentlich im Repo stehen; die Daten
   schützt Row Level Security. **Den `service_role`- bzw. Secret-Key niemals eintragen.**

## 5. Testen

1. Lokal starten (`node server.js`) und <http://localhost:4177> öffnen.
2. **Mit Google anmelden** → nach dem Login stehen oben Coins und Diamanten.
3. Eine Runde spielen → unten rechts erscheint „+… Coins“.
4. Glücksrad oben in der Kopfzeile drehen, im **Shop** ein Design kaufen und in der Detailansicht ausrüsten.
5. Ganz unten im Shop den Code `GAMEHUB` einlösen → zwei exklusive Galaxie-Designs und 300 Coins;
   im **Profil** (Menü oben rechts) erscheinen sie unter „Meine Sammlung“.
6. Mit Diamanten (z. B. vom Glücksrad) ein Paket unter „Diamanten tauschen“ eintauschen.

Nach dem Push auf `main` ist alles auch unter <https://n-brand.github.io/gamehub/> aktiv.

## 3b. Discord-Login zusätzlich einrichten (optional)

Der Code ist vorbereitet. Solange `LOGIN_PROVIDERS` in `public/js/config.js` nur `['google']` enthält, ändert sich nichts.

1. <https://discord.com/developers/applications> → **New Application** (Name `GameHub`).
2. **OAuth2**: Client ID kopieren, **Reset Secret** → Client Secret kopieren (nicht in den Chat oder ins Repo).
3. Unter **Redirects** die Callback-URL aus Supabase eintragen: `https://<project-ref>.supabase.co/auth/v1/callback`
   (steht in Supabase unter Authentication → Sign In / Providers → Discord).
4. Supabase → **Authentication → Sign In / Providers → Discord**: aktivieren, Client ID und Client Secret einfügen, speichern.
5. In `public/js/config.js` `LOGIN_PROVIDERS = ['google', 'discord']` setzen. Danach öffnet „Anmelden“ eine Auswahl.
6. `public/datenschutz.html` um einen Abschnitt zur Anmeldung mit Discord ergänzen (Discord Inc. als Anbieter, übermittelt
   Kennung, Name, E-Mail, Profilbild; Widerruf unter Discord → Einstellungen → Autorisierte Apps), bevor Discord live geht.

Hinweis: Supabase verknüpft Konten mit gleicher bestätigter E-Mail-Adresse automatisch. Wer sich mit Google und Discord
(gleiche Adresse) anmeldet, landet im selben Spielerkonto. Name und Bild kommen aus den Discord-Angaben (`user_metadata`),
der Code liest sie schon provider-unabhängig.

## Gut zu wissen

- **Pausierung:** Kostenlose Supabase-Projekte pausieren nach ca. einer Woche ohne Aktivität. Im Dashboard
  lässt sich das Projekt mit einem Klick wieder starten; die Daten bleiben erhalten.
- **Datenschutz:** Mit Google-Login werden personenbezogene Daten verarbeitet (Name, E-Mail, Profilbild).
  Für eine öffentliche Seite ist eine Datenschutzerklärung nötig.
- **Werte anpassen:** Coins pro Spiel, Glücksrad-Chancen, Erfolge und Preise stehen im Schema `gamehub` in den Tabellen
  `reward_rules`, `wheel_segments`, `achievements` und `shop_items` (direkt im Table Editor änderbar oder
  im SQL-Skript), Tauschkurs und Pakete in `shop_settings` und `exchange_packages`, Codes in
  `creator_codes`. Wie ein Design aussieht, steht in `public/js/designs.js`.
