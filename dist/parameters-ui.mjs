import {seedParameters,customerValue,applyCustomerValue,valueDrift,validateParameters,VALUE_HORIZON_MONTHS} from './parameters.mjs';
import {bindSwitchingLosses} from './switching-ui.mjs';
const $=id=>document.getElementById(id);
const number=(v,d=0)=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:d,minimumFractionDigits:d}).format(v);
const money=v=>number(v)+' kr';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let parameters=seedParameters(),readItems=()=>[],refreshLosses=()=>{};
export const currentParameters=()=>parameters;
export const snapshotParameters=()=>parameters;
export function restoreParameters(data){if(data){parameters={...seedParameters(),...data};refreshLosses()}}
export const standardCustomerValue=()=>customerValue(parameters).total;

export function renderParameters(){
 const v=customerValue(parameters);
 const fields=[['value-monthly',parameters.customerValue.monthlyContribution],['value-months',parameters.customerValue.months],['value-winback',parameters.customerValue.winbackCost],['product-name',parameters.product.name],['product-source',parameters.product.source],['product-customers',parameters.product.customers]];
 for(const [id,value] of fields){const el=$(id);if(el&&document.activeElement!==el&&String(el.value)!==String(value))el.value=value}
 const error=validateParameters(parameters);
 $('value-error').textContent=error;
 $('value-result').innerHTML=`<strong>${money(v.total)}</strong><small>${number(v.monthly)} kr × ${number(v.months)} mnd${v.winback?` + ${money(v.winback)} gjenvinning`:''} · standard kundeverdi per beholdt kunde</small>`;
 $('value-result').classList.toggle('capped',v.capped);
 const drift=valueDrift(readItems(),parameters);
 $('value-drift').innerHTML=drift.length
  ?`<strong>${drift.length} ${drift.length===1?'tiltak har':'tiltak har'} egen kundeverdi og følger ikke standarden:</strong>${drift.map(d=>`<span>${esc(d.name)}: ${money(d.value)} mot standard ${money(d.standard)} (${d.diff>0?'+':''}${money(d.diff)})</span>`).join('')}`
  :'<span>Alle tiltak følger standardverdien.</span>';
}
export function bindParameters(getItems,onChange){
 readItems=getItems;
 refreshLosses=bindSwitchingLosses($('switching-parameters'),()=>parameters.losses,losses=>{parameters.losses=losses},onChange);
 const fields=[['value-monthly','monthlyContribution'],['value-months','months'],['value-winback','winbackCost']];
 for(const [id,key] of fields)$(id).addEventListener('input',e=>{
  parameters.customerValue[key]=e.target.valueAsNumber;
  if(validateParameters(parameters)){renderParameters();return}
  // Bare tiltak uten egen overstyring følger med; de overstyrte røres ikke.
  applyCustomerValue(readItems(),parameters);
  onChange?.();
 });
 $('product-name').addEventListener('input',e=>{parameters.product.name=e.target.value});
 $('product-source').addEventListener('input',e=>{parameters.product.source=e.target.value});
 // Kundeverdifeltet er bare redigerbart når tiltaket har egen verdi.
 $('form').addEventListener('change',e=>{if(e.target.name==='valueOverride')syncValueField()});
}
export function syncValueField(){
 const box=$('form').elements.namedItem('valueOverride');
 const field=$('form').elements.namedItem('value');
 if(!box||!field)return;
 field.disabled=!box.checked;
 if(!box.checked)field.value=standardCustomerValue();
}
// Felt i tiltaksdialogen: følg standard, eller sett din egen verdi.
export function measureValueField(t){
 const standard=standardCustomerValue();
 const override=!!t.valueOverride;
 return `<label class="check value-inherit"><input type="checkbox" name="valueOverride"${override?' checked':''}>Egen kundeverdi for dette tiltaket<small>Uten haken følger tiltaket standarden på ${money(standard)}, også når den endres.</small></label>`;
}
export function applyValueChoice(draft){
 if(!draft.valueOverride)draft.value=standardCustomerValue();
 return draft;
}
export {VALUE_HORIZON_MONTHS};
