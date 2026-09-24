import {scenario,horizons,evidence,strategicFit} from './model.mjs';
import {seedRoadmap,keyResults,scenarioCurve,compareScenarios,unlocks,coverage,placementSignals,validateRoadmap,HORIZON_MONTHS} from './roadmap-model.mjs';
const $=id=>document.getElementById(id);
const number=(v,d=0)=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:d,minimumFractionDigits:d}).format(v);
const compact=v=>Math.abs(v)>=1000000?number(v/1000000,2)+' mill.':Math.abs(v)>=1000?number(v/1000,0)+' tusen':number(v);
const money=v=>compact(v)+' kr';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID();
let roadmap=seedRoadmap(),compare={a:'sc-platform',b:'sc-quick'},readItems=()=>[];
const items=()=>readItems();
const measureName=id=>items().find(t=>t.id===id)?.name??id;

export function renderRoadmap(){renderStrategy();renderBoard();renderScenarios();}

function renderStrategy(){
 if($('vision').value!==roadmap.vision.statement)$('vision').value=roadmap.vision.statement;
 $('objective-list').innerHTML=roadmap.objectives.map(o=>`<div class="objective" data-objective-id="${esc(o.id)}">
  <div class="objective-head"><label>Objective<input data-field="title" value="${esc(o.title)}" maxlength="140"></label>
  <button type="button" class="secondary" data-add-kr="${esc(o.id)}">＋ Key result</button>
  <button type="button" class="danger" data-remove-objective="${esc(o.id)}">Fjern</button></div>
  ${o.keyResults.length?o.keyResults.map(k=>{const linked=items().filter(t=>(t.keyResultIds??[]).includes(k.id));
   return `<div class="key-result" data-kr-id="${esc(k.id)}"><label>Key result<input data-field="krTitle" value="${esc(k.title)}" maxlength="200"></label>
   <span class="kr-coverage${linked.length?'':' uncovered'}">${linked.length?esc(linked.map(t=>t.name).join(', ')):'Ingen tiltak'}</span>
   <button type="button" class="danger" data-remove-kr="${esc(k.id)}">Fjern</button></div>`}).join(''):'<p class="field-help">Ingen key results ennå.</p>'}
 </div>`).join('')||'<p class="field-help">Ingen objectives ennå. Legg til ett for å koble tiltakene til et målbilde.</p>';
 const c=coverage(roadmap,items());
 const line=(label,list)=>list.length?`<span><strong>${label}:</strong> ${esc(list.join(', '))}</span>`:'';
 $('coverage-report').innerHTML=[
  line('Key results uten tiltak',c.keyResultsWithoutMeasures.map(k=>k.title)),
  line('Tiltak uten key result',c.measuresWithoutKeyResult.map(t=>t.name)),
  line('Tiltak uten plassering',c.unplaced.map(t=>t.name)),
  line('Tiltak med utdatert kobling',c.staleLinks.map(t=>t.name))
 ].filter(Boolean).join('')||'<span>Alle key results har minst ett tiltak, og alle tiltak er koblet og plassert.</span>';
}

