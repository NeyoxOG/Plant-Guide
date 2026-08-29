# Plant Guide · Cloudflare CMS

Diese Version verwendet bewusst die klassische Cloudflare-Pages-Struktur:

```text
public/        # komplette öffentliche Website + Admin-Oberfläche
functions/     # Pages Functions API
schema.sql     # D1 Datenbankschema
wrangler.toml  # Pages-Konfiguration
.gitignore
README.md
```

## Funktionen

- Admin-Login unter `/admin.html`
- Angebote/Hinweise erstellen, bearbeiten, aktivieren und löschen
- aktive Angebote werden automatisch oberhalb der Website-Inhalte angezeigt
- Shop-Produkte erstellen, bearbeiten und löschen
- aktueller Preis + optionaler Vergleichspreis
- Produktbeschreibung, Reihenfolge und Sichtbarkeit
- Medienbibliothek mit Bild-Upload über Cloudflare R2
- Produktbilder direkt aus der Mediathek auswählen
- D1 für Inhalte, Login-Sitzungen und Schutz vor Login-Bruteforce
- HttpOnly/Secure/SameSite-Session-Cookie
- bestehendes Plant-Guide-Design, Animationen und responsive Darstellung bleiben erhalten

## 1. Cloudflare Ressourcen einmalig erstellen

Im Repository-Verzeichnis mit installiertem Node.js:

```bash
npx wrangler login
npx wrangler d1 create plant-guide-db
npx wrangler r2 bucket create plant-guide-media
```

Beim D1-Befehl wird eine `database_id` ausgegeben. Diese ID in `wrangler.toml` eintragen und dort die beiden auskommentierten Binding-Blöcke für `DB` und `MEDIA` aktivieren.

Die Binding-Namen müssen exakt lauten:

- D1: `DB`
- R2: `MEDIA`

## 2. Datenbank initialisieren

```bash
npx wrangler d1 execute plant-guide-db --remote --file=schema.sql
```

Der Befehl kann nach Schema-Erweiterungen erneut ausgeführt werden, sofern die Änderungen migrationssicher formuliert sind.

## 3. Admin-Passwort als Secret setzen

Das Passwort wird niemals in GitHub gespeichert:

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name plant-guideeh
```

Wrangler fragt das Passwort verdeckt ab.

## 4. Deploy

Da `wrangler.toml` `public/` als Build-Ausgabe definiert, reicht anschließend:

```bash
npx wrangler pages deploy public --project-name plant-guideeh --branch main
```

Bei GitHub-Integration kann Cloudflare `main` weiterhin automatisch deployen. Wichtig ist dann, dass dieselben D1-/R2-Bindings (`DB` und `MEDIA`) auch im Pages-Projekt gesetzt sind.

## Admin

Nach erfolgreicher Einrichtung:

```text
https://plant-guideeh.pages.dev/admin.html
```

## Sicherheit

- Passwort nur als Cloudflare Secret `ADMIN_PASSWORD`
- Admin-Sitzungen serverseitig in D1
- Cookie: `HttpOnly`, `Secure`, `SameSite=Strict`
- Login-Rate-Limit nach wiederholten Fehlversuchen
- Schreibzugriffe benötigen eine gültige Sitzung und Same-Origin-Header
- Uploads akzeptieren nur Bilder und sind auf 8 MB begrenzt
- R2 bleibt privat; Medien werden kontrolliert über `/media/*` ausgeliefert

## Hinweis

Impressum und Datenschutz müssen vor dem endgültigen Livegang weiterhin mit vollständiger Anschrift sowie den tatsächlich eingesetzten Hosting-/Drittanbieterangaben geprüft und ergänzt werden.
