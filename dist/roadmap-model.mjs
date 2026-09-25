import {problem} from './validation.mjs';
import {scenario,costCaseFor,horizons} from './model.mjs';
import {costBreakdown} from './resources.mjs';
import {HORIZON_MONTHS,WEEKS_PER_MONTH,defaultSwitchingLoss,switchingLoss,focusFactor,throughput,scheduleWork,accrueMonthly,breakEvenMonth} from './timeline.mjs';
export {HORIZON_MONTHS,WEEKS_PER_MONTH,defaultSwitchingLoss,switchingLoss,focusFactor,throughput,breakEvenMonth};
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
// Adapter: tiltakets kalendertid hentes fra teamdataene, resten er felles motor.
export function schedule(list,key='expected',options={}){
 const costCase=costCaseFor(key);
 const rows=list.map(t=>({id:t.id,durationWeeks:costBreakdown(t,costCase).duration,requires:t.requires??[]}));
 return scheduleWork(rows,options).map((row,i)=>({...row,name:list[i].name}));
}
export function scenarioCurve(order,items,key='expected',options={}){
 const costCase=costCaseFor(key);
 const list=(order??[]).map(id=>items.find(t=>t.id===id)).filter(Boolean);
 const plan=schedule(list,key,options);
 const {rows,curve,net}=accrueMonthly(plan.map((p,i)=>{
  const t=list[i],b=costBreakdown(t,costCase),c=scenario(t,key);
  return {...p,annualGross:c.gross,annualOperating:b.annual,once:b.once,labor:b.labor,
   gross:c.gross,annual:b.annual,portfolioNet:c.net};
 }));
 return {rows,curve,net,finishWeek:plan.at(-1)?.endWeek??0,beyondHorizon:rows.filter(r=>r.beyondHorizon).map(r=>r.id)};
}
export function compareScenarios(orderA,orderB,items,key='expected',optionsA={},optionsB={}){
 const a=scenarioCurve(orderA,items,key,optionsA),b=scenarioCurve(orderB,items,key,optionsB);
 return {a,b,delta:b.net-a.net,deltaCurve:a.curve.map((m,i)=>({month:m.month,delta:b.curve[i].cumulative-m.cumulative}))};
}
// CD3: månedlig netto driftsbidrag delt på varighet i måneder. Rent økonomisk –
// evidens og strategisk fit inngår ikke, og skal vurderes ved siden av.
export function costOfDelay(t,key='expected'){
 const costCase=costCaseFor(key),{annual,duration}=costBreakdown(t,costCase);
 const monthly=(scenario(t,key).gross-annual)/12;
 const months=duration/WEEKS_PER_MONTH;
 return {monthly,months,cd3:months>0?monthly/months:null};
}
// Foreslått rekkefølge: høyest CD3 først, men et tiltak slipper aldri foran sine
// forutsetninger. Enablere har CD3 = 0 og ville ellers havnet sist.
export function suggestedOrder(items,key='expected'){
 const byId=new Map(items.map(t=>[t.id,t]));
 const score=new Map(items.map(t=>[t.id,costOfDelay(t,key).cd3??0]));
 const placed=[],done=new Set();
 const place=(t,trail=new Set())=>{
  if(done.has(t.id)||trail.has(t.id))return;
  trail.add(t.id);
  for(const req of t.requires??[])if(byId.has(req))place(byId.get(req),trail);
  if(!done.has(t.id)){done.add(t.id);placed.push(t.id)}
 };
 for(const t of [...items].sort((a,b)=>score.get(b.id)-score.get(a.id)||a.name.localeCompare(b.name,'nb')))place(t);
 return placed;
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
export function placementSignals(order,items,key='expected',options={}){
 const byId=new Map(items.map(t=>[t.id,t]));
 return scenarioCurve(order,items,key,options).rows.flatMap(r=>{
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
export function validateRoadmap(roadmap,items,scenarioIds=null){return validateRoadmapIssue(roadmap,items,scenarioIds)?.message??'';}
// scenarioIds avgrenser rekkefølgesjekken til de scenarioene som faktisk vises.
// Koblinger mellom tiltak sjekkes alltid globalt: de ødelegger enhver rekkefølge.
export function validateRoadmapIssue(roadmap,items,scenarioIds=null){
 const byId=new Map(items.map(t=>[t.id,t])),label=id=>byId.get(id)?.name??id;
 for(const t of items){
  const fail=(message,...fields)=>problem(message,'measure',t.id,fields);
  if((t.requires??[]).includes(t.id))return fail(`«${t.name}» kan ikke forutsette seg selv. Fjern koblingen.`,'requires');
  for(const req of t.requires??[])if(!byId.has(req))return fail(`«${t.name}» forutsetter et tiltak som ikke finnes lenger. Velg forutsetningen på nytt.`,'requires');
 }
 const cycle=findCycle(items);
 if(cycle)return {message:`Sirkulær avhengighet: ${cycle.map(label).map(n=>`«${n}»`).join(' forutsetter ')}. Fjern én av koblingene.`,
  targets:cycle.slice(0,-1).map(id=>({scope:'measure',id,field:'requires'}))};
 for(const s of (roadmap.scenarios??[]).filter(s=>!scenarioIds||scenarioIds.includes(s.id))){
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
