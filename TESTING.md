# Verifisering av Business Units

## SQL-leveranse 30.09.2026

Branch `feat/postgres-storage` bygger på BU-commit `0b6a26e`.

- 144 enhets-/modell-/adaptertester består.
- 12 PostgreSQL/HTTP-integrasjonstester består mot `stackrankdh_test`. De dekker ekte database, klientadapter → HTTP → SQL → ny klient, samtidige skrivinger, historikkrollback, dokumentisolasjon, reset, dokumentstørrelse og frakoblet database.
- Migreringen er kjørt i `stackrankdh_dev`, og serveren startet på 127.0.0.1:4176 med `stackrankdh_app`.
- Approllen er kontrollert: skriving til dokumenter tillates, DELETE, historikk-UPDATE og CREATE på skjema tillates ikke.
- Node-serverens statiske filer og helsesjekk er verifisert gjennom HTTP-testene. Serveren sender `Cache-Control: no-store`.
- Nettleseråpning ble igjen blokkert fordi administratorkontrollen ikke kunne verifiseres. Ingen visuell desktop-/mobil-/konsolltest er derfor markert som bestått.

Før publisering: gjennomfør BU-listen nedenfor i SQL-modus, flytt en eksportfil fra gammel adresse, kontroller at begge appflatene overlever innlasting på nytt, åpne to faner og utløse konflikt, og stopp serveren for å kontrollere «ikke lagret» og nedlasting av nødutkast. Import av porteføljeversjon 1 skal nå **oppgraderes eksplisitt**, ikke avvises slik den tidligere BU-utgaven gjorde. Ukjente versjoner skal fortsatt avvises.

## Tidligere BU-verifisering

Utgangspunkt: `47501a7`, branch `feat/business-units`. Kontrollert 30.09.2026.

## Kjørt

- `npm test`: 137 tester består (124 i utgangspunktet).
- Syntakssjekk med `node --check` for alle `.js`/`.mjs` i `dist/`.
- Statiske smoke-tester: lokale modulimporter og inngangsfiler finnes; alle ruter peker på unike HTML-seksjoner.
- Funksjonell modulbasert BU-flyt: opprett → navngi → tildel eier → eksporter/importer → fjern med bekreftelse. Hendelsesbehandlerne kjøres med en enkel DOM-stub; dette er ikke en nettlesertest.
- Regresjoner: én eier uten dobbelttelling, deltakere fra teamroller, negativ verdi, utelatt teamkostnad, ufordelte/slettede koblinger, oppgaver uten økonomisk virkning, segmentdata ved dialoglagring og uendret lagringsversjon i laben.

## Nettlesertesting gjenstår

Nettleserverktøyet kunne ved to forsøk ikke verifisere administratorstyrt tilgangspolicy. Ingen UI-, konsoll-, mobil- eller visuell kontrastsjekk er derfor godkjent. Testserveren startet på en separat lokal adresse; produksjon og brukerens lagrede data ble ikke brukt i testene.

Kjør `npm start` i denne arbeidskopien. Bruk en separat nettleserprofil for testdata, og tving ny henting av endrede moduler og CSS før testing.

1. Åpne alle menyvisninger, prioriteringslaben og FAQ. Sjekk konsollen for feil.
2. Opprett «Marked» og «Leveranse» under Business Units. Navngi dem med tastatur; fokus skal beholdes under skriving. Sjekk tomt og duplisert navn samt tekst med `<` og `&`.
3. Sett «Marked» som eier av Proaktiv diagnostikk. Knytt de aktuelle teamrollene til «Leveranse». Matrisen skal vise forventede ressursuker under Marked → Leveranse; samlet nettoverdi skal være uendret.
4. Åpne tiltakets dialog, endre navn/eier og lagre. Segmentradene skal være intakte, avledede felt låst og økonomien uendret. Avbryt en ny redigering og kontroller at den ikke lagres.
5. Eksporter, last inn siden på nytt og importer eksporten. Eier, roller, BU-er og beregninger skal være de samme. Importer en versjon-1-fil og feilformet BU-fil: de skal avvises uten å endre arbeidsflaten.
6. Med versjon-1-data fra den gamle appen i testprofilen: ny app skal pause autolagring, beholde originalen og tilby nedlasting. Bekreft at klikk og redigering ikke overskriver originalen. Sikre sikkerhetskopi før nullstilling.
7. Fjern en BU: første klikk varsler, andre gjør eier/roller ufordelte. Beløpene skal være uendret. Slett en rolle og kontroller ufordelt innsats i både BU og kapasitet.
8. Slett alle testtiltak, last inn siden på nytt og importer en tom portefølje. Eksempeltiltak skal ikke dukke opp igjen, og siden skal fortsatt fungere.
9. Gjenta BU- og dialogflyten ved 375 px. Tabeller kan rulle horisontalt inni panelet; siden skal ikke ha horisontal overløp. Kontroller lesbar tekst, kontrast, fokusmarkering og tastaturvalg.

## Konkrete neste forbedringer

1. **Tapstabell:** rediger tap for WIP 1–5 i parametrene; vis gjennomstrømning ved siden av. Verdiene må flyte til både veikart og lab, med synlig forklaring på separate arbeidsflater.
2. **Ukesats per rolle:** arvet standardsats og eksplisitt overstyring per teamrad, etter kundeverdimønsteret. Vis avvik; endre ikke overstyrte verdier automatisk.
3. **Migrering av lagring:** validert konvertering fra versjon 1 til 2, med original sikkerhetskopi og forhåndsvisning. Gamle tiltak/roller får ufordelt BU. Nåværende utgave avviser dem bevisst.
4. **Sporbarhet i BU-matrisen:** klikk på en celle for å vise teamradene og tiltakene bak ressursukene. Da kan en BU diskutere faktisk bidrag uten å flytte eller dele verdien.
