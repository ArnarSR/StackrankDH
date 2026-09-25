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
- Scenariosammenligning over 24 måneder med kumulativ nettoverdikurve, redigerbar rekkefølge og forutsetningene synlig ved siden av. Kurven markerer hvor hvert tiltak lander og når planen går i null.
- Foreslått rekkefølge etter CD3 (månedlig driftsbidrag delt på varighet), som respekterer forutsetninger mellom tiltak.
- Roller med ferdigheter og kapasitet, og kapasitetsbruk per rolle på tvers av tiltakene.
- Oppgaver brutt ned per teamrad, med «hvem må være med» og avvik mot teamradens ressursuker.
- GitHub uten innlogging: oppgaver kan lenkes til en issue, åpnes som ferdig utfylt issue, eller eksporteres til CSV.
- WIP-grense per scenario som viser hva parallelt arbeid koster i tid og verdi, med kildene på [faq.html](dist/faq.html).
- Redigerbare kostnadsposter med type (årlig/engang), grunnlag (kjent/anslag), lav/forventet/høy og kildenotat.
- Redigerbare team med leveranse, bemanning og varighet i tre scenarioer, oppstart, ukesats og valg om kostnaden inngår.
- Kostnadsfordeling, samlet ressursinnsats, gjennomføringsplan og teambelastning på tvers av tiltak.
- Risiko- og avhengighetsregister med konsekvens, sannsynlighet (for risiko), konsekvensgrad, status, ansvarlig, håndtering, varselsignal og kildereferanse. Blokkerte avhengigheter og åpne risikoer med høy konsekvens synliggjøres i porteføljen.
- Kilderegister per tiltak: tittel, lenke, type, dato/versjon og notat. Én valgt kilde kan knyttes til churn-effekten og hver kostnads-/teamrad og risiko/avhengighet. Flere kilder kan registreres i registeret. Interne dokumenter kan refereres uten URL.
- Norsk beløpsformat, responsive visninger og tastaturbetjening.

