# Churn Studio

En fungerende norsk MVP for å sammenligne churn-tiltak i bredbånd og Wi-Fi. Ingen rammeverk eller pakkeinstallasjon er nødvendig.

## Start lokalt

Kjør `npm start` fra denne mappen, eller `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist`. Åpne http://127.0.0.1:4173. Bruk HTTP-serveren; JavaScript-moduler fungerer normalt ikke ved å dobbeltklikke HTML-filen.

## Funksjoner

- Fire illustrative tiltak, med legg til, rediger og slett.
- Lavt, forventet og høyt scenario for beholdte kunder, bruttoverdi og nettoverdi.
- Sortering etter forventet nettoverdi, lav nettoverdi, forventet ROI, beholdte kunder, evidensnivå og strategisk fit.
- Interaktiv sensitivitetsgraf med nullpunkt og separat simulering.
- Evidensnotat, segment, rekkevidde og baseline.
- Strategisk fit (lav/middels/høy) med eget notat, vist som egen kolonne og badge atskilt fra evidensnivå. Endrer ikke nettoverdi eller ROI.
- Visjon, objectives og key results, med kobling fra tiltak til key results og en dekningsrapport som viser key results uten tiltak og tiltak uten key result.
- Veikart i Now (0–3 mnd), Next (3–12 mnd) og Later (12+ mnd), med en egen kolonne for tiltak som ikke er plassert.
- Forutsetninger mellom tiltak, og «låser opp»-verdi på tiltaket som forutsettes.
- Scenariosammenligning over 24 måneder med kumulativ nettoverdikurve, redigerbar rekkefølge og forutsetningene synlig ved siden av.
- Redigerbare kostnadsposter med type (årlig/engang), grunnlag (kjent/anslag), lav/forventet/høy og kildenotat.
- Redigerbare team med leveranse, bemanning og varighet i tre scenarioer, oppstart, ukesats og valg om kostnaden inngår.
- Kostnadsfordeling, samlet ressursinnsats, gjennomføringsplan og teambelastning på tvers av tiltak.
- Risiko- og avhengighetsregister med konsekvens, sannsynlighet (for risiko), konsekvensgrad, status, ansvarlig, håndtering, varselsignal og kildereferanse. Blokkerte avhengigheter og åpne risikoer med høy konsekvens synliggjøres i porteføljen.
- Kilderegister per tiltak: tittel, lenke, type, dato/versjon og notat. Én valgt kilde kan knyttes til churn-effekten og hver kostnads-/teamrad og risiko/avhengighet. Flere kilder kan registreres i registeret. Interne dokumenter kan refereres uten URL.
- Norsk beløpsformat, responsive visninger og tastaturbetjening.

Data holdes bare i minnet i den åpne fanen og nullstilles ved ny innlasting. Ingen kundedata sendes til en server. Google Fonts brukes for skrifter, med lokale sans-serif-fallbacks. Dette er en prototype uten database, innlogging eller delt lagring i selve appen. Sites kan beskytte tilgang til den publiserte siden.

## Modell

Felles horisont er 12 måneder. Eksponerte kunder = adresserbare kunder × rekkevidde / 100. Beholdte kunder = eksponerte × absolutt churn-reduksjon i prosentpoeng / 100. Bruttoverdi = beholdte × inkrementelt dekningsbidrag per beholdt kunde innen 12 måneder. Nettoverdi = bruttoverdi − øvrige kostnadsposter − inkluderte teamkostnader. Teamkostnad = fulltidsekvivalenter × varighet i uker × kostnad per fulltidsuke. Ressursuker inkluderer alle team, også team som er utelatt fra nettoverdi. Øvrige kostnadsposter skal ikke inkludere teamkostnader som allerede er ført på en teamrad. Årlige poster gjelder hele 12-månedersperioden og prorateres ikke etter varighet.

Lavt verdiutfall kombinerer lav churn-effekt med høye kostnader; høyt verdiutfall kombinerer høy effekt med lave kostnader. Kostnadstabellen viser derimot kostnadene i stigende rekkefølge (lav/forventet/høy). Kjent beløp er likt i alle scenarioer. Bemanning og tid varieres sammen innen hvert kostnadsscenario; dette er scenarioantakelser, ikke sannsynligheter.

