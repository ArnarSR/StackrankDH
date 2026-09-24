// Structured targets keep the rule and the fields it describes together.
export function problem(message,scope,id,fields){return {message,targets:fields.map(field=>({scope,id,field}))};}
export const formatValue=value=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:6}).format(value);
export function orderedProblem(values,label,target,{nonnegative=true,unit=''}={}){
  for(const key of ['low','expected','high']){
    if(!Number.isFinite(values?.[key]))return target(`${label}: skriv inn et gyldig tall.`,key);
    if(nonnegative&&values[key]<0)return target(`${label}: anslaget kan ikke være negativt.`,key);
  }
  const show=v=>formatValue(v)+(unit?' '+unit:'');
  if(values.low>values.expected)return target(`${label}: lav (${show(values.low)}) er høyere enn forventet (${show(values.expected)}). Senk lavt anslag eller øk forventet anslag.`,'low','expected');
  if(values.expected>values.high)return target(`${label}: forventet (${show(values.expected)}) er høyere enn høy (${show(values.high)}). Senk forventet anslag eller øk høyt anslag.`,'expected','high');
  return null;
}
