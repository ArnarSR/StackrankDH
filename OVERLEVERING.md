# Overlevering: Churn Studio

Status 25. september 2026. De tre prioriterte handover-oppgavene i AGENTS.md er implementert: redigerbar konteksttapstabell i begge flater, ukesatsarv fra roller med synlige overstyringer, og måltall/fremdrift for key results. De øvrige punktene nedenfor krever fortsatt produktbeslutninger.

Lagringsversjonen er økt til 2. Versjon 1 lastes ikke automatisk; ved avvisning beholdes rådata og automatisk overskriving stoppes. Porteføljens eksportknapp kan ta kopi av den gamle lagringen. Tidligere versjon må brukes for å fortsette med versjon 1. Ingen migrering eller publisering er utført.

## Formål

Et norsk beslutningsverktøy for produktledere i telekom, særlig bredbånd og Wi-Fi. Brukeren vil beregne verdien av churn-tiltak, synliggjøre ressursbehov, dokumentasjon og risiko, og sammenligne leveranser med arbeid på uvaliderte kundeproblemer.

## Kjør prosjektet

Prosjektet bruker vanlig HTML, CSS og JavaScript-moduler. Ingen rammeverk, installasjon av npm-pakker eller byggefase trengs.

- `npm start` starter Python 3 sin HTTP-server på http://127.0.0.1:4173.
- Alternativt: `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist`.
- `npm test` kjører modelltester med Node.js 18 eller nyere.
- Åpne `/` for porteføljen og `/prioritering.html` for prioriteringslaben.
- Ikke dobbeltklikk HTML-filene; modulene må serveres over HTTP.

Sist verifisert: 114 beståtte tester. Nettleserkontroll av konteksttap, ukesatsarv/overstyring, bevaring av oppgaver, målfremdrift, gjenlasting, import og avvist versjon 1. Begge flater kontrollert på 375 px, uten observerte konsollfeil.

## Levert funksjonalitet

Porteføljesiden inneholder nå også en strategisk ramme (visjon, objectives, key results med dekningsrapport), et veikart i Now/Next/Later, forutsetninger mellom tiltak med «låser opp»-verdi, og en scenariosammenligning over 24 måneder med kumulativ nettoverdikurve. Disse deler tiltakene i minnet med porteføljen; det er grunnen til at de ligger på samme side og ikke som egen fane.

Porteføljen har flere redigerbare tiltak, lavt/forventet/høyt churn-utfall, brutto-/nettoverdi, ROI, strategisk fit (lav/middels/høy, med eget notat), sortering og sensitivitet. Kostnadsposter kan være årlige eller engangsbeløp, kjente eller anslåtte. Team har bemanning og varighet i tre scenarioer, oppstart og ukesats. Risikoer og avhengigheter har ansvar, konsekvens, status og håndtering. Kilderegisteret støtter dokumentlenker, kildetype, dato/versjon og hva kilden underbygger, samt kobling til effekt, kostnader, team og risiko.

Produktets totale kundebase er en egen innstilling. Adresserbare kunder må ikke overstige basen. Ved senking av basen vises varsel med lenker til tiltak som må korrigeres. Skjemafeil markerer relevante felt, forklarer verdiene og flytter fokus til feilen ved lagring; retting stjeler ikke fokus.

Prioriteringslab sammenligner to utvalg og rekkefølger av arbeid med samme teamkapasitet. Viser usikkerhet, kapasitetsbrudd, nettoverdi og gevinst fra validert/uvalidert arbeid separat. Har separat beregning av utsettelseskostnad og en kundesmerte-modell: dagens hendelseskostnad → påvirkbart bruttopotensial → avgrenset læringsinvestering med målepunkt og stoppkriterium. Dokumentlenker kan legges til alternativer og kundeproblemet.

## Bevar disse modellskillene

1. Churn-reduksjon er absolutte prosentpoeng. Beholdte kunder = adresserbare kunder × rekkevidde/100 × reduksjon i pp/100. Ikke multipliser baseline eller produktets totale kundebase inn på nytt.
2. Kundeverdi er inkrementelt dekningsbidrag innen samme 12-måneders horisont, ikke omsetning eller full CLV.
3. Lav verdi kombinerer lav effekt og høy kostnad; høy verdi kombinerer høy effekt og lav kostnad. «Forventet» er hovedanslaget, ikke et sannsynlighetsvektet estimat. Scenarioer er ikke statistiske konfidensintervaller.
4. Evidens, risiko og strategisk fit er synlige vurderinger, ikke kunstige vekter i en samlet score. Alle eksempeldata, evidensnivåer og strategisk fit-vurderinger er illustrative; ingen reelle effektstudier dokumenterer tallene.
5. Problemkostnad og mulig bruttopotensial er ikke garantert tiltaksverdi. Innsiktsarbeid får ikke automatisk gevinst i planregnskapet.
6. Alternativkostnad gjelder et konkret alternativ. Ikke legg utsettelsesberegningen oppå planforskjellen; da dobbelttelles tapet.
7. Teamkostnad er en økonomisk ressurskostnad, ikke nødvendigvis en ekstra utbetaling. Unngå å føre den på nytt i øvrige kostnadsposter.
8. Porteføljen proraterer ikke effekten etter teamets ferdiguke; brukeren må tilpasse kundeverdi/rekkevidde selv. Veikartet og prioriteringslaben deler én tidsmodell i `dist/timeline.mjs`: 24 måneder, månedlig opptjening fra landingsmåned, felles parallellitetsfaktor. Laben ble konvergert dit 25.09.2026, og tallene der endret seg som følge. Porteføljen står bevisst utenfor — ikke trekk den inn uten en uttrykkelig beslutning.
9. Låst verdi («låser opp X kr») vises ved siden av nettoverdien, aldri under, og summeres aldri inn i en total. Verdiene overlapper mellom ledd i en kjede, så en sum på tvers er meningsløs.
10. Oppgaver er en nedbryting av en teamrad, aldri en egen kostnad. Teamraden er eneste kilde til økonomi, og differansen mellom oppgavesum og teamrad rapporteres i stedet for å avstemmes.
11. Parallellitetstapet er en justerbar antakelse med Weinberg som default — en erfaringsregel, ikke en måling. Det treffer kalendertid, ikke kostnad. Se faq.html for kilder og uenigheten mellom dem.
12. GitHub-integrasjonen er bevisst uten autentisering. Ikke innfør tokenhåndtering i en statisk side uten å ta beslutningen eksplisitt.
13. Nåkostnader er et eget regnskap. Problemkostnad er ikke tiltaksverdi, summeres aldri inn i en plan, og påvirkbar andel er bruttopotensial – ikke lovet gevinst.
14. Kundeverdien settes sammen av deler og kappes ved 12 måneder, nettopp for å hindre at full CLV smugles inn i strid med punkt 2. Tiltak arver standarden; overstyrte tiltak endres aldri i stillhet, men listes som avvik.
15. Objectives, key results og visjon er en kvalitativ ramme. De endrer ingen økonomiske tall, og manglende kobling er en rapportert mangel, ikke en valideringsfeil.