Team starter et valgt antall uker etter en felles oppstart. Kalenderlengde = maksimum av oppstart + varighet. Innsats = sum av bemanning × varighet. Oppstart + høy varighet må være innenfor 52 uker. Avhengigheter flyttes manuelt. Leveringstid reduserer ikke churn-effekten automatisk: juster rekkevidde og kundeverdi for når effekten oppstår. Teambelastningen er etterspurt innsats, ikke en kontroll mot tilgjengelig kapasitet eller kalenderkonflikter. Eksempelressurser og satser er illustrative, og gjør at eksempelkostnadene øker fra første versjon. ROI = nettoverdi / total kostnad × 100 %. Null kostnad gir udefinert ROI, vist som — og sortert sist. Baseline begrenser fysisk mulige scenarioer, men multipliseres ikke inn i absolutt effekt.

Forventet er et brukerdefinert hovedscenario, ikke et sannsynlighetsvektet forventningsestimat. Evidens endrer ingen økonomiske tall. Alle eksempelverdier og studietyper er konstruerte illustrasjoner. Summer er ikke korrigert for overlapp eller avhengigheter. Les også modellforklaringen i appen.

## Kode

- `dist/index.html`: innhold, tabeller og redigeringsdialog.
- `dist/styles.css`: visuell utforming og responsivitet.
- `dist/model.mjs`: ren beregningsmodell, validering, sortering og eksempeldata.
- `dist/app.js`: grensesnitt, redigering og sensitivitetsgraf.
- `dist/risks.mjs`: risikotyper, status, validering og oppsummering uten økonomisk risikoscore.
- `dist/resources.mjs`: kostnader, ressursuker, kalenderlengde og validering.
- `dist/resource-ui.mjs`: team-/kostnadsredigering, fordeling og tidsplan.
- `tests/*.test.mjs`: meningsfulle modelltester. Kjør `npm test` med Node.js 18 eller nyere.

Statisk publisering bruker innholdet i `dist/`. Ingen byggefase kreves.

Kildelenker åpnes i ny fane. Kilder lagres bare i denne økten sammen med tiltakene. Ingen referanser eller eksempelstudier er fabrikkert; eksemplene har ingen registrerte kilder. Registrering av en kilde endrer ikke automatisk evidensnivå eller økonomiske tall.

Risiko og avhengigheter endrer ikke økonomiske resultater automatisk. Åpne risikoer med høy konsekvens flagges uavhengig av sannsynlighet; dette er ingen beregnet risikoscore. Juster churn-, rekkevidde-, kostnads- og tidsanslag manuelt når risikovurderingen gir grunnlag for det. Eksempelrisikoene er illustrative. Manglende registrering betyr ikke at et tiltak er risikofritt.

Strategisk fit (lav/middels/høy, med eget notat) er en egen, synlig vurdering av hvor godt tiltaket støtter valgt produktstrategi. Den kan brukes til sortering, men endrer aldri nettoverdi, ROI eller evidensnivå. Eksempelverdiene er illustrative.

## Veikart og scenarioer

Veikartet og scenariosammenligningen ligger på samme side som porteføljen og bruker de samme tiltakene i minnet. Objectives, key results og visjon er en egen, kvalitativ ramme: de kan brukes til å se dekning, men endrer ingen økonomiske tall.

Et enablende tiltak er ikke en egen type. Det er et tiltak med null churn-effekt som et annet tiltak forutsetter; gevinsten blir null av seg selv. På tiltaket som forutsettes vises «låser opp» — summen av nettoverdien til tiltakene det gjør mulig. Beløpet summeres aldri inn i porteføljen eller i en scenariototal, og det overlapper mellom ledd i en kjede: hvis A låser opp B som låser opp C, telles C i både A og B. En sum på tvers ville derfor vært meningsløs.

Scenarioene er ordnede lister. Arbeidet skjer sekvensielt, ett tiltak av gangen, og hvert tiltak bruker sin egen kalendertid fra teamdataene. Landingsmåneden er der effekten starter. Kurven er kumulativ nettoverdi måned for måned: bruttogevinst delt på 12 og årlige driftskostnader delt på 12 løper fra landing, lønn fordeles over arbeidsmånedene, og engangskostnaden belastes ved oppstart. Et tiltak som lander etter måned 24 bidrar med null; det klippes ikke inn i horisonten.

