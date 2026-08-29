# Plant Guide

Moderne Plant-Guide-Website mit Cloudflare Pages CMS.

## Neu: Adminbereich

Nach dem CMS-Deploy ist der Adminbereich unter `/admin.html` erreichbar. Dort kann die Besitzerin:

- Angebote/Hinweise erstellen, bearbeiten, aktivieren und löschen – aktive Einträge erscheinen automatisch oben auf der Website.
- Shop-Produkte mit Titel, Beschreibung, aktuellem Preis, optionalem Vergleichspreis und Bild erstellen, bearbeiten und löschen.
- Bilder in die Mediathek hochladen und für Produkte verwenden.
- Inhalte als Entwurf deaktivieren, ohne sie zu löschen.

## Cloudflare-Aufbau

- **Pages Functions**: sichere API unter `/api/*`
- **D1** (`plant-guide-db`): Angebote, Produkte, Medien-Metadaten und Admin-Sitzungen
- **R2** (`plant-guide-media`): hochgeladene Bilder
- **HttpOnly Session-Cookie**: Admin-Login
- **Cloudflare Secret `ADMIN_PASSWORD`**: Passwort liegt nicht im Repository

## Einmaliger Deploy

Node.js 20+ wird benötigt. Im Projektordner:

```bash
npm run deploy:cms
```

`deploy.mjs` übernimmt weitgehend automatisch:

1. Cloudflare-Anmeldung prüfen.
2. D1-Datenbank erstellen bzw. wiederverwenden.
3. privaten R2-Bucket erstellen bzw. wiederverwenden.
4. Wrangler-Konfiguration mit der echten D1-ID erzeugen.
5. D1-Migrationen anwenden.
6. Admin-Passwort abfragen und als Cloudflare Secret speichern.
7. statische Website + Pages Functions auf `plant-guideeh` deployen.

Die generierte `wrangler.cms.toml`, `.deploy`, `.dev.vars` und `.env` sind absichtlich in `.gitignore` und enthalten keine fest eingecheckten Passwörter.

## Sicherheit

- Login-Sessions werden serverseitig in D1 gespeichert und als `HttpOnly; Secure; SameSite=Strict` Cookie gesetzt.
- Nach mehreren falschen Login-Versuchen greift eine zeitweise Sperre.
- Schreibzugriffe benötigen eine angemeldete Session und einen zusätzlichen Same-Origin Request-Header.
- Medienuploads akzeptieren nur gängige Bildformate und maximal 8 MB.
- R2 bleibt privat; Bilder werden kontrolliert über `/media/*` ausgeliefert.

## Rechtliches

Impressum und Datenschutzerklärung müssen vor dem endgültigen öffentlichen Einsatz weiterhin mit allen tatsächlich erforderlichen Anbieter- und Hostingangaben geprüft/ergänzt werden.
