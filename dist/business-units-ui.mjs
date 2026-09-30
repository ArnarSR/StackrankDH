import {seedBusinessUnits,businessUnitReport,validateBusinessUnits,removeBusinessUnit} from './business-units.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(v,d=0)=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:d}).format(v);
const money=v=>number(v)+' kr';
let units=seedBusinessUnits(),readItems=()=>[],readRoster=()=>({roles:[]}),armed=null;
export const snapshotBusinessUnits=()=>({businessUnits:units});
export function restoreBusinessUnits(data){units=data?.businessUnits??seedBusinessUnits();}
export function businessUnitOptions(selected=''){
 return '<option value="">Ufordelt</option>'+units.map(u=>`<option value="${esc(u.id)}"${u.id===selected?' selected':''}>${esc(u.name)}</option>`).join('');
}
export const measureBusinessUnitField=t=>`<label>Eiende BU<select name="businessUnitId">${businessUnitOptions(t.businessUnitId)}</select><small>Én BU eier hele nettoverdien. Deltakere utledes av rollene på teamradene.</small></label>`;
export function renderBusinessUnits(){
 $('bu-rows').innerHTML=units.map(u=>`<div class="bu-row" data-bu-id="${esc(u.id)}"><label>BU-navn<input data-bu-name value="${esc(u.name)}" maxlength="80"></label><button type="button" class="danger" data-remove-bu="${esc(u.id)}">${armed===u.id?'Bekreft fjerning':'Fjern'}</button></div>`).join('')||'<p>Ingen BU-er er opprettet. Legg til egne forretningsenheter, og koble dem til tiltak og roller.</p>';
 renderBusinessUnitReport();
}
function renderBusinessUnitReport(preserveOwnerFields=false){
 const report=businessUnitReport(readItems(),readRoster(),units),name=id=>report.groups.find(u=>u.id===id)?.name??'Ufordelt';
 $('bu-error').textContent=validateBusinessUnits(units);
 $('bu-value-rows').innerHTML=report.groups.map(u=>`<tr><th scope="row">${esc(u.name)}</th><td>${u.items.length}</td><td>${money(u.gross)}</td><td>${money(u.cost)}</td><td class="${u.net<0?'negative':'positive'}">${money(u.net)}</td></tr>`).join('');
 $('bu-net-total').textContent=money(report.total);
 $('bu-matrix').innerHTML=`<table class="resource-table"><caption>Rader: BU som eier verdien. Kolonner: BU som bidrar med forventede ressursuker.</caption><thead><tr><th scope="col">Eiende BU ↓ / Bidragende BU →</th>${report.groups.map(u=>`<th scope="col">${esc(u.name)}</th>`).join('')}<th scope="col">Sum ressursuker</th></tr></thead><tbody>${report.groups.map(owner=>`<tr><th scope="row">${esc(owner.name)}</th>${report.groups.map(contributor=>{const cell=report.matrix.get(owner.id).get(contributor.id);return `<td>${number(cell.weeks,1)}<small>${cell.items.size} tiltak</small></td>`}).join('')}<td>${number([...report.matrix.get(owner.id).values()].reduce((n,c)=>n+c.weeks,0),1)}</td></tr>`).join('')}</tbody></table>`;
 if(!preserveOwnerFields)$('bu-measures').innerHTML=report.measures.map(t=>`<tr><th scope="row"><a href="#/tiltak/${encodeURIComponent(t.id)}">${esc(t.name)}</a></th><td><label><span class="sr-only">Eiende BU for ${esc(t.name)}</span><select data-bu-owner="${esc(t.id)}">${businessUnitOptions(t.ownerId)}</select></label></td><td>${t.participants.length?t.participants.map(id=>esc(name(id))).join(', '):'Ingen teamrader'}</td></tr>`).join('')||'<tr><td colspan="3">Ingen tiltak ennå.</td></tr>';
 const missing=report.measures.filter(t=>!t.ownerId).length,unassigned=report.groups.find(u=>u.id==='').effort;
 $('bu-coverage').textContent=`${missing} tiltak uten eiende BU. ${number(unassigned,1)} ressursuker uten bidragende BU. Knytt roller til BU under «Roller og kapasitet».`;
}
export function bindBusinessUnits(getItems,getRoster,onChange){
 readItems=getItems;readRoster=getRoster;
 $('add-bu').addEventListener('click',()=>{
  let i=1;while(units.some(u=>u.name===`Ny BU ${i}`))i++;
  units.push({id:crypto.randomUUID(),name:`Ny BU ${i}`});armed=null;renderBusinessUnits();onChange?.();
  $('bu-rows').lastElementChild.querySelector('input').focus();
 });
 $('bu-rows').addEventListener('input',e=>{
  if(!e.target.hasAttribute('data-bu-name'))return;
  units.find(u=>u.id===e.target.closest('[data-bu-id]').dataset.buId).name=e.target.value;
  renderBusinessUnitReport();onChange?.();
 });
 $('bu-rows').addEventListener('click',e=>{
  const id=e.target.closest('button')?.dataset.removeBu;if(!id)return;
  if(armed!==id){armed=id;renderBusinessUnits();$('bu-error').textContent='Ved fjerning blir tilknyttede tiltak og roller ufordelt. Beløpene bevares.';return}
  units=removeBusinessUnit(units,id,readItems(),readRoster());armed=null;renderBusinessUnits();onChange?.();
 });
 $('bu-measures').addEventListener('change',e=>{
  const id=e.target.dataset.buOwner;if(!id)return;
  readItems().find(t=>t.id===id).businessUnitId=e.target.value;renderBusinessUnitReport(true);onChange?.();
 });
}
