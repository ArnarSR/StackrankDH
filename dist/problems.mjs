import {problem as fieldProblem} from './validation.mjs';
import {HORIZON_MONTHS} from './timeline.mjs';
// Hva dagens problemer koster mens de får stå. Dette er et eget regnskap:
// beløpene er ikke tiltaksverdi og summeres aldri inn i en plan.
export const problemEvidence={measured:'Målt',estimated:'Anslått',assumed:'Antatt'};
export const seedProblems=()=>[
 {id:'prob-contacts',name:'Gjentatte henvendelser om samme Wi-Fi-problem',customers:30000,frequency:2.4,unitCost:350,
  addressableShare:60,evidence:'estimated',owner:'Kundeservice',
  source:'Illustrative tall. Erstatt med kontaktårsaksanalyse og kostnad per henvendelse fra økonomi.',
  note:'Kunden tar kontakt flere ganger om samme feil.',measureIds:['diagnostics']},
 {id:'prob-visits',name:'Teknikerbesøk som kunne vært unngått',customers:4000,frequency:1.2,unitCost:2200,
  addressableShare:35,evidence:'estimated',owner:'Feltservice',
  source:'Illustrative tall. Erstatt med andel besøk uten funn fra arbeidsordresystemet.',
  note:'Utrykning der feilen kunne vært løst uten besøk.',measureIds:['diagnostics']},
 {id:'prob-manual',name:'Manuell feilsøking i drift',customers:1200,frequency:6,unitCost:900,
  addressableShare:50,evidence:'assumed',owner:'Plattform & nettverk',
  source:'Illustrativ antakelse. Ingen måling ligger bak.',
  note:'Tid som går med til å lete i logger uten standardiserte data.',measureIds:['telemetry']}
];
export const annualCost=p=>(Number(p.customers)||0)*(Number(p.frequency)||0)*(Number(p.unitCost)||0);
export const addressableCost=p=>annualCost(p)*(Number(p.addressableShare)||0)/100;
export function problemTotals(problems,horizonMonths=HORIZON_MONTHS){
 const list=(problems??[]).map(p=>({...p,annual:annualCost(p),addressable:addressableCost(p)}));
 const annual=list.reduce((s,p)=>s+p.annual,0);
 const addressable=list.reduce((s,p)=>s+p.addressable,0);
 return {list,annual,addressable,monthly:annual/12,
  horizonCost:annual/12*horizonMonths,horizonAddressable:addressable/12*horizonMonths};
}
// Kumulativ kostnad ved å la problemene stå. Egen kurve – ikke en plan.
export function doNothingCurve(problems,horizonMonths=HORIZON_MONTHS){
 const {monthly}=problemTotals(problems,horizonMonths);
 // Kumulativ verdi regnes direkte, ikke ved å summere 24 ganger, for å unngå drift.
 return Array.from({length:horizonMonths},(_,month)=>({month,monthly:-monthly,cumulative:-monthly*(month+1)}));
}
// Hvilke problemer ingen tiltak adresserer, og tiltak som peker på noe slettet.
export function problemCoverage(problems,items){
 const ids=new Set((items??[]).map(t=>t.id));
 const list=problems??[];
 return {
  unaddressed:list.filter(p=>!(p.measureIds??[]).some(id=>ids.has(id))),
  staleLinks:list.filter(p=>(p.measureIds??[]).some(id=>!ids.has(id))),
  byProblem:list.map(p=>({id:p.id,name:p.name,measures:(p.measureIds??[]).filter(id=>ids.has(id))}))};
}
export function validateProblems(problems){return validateProblemIssue(problems)?.message??'';}
export function validateProblemIssue(problems){
 const seen=new Set();
 for(const [i,p] of (problems??[]).entries()){
  const fail=(message,...fields)=>fieldProblem(`Problem ${i+1}${p.name?' – '+p.name:''}: ${message}`,'problem',p.id,fields);
  if(!p.name?.trim())return fail('gi problemet et navn.','name');
  if(seen.has(p.id))return fail('problemet har en duplisert ID.','name');seen.add(p.id);
  for(const [key,label] of [['customers','Antall berørte'],['frequency','Hendelser per kunde'],['unitCost','Kostnad per hendelse']])
   if(!Number.isFinite(p[key])||p[key]<0)return fail(`${label} må være et gyldig tall som er 0 eller større.`,key);
  if(!Number.isFinite(p.addressableShare)||p.addressableShare<0||p.addressableShare>100)
   return fail('påvirkbar andel må være mellom 0 og 100 %.','addressableShare');
  if(!problemEvidence[p.evidence])return fail('velg om tallet er målt, anslått eller antatt.','evidence');
 }
 return null;
}
