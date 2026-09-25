import {scheduleWork,accrueMonthly,breakEvenMonth,HORIZON_MONTHS,HORIZON_WEEKS} from './timeline.mjs';
export {breakEvenMonth,HORIZON_MONTHS};
export const cases = ['low','expected','high'];
export const evidenceNames = {hypothesis:'Hypotese',benchmark:'Benchmark',observational:'Observasjon',quasi:'Kvasi-eksperiment',randomized:'Randomisert eksperiment'};
export const initialOptions = [
 {id:'diagnostics',name:'Proaktiv diagnostikk',kind:'delivery',evidence:'randomized',effort:{low:10,expected:12,high:16},benefit:{low:1800000,expected:2600000,high:3200000},annualCost:200000,once:100000,owner:'Bredbåndsteamet',source:'Illustrativt eksempel: forutsetter målt kausal effekt i relevant kundesegment. Ingen faktisk studie er lagt inn.',risk:'Avhengig av tilgang til rutertelemetri. Manglende datadekning kan redusere effekten.',metric:'Churn blant kunder med registrert Wi-Fi-feil',gate:'Bekreft effekt og datadekning før full utrulling.'},
 {id:'wifi',name:'Fjerne hyppige Wi-Fi-brudd',kind:'delivery',evidence:'quasi',effort:{low:8,expected:10,high:14},benefit:{low:1200000,expected:2000000,high:2800000},annualCost:150000,once:100000,owner:'Bredbåndsteamet',source:'Illustrativt eksempel: forutsetter kvasi-eksperiment med sammenlignbar kontrollgruppe.',risk:'Avhengig av firmware fra CPE-leverandør. Overlapp med diagnostikk må trekkes fra verdien.',metric:'Brudd per kunde og inkrementell churn',gate:'Verifiser leverandørplan og at verdien er uten overlapp med diagnostikk.'},
 {id:'feature',name:'Ny familiefunksjon i Mitt WiFi',kind:'delivery',evidence:'hypothesis',effort:{low:14,expected:18,high:24},benefit:{low:0,expected:3200000,high:6000000},annualCost:400000,once:150000,owner:'Bredbåndsteamet',source:'Illustrativ forespørsel. Ingen dokumentert betalingsvilje eller churn-effekt.',risk:'Lav adopsjon eller liten effekt på kundens problem. Ekstern tjeneste og personvernavklaring må være klare.',metric:'Aktivering, varig bruk og kausal churn-effekt',gate:'Test etterspørsel og effekt før full utvikling.'},
 {id:'discovery',name:'Avklare gjentatte Wi-Fi-henvendelser',kind:'discovery',evidence:'hypothesis',effort:{low:2,expected:4,high:6},benefit:{low:0,expected:0,high:0},annualCost:0,once:15000,owner:'Innsikt + bredbåndsteamet',source:'Illustrativt innsiktsløp koblet til kundeproblemet under.',risk:'Kontaktårsaker kan være feilklassifisert. Kundeservice må kunne knytte hendelser til samme kunde.',metric:'Gjentakelsesrate og påvirkbar kostnad per kontakt',gate:'Gå videre hvis minst 20 % av kostnaden er påvirkbar og et avgrenset løsningsforsøk kan måle reduksjonen. Stopp eller endre retning hvis dette avkreftes.'}
];
export const initialPain = {name:'Kunden må kontakte oss flere ganger om samme Wi-Fi-problem',customers:30000,incidents:2.4,unitCost:350,reach:60,reduction:{low:10,expected:25,high:40},source:'Illustrative tall. Erstatt med CRM-uttrekk, kontaktårsaksanalyse og kostnad fra økonomi.',owner:'Kundeservice / innsikt',unknown:'Hvor mye skyldes problemer vi faktisk kan løse, og hvilke kunder får varig hjelp?'};
export function painValue(p) {const burden=p.customers*p.incidents*p.unitCost;return {burden,potential:Object.fromEntries(cases.map(k=>[k,burden*p.reach/100*p.reduction[k]/100]))};}
export function isValidated(o){return o.kind==='delivery'&&['quasi','randomized'].includes(o.evidence);}
// Laben bruker samme tidsmodell som veikartet: 24 måneder, månedlig opptjening
// fra landingsmåned, og valgfri parallellitet. Arbeidets kalendertid utledes av
// innsats delt på tilgjengelige fulltidsressurser.
export function planValue(options,ids,settings,scenario='expected') {
 const effortCase=scenario==='low'?'high':scenario==='high'?'low':'expected';
 const picked=ids.map(id=>options.find(o=>o.id===id)).filter(Boolean);
 const plan=scheduleWork(picked.map(o=>({id:o.id,durationWeeks:o.effort[effortCase]/settings.fte})),
  {wip:settings.wip??1,losses:settings.losses});
 const {rows,curve,net}=accrueMonthly(plan.map((p,i)=>{
  const o=picked[i],discovery=o.kind==='discovery';
  return {...p,name:o.name,effort:o.effort[effortCase],
   annualGross:discovery?0:o.benefit[scenario],
   annualOperating:discovery?0:o.annualCost,
   once:o.once,labor:o.effort[effortCase]*settings.weeklyRate,
   validated:isValidated(o),discovery};
 }));
 const withTotals=rows.map(r=>({...r,finish:r.endWeek,
  gross:r.applied.gross,cost:r.applied.operating+r.applied.labor+r.applied.once,net:r.horizonNet}));
 const effort=withTotals.reduce((s,r)=>s+r.effort,0);
 const capacity=settings.fte*settings.weeks;
 return {rows:withTotals,curve,effort,finish:plan.at(-1)?.endWeek??0,capacity,
  feasible:effort<=capacity+1e-9,net,
  gross:withTotals.reduce((s,r)=>s+r.gross,0),
  cost:withTotals.reduce((s,r)=>s+r.cost,0),
  validatedGross:withTotals.filter(r=>r.validated).reduce((s,r)=>s+r.gross,0),
  uncertainGross:withTotals.filter(r=>!r.validated&&!r.discovery).reduce((s,r)=>s+r.gross,0),
  discoveryCost:withTotals.filter(r=>r.discovery).reduce((s,r)=>s+r.cost,0)};
}
// Eget kontrafaktisk regnestykke. Netto driftsbidrag per år × tapte uker,
// avgrenset til det som er igjen av horisonten. Legges aldri oppå planforskjellen.
export function delayValue(option,settings,weeks,scenario='expected') {
 const effortCase=scenario==='low'?'high':scenario==='high'?'low':'expected';
 const finish=option.effort[effortCase]/settings.fte;
 const lostWeeks=Math.max(0,Math.min(weeks,HORIZON_WEEKS-finish));
 return (option.benefit[scenario]-option.annualCost)*lostWeeks/52;
}
export function ordered(v){return cases.every(k=>Number.isFinite(v[k])&&v[k]>=0)&&v.low<=v.expected&&v.expected<=v.high;}
