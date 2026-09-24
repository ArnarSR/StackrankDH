import {problem} from './validation.mjs';
import {scenario,costCaseFor,horizons} from './model.mjs';
import {costBreakdown} from './resources.mjs';
export const HORIZON_MONTHS=24,WEEKS_PER_MONTH=52/12;
// Now/Next/Later som månedsintervaller. Later har ingen øvre grense.
export const horizonMonths={now:[0,3],next:[3,12],later:[12,Infinity]};
export const keyResults=roadmap=>(roadmap.objectives??[]).flatMap(o=>(o.keyResults??[]).map(k=>({...k,objectiveId:o.id,objectiveTitle:o.title})));
export const seedRoadmap=()=>({
 vision:{statement:'Kunder med bredbånd fra oss opplever at nettet hjemme bare virker.',note:'Illustrativ visjon. Endrer ingen økonomiske tall.'},
 objectives:[
  {id:'obj-retention',title:'Færre kunder forlater bredbåndet',note:'Illustrativt objective.',keyResults:[
   {id:'kr-churn',title:'12-måneders churn i bredbånd ned fra 10 % til 9 %',note:'Illustrativt måltall.'},
   {id:'kr-repeat',title:'Halvere andelen kunder med gjentatte feil',note:'Illustrativt måltall.'}]},
  {id:'obj-experience',title:'Wi-Fi hjemme oppleves som pålitelig',note:'Illustrativt objective.',keyResults:[
   {id:'kr-coverage',title:'Andel som rapporterer god dekning opp fra 62 % til 75 %',note:'Illustrativt måltall.'},
   {id:'kr-contacts',title:'20 % færre henvendelser om Wi-Fi',note:'Illustrativt måltall uten tiltak ennå.'}]}],
 scenarios:[
  {id:'sc-platform',name:'Plattform først',note:'Bygger telemetri før diagnostikk, og tar adopsjon etterpå.',order:['telemetry','diagnostics','adoption']},
  {id:'sc-quick',name:'Rask gevinst først',note:'Hopper over plattformarbeidet og tar det som kan leveres raskt.',order:['adoption','wifi']}]});
