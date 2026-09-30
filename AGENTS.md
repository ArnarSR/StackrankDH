# AGENTS.md — Churn Studio

Les denne før du endrer noe. `README.md` forklarer modellen i detalj, `OVERLEVERING.md` har full status og alle modellskiller.

## Hva dette er

Et norsk beslutningsverktøy for produktledere i telekom (bredbånd/Wi-Fi). Det beregner verdien av churn-tiltak, plasserer dem i et veikart, sammenligner scenarioer over tid, og viser hva dagens problemer koster.

Hele grensesnittet og all dokumentasjon er på **norsk**. Beløp i **NOK**, formatert med `nb-NO`.

## Kjør og verifiser

```
npm start    # Node-server med PostgreSQL; krever .env og npm run db:migrate
npm run start:local  # Statisk utgave med nettleserlagring
npm test     # 148 modell-, adapter-, hendelsesflyt- og smoke-tester
npm run test:integration  # 12 tester mot separat PostgreSQL-testdatabase
```

**Ingen byggefase eller frontendrammeverk.** Ren HTML/CSS/ES-moduler fra `dist/`. SQL-bestillingen 30.09.2026 tillater Node 22+ og PostgreSQL-driveren `pg` på serveren. Ikke innfør bundler, TypeScript eller frontendrammeverk uten en ny beslutning.

Kjør alltid `npm test` før du er ferdig. UI-endringer må i tillegg verifiseres i nettleser: last siden, sjekk konsollen for feil, og kontroller mobilvisning (375 px) og kontrast.

**Praktisk felle:** den statiske Python-serveren sender ingen cache-headere. Node-serveren sender `Cache-Control: no-store`. Nettleseren serverer gjerne gamle `.mjs`- og `.css`-filer etter en endring, slik at det ser ut som koden din ikke virker. Tving ny henting med `fetch(url, {cache:'reload'})` på de endrede filene før du laster på nytt, eller bruk en cache-bust i URL-en.

## Regler du ikke skal bryte

Disse er verktøyets eksistensberettigelse. Brytes de, ser tallene like fine ut, men beslutningsstøtten er ødelagt.

1. **Ingen samlet score.** Evidens, risiko og strategisk fit er synlige, separate vurderinger — aldri vekter som blandes inn i en økonomisk rangering. Ikke lag en «prioriteringsscore» som ganger sammen verdi × evidens × risiko, uansett hvor fristende det ser ut.
2. **Churn-reduksjon er absolutte prosentpoeng.** Beholdte kunder = adresserbare × rekkevidde/100 × reduksjon i pp/100. Ikke multipliser baseline eller kundebasen inn på nytt.
3. **Kundeverdi er inkrementelt dekningsbidrag innen 12 måneder**, ikke omsetning og ikke full CLV. Derfor kappes måneder ved 12 i `dist/parameters.mjs` — den grensen er der med vilje.
4. **Oppgaver påvirker aldri økonomien.** Teamraden er eneste kilde til kostnad. Avvik mellom oppgavesum og teamrad *rapporteres*, avstemmes aldri i stillhet.
5. **Låst verdi («låser opp X kr») summeres aldri inn i en total.** Verdiene overlapper i en kjede, så en sum på tvers er matematisk meningsløs.
6. **Problemkostnad er et eget regnskap.** Nåkostnader er ikke tiltaksverdi og legges aldri til eller trekkes fra en plan.
7. **Porteføljen proraterer ikke** etter ferdigtidspunkt; brukeren justerer rekkevidde og kundeverdi selv. Veikartet og laben proraterer, fra landingsmåned. Ikke gjør porteføljen tidsbevisst uten en uttrykkelig beslutning.
8. **Alternativkostnad legges ikke oppå planforskjellen.** Forskjellen mellom to scenarioer *er* alternativkostnaden.
9. **Ikke fabrikker kilder eller studier.** Eksempeldata er merket illustrativt. Tall som ikke er målt, skal stå som anslag eller antakelse.

