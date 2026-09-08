# Plant Guide · kostenloses Cloudflare CMS

Login: https://plant-guideeh.pages.dev/admin  
Website: https://plant-guideeh.pages.dev/

Angebote oben auf der Website sowie Shop-Produkte, Preise und Fotos werden im Adminbereich verwaltet. Der Login-Link steht im Footer. Benutzername: **Nicole**. Das Passwort wird ausschließlich als verschlüsseltes Pages-Secret gespeichert.

## Ohne R2 und ohne Zahlungsdaten für R2

Alle Inhalte einschließlich Bilder liegen in einer eigenen Cloudflare-D1-Datenbank. R2 wird nicht benötigt. Fotos (JPG, PNG, WebP, AVIF, GIF; Original bis 8 MB) werden im Browser auf maximal 1600 Pixel und 1 MB optimiert. Animationen werden zu Standbildern. Originaldateien werden nicht archiviert. Die API prüft Größe und Dateisignatur zusätzlich.

Der Workers-Free-Tarif bietet derzeit 500 MB pro D1-Datenbank; tägliche Abfragekontingente gelten ebenfalls. Bei ausgeschöpftem Free-Kontingent werden Anfragen abgewiesen, bis es zurückgesetzt wird. Diese Einrichtung aktiviert keinen kostenpflichtigen Tarif.
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/

## Eine Deploy-Datei

Voraussetzungen: Node.js 22.13+ und npm, vorhandenes Pages-Projekt `plant-guideeh`, Cloudflare API-Token für dieses Konto mit **D1 Edit** und **Cloudflare Pages Edit**.

```sh
node deploy.mjs
```

Das Skript fragt API-Token und Admin-Passwort verdeckt ab; alternativ über `CLOUDFLARE_API_TOKEN` und `ADMIN_PASSWORD` bereitstellen. Keine Zugangsdaten in Dateien oder Git eintragen.

Es sucht die eigene Datenbank `plant-guide-db`, legt sie bei Bedarf an, schreibt das `DB`-Binding in `wrangler.toml`, setzt das Produktions-Secret und veröffentlicht die Website mit Wrangler 4.130.0. Tabellen werden beim ersten API-Zugriff erstellt. Vorhandene Daten werden nicht gelöscht.

**Die erzeugte wrangler.toml danach in Git übernehmen.** Die Datei ist die maßgebliche Konfiguration für spätere automatische Git-Deployments. Preview-Deployments erhalten absichtlich keinen Zugriff auf die Produktionsdatenbank.

Alternativ kann ein Administrator die D1-Datenbank im Dashboard anlegen, ihre ID in der Konfiguration eintragen und `ADMIN_PASSWORD` als verschlüsseltes Produktions-Secret setzen. Ein erneutes Deployment ist erforderlich.

## Tests

```sh
node --test tests/cms.test.mjs
```

Integrationstests verwenden echte SQLite-Abfragen über einen kleinen D1-Adapter: Anmeldung/Abmeldung, Zugriffsschutz, Angebote und Produkte erstellen/bearbeiten/löschen, öffentliche Sichtbarkeit, binäre Bildspeicherung, Löschschutz verwendeter Bilder, Größen-/Typprüfung, Rate-Limit und kontrollierte Fehlerantworten. Der Adapter ersetzt keine Prüfung im Cloudflare-Laufzeitsystem.

## Sicherheit und Betrieb

- HttpOnly/Secure/SameSite-Session-Cookies; nur Token-Hashes in D1.
- Rate-Limit nach IP statt umgehbarer Browserkennung.
- Schreibende Adminanfragen benötigen eine Sitzung und den Request-Header.
- Metadaten und Bildbytes werden gemeinsam in einer Transaktion gespeichert.
- Bilder werden öffentlich über `/media/*` bereitgestellt und bis zu einer Stunde gecacht.
- Preise und Inhalte können ohne neues Deployment bearbeitet werden.
- `/api/health` zeigt Datenbank, Bildspeicher und Passwortkonfiguration.