function renderBoard(){
 const all=items(),unlocked=new Map(unlocks(all).map(u=>[u.id,u]));
 const krTitle=id=>keyResults(roadmap).find(k=>k.id===id)?.title;
 const card=t=>{const u=unlocked.get(t.id),net=scenario(t).net;
  return `<article class="roadmap-card" data-measure-id="${esc(t.id)}">
   <button class="name-button" data-select="${esc(t.id)}">${esc(t.name)}</button>
   <div class="segment">${esc(t.segment)}</div>
   <div class="card-badges"><span class="badge fit-${t.strategicFit}">${strategicFit[t.strategicFit].label}</span><span class="badge evidence-${t.confidence}">${evidence[t.confidence].label}</span></div>
   <div class="card-net ${net<0?'negative':'positive'}">${money(net)}<small>forventet nettoverdi, 12 mnd</small></div>
   ${u?.downstream.length?`<div class="card-unlocks">Låser opp ${money(u.unlockedNet)} i ${u.downstream.length===1?'ett tiltak':u.downstream.length+' tiltak'}<small>${esc(u.downstream.map(measureName).join(', '))} · summeres ikke inn</small></div>`:''}
   ${(t.requires??[]).length?`<div class="card-requires">Forutsetter: ${esc(t.requires.map(measureName).join(', '))}</div>`:''}
   ${(t.keyResultIds??[]).length?`<div class="card-krs">${t.keyResultIds.map(id=>`<span class="kr-chip">${esc(krTitle(id)??'Utdatert kobling')}</span>`).join('')}</div>`:''}
  </article>`};
 const column=(key,label,window,list)=>`<div class="roadmap-column"><div class="roadmap-column-head"><h3>${label}</h3><span>${window}</span><span class="count">${list.length}</span></div>${list.length?list.map(card).join(''):'<p class="field-help">Ingen tiltak her.</p>'}</div>`;
 $('roadmap-board').innerHTML=Object.entries(horizons).map(([key,h])=>column(key,h.label,h.window,all.filter(t=>t.horizon===key))).join('')
  +column('none','Ikke plassert','uten horisont',all.filter(t=>!t.horizon));
}

function scenarioById(id){return roadmap.scenarios.find(s=>s.id===id);}

function renderScenarios(){
 const all=items(),error=validateRoadmap(roadmap,all);
 $('scenario-error').textContent=error;
 const options=sel=>roadmap.scenarios.map(s=>`<option value="${esc(s.id)}"${s.id===sel?' selected':''}>${esc(s.name)}</option>`).join('');
 $('scenario-pick-a').innerHTML=options(compare.a);$('scenario-pick-b').innerHTML=options(compare.b);
 const a=scenarioById(compare.a),b=scenarioById(compare.b);
 if(!a||!b||error){$('scenario-curve').innerHTML='';$('scenario-columns').innerHTML='';$('scenario-rows').innerHTML='';
  if(!error)$('scenario-error').textContent='Velg to scenarioer å sammenligne.';return;}
 const cmp=compareScenarios(a.order,b.order,all);
 renderCurve(cmp,a,b);
 $('scenario-columns').innerHTML=[[a,cmp.a,'a'],[b,cmp.b,'b']].map(([s,result,side])=>`<div class="scenario-column" data-scenario-id="${esc(s.id)}">
  <div class="scenario-column-head"><span class="scenario-key scenario-${side}"></span><h3>${esc(s.name)}</h3><strong class="${result.net<0?'negative':'positive'}">${money(result.net)}</strong><small>kumulativt over ${HORIZON_MONTHS} måneder</small></div>
  <p class="field-help">${esc(s.note??'')}</p>
  ${s.order.length?s.order.map((id,i)=>{const row=result.rows[i];
   return `<div class="scenario-item"><span class="scenario-pos">${i+1}</span><div><strong>${esc(measureName(id))}</strong><small>${row.beyondHorizon?'Lander etter horisonten':`Lander måned ${row.landing} · ${row.effectMonths} mnd effekt`}</small></div>
   <div class="scenario-item-actions"><button type="button" data-move="up" data-scenario="${esc(s.id)}" data-id="${esc(id)}" aria-label="Flytt opp"${i===0?' disabled':''}>↑</button><button type="button" data-move="down" data-scenario="${esc(s.id)}" data-id="${esc(id)}" aria-label="Flytt ned"${i===s.order.length-1?' disabled':''}>↓</button><button type="button" class="danger" data-drop="${esc(id)}" data-scenario="${esc(s.id)}" aria-label="Fjern">×</button></div></div>`}).join(''):'<p class="field-help">Ingen tiltak i dette scenarioet.</p>'}
  <label class="scenario-add">Legg til tiltak<select data-add-to="${esc(s.id)}"><option value="">Velg tiltak …</option>${all.filter(t=>!s.order.includes(t.id)).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></label>
 </div>`).join('');
 const signals=[...placementSignals(a.order,all).map(s=>[a.name,s]),...placementSignals(b.order,all).map(s=>[b.name,s])];
 $('scenario-rows').innerHTML=`<div class="table-scroll"><table class="resource-table"><thead><tr><th>Tiltak</th><th>Scenario</th><th>Lander</th><th>Effektmåneder</th><th>Porteføljeverdi<small>12 mnd</small></th><th>Bidrag i veikartet<small>${HORIZON_MONTHS} mnd</small></th></tr></thead><tbody>${
  [[a,cmp.a],[b,cmp.b]].flatMap(([s,result])=>result.rows.map(r=>`<tr><th scope="row">${esc(r.name)}</th><td>${esc(s.name)}</td><td>${r.beyondHorizon?'Etter horisonten':'Måned '+r.landing}</td><td>${r.effectMonths}</td><td>${money(r.portfolioNet)}</td><td class="${r.horizonNet<0?'negative':'positive'}">${money(r.horizonNet)}</td></tr>`)).join('')
  ||'<tr><td colspan="6">Ingen tiltak i scenarioene.</td></tr>'}</tbody></table></div>
  ${signals.length?`<div class="placement-signals"><strong>Plassering og faktisk landing er uenige:</strong>${signals.map(([name,s])=>`<span>${esc(s.name)} er plassert i ${horizons[s.horizon].label} (${horizons[s.horizon].window}), men lander i måned ${s.landing} i «${esc(name)}».</span>`).join('')}</div>`:''}`;
}