Flere av disse er låst av tester. Hvis en test med et norsk navn som beskriver en modellegenskap ryker, har du sannsynligvis brutt en regel — ikke «fiks» testen uten å forstå hvorfor den finnes.

## Beslutninger som er tatt

Ikke omgjør disse uten å spørre brukeren (Arnar) eksplisitt.

- **Lagring: PostgreSQL bak et server-API.** Eksplisitt endret av Arnar 30.09.2026. `npm start` bruker SQL via `server/`; `npm run start:local` og GitHub Pages bruker fortsatt lokal nettleserlagring. Serveren holder databaselegitimasjon, portefølje og lab lagres separat som versjonerte JSONB-dokumenter, og skriving krever forventet revisjon. Databasefeil skal aldri gi stille lokal fallback. Denne utgaven er kun tilgjengelig på loopback; SSO/autorisasjon og HTTPS må på plass før ekstern deling. Se `SQL-PLAN.md` og `SQL-STORAGE.md`.
- **GitHub-integrasjon uten autentisering.** Projects v2 er GraphQL-only og krever `read:project`; en statisk side har ingen trygg plass å holde en token. Vi bygger forhåndsutfylte issue-URL-er brukeren selv sender inn. **Ikke innfør tokenhåndtering.**
- **Prioriteringslaben er konvergert mot veikartets tidsmodell** (felles motor i `dist/timeline.mjs`). Porteføljens 12-månedersmodell står bevisst utenfor.

## Arkitektur

Ren modell adskilt fra grensesnitt. Modellfilene er testbare uten DOM; `*-ui.mjs` rører DOM og testes ikke.

| Fil | Ansvar |
| --- | --- |
| `timeline.mjs` | **Felles tidsmodell.** 24 mnd, WIP-baner, parallellitetstap, månedlig opptjening. Brukes av både veikart og lab. |
| `model.mjs` | Churn-beregning, eksempeldata, validering, sortering |
| `resources.mjs` | Kostnader, ressursuker, kalendertid, teamrader |
| `roadmap-model.mjs` | Veikart, scenarioer, CD3, låst verdi, dekning |
| `decision-model.mjs` | Prioriteringslaben (egen datamodell, felles tidsmodell) |
| `roster.mjs` | Roller, ferdigheter, kapasitet, oppgaver |
| `business-units.mjs` | Én verdieier per tiltak, bidragsmatrise i ressursuker, ufordelt eierskap/innsats |
| `measure-draft.mjs` | Bevarer segmentrader ved dialoglagring og utleder deres verdier på nytt |
| `problems.mjs` | Nåkostnader, «gjør ingenting»-kurve |
| `parameters.mjs` | Kundebase og kundeverdi, arv og avvik |
| `storage.mjs` | Eksportformat og lokal lagring |
| `persistence.mjs` | Asynkron lokal/SQL-adapter, lagringskø, konflikter og eksplisitt v1-import |
| `workspace-schema.mjs` | Felles strukturvalidering for dokument-API |
| `server/` og `db/` | HTTP, PostgreSQL-repository, migreringer og rettigheter |
| `github.mjs` | Issue-URL-er, CSV-eksport, URL-validering |
| `router.mjs` | **Hash-ruting.** Rene parse/format-funksjoner + DOM-binding. Visningsregisteret bygger også venstremenyen |
| `segments.mjs` | Segmenter som ikke overlapper, TAM/SAM/SOM, utledning av tiltakets skalarer |
| `validation.mjs` | `problem(message, scope, id, fields)` — felles feilformat med presise feltreferanser |

Alt av tilstand ligger i minnet i modulvariabler og lagres via `snapshot()`/`restore()` som hver `*-ui.mjs` eksporterer. `app.js` orkestrerer.

## Hva som bør gjøres

Prioritert. De tre første er avgrensede og trygge; resten krever en beslutning før koding.

### 0. Business Units — implementert, nettleserverifisering gjenstår

