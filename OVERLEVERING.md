# Overlevering: Churn Studio

Status 24. september 2026. Dette dokumentet beskriver levert løsning og kjente begrensninger; foreslått videre arbeid er ikke en bestilling på automatisk omskriving.

## Tillegg 30. september 2026 — SQL-lagring

Arnar bestilte eksplisitt planlegging og implementering av SQL-lagring. Den tidligere beslutningen om bare lokal lagring er dermed erstattet for serverutgaven. Se `SQL-PLAN.md` for planen og `SQL-STORAGE.md` for drift.

Implementert: Node HTTP-server med `pg`, migrert PostgreSQL-skjema, avgrenset approlle, JSONB-dokumenter for portefølje og lab, atomisk revisjonshistorikk, optimistisk konfliktkontroll, asynkron klientadapter og eksplisitt import av v1-porteføljedata. Nullstilling bevarer SQL-historikken. Lokal statisk modus er beholdt. Ingen modellregler eller GitHub-tokenhåndtering er endret.

Utviklingsdatabasen er `stackrankdh_dev`, testdatabasen `stackrankdh_test`. Serveren binder bare til loopback; ekstern deling, Telenor SSO og autorisasjon er ikke levert. Dev og demo må bruke forskjellige databaser ved utrulling.

Verifisert: 144 enhet-/modell-/adaptertester og 12 PostgreSQL/HTTP-integrasjonstester. Lagring/gjenlesing, samtidighet, historikkrollback, reset, isolasjon, eldre import og databasefeil er dekket. Visuell nettlesertesting er fortsatt blokkert av administratorkontrollen. Se `TESTING.md`.

## Tidligere BU-leveranse (før SQL-endringen)

Implementert fra commit `47501a7` på `feat/business-units`. Ny visning `#/business-units`: redigerbart BU-register, én `businessUnitId` per tiltak, BU per rolle og bidragsmatrise i forventede ressursuker. Hele nettoverdien tilhører tiltakets eier; deltakere utledes bare av teamradenes roller. Ukjente/slettede koblinger vises som ufordelt. Sletting krever to klikk, fjerner koblingene og bevarer økonomien. Ingen illustrative organisasjonstilknytninger er lagt inn.

Nærliggende feil rettet: tiltaksdialogen bevarer segmentrader og låser avledede felt; en slettet rolle gjør innsatsen ufordelt i stedet for usynlig; tom tiltaksportefølje kan gjenopprettes; sletting av valgt tiltak går tilbake til porteføljen.

Porteføljens lagringsversjon er økt til 2. Gammel lagring avvises etter gjeldende regel, men originaldata overskrives ikke: autolagring pauses og tidligere data kan lastes ned. Ingen migrering er implementert. Labens versjon forblir 1. Beslutningene om lokal lagring og GitHub uten token står fast.

Verifisert: 137 beståtte tester, inkludert modellregler, BU-hendelsesflyt med enkel DOM-stub, eksport/import, regresjoner og statiske smoke-sjekker. Alle JavaScript-moduler er syntakssjekket. Nettlesersjekk ble forsøkt to ganger, men administratorkontrollen kunne ikke verifiseres. Desktop, 375 px mobil, konsoll og visuell kontrast er derfor ikke verifisert. Se `TESTING.md` før publisering.

Neste foreslåtte arbeid: eksponer tapstabellen og gjennomstrømning, samle ukesats per rolle med eksplisitte overstyringer, og planlegg en validert migrering av versjon 1 til 2 med sikkerhetskopi og forhåndsvisning.

## Formål

Et norsk beslutningsverktøy for produktledere i telekom, særlig bredbånd og Wi-Fi. Brukeren vil beregne verdien av churn-tiltak, synliggjøre ressursbehov, dokumentasjon og risiko, og sammenligne leveranser med arbeid på uvaliderte kundeproblemer.

## Kjør prosjektet

Prosjektet bruker vanlig HTML, CSS og JavaScript-moduler. Ingen rammeverk, installasjon av npm-pakker eller byggefase trengs.

- `npm start` starter Node/SQL-serveren med `.env`. `npm run start:local` starter Python-serveren på http://127.0.0.1:4173.
- Alternativt: `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist`.
- `npm test` kjører modelltester med Node.js 18 eller nyere.
- Åpne `/` for porteføljen og `/prioritering.html` for prioriteringslaben.
- Ikke dobbeltklikk HTML-filene; modulene må serveres over HTTP.

