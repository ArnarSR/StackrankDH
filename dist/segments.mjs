import {problem} from './validation.mjs';
// Kundebasen deles i segmenter som ikke overlapper: hver kunde hører til nøyaktig
// ett. Da kan et tiltak treffe flere segmenter uten at noen kunde telles to ganger.
//
// Rekkevidde er delt i to trinn med ulikt evidensgrunnlag:
//   TAM = segmentets størrelse
//   SAM = andelen som har behovet eller kan bruke tiltaket  («hvor mange kunne»)
//   SOM = andelen av SAM som faktisk påvirkes eller tar det i bruk («hvor mange vil»)
// eksponerte = TAM × SAM/100 × SOM/100 — fortsatt én kjede, så rekkevidde
// anvendes bare én gang (modellskille 1).
export const seedSegments=()=>[
 {id:'seg-families',name:'Familier med barn',customers:75000,sourceId:'',note:'Husstander med barn under 18. Illustrativt tall.'},
 {id:'seg-couples',name:'Husstander uten barn',customers:120000,sourceId:'',note:'To eller flere voksne, ingen barn. Illustrativt tall.'},
 {id:'seg-single',name:'Enpersonshusstander',customers:40000,sourceId:'',note:'Illustrativt tall.'},
 {id:'seg-business',name:'Små bedrifter',customers:15000,sourceId:'',note:'Bedriftskunder på samme bredbåndsprodukt. Illustrativt tall.'}
];
export const segmentById=(segments,id)=>(segments??[]).find(s=>s.id===id)??null;
export const segmentName=(segments,id)=>segmentById(segments,id)?.name??'';
export function segmentTotals(segments,productCustomers=0){
 const total=(segments??[]).reduce((n,s)=>n+(Number(s.customers)||0),0);
 return {total,base:productCustomers,remaining:productCustomers-total,over:total>productCustomers};
}
export const rowExposed=(row,segment)=>
 (Number(segment?.customers)||0)*(Number(row?.sam)||0)/100*(Number(row?.som)||0)/100;
// Utleder tiltakets samlede tall fra segmentradene. Skalarene er resultater, ikke
// en alternativ inndata – derfor kan modellen ellers stå urørt.
export function deriveMeasure(t,segments,fallbackValue){
 const rows=(t?.segmentImpact??[]).map(row=>{
  const segment=segmentById(segments,row.segmentId);
  const exposed=rowExposed(row,segment);
  return {...row,segment,tam:Number(segment?.customers)||0,exposed,
   value:Number.isFinite(row.valueOverride)?row.valueOverride:fallbackValue};
 }).filter(r=>r.segment);
 if(!rows.length)return null;
 const customers=rows.reduce((n,r)=>n+r.tam,0);
 const exposed=rows.reduce((n,r)=>n+r.exposed,0);
 // Vektet sammenslåing: eksponerte for effekt, beholdte for kundeverdi.
 const blend=key=>exposed>0?rows.reduce((n,r)=>n+r.exposed*(Number(r[key])||0),0)/exposed:0;
 const low=blend('low'),expected=blend('expected'),high=blend('high');
 const retained=rows.reduce((n,r)=>n+r.exposed*(Number(r.expected)||0)/100,0);
 const value=retained>0?rows.reduce((n,r)=>n+r.exposed*(Number(r.expected)||0)/100*r.value,0)/retained:fallbackValue;
 return {rows,customers,exposed,low,expected,high,value,
  reach:customers>0?exposed/customers*100:0};
}
// Skriver de utledede tallene tilbake på tiltakene, slik applyCustomerValue gjør.
export function applySegments(items,segments,fallbackValue){
 let updated=0;
 for(const t of items??[]){
  const derived=deriveMeasure(t,segments,fallbackValue);
  if(!derived)continue;
  Object.assign(t,{customers:Math.round(derived.customers),reach:derived.reach,
   low:derived.low,expected:derived.expected,high:derived.high,value:derived.value});
  updated++;
 }
 return updated;
}
export const usesSegments=t=>(t?.segmentImpact??[]).length>0;
export function validateSegments(segments,productCustomers){return validateSegmentIssue(segments,productCustomers)?.message??'';}
export function validateSegmentIssue(segments,productCustomers){
 const seen=new Set();
 for(const [i,s] of (segments??[]).entries()){
  const fail=(message,...fields)=>problem(`Segment ${i+1}${s.name?' – '+s.name:''}: ${message}`,'segment',s.id,fields);
  if(!s.name?.trim())return fail('gi segmentet et navn.','name');
  if(seen.has(s.id))return fail('segmentet har en duplisert ID.','name');seen.add(s.id);
  if(!Number.isInteger(s.customers)||s.customers<0)return fail('antall kunder må være et heltall som er 0 eller større.','customers');
 }
 const {total,over}=segmentTotals(segments,productCustomers);
 if(over)return problem(`Segmentene summerer til ${total.toLocaleString('nb-NO')} kunder, mer enn kundebasen på ${Number(productCustomers).toLocaleString('nb-NO')}. Segmentene skal ikke overlappe – juster størrelsene eller kundebasen.`,'segment',null,['customers']);
 return null;
}
export function validateSegmentImpact(t,segments){return validateImpactIssue(t,segments)?.message??'';}
export function validateImpactIssue(t,segments){
 const seen=new Set();
 for(const [i,row] of (t?.segmentImpact??[]).entries()){
  const name=segmentName(segments,row.segmentId);
  const fail=(message,...fields)=>problem(`Segmentrad ${i+1}${name?' – '+name:''}: ${message}`,'impact',row.segmentId,fields);
  if(!segmentById(segments,row.segmentId))return fail('velg segmentet på nytt; det forrige finnes ikke lenger.','segmentId');
  if(seen.has(row.segmentId))return fail('segmentet er brukt flere ganger. Slå radene sammen.','segmentId');seen.add(row.segmentId);
  for(const [key,label] of [['sam','SAM'],['som','SOM']])
   if(!Number.isFinite(row[key])||row[key]<0||row[key]>100)return fail(`${label} må være mellom 0 og 100 %.`,key);
  for(const key of ['low','expected','high'])
   if(!Number.isFinite(row[key]))return fail('churn-reduksjonen må være gyldige tall.',key);
  if(row.low>row.expected)return fail('lav churn-reduksjon er høyere enn forventet.','low','expected');
  if(row.expected>row.high)return fail('forventet churn-reduksjon er høyere enn høy.','expected','high');
  if(Number.isFinite(t?.baseline)&&row.high>t.baseline)return fail(`høy churn-reduksjon (${row.high} pp) overstiger baseline (${t.baseline} %).`,'high');
  if(row.valueOverride!==undefined&&row.valueOverride!==''&&(!Number.isFinite(row.valueOverride)||row.valueOverride<0))
   return fail('kundeverdien må være et gyldig tall som er 0 eller større.','valueOverride');
 }
 return null;
}
