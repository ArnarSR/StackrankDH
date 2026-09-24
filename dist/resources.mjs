import {problem,orderedProblem,formatValue} from './validation.mjs';
import {validateRiskIssue,seedRisks} from './risks.mjs';
export const cases = ['low','expected','high'];
export const sourceTypes={internal:'Internt dokument',presentation:'Presentasjon',product:'Produktarbeid / discovery',research:'Kundeinnsikt / undersøkelse',vendor:'Leverandørtilbud',analysis:'Analyse / eksperiment',external:'Ekstern referanse',assumption:'Egen antakelse'};
export function safeSourceUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}}
export const estimate = (low=0,expected=low,high=expected)=>({low,expected,high});
export function teamEffort(team,key='expected') {return team.fte[key]*team.weeks[key];}
export function costBreakdown(t,key='expected') {
  const rows=t.costItems??[
    {kind:'annual',...estimate(t.cost??0)},
    {kind:'once',...estimate(t.setup??0)}
  ];
  const annual=rows.filter(r=>r.kind==='annual').reduce((n,r)=>n+r[key],0);
  const once=rows.filter(r=>r.kind==='once').reduce((n,r)=>n+r[key],0);
  const teams=t.teams??[];
  const labor=teams.reduce((n,r)=>n+(r.includeCost?teamEffort(r,key)*r.rate:0),0);
  const effort=teams.reduce((n,r)=>n+teamEffort(r,key),0);
  const duration=teams.length?Math.max(...teams.map(r=>r.start+r.weeks[key])):0;
  return {annual,once,labor,total:annual+once+labor,effort,duration};
}
export function validateResources(t){return validateResourceIssue(t)?.message??'';}
export function validateResourceIssue(t){
 const sources=t.sources??[],ids=new Set();
 for(const [i,s] of sources.entries()){
  const fail=(message,...fields)=>problem(`Kilde ${i+1}: ${message}`,'source',s.id,fields);
  if(ids.has(s.id))return fail('referansen har en duplisert ID. Fjern den dupliserte kilden og legg den til på nytt.','title');ids.add(s.id);
  if(!s.title?.trim())return fail('oppgi en tittel eller et dokumentnavn.','title');
  if(!sourceTypes[s.type])return fail('velg en kildetype.','type');
  if(s.url&&!safeSourceUrl(s.url))return fail('bruk en full http- eller https-lenke uten brukernavn/passord, eller la lenkefeltet være tomt.','url');
 }
 if(t.effectSourceId&&!ids.has(t.effectSourceId))return problem('Velg kilden for churn-effekten på nytt; den forrige finnes ikke lenger.','main',null,['effectSourceId']);
 for(const [i,r] of (t.costItems??[]).entries()){
  const label=`Kostnadspost ${i+1}${r.name?' – '+r.name:''}`;
  const fail=(message,...fields)=>problem(`${label}: ${message}`,'cost',r.id,fields);
  if(!r.name?.trim())return fail('oppgi navn.','name');
  if(!['annual','once'].includes(r.kind))return fail('velg årlig kostnad eller engangskostnad.','kind');
  if(!['known','estimate'].includes(r.basis))return fail('velg kjent tall eller anslag.','basis');
  const order=orderedProblem(r,label,(message,...fields)=>problem(message,'cost',r.id,fields),{unit:'kr'});if(order)return order;
  if(r.basis==='known'&&(r.low!==r.expected||r.high!==r.expected))return fail('et kjent beløp må være likt i alle scenarioer. Oppdater forventet beløp eller velg anslag.','expected','basis');
  if(r.sourceId&&!ids.has(r.sourceId))return fail('velg kilden på nytt; den forrige finnes ikke lenger.','sourceId');
 }
 for(const [i,r] of (t.teams??[]).entries()){
  const label=`Team ${i+1}${r.name?' – '+r.name:''}`;
  const fail=(message,...fields)=>problem(`${label}: ${message}`,'team',r.id,fields);
  if(!r.name?.trim())return fail('oppgi teamnavn.','name');
  for(const [group,title,unit] of [['fte','bemanning','FTE'],['weeks','varighet','uker']]){
   const order=orderedProblem(r[group],`${label}, ${title}`,(message,...fields)=>problem(message,'team',r.id,fields.map(f=>`${group}.${f}`)),{unit});if(order)return order;
  }
  if(!Number.isFinite(r.rate)||r.rate<0)return fail('ukesatsen må være et gyldig tall som er 0 eller større.','rate');
  if(!Number.isFinite(r.start)||r.start<0)return fail('oppstart må være et gyldig antall uker som er 0 eller større.','start');
  if(r.start+r.weeks.high>52)return fail(`oppstart (${formatValue(r.start)} uker) + høy varighet (${formatValue(r.weeks.high)} uker) blir ${formatValue(r.start+r.weeks.high)} uker. Reduser oppstart eller høy varighet til summen er høyst 52 uker.`,'start','weeks.high');
  if(typeof r.includeCost!=='boolean')return fail('angi om teamkostnaden skal inngå.','includeCost');
  if(r.sourceId&&!ids.has(r.sourceId))return fail('velg kilden på nytt; den forrige finnes ikke lenger.','sourceId');
 }
 if(cases.some(k=>!Number.isFinite(costBreakdown(t,k).total))){const targets=[...(t.costItems??[]).flatMap(r=>cases.map(field=>({scope:'cost',id:r.id,field}))),...(t.teams??[]).flatMap(r=>['rate','fte.high','weeks.high'].map(field=>({scope:'team',id:r.id,field})))];return {message:'Samlet kostnad er for stor til å beregnes. Kontroller størrelsesordenen på beløp, bemanning og varighet.',targets};}
 return validateRiskIssue(t);
}
export function resourcePortfolio(items) {
  const groups=new Map();
  for(const t of items)for(const row of t.teams??[]){
    const key=row.name.trim().toLocaleLowerCase('nb-NO');
    if(!groups.has(key))groups.set(key,{name:row.name.trim(),low:0,expected:0,high:0,measures:new Set()});
    const g=groups.get(key);for(const k of cases)g[k]+=teamEffort(row,k);g.measures.add(t.id);
  }
  return [...groups.values()].sort((a,b)=>b.expected-a.expected).map(g=>({...g,measures:g.measures.size}));
}
export function seedResources(t,index) {
  const annual=t.cost,once=t.setup;
  const templates=[
    [['Plattform & nettverk','Integrasjon og automatisert feilretting',1,2,3,6,8,12,0,30000],['Kundeservice','Pilot og nye arbeidsprosesser',.25,.5,1,4,6,8,4,22000]],
    [['Wi-Fi & CPE','Forbedre firmware og dekning',1,2,3,8,12,16,0,30000],['Kundeopplevelse','Veiledning og brukertest',.5,1,1.5,4,6,8,4,26000]],
    [['App & digitale flater','Integrere tjenesten i kundeappen',.5,1,2,4,6,10,0,30000],['Sikkerhet & personvern','Vurdere løsning og databehandling',.2,.4,.6,2,3,5,1,32000]],
    [['App & digitale flater','Onboarding og aktiveringsflyt',.5,1,1.5,3,5,8,0,30000],['Kundeopplevelse','Kommunikasjon og adopsjonsmåling',.25,.5,1,3,4,6,2,26000]]
  ];
  return {...t,sources:[],effectSourceId:'',risks:seedRisks(t,index),costItems:[
    {id:`${t.id}-annual`,name:'Tjeneste, lisens og løpende drift',kind:'annual',basis:'estimate',...estimate(annual*.8,annual,annual*1.25),note:'Illustrativt årsbeløp. Intern teaminnsats er ikke inkludert.'},
    {id:`${t.id}-setup`,name:'Etablering hos leverandør',kind:'once',basis:'known',...estimate(once),note:'Illustrativt kjent beløp, ikke et faktisk tilbud.'}
  ],teams:templates[index].map(([name,role,fl,fe,fh,wl,we,wh,start,rate],i)=>({id:`${t.id}-team-${i}`,name,role,fte:estimate(fl,fe,fh),weeks:estimate(wl,we,wh),start,rate,includeCost:true,note:'Illustrative bemannings- og tidsanslag.'}))};
}