function renderCurve(cmp,a,b){
 const points=[...cmp.a.curve,...cmp.b.curve].map(m=>m.cumulative);
 const min=Math.min(0,...points),max=Math.max(0,...points),spread=(max-min)||1;
 const x=m=>70+m/(HORIZON_MONTHS-1)*470,y=v=>170-(v-min)/spread*140;
 const path=curve=>curve.map((m,i)=>`${i?'L':'M'} ${x(m.month).toFixed(1)} ${y(m.cumulative).toFixed(1)}`).join(' ');
 let grid='';for(let i=0;i<=2;i++){const v=min+spread*i/2;grid+=`<line x1="70" y1="${y(v)}" x2="540" y2="${y(v)}" stroke="#e5ecef"${Math.abs(v)<.001?' stroke-dasharray="4 4"':''}/><text x="62" y="${y(v)+4}" text-anchor="end">${compact(v)}</text>`}
 let ticks='';for(const m of [0,6,12,18,23])ticks+=`<text x="${x(m)}" y="190" text-anchor="middle">${m===23?24:m}</text>`;
 const title=`Kumulativ nettoverdi over ${HORIZON_MONTHS} måneder. ${a.name}: ${money(cmp.a.net)}. ${b.name}: ${money(cmp.b.net)}.`;
 $('scenario-curve').innerHTML=`<div class="chart-wrap"><svg viewBox="0 0 560 205" role="img" aria-label="${esc(title)}"><text x="70" y="16">NOK, kumulativt</text>${grid}${ticks}
  <text x="305" y="203" text-anchor="middle">Måneder fra felles start</text>
  <path d="${path(cmp.a.curve)}" fill="none" stroke="#2d7a64" stroke-width="2.5"/>
  <path d="${path(cmp.b.curve)}" fill="none" stroke="#5a6fa8" stroke-width="2.5" stroke-dasharray="6 3"/></svg>
  <div class="curve-legend"><span><i class="scenario-key scenario-a"></i>${esc(a.name)} · ${money(cmp.a.net)}</span><span><i class="scenario-key scenario-b"></i>${esc(b.name)} · ${money(cmp.b.net)}</span><span class="curve-delta">Forskjell: ${money(cmp.delta)}</span></div></div>`;
}

