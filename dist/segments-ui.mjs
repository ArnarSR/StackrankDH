import {seedSegments,segmentTotals,segmentById,segmentName,deriveMeasure,applySegments,
        usesSegments,validateSegments,validateSegmentImpact} from './segments.mjs';
import {standardCustomerValue} from './parameters-ui.mjs';
const $=id=>document.getElementById(id);
const number=(v,d=0)=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:d,minimumFractionDigits:d}).format(v);
const compact=v=>Math.abs(v)>=1000000?number(v/1000000,2)+' mill.':Math.abs(v)>=1000?number(v/1000,0)+' tusen':number(v);
const money=v=>compact(v)+' kr';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID();
let segments=seedSegments(),readItems=()=>[],readBase=()=>0,armed=null,onChanged=null;
export const currentSegments=()=>segments;
export const snapshotSegments=()=>({segments});
export function restoreSegments(data){if(Array.isArray(data?.segments))segments=data.segments;}
export const syncSegments=items=>applySegments(items,segments,standardCustomerValue());

export function renderSegments(){
 const base=readBase(),items=readItems();
 const totals=segmentTotals(segments,base);
 $('segment-error').textContent=validateSegments(segments,base);
 $('segment-rows').innerHTML=segments.map(s=>{
  const brukt=items.filter(t=>(t.segmentImpact??[]).some(r=>r.segmentId===s.id));
  return `<div class="segment-row" data-segment-id="${esc(s.id)}">
   <label class="segment-name">Segment<input data-field="name" value="${esc(s.name)}" maxlength="120"></label>
   <label>Antall kunder<input data-field="customers" type="number" min="0" step="1" value="${s.customers}"></label>
   <span class="segment-share">${base>0?number(s.customers/base*100,1)+' %':'—'}<small>av kundebasen</small></span>
   <button type="button" class="danger" data-remove-segment="${esc(s.id)}">${armed==='seg:'+s.id?'Bekreft':'Fjern'}</button>
   <p class="segment-note">${esc(s.note??'')}${brukt.length?` · Brukes av ${esc(brukt.map(t=>t.name).join(', '))}`:' · Ingen tiltak treffer dette segmentet'}</p>
  </div>`;
 }).join('')||'<p class="field-help">Ingen segmenter definert ennå.</p>';
 $('segment-totals').innerHTML=`
  <div class="metric"><span class="metric-label">Segmentert</span><div class="metric-value">${number(totals.total)}</div><small>av ${number(base)} i kundebasen</small></div>
  <div class="metric ${totals.over?'':'highlight'}"><span class="metric-label">${totals.over?'Overlapp':'Ikke plassert'}</span><div class="metric-value ${totals.over?'negative':''}">${number(Math.abs(totals.remaining))}</div><small>${totals.over?'kunder for mye – segmentene skal ikke overlappe':'kunder hører ikke til noe segment ennå'}</small></div>`;
}