Sist verifisert: 33 beståtte tester. Nettleserkontroll av validering, kundebase, dokumentlenker, kapasitetsbrudd og mobilvisning, uten observerte konsollfeil.

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
14. Segmentene overlapper ikke: hver kunde hører til nøyaktig ett. Rekkevidde er TAM × SAM × SOM — fortsatt én kjede, så modellskille 1 holder. Effekt og verdi slås sammen vektet etter eksponerte kunder, aldri som et rått gjennomsnitt.
15. Segmentene er inndata; adresserbare kunder og rekkevidde utledes. Ikke gjør skalarene redigerbare igjen når et tiltak har segmentrader – da finnes det to sannheter.
16. Risikomatrisen er en visning av sannsynlighet og konsekvens som allerede ligger på hver risiko. Ingen score, ingen påvirkning på rangeringen.
17. Kundeverdien settes sammen av deler og kappes ved 12 måneder, nettopp for å hindre at full CLV smugles inn i strid med punkt 2. Tiltak arver standarden; overstyrte tiltak endres aldri i stillhet, men listes som avvik.
18. Objectives, key results og visjon er en kvalitativ ramme. De endrer ingen økonomiske tall, og manglende kobling er en rapportert mangel, ikke en valideringsfeil.

## Kjente begrensninger

- SQL-utgaven deler arbeidsflaten mellom faner/nettlesere via lokal server. Statisk utgave bruker fortsatt `localStorage`. SQL-historikk erstatter ikke driftsbackup; se `SQL-STORAGE.md`.
- Lagret data er versjonert. Endrer du datamodellen, øk `STORAGE_VERSION` i `dist/storage.mjs`; gammel data avvises da med forklaring i stedet for å lastes halvveis inn.
- Ingen automatisk oppdatering av en åpen side når en ny versjon publiseres.
- Portefølje og lab bruker separate data, også separate kundebaseinnstillinger. De er ikke synkronisert.
- Laben modellerer én felles teamflaskehals og sekvensielt arbeid, ikke full planlegging på tvers av team.
- Summer korrigeres ikke automatisk for overlapp, og avhengigheter endrer ikke planen automatisk.
- Dokumentlenker registreres manuelt. Dokumentinnhold hentes eller verifiseres ikke automatisk.
- Ukesats settes fortsatt per teamrad (9 steder i eksempeldataene), og er ikke samlet i parametrene.
- Tapstabellen for kontekstbytte er dokumentert som justerbar og støttes av modellen, men er ennå ikke eksponert i grensesnittet. Weinberg-tallene er i praksis låst til defaultverdiene.
- Horisonten på 24 måneder er hardkodet i `dist/timeline.mjs`.
- PostgreSQL-lagring finnes lokalt. Ingen sanntidsfletting av samtidige endringer; konflikter må håndteres via eksport og ny innlasting. Ekstern SQL-hosting og SSO gjenstår.

## Filer

Les README.md for detaljer. Portefølje: `dist/index.html`, `app.js`, `model.mjs`, `resources.mjs`, `resource-ui.mjs`, `risks.mjs`. Validering: `validation.mjs`, `form-validation.mjs`. Lab: `prioritering.html`, `decision-app.js`, `decision-model.mjs`, `decision.css`. Dokumentlenker i laben: `document-links.mjs`. Felles stil: `styles.css`. Tester: `tests/*.test.mjs`.

## Publisering og tilgang

Nåværende side: https://churn-studio-bredband.arnar-s-reiten.chatgpt.site

Sist publiserte kildeversjon: `81e8f737d5ea0f4d66143ab2acafd69cadff9f3e`.

Den portable ZIP-pakken inkluderer ikke Git-historikk, autentisering eller Sites-oppsett. Publiseringstilgang til dagens adresse overføres ikke med filene. Fortsett lokalt først. Avklar tilgjengelig publiseringsmetode for samme adresse, eller publiser `dist/` på en annen avtalt statisk vertstjeneste. Ikke be om eller gjenbruk kortlivede tilganger fra den tidligere samtalen.

## Beslutninger som er tatt

- **Lagring: PostgreSQL via server-API, besluttet 30.09.2026.** Arnar bestilte endringen eksplisitt. Databaselegitimasjon forblir på serveren, JSONB bevarer modellene, og SQL-versjonen kjører foreløpig bare lokalt. Statisk hosting beholder nettleserlagring. Beslutningen fra 25.09 om ingen database er erstattet; SSO og ekstern utrulling er fortsatt egne oppgaver.
- **Tidsmodell: laben er konvergert mot veikartet.** Besluttet 25.09.2026. Felles motor i `dist/timeline.mjs`. Porteføljens 12-månedersmodell står bevisst utenfor.
- **GitHub-integrasjon: uten autentisering.** Forhåndsutfylte issue-URL-er, ikke tokenhåndtering.
- **Kundeverdi: sammensatt, kappet ved 12 måneder.** Hindrer at full CLV smugles inn i strid med modellskille 2.

## Naturlige neste beslutninger – ikke vedtatt arbeidsliste

Kobling mellom portefølje og lab (de har fortsatt hver sin datamodell og hver sin lagringsnøkkel); om ukesats, tapstabellen for kontekstbytte og horisonten skal samles i parametrene; og hvordan usikkerhet og overlapp skal håndteres ved faktisk beslutning. Bevar eksisterende fungerende løsning mens dette vurderes. Unngå rammeverksbytte uten et konkret behov.
