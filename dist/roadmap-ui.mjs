import {scenario,horizons,evidence,strategicFit} from './model.mjs';
import {seedRoadmap,keyResults,scenarioCurve,compareScenarios,unlocks,coverage,placementSignals,validateRoadmap,suggestedOrder,breakEvenMonth,throughput,switchingLoss,HORIZON_MONTHS} from './roadmap-model.mjs';
import {doNothingCurve} from './problems.mjs';
import {currentProblems,baselineVisible} from './problems-ui.mjs';
const $=id=>document.getElementById(id);
const number=(v,d=0)=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:d,minimumFractionDigits:d}).format(v);
const compact=v=>Math.abs(v)>=1000000?number(v/1000000,2)+' mill.':Math.abs(v)>=1000?number(v/1000,0)+' tusen':number(v);
const money=v=>compact(v)+' kr';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID();
let roadmap=seedRoadmap(),compare={a:'sc-platform',b:'sc-quick'},readItems=()=>[],armed=null;
const items=()=>readItems();
const measureName=id=>items().find(t=>t.id===id)?.name??id;
// Sletting krever to klikk, som i tiltaksdialogen.
const removeLabel=key=>armed===key?'Bekreft':'Fjern';
function confirmRemove(key){if(armed===key){armed=null;return true}armed=key;renderStrategy();renderScenarios();return false;}

export function renderRoadmap(){renderStrategy();renderBoard();renderScenarios();}