Data lagres lokalt i din egen nettleser og kan eksporteres til fil — se [Lagring](#lagring). Ingen kundedata sendes til en server. Google Fonts brukes for skrifter, med lokale sans-serif-fallbacks. Dette er fortsatt en prototype uten database, innlogging eller delt lagring: data ligger hos én bruker, i én nettleser, på én maskin.

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

Kildelenker åpnes i ny fane. Kilder lagres lokalt sammen med tiltakene. Ingen referanser eller eksempelstudier er fabrikkert; eksemplene har ingen registrerte kilder. Registrering av en kilde endrer ikke automatisk evidensnivå eller økonomiske tall.

Risiko og avhengigheter endrer ikke økonomiske resultater automatisk. Åpne risikoer med høy konsekvens flagges uavhengig av sannsynlighet; dette er ingen beregnet risikoscore. Juster churn-, rekkevidde-, kostnads- og tidsanslag manuelt når risikovurderingen gir grunnlag for det. Eksempelrisikoene er illustrative. Manglende registrering betyr ikke at et tiltak er risikofritt.

Strategisk fit (lav/middels/høy, med eget notat) er en egen, synlig vurdering av hvor godt tiltaket støtter valgt produktstrategi. Den kan brukes til sortering, men endrer aldri nettoverdi, ROI eller evidensnivå. Eksempelverdiene er illustrative.

## Veikart og scenarioer

Veikartet og scenariosammenligningen ligger på samme side som porteføljen og bruker de samme tiltakene i minnet. Objectives, key results og visjon er en egen, kvalitativ ramme: de kan brukes til å se dekning, men endrer ingen økonomiske tall.

Et enablende tiltak er ikke en egen type. Det er et tiltak med null churn-effekt som et annet tiltak forutsetter; gevinsten blir null av seg selv. På tiltaket som forutsettes vises «låser opp» — summen av nettoverdien til tiltakene det gjør mulig. Beløpet summeres aldri inn i porteføljen eller i en scenariototal, og det overlapper mellom ledd i en kjede: hvis A låser opp B som låser opp C, telles C i både A og B. En sum på tvers ville derfor vært meningsløs.

Scenarioene er ordnede lister. Arbeidet følger scenarioets WIP-grense og tapstabellen i parametrene; med WIP 1 skjer det sekvensielt. Hvert tiltak bruker sin egen kalendertid fra teamdataene. Landingsmåneden er der effekten starter. Kurven er kumulativ nettoverdi måned for måned: bruttogevinst delt på 12 og årlige driftskostnader delt på 12 løper fra landing, lønn fordeles over arbeidsmånedene, og engangskostnaden belastes ved oppstart. Et tiltak som lander etter måned 24 bidrar med null; det klippes ikke inn i horisonten.

**Veikartets tall er ikke porteføljens tall.** Porteføljen viser alltid ett helt driftsår per tiltak. Veikartet viser bare det som rekker å inntreffe innen 24 måneder i den valgte rekkefølgen — det kan bli både mindre (sen landing) og mer (over ett års drift innenfor horisonten). Begge vises ved siden av hverandre i tabellen under kurven. Forskjellen mellom to scenarioer er alternativkostnaden; ikke legg en egen utsettelsesberegning oppå. Summene er ikke korrigert for overlapp mellom tiltak.

Plassering i Now/Next/Later er en intensjon og valideres ikke mot beregnet landing. Når de er uenige, vises det som et eget signal — det er en av de mest nyttige observasjonene verktøyet gir.

### Foreslått rekkefølge (CD3)

«Foreslå rekkefølge» sorterer tiltakene etter CD3: månedlig driftsbidrag (bruttogevinst minus årlig driftskostnad, delt på 12) delt på varighet i måneder. Høyest først, men et tiltak slipper aldri foran sine forutsetninger — uten den regelen ville enablere, som har CD3 lik null, havnet sist.

CD3 er rent økonomisk. Evidens, risiko og strategisk fit inngår ikke og må vurderes ved siden av; forslaget er et utgangspunkt for diskusjon, ikke en beslutning.

To forbehold er verdt å merke seg. Forslaget sekvenserer **alle** tiltak — det svarer på rekkefølge, ikke på hva som bør droppes. Og fordi planer kan ha ulikt omfang, er totalen for en plan med fem tiltak ikke sammenlignbar med en plan som inneholder to; sammenlign kurveformen og nullpunktet, ikke bare sluttsummen.

## Roller, oppgaver og GitHub

Rollelisten definerer hvilke roller teamet har, med enkle ferdigheter og tilgjengelig kapasitet i fulltidsekvivalenter. Teamrader på et tiltak kan peke på en rolle; gjør de ikke det, havner innsatsen i «ufordelt etterspørsel» i stedet for å forsvinne. Kapasitetstabellen viser etterspurte ressursuker mot tilgjengelige rolleuker over horisonten.

Oppgaver hører til en teamrad. **Oppgaver påvirker aldri økonomien** — teamraden er fortsatt eneste kilde til kostnad. Summen av oppgavenes estimat holdes mot teamradens ressursuker, og differansen vises som «ikke brutt ned ennå» eller «over teamraden» i stedet for å avstemmes i stillhet. Oppgaver som peker på en slettet teamrad blir synlige, ikke borte.

GitHub-integrasjonen bruker ingen innlogging. Projects v2 er GraphQL-only og krever `read:project`, og en statisk side har ingen trygg plass å oppbevare en token. I stedet bygger verktøyet forhåndsutfylte issue-URL-er som du selv sender inn på github.com, og lar deg lime inn en issue-lenke tilbake. Ingenting sendes automatisk, og verktøyet leser ikke status tilbake fra GitHub.

## Lagring

Alt du skriver inn lagres automatisk i **din egen nettleser** (`localStorage`), og er der neste gang du åpner siden på samme maskin i samme nettleser. Porteføljesiden og prioriteringslaben har hver sin nøkkel, fordi de har hver sin datamodell.

- **Eksporter til fil** laster ned hele arbeidsflaten som JSON, til sikkerhetskopi eller for å flytte mellom maskiner.
- **Importer fra fil** leser en slik fil tilbake. Filen valideres først: feil app, feil versjon eller feil struktur avvises, og ingenting endres.
- **Nullstill** sletter lagret data og henter eksempeldataene tilbake. Krever bekreftelse i to steg.

Denne utgaven bruker **lagringsversjon 2**. Versjon 1 avvises med forklaring. Ved avvist lokal lagring stoppes automatisk lagring, slik at gamle data ikke overskrives av eksempeldata. Porteføljens eksportknapp laster da ned den opprinnelige lagringen. Bruk tidligere utgave for å arbeide videre med versjon 1, eller nullstill eksplisitt for å starte på nytt.

Lagret data har et versjonsnummer. Endres datamodellen senere, avvises gammel data med en forklaring i stedet for å lastes halvveis inn — en halvt gjenopprettet arbeidsflate er farligere enn eksempeldata.

Nettleserlagring kan feile: privat modus, full kvote eller blokkerte nettsteddata. Appen fanger det, sier fra i statuslinjen og fortsetter å virke i minnet. Får du den meldingen, eksporter til fil.

**Dette er ikke delt lagring.** Data ligger bare hos deg, i én nettleser på én maskin. Tømmer du nettleserdata, er det borte. Skal flere jobbe i samme tall, må dere enten dele en eksportfil eller bygge ekte skylagring med backend.

## Parametre

Kundebase og kundeverdi settes ett sted, øverst på porteføljesiden.

Kundeverdien settes **sammen av deler** i stedet for som ett fritt tall: dekningsbidrag per kunde per måned × antall måneder innen horisonten, pluss eventuell gjenvinningskostnad. Antall måneder kappes ved 12, og verktøyet sier fra hvis du prøver å strekke deg forbi. Det er med vilje: modellskille 2 sier at kundeverdi er inkrementelt dekningsbidrag innen 12 måneder, ikke omsetning eller full livstidsverdi, og et fritt felt inviterer til å bryte den regelen.

Tiltak arver standarden. Endrer du den, følger alle tiltak som ikke har satt sin egen verdi automatisk med. Tiltak som **har** satt sin egen verdi røres aldri — de beholder den og listes som avvik («Foreldrekontroll: 5 500 kr mot standard 6 000 kr»). I tiltaksdialogen er kundeverdifeltet låst til standarden inntil du huker av for egen verdi.

Tapstabellen for kontekstbytte kan redigeres i parameterpanelet, med gjennomstrømning ved siden av hvert nivå. Ett tiltak har 0 % tap som referanse; 2–5 samtidige kan justeres fra 0 til under 100 %. Ved 6–8 brukes tapet ved fem. Ugyldige verdier endrer ikke beregningen. Veikartet bruker tabellen i både kurver og plasseringssignaler. Laben har samme kontroll, men egne lagrede verdier.

Ukesats settes én gang per rolle under «Roller, ferdigheter og kapasitet», lenket fra parametrene. Teamrader arver rollens sats. «Egen ukesats» beholder radens verdi når standarden endres, og avvik vises i parameterpanelet. Bytter du rolle uten overstyring, følger satsen den nye rollen. Slettet rolle beholder siste sats og vises som uavklart og ufordelt etterspørsel. Oppgaver endrer fortsatt ingen kostnader.

Key results har startverdi, siste måling, mål, enhet, måledato og kilde/notat. Fremdrift = (siste måling − startverdi) / (mål − startverdi), også for synkende mål. Tilbakegang og overoppfyllelse vises som faktiske prosenter; manglende måling eller lik start/mål gir ingen prosent. Eksempeldataene har ingen registrert måling. Fremdrift påvirker aldri økonomien.

Horisonten er fortsatt 24 måneder og ikke konfigurerbar.

## Nåkostnader

Nåkostnadspanelet viser hva dagens problemer koster mens de får stå: berørte kunder × hendelser per år × kostnad per hendelse. Summen vises per år, over 24 måneder, og som påvirkbart bruttopotensial. Hvert problem merkes som målt, anslått eller antatt, og kan knyttes til tiltakene som adresserer det — så det blir synlig hvilke problemer ingen jobber med.

**Dette er et eget regnskap.** Problemkostnad er ikke tiltaksverdi og summeres aldri inn i en plan eller et scenario. Påvirkbar andel er et anslag på hvor mye som i prinsippet kan fjernes, ikke en gevinst noen har lovet. Et tiltak som adresserer et problem har sin egen verdi i porteføljen; de to skal ikke legges sammen.

«Gjør ingenting» kan vises som referanselinje på scenariokurven, men er **av som standard**: nåkostnaden er gjerne en størrelsesorden større enn planverdiene og klemmer plankurvene flate. Slås den på, varsler verktøyet om nettopp det.

## Parallellitet

Hvert scenario har en WIP-grense: hvor mange tiltak som kan gå samtidig. Flere parallelle tiltak starter tidligere, men hvert enkelt tar lenger tid, fordi effektiv varighet = varighet ÷ (1 − tap). Standardtapet er Weinbergs tabell, som er en **erfaringsregel og ikke en måling**.

Regnet om til gjennomstrømning gir de tallene en omvendt U: 2 samtidige gir 1,60×, 3 gir 1,80×, 4 gir 1,60× og 5 gir 1,25×. Optimum rundt tre. Kildene, uenigheten mellom dem og alle forbehold ligger på [faq.html](dist/faq.html).

Tapet treffer kalendertid, ikke kostnad: et tiltak blir ikke dyrere av å gå saktere, men lander senere og rekker dermed færre effektmåneder innen horisonten. Tapet bruker WIP-innstillingen som konstant, ikke faktisk samtidighet time for time.

### To tidsmodeller

Prioriteringslaben er konvergert mot veikartets tidsmodell. Begge bruker nå samme motor i `dist/timeline.mjs`: 24 måneders horisont, månedlig opptjening fra landingsmåned, og samme parallellitetsfaktor. De har fortsatt hver sin datamodell — laben regner på frittstående alternativer med årlig bruttogevinst, veikartet på porteføljens churn-tiltak — men tiden behandles likt.

| Flate | Horisont | Proratering |
| --- | --- | --- |
| Tiltaksporteføljen | 12 måneder | Nei — brukeren justerer rekkevidde og kundeverdi selv |
| Veikart, scenarioer og prioriteringslab | 24 måneder, månedlig | Ja, fra landingsmåned |

Porteføljen står bevisst utenfor: den svarer på «hva er dette tiltaket verdt som business case», ikke «når inntreffer det». Den skal fortsatt ikke proratere automatisk.

**Konvergeringen endret labens tall.** Der laben før proraterte én årsgevinst mot uke 52, opptjener den nå månedlig i inntil 24 måneder. Leveranser som lander tidlig er derfor verdt vesentlig mer enn før. Laben har også fått en WIP-innstilling, siden den bruker samme scheduler.

## Prioriteringslab

Åpne `/prioritering.html` eller lenken fra tiltaksporteføljen. Laben er en separat prototype med egne eksempeldata; tall og kundebase synkroniseres ikke mellom de to sidene.

- Sammenlign to redigerbare utvalg av arbeid med samme teamkapasitet, endre rekkefølge og legg til alternativer.
- Se hovedanslag, lavt/høyt verdiutfall, kapasitetsbrudd og gevinst fra validert/uvalidert arbeid separat.
- Beregn utsettelseskostnad for validerte tiltak med en justerbar forsinkelse.
- Beskriv et kundeproblem og beregn dagens hendelseskostnad og et lavt/forventet/høyt bruttopotensial.
- Sett av innsats til et valideringsløp med ansvar, målepunkt, risiko og stopp-/videreføringskriterium. Innsiktsarbeid tilfører kostnad, ingen automatisk gevinst.
- Knytt flere dokumentlenker til hvert alternativ og kundeproblemet: én linje per referanse, `Tittel | https://…`.

Laben bruker 24 måneder fra felles start, én felles teamkapasitet og valgt WIP/tapstabell, med konstant årlig gevinst/driftskostnad etter ferdigstillelse. Lav verdi bruker lav gevinst, høy innsats og senere ferdigstillelse; høy verdi bruker høy gevinst og lav innsats. Hele gjennomføringskostnaden belastes. Kapasitetsbrudd vises, også for høyt innsatsanslag. Dette er ikke en optimaliseringsmotor, og avhengigheter er kvalitative. Ikke-valgte alternativer gjennomføres ikke innen horisonten i planberegningen. Forsinkelsesberegningen er et separat kontrafaktisk eksempel og må ikke legges til forskjellen mellom planene. Scenarioer må ikke tolkes som sannsynligheter. Problemkostnad/potensial inngår ikke i tiltaksverdiene.

Labens nye filer er `decision-model.mjs`, `decision-app.js`, `decision.css`, `document-links.mjs` og `prioritering.html`. Metodekilder til alternativvurdering/evaluering ligger i sidens metodeavsnitt, og underbygger ikke de illustrative tallene.

## Kundebase, dokumentasjon og feilretting

Begge sidene har egne innstillinger for produktnavn, antall produktkunder og kilde/dato. Kundetallet er en avgrensning og nevner for andeler, ikke en ekstra multiplikator i eksisterende churn-formler. Adresserbare/berørte kunder kan ikke lagres over kundebasen. Senkes basen under eksisterende anslag, vises tydelig varsel og lenker til berørte tiltak; tallene endres ikke i det skjulte.

Tiltaksporteføljen viser alle dokumentreferanser ved siden av evidensen. Kildetyper inkluderer presentasjon, produktarbeid og kundeinnsikt. Kilder endrer ikke evidensklassifiseringen automatisk.

Valideringsfeil viser konkrete felt og verdier, markerer relevante inndata og flytter fokus til første feil ved lagring. Feil fjernes under retting uten å flytte fokus. `validation.mjs` gir strukturerte feltreferanser og `form-validation.mjs` kobler dem til skjemaet.

Siden henter ikke automatisk nye publiserte versjoner. En ny innlasting kreves. Inndata lagres lokalt i nettleseren, men portefølje og lab lagres hver for seg og er ikke synkronisert.
