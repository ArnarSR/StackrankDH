import {seedProblems,problemEvidence,problemTotals,problemCoverage,validateProblems,annualCost,addressableCost} from './problems.mjs';
import {HORIZON_MONTHS} from './timeline.mjs';
const $=id=>document.getElementById(id);
const number=(v,d=0)=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:d,minimumFractionDigits:d}).format(v);
const compact=v=>Math.abs(v)>=1000000?number(v/1000000,2)+' mill.':Math.abs(v)>=1000?number(v/1000,0)+' tusen':number(v);
const money=v=>compact(v)+' kr';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID();
// Av som standard: nåkostnaden er gjerne en størrelsesorden større enn planverdiene,
// og klemmer plankurvene flate. Tallet står uansett i nåkostnadspanelet.
let problems=seedProblems(),readItems=()=>[],armed=null,showBaseline=false;
export const currentProblems=()=>problems;
export const snapshotProblems=()=>({problems,showBaseline});
export function restoreProblems(data){if(Array.isArray(data?.problems))problems=data.problems;if(typeof data?.showBaseline==='boolean')showBaseline=data.showBaseline;}
export const baselineVisible=()=>showBaseline;

export function renderProblems(){renderRows();renderSummary();}
function renderRows(){
 const items=readItems();
 $('problem-rows').innerHTML=problems.map(p=>`<div class="problem-row" data-problem-id="${esc(p.id)}">
  <div class="problem-main">
   <label class="problem-name">Problem<input data-field="name" value="${esc(p.name)}" maxlength="140"></label>
   <span class="problem-cost">${money(annualCost(p))}<small>per år</small></span>
   <button type="button" class="danger" data-remove-problem="${esc(p.id)}">${armed==='prob:'+p.id?'Bekreft':'Fjern'}</button>
  </div>
  <div class="problem-fields">
   <label>Berørte kunder<input data-field="customers" type="number" min="0" step="1" value="${p.customers}"></label>
   <label>Hendelser per kunde/år<input data-field="frequency" type="number" min="0" step="0.1" value="${p.frequency}"></label>
   <label>Kostnad per hendelse<input data-field="unitCost" type="number" min="0" step="10" value="${p.unitCost}"></label>
   <label>Påvirkbar andel (%)<input data-field="addressableShare" type="number" min="0" max="100" step="1" value="${p.addressableShare}"></label>
   <label>Grunnlag<select data-field="evidence">${Object.entries(problemEvidence).map(([k,v])=>`<option value="${k}"${p.evidence===k?' selected':''}>${v}</option>`).join('')}</select></label>
   <label class="problem-measures">Adresseres av<select data-field="measureIds" multiple size="3">${items.map(t=>`<option value="${esc(t.id)}"${(p.measureIds??[]).includes(t.id)?' selected':''}>${esc(t.name)}</option>`).join('')}</select></label>
  </div>
  <p class="problem-source">${esc(p.source??'')}</p>
 </div>`).join('')||'<p class="field-help">Ingen problemer registrert ennå.</p>';
}
function renderSummary(){
 const items=readItems();
 $('problem-error').textContent=validateProblems(problems);
 const t=problemTotals(problems);
 $('problem-totals').innerHTML=`
  <div class="metric"><span class="metric-label">Koster i dag</span><div class="metric-value negative">${money(t.annual)}</div><small>per år, alle registrerte problemer</small></div>
  <div class="metric highlight"><span class="metric-label">Å ikke gjøre noe</span><div class="metric-value">${money(t.horizonCost)}</div><small>over ${HORIZON_MONTHS} måneder · ${money(t.monthly)} i måneden</small></div>
  <div class="metric"><span class="metric-label">Påvirkbart bruttopotensial</span><div class="metric-value">${money(t.horizonAddressable)}</div><small>over ${HORIZON_MONTHS} mnd · ikke en lovet gevinst</small></div>`;
 const c=problemCoverage(problems,items);
 const line=(label,list)=>list.length?`<span><strong>${label}:</strong> ${esc(list.map(p=>p.name).join(', '))}</span>`:'';
 $('problem-coverage').innerHTML=[
  line('Problemer uten tiltak',c.unaddressed),
  line('Problemer som peker på et slettet tiltak',c.staleLinks)
 ].filter(Boolean).join('')||'<span>Alle registrerte problemer adresseres av minst ett tiltak.</span>';
}
export function bindProblems(getItems,onChange){
 readItems=getItems;
 const refresh=()=>{renderProblems();onChange?.()};
 $('add-problem').addEventListener('click',()=>{armed=null;problems.push({id:uid(),name:'Nytt problem',customers:0,frequency:0,unitCost:0,addressableShare:0,evidence:'assumed',owner:'',source:'',note:'',measureIds:[]});refresh()});
 $('problem-rows').addEventListener('input',e=>{
  const field=e.target.dataset.field;if(!field||field==='measureIds')return;
  const p=problems.find(x=>x.id===e.target.closest('[data-problem-id]').dataset.problemId);
  if(field==='name')p.name=e.target.value;else p[field]=e.target.valueAsNumber;
  // Bare summene oppdateres, slik at feltet man skriver i beholder fokus.
  const cost=e.target.closest('.problem-row').querySelector('.problem-cost');
  cost.childNodes[0].nodeValue=money(annualCost(p));
  renderSummary();onChange?.();
 });
 $('problem-rows').addEventListener('change',e=>{
  const field=e.target.dataset.field;if(!field)return;
  const p=problems.find(x=>x.id===e.target.closest('[data-problem-id]').dataset.problemId);
  if(field==='measureIds')p.measureIds=[...e.target.selectedOptions].map(o=>o.value);
  else if(field==='evidence')p.evidence=e.target.value;
  else return;
  renderSummary();onChange?.();
 });
 $('problem-rows').addEventListener('click',e=>{
  const id=e.target.closest('button')?.dataset.removeProblem;if(!id)return;
  if(armed!=='prob:'+id){armed='prob:'+id;return renderRows()}
  armed=null;problems=problems.filter(p=>p.id!==id);refresh();
 });
}
// Avkrysningsboksen lever inne i kurven, som tegnes på nytt – derfor delegering.
export function bindBaselineToggle(onChange){
 $('scenario-curve').addEventListener('change',e=>{
  if(e.target.id!=='show-baseline')return;
  showBaseline=e.target.checked;onChange?.();
 });
}