**Veikartets tall er ikke porteføljens tall.** Porteføljen viser alltid ett helt driftsår per tiltak. Veikartet viser bare det som rekker å inntreffe innen 24 måneder i den valgte rekkefølgen — det kan bli både mindre (sen landing) og mer (over ett års drift innenfor horisonten). Begge vises ved siden av hverandre i tabellen under kurven. Forskjellen mellom to scenarioer er alternativkostnaden; ikke legg en egen utsettelsesberegning oppå. Summene er ikke korrigert for overlapp mellom tiltak.

Plassering i Now/Next/Later er en intensjon og valideres ikke mot beregnet landing. Når de er uenige, vises det som et eget signal — det er en av de mest nyttige observasjonene verktøyet gir.

### Tre tidsmodeller

Verktøyet har nå tre bevisst ulike tidsmodeller. Ikke bland dem uten en uttrykkelig beslutning:

| Flate | Horisont | Proratering |
| --- | --- | --- |
| Tiltaksporteføljen | 12 måneder | Nei — brukeren justerer rekkevidde og kundeverdi selv |
| Prioriteringslaben | 52 uker, ett team sekvensielt | Ja, fra ferdiguke |
| Veikart og scenarioer | 24 måneder, månedlig | Ja, fra landingsmåned |

## Prioriteringslab

Åpne `/prioritering.html` eller lenken fra tiltaksporteføljen. Laben er en separat prototype med egne eksempeldata; tall og kundebase synkroniseres ikke mellom de to sidene.

- Sammenlign to redigerbare utvalg av arbeid med samme teamkapasitet, endre rekkefølge og legg til alternativer.
- Se hovedanslag, lavt/høyt verdiutfall, kapasitetsbrudd og gevinst fra validert/uvalidert arbeid separat.
- Beregn utsettelseskostnad for validerte tiltak med en justerbar forsinkelse.
- Beskriv et kundeproblem og beregn dagens hendelseskostnad og et lavt/forventet/høyt bruttopotensial.
- Sett av innsats til et valideringsløp med ansvar, målepunkt, risiko og stopp-/videreføringskriterium. Innsiktsarbeid tilfører kostnad, ingen automatisk gevinst.
- Knytt flere dokumentlenker til hvert alternativ og kundeproblemet: én linje per referanse, `Tittel | https://…`.

Laben bruker 52 uker fra felles start, sekvensielt arbeid i ett team og en konstant årlig gevinst/driftskostnad etter ferdigstillelse. Lav verdi bruker lav gevinst, høy innsats og senere ferdigstillelse; høy verdi bruker høy gevinst og lav innsats. Hele gjennomføringskostnaden belastes. Kapasitetsbrudd vises, også for høyt innsatsanslag. Dette er ikke en optimaliseringsmotor, og avhengigheter er kvalitative. Ikke-valgte alternativer gjennomføres ikke innen horisonten i planberegningen. Forsinkelsesberegningen er et separat kontrafaktisk eksempel og må ikke legges til forskjellen mellom planene. Scenarioer må ikke tolkes som sannsynligheter. Problemkostnad/potensial inngår ikke i tiltaksverdiene.

Labens nye filer er `decision-model.mjs`, `decision-app.js`, `decision.css`, `document-links.mjs` og `prioritering.html`. Metodekilder til alternativvurdering/evaluering ligger i sidens metodeavsnitt, og underbygger ikke de illustrative tallene.

## Kundebase, dokumentasjon og feilretting

Begge sidene har egne innstillinger for produktnavn, antall produktkunder og kilde/dato. Kundetallet er en avgrensning og nevner for andeler, ikke en ekstra multiplikator i eksisterende churn-formler. Adresserbare/berørte kunder kan ikke lagres over kundebasen. Senkes basen under eksisterende anslag, vises tydelig varsel og lenker til berørte tiltak; tallene endres ikke i det skjulte.

Tiltaksporteføljen viser alle dokumentreferanser ved siden av evidensen. Kildetyper inkluderer presentasjon, produktarbeid og kundeinnsikt. Kilder endrer ikke evidensklassifiseringen automatisk.

Valideringsfeil viser konkrete felt og verdier, markerer relevante inndata og flytter fokus til første feil ved lagring. Feil fjernes under retting uten å flytte fokus. `validation.mjs` gir strukturerte feltreferanser og `form-validation.mjs` kobler dem til skjemaet.

Siden henter ikke automatisk nye publiserte versjoner. En ny innlasting kreves. Inndata finnes bare i minnet i den åpne fanen og går tapt ved ny innlasting. Navigasjonslenker mellom portefølje og lab åpnes derfor i ny fane fra hovedarbeidsflaten.
