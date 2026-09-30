# Plan for PostgreSQL-lagring

Besluttet 30.09.2026 etter eksplisitt bestilling fra Arnar. Bygger på BU-commit `0b6a26e`. Tidligere beslutning om bare lokal lagring erstattes for serverutgaven; statisk utgave beholder lokal lagring.

Status: punktene 1–7 nedenfor er implementert og verifisert med 144 enhetstester og 12 SQL/HTTP-integrasjonstester. Lokal server kjører med avgrenset approlle. Visuell nettleserverifisering er blokkert av administratorkontrollen. Ekstern demo, SSO og driftsbackup er neste utrullingssteg.

## Datamodell

| Tabell | Innhold | Nøkkel |
| --- | --- | --- |
| `workspaces` | Navngitt arbeidsflate | `id` (tekst) |
| `workspace_documents` | Gjeldende portefølje eller lab, modellversjon, revisjon og JSONB-data | `(workspace_id, kind)` |
| `document_revisions` | Historikk over lagrede dokumenter, inkludert nullstilling | `(workspace_id, kind, revision)` |
| `schema_migrations` | Utførte SQL-migrasjoner med sjekksum | `name` |

Porteføljens JSONB inneholder tiltak, segmenter, BU-er, roller, veikart, scenarioer, problemer, parametre og GitHub-lenker. Laben lagres separat med alternativer, problem, planer og ramme. Eksisterende ID-er beholdes. Beregnede prioriterings-/verditall materialiseres ikke; samme modell beregner dem etter innlasting.

Dokumentet er transaksjonsgrensen: et lagret scenario skal ikke peke på en halvoppdatert portefølje. JSONB bevarer eksportformatet og utkast som ennå ikke er ferdig utfylt. SQL-kolonnene bærer identitet, revisjon, modellversjon og tidsstempel. Databasen håndhever format, nøkler og referanser; API-et validerer dokumentstruktur. Eventuelle analysevisninger kan legges til senere uten å innføre en ny økonomimodell.

## Gjennomføring

1. Opprett skjema med transaksjonell, sjekksumbasert migrering og avgrenset applikasjonsrolle.
2. Lag et lite Node HTTP-API med `pg`-pool, parameteriserte spørringer, begrenset dokumentstørrelse og atomisk oppdatering/historikk.
3. Innfør asynkron lagringsadapter. Serveren annonserer SQL-modus; statisk hosting annonserer lokal modus. Databasefeil må aldri føre til stille bytte til nettleserlagring.
4. Krev forventet revisjon ved lagring. To samtidige redaktører gir 409-konflikt; brukerens utkast kan eksporteres før ny innlasting. Nullstilling lager en ny revisjon i stedet for å slette historikk.
5. Behold eksport/import. Gammel porteføljeversjon 1 oppgraderes eksplisitt ved import med ufordelt BU; eksisterende nettleserdata flyttes kun når brukeren velger det.
6. Opprett separate lokale `stackrankdh_dev` og `stackrankdh_test`. Demo bruker en egen database ved utrulling, aldri dev-data ved branchbytte.
7. Verifiser lagring/gjenlesing, historikk, samtidighet, isolasjon, validering, reset og databasefeil med ekte PostgreSQL og HTTP-integrasjonstester.

## Driftsgrense

Første serverutgave binder bare til loopback på denne maskinen. Den gir ikke flerbrukerautentisering eller tilgang fra internett. Telenor SSO, autorisasjon per arbeidsflate, HTTPS, driftsbackup og hosting må kobles på før ekstern demo. GitHub Pages kan fortsatt kjøre statisk lokalmodus, men kan ikke kjøre SQL-API-et. Databasepassord skal bare finnes i servermiljøet.

Snapshot-historikk er ikke katastrofebackup. Bruk `pg_dump` og test gjenoppretting. Store arbeidsflater og samtidige endringer i forskjellige tiltak vil på sikt kunne kreve mer finmasket lagring; det innføres først når bruken begrunner det.

Designgrunnlag: [PostgreSQL JSONB](https://www.postgresql.org/docs/16/datatype-json.html) og [node-postgres-transaksjoner](https://node-postgres.com/features/transactions). En transaksjon bruker én pool-tilkobling; historikk og gjeldende versjon lagres sammen.
