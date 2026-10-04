# Supabase einrichten (Coins, Glücksrad, Erfolge, Shop, Google-Login)

Dauer: etwa 20–30 Minuten. Alles läuft im kostenlosen Tarif.

> **Vorher ausprobieren:** Mit `?demo=1` an der Adresse (z. B. `http://localhost:4177/?demo=1`) läuft
> alles mit einem Demo-Backend im Browser – ohne Supabase und ohne echten Login.

## 1. Supabase-Projekt anlegen

1. Auf <https://supabase.com> anmelden (z. B. mit GitHub) und **New project** wählen.
2. Name: `gamehub`, Region: **Central EU (Frankfurt)**.
3. Ein sicheres Datenbank-Passwort erzeugen und gut aufbewahren (wird für die Webseite nicht gebraucht).
4. Warten, bis das Projekt fertig ist (1–2 Minuten).

## 2. Datenbank anlegen

1. Im Supabase-Dashboard links **SQL Editor** öffnen → **New query**.
2. Den kompletten Inhalt von [`supabase/migrations/001_economy.sql`](../supabase/migrations/001_economy.sql) einfügen.
3. **Run** klicken. Erwartet: „Success. No rows returned“.
4. Unter **Table Editor** sollten jetzt Tabellen wie `profiles`, `shop_items` und `achievements` stehen.

Das Skript kann später erneut ausgeführt werden (z. B. nach Änderungen an Preisen oder Erfolgen) – die
Kataloge werden dabei aktualisiert, Spielerdaten bleiben erhalten.

## 3. Google-Login einrichten

### 3a. Google Cloud

1. <https://console.cloud.google.com> öffnen, oben ein **neues Projekt** anlegen (Name z. B. `GameHub`).
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
4. Glücksrad oben in der Kopfzeile drehen, im **Shop** ein Snake-Design kaufen.

Nach dem Push auf `main` ist alles auch unter <https://n-brand.github.io/gamehub/> aktiv.

## Gut zu wissen

- **Pausierung:** Kostenlose Supabase-Projekte pausieren nach ca. einer Woche ohne Aktivität. Im Dashboard
  lässt sich das Projekt mit einem Klick wieder starten; die Daten bleiben erhalten.
- **Datenschutz:** Mit Google-Login werden personenbezogene Daten verarbeitet (Name, E-Mail, Profilbild).
  Für eine öffentliche Seite ist eine Datenschutzerklärung nötig.
- **Werte anpassen:** Coins pro Spiel, Glücksrad-Chancen, Erfolge und Preise stehen in den Tabellen
  `reward_rules`, `wheel_segments`, `achievements` und `shop_items` (direkt im Table Editor änderbar oder
  im SQL-Skript). Wie ein Design aussieht, steht in `public/js/designs.js`.
