# SQL-lagring: oppsett og drift

## Lokalt oppsett

Krever Node 22+ og PostgreSQL 16+. Appen trenger bare npm-pakken `pg`; frontenden har ingen byggefase.

```sh
npm ci
createdb -h localhost stackrankdh_dev
createdb -h localhost stackrankdh_test
psql -h localhost -d postgres -c 'CREATE ROLE stackrankdh_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;'
cp .env.example .env
npm run db:migrate
psql -h localhost -d stackrankdh_dev -v ON_ERROR_STOP=1 -f db/runtime-grants.sql
npm start
```

Opprett databaser og rolle bare én gang. På denne maskinen er de allerede opprettet, migreringen kjørt og `.env` konfigurert med port **4176**. Åpne http://127.0.0.1:4176. Lokal PostgreSQL bruker maskinens eksisterende autentiseringsoppsett; dersom den krever passord, sett dette bare i `.env`/serverens hemmelighetslager, aldri i Git.

`DATABASE_URL` er approllen. `MIGRATION_DATABASE_URL` er eieren som kan endre skjema. Approllen får SELECT/INSERT/UPDATE på gjeldende dokumenter, SELECT/INSERT på historikk, og ingen DELETE eller DDL. `WORKSPACE_ID` velger arbeidsflaten serveren tilbyr. Nettleseren får verken database-URL eller passord.

`npm run start:local` starter den statiske utgaven med nettleserlagring. `storage-config.json` annonserer lokalmodus på statisk hosting; Node-serveren erstatter svaret med SQL-modus. Et SQL-tilkoblingsproblem fører ikke til lokal fallback.

## Hva som lagres

- `workspace_documents`: gjeldende dokument, type `portfolio` eller `lab`, modellversjon, revisjon, tidsstempel og JSONB.
- `document_revisions`: alle lagrede revisjoner og nullstillinger.
- `workspaces`: arbeidsflatens identitet.
- `schema_migrations`: hvilke skjemaendringer som er kjørt, med sjekksum.

Hver PUT validerer struktur og forventet revisjon, skriver dokumentet og historikken i samme transaksjon. Ved feil rulles begge tilbake. Primærnøklene fungerer også som indekser for dokument- og historikkoppslag. Maks dokumentstørrelse er 2 MB.

Porteføljen inneholder hele grafen av tiltak, segmenter, BU-er, roller, kostnader, oppgaver, risikoer, kilder, veikart og parametre. Laben har sitt eget dokument. Beregnede totalsummer blir ikke en ekstra lagret sannhet. `JSONB` beholder tallverdier og ID-er, men ikke JSON-nøkkelrekkefølge eller formatering.

## Overføring av eksisterende data

1. Eksporter fra adressen/nettleseren der de gamle dataene ligger. Nettleserlagring er knyttet til adresse og port; serveren kan ikke hente data fra en annen adresse.
2. Åpne SQL-utgaven og velg «Importer fra fil» eller «Importer lab». Porteføljeversjon 1 oppgraderes med tomt BU-register og ufordelt eierskap. Andre ukjente versjoner avvises.
3. Dersom de gamle dataene finnes på samme adresse, kan «Flytt nettleserdata til SQL» brukes med to klikk. Originalen i nettleseren slettes ikke.
4. Kontroller at status sier «Lagret i PostgreSQL» og viser en revisjon. Last siden på nytt for å kontrollere resultatet.

Import erstatter dokumentet for arbeidsflaten. Tidligere SQL-revisjoner beholdes. Eksportfilen og eventuelt lokalt nødutkast bør beholdes til innholdet er kontrollert. En gammel porteføljefil kan ikke importeres som lab eller omvendt.

## Konflikter og frakobling

To faner kan lese samme revisjon. Bare den første får lagre; den andre får 409 og stoppes. Eksporter utkastet, last inn serverversjonen og før endringene inn igjen. Automatisk fletting er ikke implementert.

Ved timeout er det ukjent om serveren rakk å lagre. Derfor forsøkes ingen blind overskriving med en ny revisjon. Et nødutkast forsøkes lagret separat i nettleseren, og kan lastes ned ved neste innlasting. Kvotefeil eller blokkert nettleserlagring kan også hindre dette; eksport fra den åpne siden er da nødvendig.

## API og historikk

Alle endepunkter ligger på samme lokale server som appen.

| Metode / adresse | Effekt |
| --- | --- |
| `GET /api/health` | Kontrollerer databaseforbindelsen |
| `GET /api/documents/portfolio` | Gjeldende portefølje med revisjon |
| `PUT /api/documents/portfolio` | Lagrer `{expectedRevision, version, workspace}` |
| `DELETE /api/documents/portfolio` | Nullstiller med `{expectedRevision}`; historikk beholdes |
| `GET /api/documents/portfolio/history` | Metadata for siste 100 revisjoner |
| `GET /api/documents/portfolio/history/1` | Innholdet i en bestemt revisjon |

Bytt `portfolio` med `lab` for laben. En eldre revisjon kan gjenopprettes ved å sende dens `workspace` og `version` som en ny PUT med **gjeldende** `expectedRevision`. Det opprettes en ny revisjon; historikken endres aldri. Historikken inneholder ikke brukeridentitet før autentisering er innført.

## Dev, demo og backup

Dev og demo skal ha separate databaser og servermiljøer. Branchbytte alene isolerer ikke data. Det er foreløpig bare dev og test som er opprettet lokalt. Før demo deles eksternt trengs en serverplattform, Telenor SSO/autorisasjon per arbeidsflate og HTTPS. Nåværende Node-server binder bevisst bare til loopback og avviser andre Host/Origin-verdier. GitHub Pages kan bare levere lokalmodus.

Eksempel på backup fra den lokale databasen med databaseeierens tilgang:

```sh
mkdir -p backups
pg_dump -h localhost -d stackrankdh_dev -Fc -f backups/stackrankdh-dev.dump
createdb -h localhost stackrankdh_restore_test
pg_restore -h localhost -d stackrankdh_restore_test --no-owner --no-acl backups/stackrankdh-dev.dump
```

Bruk datert filnavn i praksis. `backups/` er ignorert av Git, men backup må også lagres på et godkjent sted utenfor maskinen. Revisjonshistorikk er ingen erstatning for backup. Gjenopprett til en **ny database**, kontroller dokumenter og antall revisjoner, og avtal deretter eventuelt bytte av database-URL. Ingen automatisk backupjobb eller ekstern backup er satt opp.

## Test

```sh
npm test
npm run test:integration
```

Integrasjonstestene krever `TEST_DATABASE_URL` og avviser databasenavn som ikke slutter på `_test`. De oppretter isolerte testarbeidsflater og bevarer dem for inspeksjon. CI starter en egen PostgreSQL 16-instans. Testene kontrollerer migrering, klient → HTTP → SQL → ny klient, samtidighet, rollback, historikk, reset, isolasjon og feiltilfeller. Visuell nettleserverifisering er dokumentert separat i `TESTING.md`.