## Kjente begrensninger

- Lagring skjer lokalt i nettleseren (`localStorage`) med eksport/import av JSON. Det er ikke delt lagring: data ligger hos én bruker, i én nettleser, på én maskin, og forsvinner om nettleserdata tømmes.
- Lagret data er versjonert. Endrer du datamodellen, øk `STORAGE_VERSION` i `dist/storage.mjs`; gammel data avvises da med forklaring i stedet for å lastes halvveis inn.
- Ingen automatisk oppdatering av en åpen side når en ny versjon publiseres.
- Portefølje og lab bruker separate data, også separate kundebaseinnstillinger. De er ikke synkronisert.
- Laben modellerer én felles teamflaskehals og sekvensielt arbeid, ikke full planlegging på tvers av team.
- Summer korrigeres ikke automatisk for overlapp, og avhengigheter endrer ikke planen automatisk.
- Dokumentlenker registreres manuelt. Dokumentinnhold hentes eller verifiseres ikke automatisk.
- Standard ukesats settes nå per rolle. Teamrader med overstyring beholder sin verdi og vises som avvik.
- Tapstabellen er nå redigerbar i porteføljens parametre og separat i laben. WIP 6–8 bruker tabellens siste verdi (5 samtidige).
- Horisonten på 24 måneder er hardkodet i `dist/timeline.mjs`.
- Ingen database eller delt redigering i appen. Den nåværende vertstjenesten kan styre tilgang til selve siden.

## Filer

Les README.md for detaljer. Portefølje: `dist/index.html`, `app.js`, `model.mjs`, `resources.mjs`, `resource-ui.mjs`, `risks.mjs`. Validering: `validation.mjs`, `form-validation.mjs`. Lab: `prioritering.html`, `decision-app.js`, `decision-model.mjs`, `decision.css`. Dokumentlenker i laben: `document-links.mjs`. Felles stil: `styles.css`. Tester: `tests/*.test.mjs`.

## Publisering og tilgang

Nåværende side: https://churn-studio-bredband.arnar-s-reiten.chatgpt.site

Sist publiserte kildeversjon: `81e8f737d5ea0f4d66143ab2acafd69cadff9f3e`.

Den portable ZIP-pakken inkluderer ikke Git-historikk, autentisering eller Sites-oppsett. Publiseringstilgang til dagens adresse overføres ikke med filene. Fortsett lokalt først. Avklar tilgjengelig publiseringsmetode for samme adresse, eller publiser `dist/` på en annen avtalt statisk vertstjeneste. Ikke be om eller gjenbruk kortlivede tilganger fra den tidligere samtalen.

## Beslutninger som er tatt

- **Lagring: lokalt, ikke i sky.** Besluttet 25.09.2026. Data lagres i brukerens egen nettleser, med eksport/import av JSON for sikkerhetskopi og flytting. Ekte skylagring med konto og delt database ble vurdert og valgt bort. Tre grunner ble avgjørende: GitHub Pages kan ikke kjøre backend, dataene er forretningssensitive og ville forlatt maskinen, og sikkerheten ville hvilt på tilgangsregler i en ekstern tjeneste der API-nøkkelen ligger åpent i nettleseren. **Ikke innfør innlogging eller en ekstern database uten at denne beslutningen tas om igjen eksplisitt.**
- **Tidsmodell: laben er konvergert mot veikartet.** Besluttet 25.09.2026. Felles motor i `dist/timeline.mjs`. Porteføljens 12-månedersmodell står bevisst utenfor.
- **GitHub-integrasjon: uten autentisering.** Forhåndsutfylte issue-URL-er, ikke tokenhåndtering.
- **Kundeverdi: sammensatt, kappet ved 12 måneder.** Hindrer at full CLV smugles inn i strid med modellskille 2.

## Naturlige neste beslutninger – ikke vedtatt arbeidsliste

Kobling mellom portefølje og lab (de har fortsatt hver sin datamodell og hver sin lagringsnøkkel); om tidshorisonten skal kunne endres; og hvordan usikkerhet og overlapp skal håndteres ved faktisk beslutning. Bevar eksisterende fungerende løsning mens dette vurderes. Unngå rammeverksbytte uten et konkret behov.