// Sekvensielt: ett tiltak av gangen, i oppgitt rekkefølge. Kalendertid hentes fra teamdataene.
export function schedule(list,key='expected'){
 const costCase=costCaseFor(key);let week=0;
 return list.map(t=>{
  const {duration}=costBreakdown(t,costCase);
  const startWeek=week,endWeek=week+duration;week=endWeek;
  const startMonth=Math.floor(startWeek/WEEKS_PER_MONTH),landing=Math.ceil(endWeek/WEEKS_PER_MONTH);
  return {id:t.id,name:t.name,duration,startWeek,endWeek,startMonth,landing,
   workMonths:Math.max(1,landing-startMonth),
   effectMonths:Math.max(0,HORIZON_MONTHS-landing),
   beyondHorizon:landing>=HORIZON_MONTHS};
 });
}
export function scenarioCurve(order,items,key='expected'){
 const costCase=costCaseFor(key);
 const list=(order??[]).map(id=>items.find(t=>t.id===id)).filter(Boolean);
 const plan=schedule(list,key);
 const months=Array.from({length:HORIZON_MONTHS},()=>({gross:0,operating:0,labor:0,once:0}));
 const rows=plan.map((p,i)=>{
  const t=list[i],b=costBreakdown(t,costCase),c=scenario(t,key);
  const applied={gross:0,operating:0,labor:0,once:0};
  const apply=(m,field,value)=>{if(m>=0&&m<HORIZON_MONTHS){months[m][field]+=value;applied[field]+=value}};
  apply(p.startMonth,'once',b.once);
  for(let m=p.startMonth;m<p.startMonth+p.workMonths;m++)apply(m,'labor',b.labor/p.workMonths);
  for(let m=p.landing;m<HORIZON_MONTHS;m++){apply(m,'gross',c.gross/12);apply(m,'operating',b.annual/12)}
  return {...p,gross:c.gross,annual:b.annual,once:b.once,labor:b.labor,portfolioNet:c.net,applied,
   horizonNet:applied.gross-applied.operating-applied.labor-applied.once};
 });
 let running=0;
 const curve=months.map((m,month)=>{const net=m.gross-m.operating-m.labor-m.once;running+=net;return {month,...m,net,cumulative:running}});
 return {rows,curve,net:running,finishWeek:plan.at(-1)?.endWeek??0,beyondHorizon:rows.filter(r=>r.beyondHorizon).map(r=>r.id)};
}
export function compareScenarios(orderA,orderB,items,key='expected'){
 const a=scenarioCurve(orderA,items,key),b=scenarioCurve(orderB,items,key);
 return {a,b,delta:b.net-a.net,deltaCurve:a.curve.map((m,i)=>({month:m.month,delta:b.curve[i].cumulative-m.cumulative}))};
}
// Låst verdi: hva et tiltak gjør mulig. Summeres aldri inn i en total — verdiene overlapper i en kjede.
export function unlocks(items,key='expected'){
 const byId=new Map(items.map(t=>[t.id,t]));
 const dependents=id=>items.filter(x=>(x.requires??[]).includes(id));
 return items.map(t=>{
  const seen=new Set();
  const walk=id=>{for(const d of dependents(id))if(!seen.has(d.id)){seen.add(d.id);walk(d.id)}};
  walk(t.id);
  const downstream=[...seen];
  return {id:t.id,direct:dependents(t.id).map(x=>x.id),downstream,
   unlockedNet:downstream.reduce((sum,id)=>sum+scenario(byId.get(id),key).net,0)};
 });
}
// Ufullstendig planlegging er en normal tilstand, ikke en valideringsfeil.
export function coverage(roadmap,items){
 const krs=keyResults(roadmap),krIds=new Set(krs.map(k=>k.id));
 const linked=id=>items.filter(t=>(t.keyResultIds??[]).includes(id));
 return {
  keyResultsWithoutMeasures:krs.filter(k=>!linked(k.id).length),
  measuresWithoutKeyResult:items.filter(t=>!(t.keyResultIds??[]).length),
  staleLinks:items.filter(t=>(t.keyResultIds??[]).some(id=>!krIds.has(id))),
  unplaced:items.filter(t=>!t.horizon),
  byHorizon:Object.keys(horizons).map(horizon=>({horizon,measures:items.filter(t=>t.horizon===horizon)}))};
}
// Uenighet mellom plassert horisont og beregnet landing er innsikt, ikke feil.
export function placementSignals(order,items,key='expected'){
 const byId=new Map(items.map(t=>[t.id,t]));
 return scenarioCurve(order,items,key).rows.flatMap(r=>{
  const horizon=byId.get(r.id)?.horizon;if(!horizon)return [];
  const [from,to]=horizonMonths[horizon];
  return r.landing<from||r.landing>=to?[{id:r.id,name:r.name,horizon,landing:r.landing,from,to}]:[];
 });
}
function findCycle(items){
 const byId=new Map(items.map(t=>[t.id,t])),state=new Map(),stack=[];
 const visit=id=>{
  if(state.get(id)==='done')return null;
  if(state.get(id)==='open')return stack.slice(stack.indexOf(id)).concat(id);
  state.set(id,'open');stack.push(id);
  for(const req of byId.get(id)?.requires??[]){if(!byId.has(req))continue;const cycle=visit(req);if(cycle)return cycle}
  stack.pop();state.set(id,'done');return null;
 };
 for(const t of items){const cycle=visit(t.id);if(cycle)return cycle}
 return null;
}
export function validateRoadmap(roadmap,items){return validateRoadmapIssue(roadmap,items)?.message??'';}
export function validateRoadmapIssue(roadmap,items){
 const byId=new Map(items.map(t=>[t.id,t])),label=id=>byId.get(id)?.name??id;
 for(const t of items){
  const fail=(message,...fields)=>problem(message,'measure',t.id,fields);
  if((t.requires??[]).includes(t.id))return fail(`«${t.name}» kan ikke forutsette seg selv. Fjern koblingen.`,'requires');
  for(const req of t.requires??[])if(!byId.has(req))return fail(`«${t.name}» forutsetter et tiltak som ikke finnes lenger. Velg forutsetningen på nytt.`,'requires');
 }
 const cycle=findCycle(items);
 if(cycle)return {message:`Sirkulær avhengighet: ${cycle.map(label).map(n=>`«${n}»`).join(' forutsetter ')}. Fjern én av koblingene.`,
  targets:cycle.slice(0,-1).map(id=>({scope:'measure',id,field:'requires'}))};
 for(const s of roadmap.scenarios??[]){
  const order=s.order??[],position=new Map();
  const fail=(message,...fields)=>problem(`Scenario «${s.name}»: ${message}`,'scenario',s.id,fields);
  for(const [i,id] of order.entries()){
   if(!byId.has(id))return fail('et tiltak i rekkefølgen finnes ikke lenger. Fjern det fra scenarioet.',`order.${id}`);
   if(position.has(id))return fail(`«${label(id)}» står flere ganger i rekkefølgen. Fjern duplikatet.`,`order.${id}`);
   position.set(id,i);
  }
  for(const id of order)for(const req of byId.get(id).requires??[]){
   if(!position.has(req))return fail(`«${label(id)}» forutsetter «${label(req)}», som ikke er med i scenarioet. Legg til «${label(req)}» før «${label(id)}», eller fjern koblingen.`,`order.${id}`);
   if(position.get(req)>position.get(id))return fail(`«${label(id)}» ligger før sin forutsetning «${label(req)}». Flytt «${label(id)}» etter «${label(req)}».`,`order.${id}`);
  }
 }
 return null;
}
