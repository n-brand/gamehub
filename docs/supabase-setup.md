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
4. Unter **Security** „Enable Data API“ **und** „Automatically expose new tables“ **eingeschaltet lassen**:
   Das SQL-Skript vergibt keine eigenen Leserechte (`grant select`) auf die Tabellen. Geschützt sind die
   Daten trotzdem über Row Level Security, die das Skript für jede Tabelle einschaltet.
   „Enable automatic RLS“ ist egal, die GitHub-Verknüpfung leer lassen.
5. Warten, bis das Projekt fertig ist (1–2 Minuten).

## 2. Datenbank anlegen

1. Im Supabase-Dashboard links **SQL Editor** öffnen → **New query**.
2. Den kompletten Inhalt von [`supabase/migrations/001_economy.sql`](../supabase/migrations/001_economy.sql) einfügen.
3. **Run** klicken. Erwartet: „Success. No rows returned“.
4. Unter **Table Editor** sollten jetzt Tabellen wie `profiles`, `shop_items` und `achievements` stehen.

Das Skript kann später erneut ausgeführt werden (z. B. nach Änderungen an Preisen oder Erfolgen) – die
Kataloge werden dabei aktualisiert, Spielerdaten bleiben erhalten.

5. Danach genauso [`supabase/migrations/002_shop.sql`](../supabase/migrations/002_shop.sql) ausführen
   (Shop 2.0: Rabatte, Diamanten-Tausch in Paketen, Creator-Codes, exklusive Designs). Erwartet ebenfalls
   „Success. No rows returned“; danach gibt es u. a. die Tabellen `exchange_packages` und `creator_codes`.

6. Danach [`supabase/migrations/003_achievement_claims.sql`](../supabase/migrations/003_achievement_claims.sql)
   ausführen: Erfolgs-Belohnungen werden nicht mehr sofort gutgeschrieben, sondern im Inventar abgeholt.

7. Danach [`supabase/migrations/004_new_skins.sql`](../supabase/migrations/004_new_skins.sql) ausführen (neue Shop-Designs).

8. Danach [`supabase/migrations/005_int_from_search_path.sql`](../supabase/migrations/005_int_from_search_path.sql)
   ausführen (fester `search_path` für eine Hilfsfunktion – behebt den Sicherheitshinweis „Function Search Path Mutable“).

**Reihenfolge:** Immer `001`, `002`, `003`, `004`, dann `005`. Wer `001` erneut ausführt, führt danach auch `002`
bis `005` erneut aus.
Alle SQL-Befehle liegen im Repo unter `supabase/migrations/`.

### Shop-Werte selbst ändern (SQL Editor)

```sql
-- Rabatt: 30 % auf Snake „Neon“ für 3 Tage
update public.shop_items set sale_percent = 30, sale_until = now() + interval '3 days' where id = 'snake-neon';
-- Rabatt beenden
update public.shop_items set sale_percent = 0, sale_until = null where id = 'snake-neon';
-- Wochenend-Aktion: alles 20 % günstiger bis Sonntagabend (ohne exklusive Designs)
update public.shop_items set sale_percent = 20, sale_until = '2026-10-11 23:59+02' where not exclusive;
-- Hervorheben (gelber Rand + Schild im Shop), z. B. „Beliebt“ oder „Neu“; entfernen mit = null
update public.shop_items set highlight = 'Beliebt' where id = 'snake-neon';
-- Grundkurs Diamant → Coins
update public.shop_settings set value = 150 where key = 'diamond_coin_rate';
-- Tauschpaket ändern (Diamanten, Bonus in %)
update public.exchange_packages set bonus_percent = 35 where id = 'p25';
-- Creator-Code anlegen: Designs (IDs aus shop_items) und/oder Coins/Diamanten,
-- optional mit Ablaufdatum und Höchstzahl an Einlösungen
insert into public.creator_codes (code, coins, diamonds, items, expires_at, max_uses, note)
values ('SOMMER', 500, 0, array['snake-galaxy'], now() + interval '14 days', 1000, 'Sommer-Aktion');
-- Code abschalten
update public.creator_codes set active = false where code = 'SOMMER';
```

Codes immer in Großbuchstaben anlegen – Spieler können sie in beliebiger Schreibweise eingeben.
Exklusive Designs (`exclusive = true`) erscheinen nie im Shop und lassen sich nur per Code bekommen.

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

## Gut zu wissen

- **Pausierung:** Kostenlose Supabase-Projekte pausieren nach ca. einer Woche ohne Aktivität. Im Dashboard
  lässt sich das Projekt mit einem Klick wieder starten; die Daten bleiben erhalten.
- **Datenschutz:** Mit Google-Login werden personenbezogene Daten verarbeitet (Name, E-Mail, Profilbild).
  Für eine öffentliche Seite ist eine Datenschutzerklärung nötig.
- **Werte anpassen:** Coins pro Spiel, Glücksrad-Chancen, Erfolge und Preise stehen in den Tabellen
  `reward_rules`, `wheel_segments`, `achievements` und `shop_items` (direkt im Table Editor änderbar oder
  im SQL-Skript), Tauschkurs und Pakete in `shop_settings` und `exchange_packages`, Codes in
  `creator_codes`. Wie ein Design aussieht, steht in `public/js/designs.js`.