// Felter som legges inn i tiltaksdialogen.
export function measureRoadmapFields(t,all){
 const krs=keyResults(roadmap);
 const box=(name,value,label,checked)=>`<label class="check"><input type="checkbox" name="${name}" value="${esc(value)}"${checked?' checked':''}>${esc(label)}</label>`;
 return `<label>Tidshorisont<select name="horizon"><option value="">Ikke plassert</option>${Object.entries(horizons).map(([key,h])=>`<option value="${key}"${t.horizon===key?' selected':''}>${h.label} · ${h.window}</option>`).join('')}</select></label>
 <fieldset><legend>Key results tiltaket skal bidra til</legend>${krs.length?krs.map(k=>box('keyResultIds',k.id,`${k.objectiveTitle} → ${k.title}`,(t.keyResultIds??[]).includes(k.id))).join(''):'<small>Ingen key results er definert ennå.</small>'}</fieldset>
 <fieldset><legend>Forutsetter disse tiltakene</legend><small>Tiltak som må være ferdige før dette kan levere. Låser opp-verdien vises på tiltaket som forutsettes, og summeres aldri inn i porteføljen.</small>${
  all.filter(x=>x.id!==t.id).map(x=>box('requires',x.id,x.name,(t.requires??[]).includes(x.id))).join('')||'<small>Ingen andre tiltak å velge.</small>'}</fieldset>`;
}
export function readMeasureRoadmapFields(form){const data=new FormData(form);
 return {horizon:data.get('horizon')||'',keyResultIds:data.getAll('keyResultIds'),requires:data.getAll('requires')};}

export function bindRoadmap(getItems,onSelect,onRerender){
 readItems=getItems;
 const refresh=()=>{renderRoadmap();onRerender?.()};
 $('vision').addEventListener('input',e=>{roadmap.vision.statement=e.target.value});
 $('add-objective').addEventListener('click',()=>{roadmap.objectives.push({id:uid(),title:'Nytt objective',note:'',keyResults:[]});refresh()});
 $('add-scenario').addEventListener('click',()=>{const s={id:uid(),name:'Nytt scenario',note:'',order:[]};roadmap.scenarios.push(s);compare.b=s.id;refresh()});
 $('objective-list').addEventListener('input',e=>{
  const field=e.target.dataset.field;if(!field)return;
  const objective=roadmap.objectives.find(o=>o.id===e.target.closest('[data-objective-id]').dataset.objectiveId);
  if(field==='title')objective.title=e.target.value;
  else objective.keyResults.find(k=>k.id===e.target.closest('[data-kr-id]').dataset.krId).title=e.target.value;
  renderBoard();renderScenarios();
 });
 $('objective-list').addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  const {addKr,removeObjective,removeKr}=button.dataset;
  if(addKr)roadmap.objectives.find(o=>o.id===addKr).keyResults.push({id:uid(),title:'Nytt key result',note:''});
  if(removeObjective)roadmap.objectives=roadmap.objectives.filter(o=>o.id!==removeObjective);
  if(removeKr)for(const o of roadmap.objectives)o.keyResults=o.keyResults.filter(k=>k.id!==removeKr);
  refresh();
 });
 $('scenario-pick-a').addEventListener('change',e=>{compare.a=e.target.value;renderScenarios()});
 $('scenario-pick-b').addEventListener('change',e=>{compare.b=e.target.value;renderScenarios()});
 $('scenario-columns').addEventListener('change',e=>{
  const target=e.target.dataset.addTo;if(!target||!e.target.value)return;
  scenarioById(target).order.push(e.target.value);renderScenarios();
 });
 $('scenario-columns').addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  const s=scenarioById(button.dataset.scenario);if(!s)return;
  const index=s.order.indexOf(button.dataset.id);
  if(button.dataset.drop)s.order=s.order.filter(id=>id!==button.dataset.drop);
  else{const to=button.dataset.move==='up'?index-1:index+1;if(to<0||to>=s.order.length)return;
   [s.order[index],s.order[to]]=[s.order[to],s.order[index]]}
  renderScenarios();
 });
 $('roadmap-board').addEventListener('click',e=>{const select=e.target.closest('[data-select]');if(select)onSelect(select.dataset.select)});
}
