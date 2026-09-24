import {problem} from './validation.mjs';
export const riskTypes={risk:'Risiko',dependency:'Avhengighet'};
export const riskLevels={low:'Lav',medium:'Middels',high:'Høy'};
export const riskStatuses={risk:{open:'Åpen',mitigating:'Tiltak pågår',closed:'Lukket'},dependency:{unconfirmed:'Uavklart',confirmed:'Bekreftet',blocked:'Blokkert'}};
export const riskIsActive=r=>r.kind==='dependency'?r.status!=='confirmed':r.status!=='closed';
export function riskSummary(t){const risks=t.risks??[];return {total:risks.length,active:risks.filter(riskIsActive).length,blocked:risks.filter(r=>r.kind==='dependency'&&r.status==='blocked').length,unconfirmed:risks.filter(r=>r.kind==='dependency'&&r.status==='unconfirmed').length,severe:risks.filter(r=>r.kind==='risk'&&riskIsActive(r)&&r.severity==='high').length,unowned:risks.filter(r=>riskIsActive(r)&&!r.owner?.trim()).length};}
export function validateRisks(t){return validateRiskIssue(t)?.message??'';}
export function validateRiskIssue(t){const ids=new Set((t.sources??[]).map(s=>s.id));for(const [i,r] of (t.risks??[]).entries()){
 const fail=(message,...fields)=>problem(`Risiko/avhengighet ${i+1}${r.title?' – '+r.title:''}: ${message}`,'risk',r.id,fields);
 if(!r.title?.trim())return fail('oppgi hva dere er avhengige av eller hva som kan gå galt.','title');
 if(!riskTypes[r.kind])return fail('velg risiko eller avhengighet.','kind');
 if(!riskStatuses[r.kind]?.[r.status])return fail('velg en gyldig status.','status');
 if(!riskLevels[r.severity])return fail('velg konsekvensgrad.','severity');
 if(r.kind==='risk'&&!riskLevels[r.probability])return fail('velg sannsynlighet.','probability');
 if(!r.consequence?.trim())return fail('beskriv konsekvensen for tiltaket.','consequence');
 if(r.sourceId&&!ids.has(r.sourceId))return fail('velg kilden på nytt; den forrige finnes ikke lenger.','sourceId');
 }return null;
}
export function seedRisks(t,index){
 const rows=[
  [{kind:'dependency',title:'Tilgang til stabil CPE-telemetri',status:'unconfirmed',severity:'high',owner:'Plattform & nettverk',consequence:'Manglende data kan redusere rekkevidden og utsette pilotstart.',action:'Verifiser datadekning og tilgang før integrasjonsarbeidet starter.',trigger:'Datadekning og kvalitet er ikke godkjent før pilot.'},{kind:'risk',title:'Feilvarsler øker belastningen på kundeservice',status:'open',probability:'medium',severity:'high',owner:'Kundeservice',consequence:'Flere henvendelser og feilrettinger kan øke kostnadene og redusere churn-effekten.',action:'Kjør en avgrenset pilot med manuell kontroll og avtal stoppkriterier.',trigger:'Andelen feilvarsler overstiger pilotens avtalte grense.'}],
  [{kind:'dependency',title:'Firmware-støtte fra CPE-leverandør',status:'blocked',severity:'high',owner:'Wi-Fi & CPE',consequence:'Uten riktig firmware kan tiltaket ikke rulles ut til den planlagte målgruppen.',action:'Avklar leveransedato og et alternativ for eksisterende utstyr.',trigger:'Ingen bekreftet leveranse til planlagt utrulling.'},{kind:'risk',title:'Effekten varierer mellom bolig- og utstyrstyper',status:'mitigating',probability:'medium',severity:'medium',owner:'Kundeopplevelse',consequence:'Et godt pilotsnitt kan overvurdere effekten i hele kundebasen.',action:'Del målingen på boligtype, utstyr og feilårsak før bred utrulling.',trigger:'Pilotutvalget er ikke representativt for målgruppen.'}],
  [{kind:'risk',title:'Lav aktivering blant familier',status:'open',probability:'high',severity:'high',owner:'App & digitale flater',consequence:'Få eksponerte kunder kan gjøre tiltaket ulønnsomt selv om lisenskostnaden er kjent.',action:'Test aktivering og vedvarende bruk i liten skala før full avtale.',trigger:'Aktiveringen er lavere enn det business caset forutsetter.'},{kind:'dependency',title:'Avklaring av personvern og leverandøravtale',status:'unconfirmed',severity:'high',owner:'Sikkerhet & personvern',consequence:'Uavklarte vilkår kan forsinke eller stoppe lanseringen.',action:'Avklar avtale og databehandling før bindende bestilling.',trigger:'Nødvendige avklaringer er ikke ferdige til beslutningspunktet.'}],
  [{kind:'risk',title:'Selvseleksjon overvurderer churn-effekten',status:'open',probability:'high',severity:'high',owner:'Produkt & innsikt',consequence:'Appbrukerne kan ha lavere churn av andre grunner; verdien kan bli vesentlig lavere enn anslått.',action:'Test med kontrollgruppe og mål inkrementell effekt.',trigger:'Resultatene bygger bare på brukere mot ikke-brukere.'}],
  [{kind:'risk',title:'Plattformen bygges uten at tiltakene som skal bruke den er besluttet',status:'open',probability:'medium',severity:'high',owner:'Plattform & nettverk',consequence:'Kostnaden påløper uten at verdien den skal låse opp blir realisert.',action:'Beslutt minst ett avhengig tiltak før byggingen starter, og følg opp at det faktisk leveres.',trigger:'Ingen avhengige tiltak er besluttet ved oppstart.'}]
 ];
 return rows[index].map((r,i)=>({id:`${t.id}-risk-${i}`,probability:'medium',sourceId:'',...r}));
}
