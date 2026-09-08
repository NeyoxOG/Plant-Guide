# Plant Guide · Cloudflare CMS

Cloudflare-Pages-CMS für die Plant-Guide-Website.

```text
public/        # öffentliche Website + Admin-Oberfläche
functions/     # Cloudflare Pages Functions
schema.sql     # Referenzschema für D1
wrangler.toml  # Pages-Konfiguration
.github/       # automatische Syntax- und Live-Smoke-Tests
```

## Enthaltene Funktionen

- sichtbarer `Admin Login` unten auf der Website
- Login mit Benutzername `Nicole` + Cloudflare-Secret-Passwort
- Angebote/Hinweise erstellen, bearbeiten, aktivieren und löschen
- aktive Angebote automatisch auf der öffentlichen Website
- Shop-Produkte erstellen, bearbeiten und löschen
- aktueller Preis + optionaler Vergleichspreis
- Produktbeschreibung, Reihenfolge und Sichtbarkeit
- Medienbibliothek mit Bild-Upload zu Cloudflare R2
- Produktbilder aus der Mediathek auswählen
- serverseitige Sessions in D1
- Login-Rate-Limit
- Live-Systemstatus für D1, R2 und Login-Konfiguration
- Upload-Timeouts und saubere Fehlerrücksetzung statt endlosem Ladezustand
- automatische D1-Tabellenerstellung beim ersten API-Zugriff
- GitHub-Syntaxprüfung und Live-Smoke-Test gegen `plant-guideeh.pages.dev`

## Cloudflare-Ressourcen

Die Anwendung braucht genau zwei Bindings:

- `DB` → D1-Datenbank `plant-guide-db`
- `MEDIA` → R2-Bucket `plant-guide-media`

Zusätzlich:

- `ADMIN_USERNAME` ist in `wrangler.toml` auf `Nicole` gesetzt.
- `ADMIN_PASSWORD` muss als Cloudflare Pages Secret gesetzt werden und darf niemals ins Repository geschrieben werden.

### Ressourcen anlegen

```bash
npx wrangler login
npx wrangler d1 create plant-guide-db
npx wrangler r2 bucket create plant-guide-media
```

Die von D1 ausgegebene `database_id` in `wrangler.toml` eintragen und die D1-/R2-Blöcke aktivieren.

### Admin-Passwort setzen

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name plant-guideeh
```

Wrangler fragt den Secret-Wert verdeckt ab.

## Datenbank

Die Pages Function initialisiert die benötigten Tabellen automatisch, sobald `DB` korrekt gebunden ist. `schema.sql` bleibt zusätzlich als nachvollziehbare Referenz und kann bei Bedarf manuell ausgeführt werden:

```bash
npx wrangler d1 execute plant-guide-db --remote --file=schema.sql
```

Es werden keine Passwort-Hashes oder produktiven Zugangsdaten in Git gespeichert.

## Deploy

Mit GitHub-Integration deployt Cloudflare Änderungen aus `main` automatisch. Ein manueller Deploy ist ebenfalls möglich:

```bash
npx wrangler pages deploy public --project-name plant-guideeh --branch main
```

Danach:

```text
Website: https://plant-guideeh.pages.dev/
Admin:   https://plant-guideeh.pages.dev/admin.html
Health:  https://plant-guideeh.pages.dev/api/health
```

## Systemstatus

`/api/health` prüft getrennt:

- ob D1 gebunden und erreichbar ist
- ob R2 gebunden und erreichbar ist
- ob das Admin-Passwort als Secret vorhanden ist

Der Adminbereich zeigt denselben Status sichtbar an und deaktiviert Medien-Uploads, solange R2 nicht bereit ist.

## Automatische Prüfungen

`.github/workflows/verify.yml` prüft bei Änderungen:

- JavaScript-Syntax
- notwendige Dateien und Admin-Login-Felder
- Wrangler-Grundkonfiguration
- dass das produktive Passwort nicht versehentlich in Git landet

`.github/workflows/live-smoke.yml` prüft nach einem Push auf `main` die Live-Seite und erwartet, dass D1, R2 und Login vollständig bereit sind.

## Sicherheit

- Passwort ausschließlich als Cloudflare Secret
- `HttpOnly; Secure; SameSite=Strict` Session-Cookie
- serverseitige Sessions in D1
- Rate-Limit nach wiederholten Fehlversuchen
- schreibende Admin-Anfragen benötigen eine gültige Sitzung und einen zusätzlichen Request-Header
- Uploads sind auf Bildformate und 8 MB begrenzt
- R2 bleibt privat; Medien werden kontrolliert über `/media/*` ausgeliefert

## Rechtliches

Impressum und Datenschutz müssen vor dem endgültigen Livegang weiterhin mit vollständiger Anschrift sowie den tatsächlich eingesetzten Hosting-/Drittanbieterangaben geprüft werden.