Visningen `#/business-units` viser nettoverdi per eiende BU og en bidragsmatrise i forventede ressursuker. Tiltaket har én `businessUnitId`; deltakere utledes bare av rollene på teamradene. Manglende/slettede koblinger vises som ufordelt. BU-registeret starter tomt, så det ikke påstås noe om reell organisering. Modell-, modulbaserte flyt- og statiske smoke-tester består; desktop, mobil (375 px), konsoll og visuell kontrast gjenstår fordi nettleserverktøyets administratorkontroll var utilgjengelig. Se `TESTING.md`.

Porteføljens modellversjon er 2; labens er 1. Automatisk innlasting av v1-data avvises og pauses, mens eksplisitt import/overføring oppgraderer v1-porteføljen med ufordelt BU. Originale nettleserdata beholdes. SQL-nullstilling lager en historikkrevisjon; ikke slett historikk eller erstatt avviste data automatisk.

### 1. Eksponer tapstabellen for kontekstbytte

`README.md` og `dist/faq.html` sier begge at Weinberg-tallene er «justerbare». Modellen støtter det (`losses`-parameteren i `timeline.mjs`), men **det finnes ingen kontroll i grensesnittet**, så tallene er i praksis låst. Dokumentasjonen lover altså noe produktet ikke gjør.

Legg en redigerbar tapstabell i parameterpanelet, og la den flyte gjennom til `scheduleWork`. Vis gjennomstrømningen (`throughput`) ved siden av, så den omvendte U-en blir synlig.

### 2. Samle ukesats i parametrene

Ukesats settes i dag på hver teamrad — 9 steder i eksempeldataene alene. Flytt den til rollelisten i `roster.mjs` med mulighet for å overstyre per rad.

**Gjenbruk mønsteret fra kundeverdi** i `parameters.mjs`: standard arves, overstyring røres aldri, og avvik listes synlig (`valueDrift`). Ikke oppfinn et nytt mønster.

### 3. Måltall og fremdrift på key results

Ble utelatt fordi det krevde lagring. Lagring finnes nå, så dette er ikke lenger blokkert. Key results ligger i `roadmap-model.mjs` (`seedRoadmap`, `keyResults`, `coverage`).

Merk regel 1: måltall skal ikke kobles inn i noen økonomisk beregning.

### 4. Overlapp mellom tiltak — krever beslutning først

Summene er ikke korrigert for at to tiltak kan treffe de samme kundene. Dette er den største kjente svakheten i modellen, og det er et **modelleringsspørsmål, ikke en kodeoppgave**. Ikke implementer en automatisk korreksjon; legg fram alternativer og la Arnar velge.

### 5. Horisonten er hardkodet

`HORIZON_MONTHS = 24` i `timeline.mjs`. Gjøres den konfigurerbar, treffer det både veikart og lab, og alle tester som sjekker eksakte beløp må regnes om. Avklar om behovet er reelt før du rører den.

### 6. Fra Arnars egen backlog (se Notion-siden)

- **Navnebytte til «Roadmapper»** (nytt arbeidsnavn). Berører repo-navn, sidetitler og **GitHub Pages-adressen** — altså en lenke som kan være delt. Koordiner med Arnar før du gjør det.
- **Systemeierskap og kapabiliteter:** hvilke systemer må endres, og hvilke team eier dem. Rollelisten i `roster.mjs` er det naturlige ankeret — utvid den, ikke lag et parallelt register.
- **Hypoteser koblet til eksperimenter,** med validitetssjekk. Evidensnivåer og kilderegister finnes allerede i `model.mjs` og `resources.mjs`; bygg videre på dem framfor å duplisere.
- **Planlegging på tvers av team.** Scenariomodellen antar i dag én felles leveransekapasitet. Ekte flerteamsplanlegging er en vesentlig utvidelse av `timeline.mjs`.

## Stil

Koden er bevisst kompakt — lange linjer, korte navn, få kommentarer. Følg stilen i filen du endrer framfor å formatere om. Kommentarer forklarer **hvorfor**, aldri hva.

Testnavn er norske og beskriver en modellegenskap, ikke en implementasjonsdetalj: «Oppgaver endrer verken kostnad, nettoverdi eller ROI», ikke «test taskBreakdown()».
