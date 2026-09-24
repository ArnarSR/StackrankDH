import {problem,orderedProblem,formatValue} from './validation.mjs';
import {costBreakdown,validateResourceIssue,seedResources} from './resources.mjs';
export const evidence = {hypothesis:{label:'Hypotese',rank:1},benchmark:{label:'Benchmark',rank:2},observational:{label:'Observasjon',rank:3},quasi:{label:'Kvasi-eksperiment',rank:4},randomized:{label:'Randomisert',rank:5}};
const baseExamples = [
 {id:'diagnostics',name:'Proaktiv diagnostikk',description:'Oppdag og løs bredbåndsproblemer før kunden tar kontakt. Prioriter kunder med gjentatte avbrudd.',segment:'Bredbånd · gjentatte feil',customers:100000,reach:80,baseline:10,low:.2,expected:.6,high:1,value:6000,cost:900000,setup:200000,confidence:'quasi',evidence:'Illustrasjon: Et mulig kvasi-eksperiment med sammenlignbare områder før og etter utrulling. Ingen faktisk studie ligger bak tallene. Kontroller parallelle trender, feilmønster og forskjeller i kundemiks.'},
 {id:'wifi',name:'Bedre Wi-Fi-opplevelse',description:'Bedre dekning og stabilitet gjennom optimalisering, veiledning og målrettede tiltak i hjemmet.',segment:'Wi-Fi · svak dekning',customers:160000,reach:65,baseline:9,low:.1,expected:.4,high:.8,value:6000,cost:1200000,setup:400000,confidence:'observational',evidence:'Illustrativt observasjonsgrunnlag. Sammenheng mellom Wi-Fi-kvalitet og churn kan skyldes bolig, utstyr, kundemiks og engasjement. Den kausale effekten må testes.'},
 {id:'parental',name:'Foreldrekontroll',description:'Enklere skjermtidsstyring og tryggere nett for familier med barn.',segment:'Familier · barn i husstanden',customers:75000,reach:35,baseline:7,low:-.1,expected:.25,high:.6,value:5500,cost:450000,setup:100000,confidence:'hypothesis',evidence:'Illustrativ hypotese uten målt churn-effekt. Lavscenarioet inkluderer mulig økt churn. Test behov, aktivering og bruk før en kontrollert utrulling.'},
 {id:'adoption',name:'Mitt WiFi-adopsjon',description:'Øk aktiv bruk av Mitt WiFi gjennom onboarding og relevant hjelp i kundereisen.',segment:'App · nye og inaktive brukere',customers:200000,reach:45,baseline:8,low:0,expected:.3,high:.5,value:6000,cost:400000,setup:100000,confidence:'benchmark',evidence:'Illustrativt benchmark, ikke en dokumentert effekt. Mer engasjerte kunder kan både bruke appen og ha lavere churn. Ikke tolk bruker/ikke-bruker-forskjellen som kausal.'}
];
export const examples=baseExamples.map(seedResources);
export function calculate(t, reduction=t.expected, costCase='expected'){const exposed=t.customers*t.reach/100;const retained=exposed*reduction/100;const gross=retained*t.value;const cost=costBreakdown(t,costCase).total;return {exposed,retained,gross,cost,net:gross-cost,roi:cost>0?(gross-cost)/cost*100:null,churn:t.baseline-reduction,breakEven:exposed*t.value>0?cost/(exposed*t.value)*100:null};}
export function validate(t){return validateIssue(t)?.message??'';}
export function validateIssue(t){
 const fail=(message,...fields)=>problem(message,'main',null,fields);
 if(!t.name?.trim())return fail('Gi tiltaket et navn.','name');
 const labels={customers:'Adresserbare kunder',reach:'Rekkevidde',baseline:'Baseline churn',value:'Dekningsbidrag per beholdt kunde',low:'Lav churn-reduksjon',expected:'Forventet churn-reduksjon',high:'Høy churn-reduksjon',cost:'Årlig kostnad',setup:'Engangskostnad'};
 for(const key of Object.keys(labels))if(!Number.isFinite(t[key]))return fail(`${labels[key]}: skriv inn et gyldig tall.`,key);
 if(t.customers<0||!Number.isInteger(t.customers))return fail('Adresserbare kunder må være et heltall som er 0 eller større.','customers');
 if(t.productCustomers!==undefined&&(!Number.isInteger(t.productCustomers)||t.productCustomers<0||t.customers>t.productCustomers))return fail(`Adresserbare kunder kan ikke overstige produktets kundebase (${formatValue(t.productCustomers)}). Korriger kundeanslaget eller produktinnstillingen.`,'customers');
 for(const key of ['value','cost','setup'])if(t[key]<0)return fail(`${labels[key]} kan ikke være negativ.`,key);
 for(const key of ['reach','baseline'])if(t[key]<0||t[key]>100)return fail(`${labels[key]} må være mellom 0 og 100 %.`,key);
 const order=orderedProblem(t,'Churn-reduksjon',fail,{nonnegative:false,unit:'pp'});if(order)return order;
 if(t.high>t.baseline)return fail(`Høy churn-reduksjon (${formatValue(t.high)} pp) overstiger baseline (${formatValue(t.baseline)} %). Reduser høyt anslag eller korriger baseline, slik at churn ikke blir negativ.`,'high','baseline');
 if(t.low<t.baseline-100)return fail('Lav churn-reduksjon gir churn over 100 %. Korriger lavt anslag eller baseline.','low','baseline');
 if(!evidence[t.confidence])return fail('Velg et gyldig evidensnivå.','confidence');
 return validateResourceIssue(t);
}
export function scenario(t,key='expected'){return calculate(t,t[key],key==='low'?'high':key==='high'?'low':'expected');}
export function sortMeasures(items,key){const score=t=>key==='confidence'?evidence[t.confidence].rank:key==='low'?scenario(t,'low').net:key==='roi'?(calculate(t).roi??-Infinity):key==='retained'?calculate(t).retained:calculate(t).net;return [...items].sort((a,b)=>score(b)-score(a)||calculate(b).net-calculate(a).net||a.name.localeCompare(b.name,'nb'));}
