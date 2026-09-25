import {problem} from './validation.mjs';
// Kundeverdien settes sammen av deler i stedet for som ett fritt tall, slik at
// modellskille 2 holder: inkrementelt dekningsbidrag innen 12 måneder, ikke full CLV.
export const VALUE_HORIZON_MONTHS=12;
export const seedParameters=()=>({
 product:{name:'Bredbånd / Wi-Fi',customers:250000,source:''},
 customerValue:{monthlyContribution:500,months:12,winbackCost:0,
  source:'Illustrative tall. Erstatt med dekningsbidrag per kunde fra økonomi.',
  note:'Dekningsbidrag, ikke omsetning. Kostnader tiltaket selv medfører føres som kostnadsposter.'}
});
// Månedlig dekningsbidrag × måneder innen horisonten, pluss eventuell gjenvinningskostnad.
export function customerValue(parameters){
 const v=parameters?.customerValue??{};
 const monthly=Number(v.monthlyContribution)||0;
 const requested=Number(v.months)||0;
 const months=Math.min(Math.max(requested,0),VALUE_HORIZON_MONTHS);
 const winback=Number(v.winbackCost)||0;
 return {monthly,months,requestedMonths:requested,winback,
  total:monthly*months+winback,
  capped:requested>VALUE_HORIZON_MONTHS};
}
// Tiltak uten egen overstyring følger standarden. Overstyrte tiltak røres aldri.
export function applyCustomerValue(items,parameters){
 const total=customerValue(parameters).total;
 let updated=0;
 for(const t of items??[])if(!t.valueOverride&&t.value!==total){t.value=total;updated++}
 return {total,updated};
}
// Avvik gjøres synlig i stedet for å avstemmes.
export function valueDrift(items,parameters){
 const total=customerValue(parameters).total;
 return (items??[]).filter(t=>t.valueOverride&&t.value!==total)
  .map(t=>({id:t.id,name:t.name,value:t.value,standard:total,diff:t.value-total}));
}
export function validateParameters(parameters){return validateParameterIssue(parameters)?.message??'';}
export function validateParameterIssue(parameters){
 const fail=(message,...fields)=>problem(message,'parameter',null,fields);
 const p=parameters?.product??{};
 if(!Number.isInteger(p.customers)||p.customers<0)return fail('Antall kunder med produktet må være et heltall som er 0 eller større.','product-customers');
 const v=parameters?.customerValue??{};
 if(!Number.isFinite(v.monthlyContribution)||v.monthlyContribution<0)return fail('Månedlig dekningsbidrag må være et gyldig tall som er 0 eller større.','value-monthly');
 if(!Number.isFinite(v.months)||v.months<0)return fail('Antall måneder må være et gyldig tall som er 0 eller større.','value-months');
 if(v.months>VALUE_HORIZON_MONTHS)return fail(`Kundeverdien måles innen ${VALUE_HORIZON_MONTHS} måneder. Reduser antall måneder, eller før verdi utover dette som en egen vurdering utenfor modellen.`,'value-months');
 if(!Number.isFinite(v.winbackCost)||v.winbackCost<0)return fail('Gjenvinningskostnad må være et gyldig tall som er 0 eller større.','value-winback');
 return null;
}