// Panelet på tiltakssiden: her endres TAM/SAM/SOM og effekt per segment.
export function renderMeasureSegments(t){
 const standard=standardCustomerValue();
 const derived=deriveMeasure(t,segments,standard);
 $('measure-segment-error').textContent=validateSegmentImpact(t,segments);
 const ledige=segments.filter(s=>!(t.segmentImpact??[]).some(r=>r.segmentId===s.id));
 $('measure-segment-add').innerHTML='<option value="">Legg til segment …</option>'+ledige.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
 $('measure-segment-add').disabled=!ledige.length;
 if(!derived){
  $('measure-segment-rows').innerHTML='<p class="field-help">Ingen segmenter er knyttet til dette tiltaket. Uten segmenter brukes tiltakets egne tall for adresserbare kunder og rekkevidde.</p>';
  $('measure-segment-summary').innerHTML='';
  return;
 }
 $('measure-segment-rows').innerHTML=derived.rows.map(r=>`<div class="impact-row" data-impact-id="${esc(r.segmentId)}">
  <div class="impact-head"><strong>${esc(r.segment.name)}</strong>
   <span class="impact-exposed">${number(r.exposed)}<small>eksponerte</small></span>
   <button type="button" class="danger" data-remove-impact="${esc(r.segmentId)}">${armed==='imp:'+r.segmentId?'Bekreft':'Fjern'}</button></div>
  <div class="impact-funnel">
   <span class="funnel-step"><small>TAM</small>${number(r.tam)}<em>hele segmentet</em></span>
   <label class="funnel-step"><small>SAM %</small><input data-field="sam" type="number" min="0" max="100" step="1" value="${r.sam}"><em>kunne bruke det</em></label>
   <label class="funnel-step"><small>SOM %</small><input data-field="som" type="number" min="0" max="100" step="1" value="${r.som}"><em>vil faktisk bruke det</em></label>
  </div>
  <div class="impact-effect">
   <label>Lav<input data-field="low" type="number" step="0.05" value="${r.low}"></label>
   <label>Forventet<input data-field="expected" type="number" step="0.05" value="${r.expected}"></label>
   <label>Høy<input data-field="high" type="number" step="0.05" value="${r.high}"></label>
   <label>Kundeverdi<input data-field="valueOverride" type="number" min="0" step="100" value="${Number.isFinite(r.valueOverride)?r.valueOverride:''}" placeholder="${standard}"></label>
  </div>
  <p class="impact-note">${esc(r.note??'')}</p>
 </div>`).join('');
 $('measure-segment-summary').innerHTML=`
  <span><strong>${number(derived.customers)}</strong> kunder i berørte segmenter</span>
  <span><strong>${number(derived.exposed)}</strong> eksponerte · ${number(derived.reach,1)} % samlet rekkevidde</span>
  <span><strong>${number(derived.expected,2)} pp</strong> vektet churn-reduksjon</span>
  <span><strong>${money(derived.value)}</strong> vektet kundeverdi</span>`;
}

export function bindSegments(getItems,getBase,onChange){
 readItems=getItems;readBase=getBase;onChanged=onChange;
 const changed=()=>{syncSegments(readItems());onChange?.()};
 $('add-segment').addEventListener('click',()=>{armed=null;segments.push({id:uid(),name:'Nytt segment',customers:0,sourceId:'',note:''});changed()});
 $('segment-rows').addEventListener('input',e=>{
  const field=e.target.dataset.field;if(!field)return;
  const s=segmentById(segments,e.target.closest('[data-segment-id]').dataset.segmentId);
  if(field==='name')s.name=e.target.value;else s.customers=Math.max(0,Math.round(e.target.valueAsNumber||0));
  changed();
 });
 $('segment-rows').addEventListener('click',e=>{
  const id=e.target.closest('button')?.dataset.removeSegment;if(!id)return;
  if(armed!=='seg:'+id){armed='seg:'+id;return renderSegments()}
  armed=null;segments=segments.filter(s=>s.id!==id);
  // Rader som pekte hit fjernes, ellers ville de blitt hengende som ugyldige.
  for(const t of readItems())t.segmentImpact=(t.segmentImpact??[]).filter(r=>r.segmentId!==id);
  changed();
 });
 $('measure-segment-add').addEventListener('change',e=>{
  const id=e.target.value;e.target.value='';if(!id)return;
  const t=readItems().find(x=>x.id===currentMeasureId);if(!t)return;
  t.segmentImpact=[...(t.segmentImpact??[]),{segmentId:id,sam:50,som:50,low:0,expected:0,high:0,samSourceId:'',somSourceId:'',note:''}];
  changed();
 });
 $('measure-segment-rows').addEventListener('input',e=>{
  const field=e.target.dataset.field;if(!field)return;
  const t=readItems().find(x=>x.id===currentMeasureId);if(!t)return;
  const r=(t.segmentImpact??[]).find(x=>x.segmentId===e.target.closest('[data-impact-id]').dataset.impactId);
  if(!r)return;
  r[field]=e.target.value===''&&field==='valueOverride'?undefined:e.target.valueAsNumber;
  changed();
 });
 $('measure-segment-rows').addEventListener('click',e=>{
  const id=e.target.closest('button')?.dataset.removeImpact;if(!id)return;
  const t=readItems().find(x=>x.id===currentMeasureId);if(!t)return;
  if(armed!=='imp:'+id){armed='imp:'+id;return renderMeasureSegments(t)}
  armed=null;t.segmentImpact=(t.segmentImpact??[]).filter(r=>r.segmentId!==id);
  changed();
 });
}
let currentMeasureId=null;
export const setMeasureContext=id=>{currentMeasureId=id;};