function renderStrategy(){
 if($('vision').value!==roadmap.vision.statement)$('vision').value=roadmap.vision.statement;
 $('objective-list').innerHTML=roadmap.objectives.map(o=>`<div class="objective" data-objective-id="${esc(o.id)}">
  <div class="objective-head"><label>Objective<input data-field="title" value="${esc(o.title)}" maxlength="140"></label>
  <button type="button" class="secondary" data-add-kr="${esc(o.id)}">＋ Key result</button>
  <button type="button" class="danger" data-remove-objective="${esc(o.id)}">${removeLabel('obj:'+o.id)}</button></div>
  ${o.keyResults.length?o.keyResults.map(k=>{const linked=items().filter(t=>(t.keyResultIds??[]).includes(k.id));
   return `<div class="key-result" data-kr-id="${esc(k.id)}"><label>Key result<input data-field="krTitle" value="${esc(k.title)}" maxlength="200"></label>
   <span class="kr-coverage${linked.length?'':' uncovered'}">${linked.length?esc(linked.map(t=>t.name).join(', ')):'Ingen tiltak'}</span>
   <button type="button" class="danger" data-remove-kr="${esc(k.id)}">${removeLabel('kr:'+k.id)}</button></div>`}).join(''):'<p class="field-help">Ingen key results ennå.</p>'}
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
  return `<article class="roadmap-card" draggable="true" data-measure-id="${esc(t.id)}">
   <label class="card-horizon">Horisont<select data-set-horizon="${esc(t.id)}"><option value=""${t.horizon?'':' selected'}>Ikke plassert</option>${Object.entries(horizons).map(([key,h])=>`<option value="${key}"${t.horizon===key?' selected':''}>${h.label}</option>`).join('')}</select></label>
   <button class="name-button" data-select="${esc(t.id)}">${esc(t.name)}</button>
   <div class="segment">${esc(t.segment)}</div>
   <div class="card-badges"><span class="badge fit-${t.strategicFit}">${strategicFit[t.strategicFit].label}</span><span class="badge evidence-${t.confidence}">${evidence[t.confidence].label}</span></div>
   <div class="card-net ${net<0?'negative':'positive'}">${money(net)}<small>forventet nettoverdi, 12 mnd</small></div>
   ${u?.downstream.length?`<div class="card-unlocks">Låser opp ${money(u.unlockedNet)} i ${u.downstream.length===1?'ett tiltak':u.downstream.length+' tiltak'}<small>${esc(u.downstream.map(measureName).join(', '))} · summeres ikke inn</small></div>`:''}
   ${(t.requires??[]).length?`<div class="card-requires">Forutsetter: ${esc(t.requires.map(measureName).join(', '))}</div>`:''}
   ${(t.keyResultIds??[]).length?`<div class="card-krs">${t.keyResultIds.map(id=>`<span class="kr-chip">${esc(krTitle(id)??'Utdatert kobling')}</span>`).join('')}</div>`:''}
  </article>`};
 const column=(key,label,window,list)=>`<div class="roadmap-column" data-horizon="${key}"><div class="roadmap-column-head"><h3>${label}</h3><span>${window}</span><span class="count">${list.length}</span></div>${list.length?list.map(card).join(''):'<p class="field-help">Slipp et tiltak her, eller velg horisont på kortet.</p>'}</div>`;
 $('roadmap-board').innerHTML=Object.entries(horizons).map(([key,h])=>column(key,h.label,h.window,all.filter(t=>t.horizon===key))).join('')
  +column('none','Ikke plassert','uten horisont',all.filter(t=>!t.horizon));
}

function scenarioById(id){return roadmap.scenarios.find(s=>s.id===id);}

function renderScenarios(){
 const all=items(),error=validateRoadmap(roadmap,all,[compare.a,compare.b]);
 $('scenario-error').textContent=error;
 const options=sel=>roadmap.scenarios.map(s=>`<option value="${esc(s.id)}"${s.id===sel?' selected':''}>${esc(s.name)}</option>`).join('');
 $('scenario-pick-a').innerHTML=options(compare.a);$('scenario-pick-b').innerHTML=options(compare.b);
 const a=scenarioById(compare.a),b=scenarioById(compare.b);
 if(!a||!b||error){$('scenario-curve').innerHTML='';$('scenario-columns').innerHTML='';$('scenario-rows').innerHTML='';
  if(!error)$('scenario-error').textContent='Velg to scenarioer å sammenligne.';return;}
 const wipOf=s=>Math.max(1,Math.round(s.wip||1));
 const cmp=compareScenarios(a.order,b.order,all,'expected',{wip:wipOf(a)},{wip:wipOf(b)});
 renderCurve(cmp,a,b);
 $('scenario-columns').innerHTML=[[a,cmp.a,'a'],[b,cmp.b,'b']].map(([s,result,side])=>`<div class="scenario-column" data-scenario-id="${esc(s.id)}">
  <div class="scenario-column-head"><span class="scenario-key scenario-${side}"></span><h3 class="scenario-title"><input data-scenario-name="${esc(s.id)}" value="${esc(s.name)}" maxlength="80" aria-label="Navn på scenario"></h3><button type="button" class="danger" data-remove-scenario="${esc(s.id)}">${removeLabel('sc:'+s.id)}</button>
  <strong class="${result.net<0?'negative':'positive'}">${money(result.net)}</strong><small>kumulativt over ${HORIZON_MONTHS} måneder${breakEvenMonth(result.curve)===null?' · går ikke i null innen horisonten':' · i null fra måned '+breakEvenMonth(result.curve)}</small></div>
  <div class="wip-control"><label>Samtidige tiltak<input type="number" min="1" max="8" step="1" value="${wipOf(s)}" data-wip="${esc(s.id)}"></label>
   <span class="wip-readout">${wipOf(s)===1?'Én av gangen · ingen kontekstbytte':`${Math.round(switchingLoss(wipOf(s))*100)} % av tiden går til kontekstbytte · gjennomstrømning ${number(throughput(wipOf(s)),2)}×`}<a href="faq.html" target="_blank" rel="noopener">Hvor kommer tallet fra? ↗</a></span></div>
  <p class="field-help">${esc(s.note??'')}</p>
  ${s.order.length?s.order.map((id,i)=>{const row=result.rows[i];
   return `<div class="scenario-item"><span class="scenario-pos">${i+1}</span><div><strong>${esc(measureName(id))}</strong><small>${row.beyondHorizon?'Lander etter horisonten':`Lander måned ${row.landing} · ${row.effectMonths} mnd effekt`}</small></div>
   <div class="scenario-item-actions"><button type="button" data-move="up" data-scenario="${esc(s.id)}" data-id="${esc(id)}" aria-label="Flytt opp"${i===0?' disabled':''}>↑</button><button type="button" data-move="down" data-scenario="${esc(s.id)}" data-id="${esc(id)}" aria-label="Flytt ned"${i===s.order.length-1?' disabled':''}>↓</button><button type="button" class="danger" data-drop="${esc(id)}" data-scenario="${esc(s.id)}" aria-label="Fjern">×</button></div></div>`}).join(''):'<p class="field-help">Ingen tiltak i dette scenarioet.</p>'}
  <label class="scenario-add">Legg til tiltak<select data-add-to="${esc(s.id)}"><option value="">Velg tiltak …</option>${all.filter(t=>!s.order.includes(t.id)).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></label>
 </div>`).join('');
 const signals=[...placementSignals(a.order,all,'expected',{wip:wipOf(a)}).map(s=>[a.name,s]),...placementSignals(b.order,all,'expected',{wip:wipOf(b)}).map(s=>[b.name,s])];
 $('scenario-rows').innerHTML=`<div class="table-scroll"><table class="resource-table"><thead><tr><th>Tiltak</th><th>Scenario</th><th>Lander</th><th>Effektmåneder</th><th>Porteføljeverdi<small>12 mnd</small></th><th>Bidrag i veikartet<small>${HORIZON_MONTHS} mnd</small></th></tr></thead><tbody>${
  [[a,cmp.a],[b,cmp.b]].flatMap(([s,result])=>result.rows.map(r=>`<tr><th scope="row">${esc(r.name)}</th><td>${esc(s.name)}</td><td>${r.beyondHorizon?'Etter horisonten':'Måned '+r.landing}</td><td>${r.effectMonths}</td><td>${money(r.portfolioNet)}</td><td class="${r.horizonNet<0?'negative':'positive'}">${money(r.horizonNet)}</td></tr>`)).join('')
  ||'<tr><td colspan="6">Ingen tiltak i scenarioene.</td></tr>'}</tbody></table></div>
  ${signals.length?`<div class="placement-signals"><strong>Plassering og faktisk landing er uenige:</strong>${signals.map(([name,s])=>`<span>${esc(s.name)} er plassert i ${horizons[s.horizon].label} (${horizons[s.horizon].window}), men lander i måned ${s.landing} i «${esc(name)}».</span>`).join('')}</div>`:''}`;
}

function renderCurve(cmp,a,b){
 const series=[{result:cmp.a,scenario:a,color:'#2d7a64',dash:''},{result:cmp.b,scenario:b,color:'#5a6fa8',dash:' stroke-dasharray="6 3"'}];
 // Eget regnskap, tegnet som referanse: hva problemene koster om de får stå.
 const baseline=baselineVisible()?doNothingCurve(currentProblems()):null;
 const baselineTotal=baseline?baseline.at(-1).cumulative:0;
 const points=[...cmp.a.curve,...cmp.b.curve,...(baseline??[])].map(m=>m.cumulative);
 const min=Math.min(0,...points),max=Math.max(0,...points),spread=(max-min)||1;
 const x=m=>72+m/(HORIZON_MONTHS-1)*468,y=v=>212-(v-min)/spread*182;
 const path=curve=>curve.map((m,i)=>`${i?'L':'M'} ${x(m.month).toFixed(1)} ${y(m.cumulative).toFixed(1)}`).join(' ');
 let grid='';for(let i=0;i<=4;i++){const v=min+spread*i/4;grid+=`<line x1="72" y1="${y(v).toFixed(1)}" x2="540" y2="${y(v).toFixed(1)}" stroke="#eef2f4"/><text x="64" y="${(y(v)+4).toFixed(1)}" text-anchor="end">${compact(v)}</text>`}
 if(min<0&&max>0)grid+=`<line x1="72" y1="${y(0).toFixed(1)}" x2="540" y2="${y(0).toFixed(1)}" stroke="#a3b6bc" stroke-dasharray="4 4"/>`;
 let ticks='';for(const m of [0,6,12,18,23])ticks+=`<text x="${x(m).toFixed(1)}" y="232" text-anchor="middle">${m===23?24:m}</text>`;
 // Markør der hvert tiltak lander: det er her gevinsten begynner å løpe.
 const markers=series.map(({result,color})=>result.rows.filter(r=>!r.beyondHorizon).map(r=>
  `<circle cx="${x(r.landing).toFixed(1)}" cy="${y(result.curve[r.landing].cumulative).toFixed(1)}" r="4.5" fill="white" stroke="${color}" stroke-width="2"><title>${esc(r.name)} lander måned ${r.landing}</title></circle>`).join('')).join('');
 const breakEven=series.map(({result,color,scenario})=>{const m=breakEvenMonth(result.curve);
  return m===null||m===0?'':`<line x1="${x(m).toFixed(1)}" y1="30" x2="${x(m).toFixed(1)}" y2="212" stroke="${color}" stroke-width="1" stroke-dasharray="2 4" opacity=".55"><title>${esc(scenario.name)} går i null i måned ${m}</title></line>`}).join('');
 const nullText=({result})=>{const m=breakEvenMonth(result.curve);return m===null?'går ikke i null':'i null måned '+m};
 const title=`Kumulativ nettoverdi over ${HORIZON_MONTHS} måneder. ${a.name}: ${money(cmp.a.net)}, ${nullText(series[0])}. ${b.name}: ${money(cmp.b.net)}, ${nullText(series[1])}.`;
 $('scenario-curve').innerHTML=`<div class="chart-wrap curve-wrap"><svg viewBox="0 0 560 248" role="img" aria-label="${esc(title)}"><text x="72" y="18">NOK, kumulativt</text>${grid}${ticks}${breakEven}
  <text x="306" y="246" text-anchor="middle">Måneder fra felles start</text>
  ${baseline?`<path d="${path(baseline)}" fill="none" stroke="#a3554c" stroke-width="2" stroke-dasharray="2 5"/>`:''}
  ${series.map(({result,color,dash})=>`<path d="${path(result.curve)}" fill="none" stroke="${color}" stroke-width="2.5"${dash}/>`).join('')}${markers}</svg>
  <div class="curve-legend">${series.map(({scenario,result},i)=>`<span><i class="scenario-key scenario-${i?'b':'a'}"></i>${esc(scenario.name)} · ${money(result.net)} · ${nullText(series[i])}</span>`).join('')}<span class="curve-delta">Forskjell: ${money(cmp.delta)}</span>
  ${baseline?`<span><i class="scenario-key scenario-none"></i>Gjør ingenting · ${money(baselineTotal)}</span>${Math.abs(baselineTotal)>Math.max(Math.abs(cmp.a.net),Math.abs(cmp.b.net))*4?'<span class="curve-warning">Nåkostnaden er mye større enn planverdiene, så plankurvene blir flate. Skru av for å lese dem.</span>':''}`:''}
  <label class="baseline-toggle"><input type="checkbox" id="show-baseline"${baselineVisible()?' checked':''}>Vis hva dagens problemer koster</label>
  <span class="curve-hint">Ring = tiltak lander. Loddrett stiplet = planen går i null.${baseline?' Den røde linjen er et <strong>eget regnskap</strong> over nåkostnader — den skal ikke legges til eller trekkes fra planene.':''}</span></div></div>`;
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
 $('add-scenario').addEventListener('click',()=>{armed=null;const s={id:uid(),name:'Nytt scenario',note:'',order:[]};roadmap.scenarios.push(s);compare.b=s.id;refresh()});
 $('suggest-order').addEventListener('click',()=>{
  armed=null;
  const order=suggestedOrder(items());
  const existing=roadmap.scenarios.find(s=>s.id==='sc-cd3');
  if(existing)existing.order=order;
  else roadmap.scenarios.push({id:'sc-cd3',name:'Foreslått rekkefølge (CD3)',note:'Høyest månedlig driftsbidrag delt på varighet først, men aldri foran en forutsetning. Sekvenserer alle tiltak – den svarer på rekkefølge, ikke på hva som bør droppes. Totalen er derfor ikke sammenlignbar med en plan som inneholder færre tiltak. Rent økonomisk: evidens, risiko og strategisk fit er ikke vurdert.',order});
  compare.b='sc-cd3';refresh();
 });
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
  if(addKr){armed=null;roadmap.objectives.find(o=>o.id===addKr).keyResults.push({id:uid(),title:'Nytt key result',note:''})}
  if(removeObjective){if(!confirmRemove('obj:'+removeObjective))return;roadmap.objectives=roadmap.objectives.filter(o=>o.id!==removeObjective)}
  if(removeKr){if(!confirmRemove('kr:'+removeKr))return;for(const o of roadmap.objectives)o.keyResults=o.keyResults.filter(k=>k.id!==removeKr)}
  refresh();
 });
 $('scenario-pick-a').addEventListener('change',e=>{compare.a=e.target.value;renderScenarios()});
 $('scenario-pick-b').addEventListener('change',e=>{compare.b=e.target.value;renderScenarios()});
 $('scenario-columns').addEventListener('change',e=>{
  const target=e.target.dataset.addTo;if(!target||!e.target.value)return;
  scenarioById(target).order.push(e.target.value);renderScenarios();
 });
 // Navneendring oppdaterer velgerne direkte, så feltet ikke mister fokus av en re-render.
 $('scenario-columns').addEventListener('input',e=>{
  const id=e.target.dataset.scenarioName;if(!id)return;
  scenarioById(id).name=e.target.value;
  for(const sel of [$('scenario-pick-a'),$('scenario-pick-b')]){const option=[...sel.options].find(o=>o.value===id);if(option)option.textContent=e.target.value}
 });
 $('scenario-columns').addEventListener('change',e=>{
  const id=e.target.dataset.wip;if(!id)return;
  scenarioById(id).wip=Math.max(1,Math.min(8,Math.round(e.target.valueAsNumber||1)));
  renderScenarios();
 });
 $('scenario-columns').addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  const remove=button.dataset.removeScenario;
  if(remove){
   if(!confirmRemove('sc:'+remove))return;
   roadmap.scenarios=roadmap.scenarios.filter(s=>s.id!==remove);
   const fallback=roadmap.scenarios[0]?.id??'';
   if(compare.a===remove)compare.a=fallback;
   if(compare.b===remove)compare.b=roadmap.scenarios.find(s=>s.id!==compare.a)?.id??fallback;
   return renderScenarios();
  }
  const s=scenarioById(button.dataset.scenario);if(!s)return;
  const index=s.order.indexOf(button.dataset.id);
  if(button.dataset.drop)s.order=s.order.filter(id=>id!==button.dataset.drop);
  else{const to=button.dataset.move==='up'?index-1:index+1;if(to<0||to>=s.order.length)return;
   [s.order[index],s.order[to]]=[s.order[to],s.order[index]]}
  renderScenarios();
 });
 $('roadmap-board').addEventListener('click',e=>{const select=e.target.closest('[data-select]');if(select)onSelect(select.dataset.select)});
 // Horisont settes enten med nedtrekk (tastatur) eller ved å dra kortet. Begge skriver samme felt.
 const setHorizon=(id,horizon)=>{const t=items().find(x=>x.id===id);if(!t||t.horizon===(horizon||''))return;t.horizon=horizon||'';renderRoadmap();onRerender?.()};
 $('roadmap-board').addEventListener('change',e=>{const id=e.target.dataset.setHorizon;if(id)setHorizon(id,e.target.value)});
 let dragging=null;
 $('roadmap-board').addEventListener('dragstart',e=>{
  const card=e.target.closest('[data-measure-id]');if(!card)return;
  dragging=card.dataset.measureId;card.classList.add('dragging');
  e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragging);
 });
 $('roadmap-board').addEventListener('dragend',()=>{dragging=null;document.querySelectorAll('.roadmap-card.dragging,.roadmap-column.drop-target').forEach(el=>el.classList.remove('dragging','drop-target'))});
 $('roadmap-board').addEventListener('dragover',e=>{
  const column=e.target.closest('[data-horizon]');if(!column||!dragging)return;
  e.preventDefault();e.dataTransfer.dropEffect='move';
  document.querySelectorAll('.roadmap-column.drop-target').forEach(el=>el.classList.remove('drop-target'));
  column.classList.add('drop-target');
 });
 $('roadmap-board').addEventListener('drop',e=>{
  const column=e.target.closest('[data-horizon]');if(!column)return;
  e.preventDefault();
  const id=dragging??e.dataTransfer.getData('text/plain');
  const horizon=column.dataset.horizon;
  dragging=null;
  if(id)setHorizon(id,horizon==='none'?'':horizon);
 });
}
