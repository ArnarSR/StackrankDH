import {seedRoster,roleDemand,measureRoles,taskBreakdown,taskStatuses,roleName,validateRoster} from './roster.mjs';
import {parseRepo,issueUrl,safeIssueUrl,tasksToCsv} from './github.mjs';
const $=id=>document.getElementById(id);
const number=(v,d=0)=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:d,minimumFractionDigits:d}).format(v);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID();
let roster=seedRoster(),github={repo:'',project:''},readItems=()=>[],armed=null;
export const currentRoster=()=>roster;
export const githubSettings=()=>github;
const removeLabel=key=>armed===key?'Bekreft':'Fjern';

export function renderRoster(){renderRoleRows();renderCapacity();}
function renderRoleRows(){
 $('role-rows').innerHTML=roster.roles.map(role=>`<div class="role-row" data-role-id="${esc(role.id)}">
  <label class="role-name">Rolle<input data-field="name" value="${esc(role.name)}" maxlength="80"></label>
  <label>Kapasitet (FTE)<input data-field="capacity" type="number" min="0" max="1000" step="0.1" value="${role.capacity}"></label>
  <label class="role-skills">Ferdigheter<input data-field="skills" value="${esc((role.skills??[]).join(', '))}" maxlength="200" placeholder="Komma mellom hver"></label>
  <button type="button" class="danger" data-remove-role="${esc(role.id)}">${removeLabel('role:'+role.id)}</button>
 </div>`).join('')||'<p class="field-help">Ingen roller definert ennå.</p>';
}
// Skilles ut, slik at skriving i en rollerad ikke river vekk feltet man står i.
function renderCapacity(){
 const items=readItems();
 const {roles,unassigned}=roleDemand(items,roster);
 const error=validateRoster(roster);
 $('roster-error').textContent=error;
 $('capacity-rows-roles').innerHTML=roles.length?roles.map(r=>{
  const pct=r.utilisation;
  return `<tr><th scope="row">${esc(r.name)}<small>${esc((r.skills??[]).join(' · '))||'Ingen ferdigheter oppgitt'}</small></th>
   <td>${number(r.capacity,1)}</td><td>${r.measures}</td><td>${number(r.demand,1)}</td><td>${number(r.available,0)}</td>
   <td class="${r.over?'negative':'positive'}">${pct===null?'—':number(pct,1)+' %'}</td>
   <td><div class="util-bar"><i class="${r.over?'over':''}" style="width:${pct===null?0:Math.min(100,pct).toFixed(1)}%"></i></div>${r.over?'<small class="negative">Over kapasitet</small>':''}</td></tr>`;
 }).join(''):'<tr><td colspan="7">Ingen roller definert ennå.</td></tr>';
 $('unassigned-demand').innerHTML=unassigned>0
  ?`<strong>${number(unassigned,1)} ressursuker</strong> ligger på teamrader uten rolle, og teller ikke med i kapasitetsbruken over.`
  :'Alle teamrader er knyttet til en rolle.';
 renderGithubStatus();
}
function renderGithubStatus(){
 const repo=parseRepo(github.repo);
 $('github-status').innerHTML=github.repo.trim()
  ?(repo?`Bruker <strong>${esc(repo)}</strong>. «Opprett issue» åpner GitHubs skjema ferdig utfylt – ingenting sendes inn automatisk.`
        :'<span class="negative">Ugyldig repo. Bruk <code>eier/navn</code> eller en full github.com-adresse.</span>')
  :'Uten repo kan oppgaver fortsatt lenkes til en issue-URL manuelt.';
}

// Oppgaver per teamrad, med avvik mot teamradens ressursuker.
export function renderTasks(t){
 const {rows,orphans}=taskBreakdown(t);
 const repo=parseRepo(github.repo);
 const link=task=>{
  const existing=safeIssueUrl(task.issueUrl);
  if(existing)return `<a href="${esc(existing)}" target="_blank" rel="noopener noreferrer">Åpne issue ↗</a>`;
  if(!repo)return '<span class="task-hint">Sett repo for å opprette issue</span>';
  const url=issueUrl(repo,{title:`${t.name}: ${task.title}`,
   body:`Fra Churn Studio.\n\nTiltak: ${t.name}\nEstimat: ${task.estimateWeeks} ressursuker\n\n${task.note??''}`.trim(),
   projects:github.project.trim()?[github.project.trim()]:[]});
  return url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Opprett issue ↗</a>`:'';
 };
 $('task-list').innerHTML=rows.length?rows.map(row=>`<div class="task-group">
  <div class="task-group-head"><h4>${esc(row.name)}</h4>
   <span class="badge ${row.state==='match'?'evidence-quasi':row.state==='over'?'fit-low':'fit-medium'}">${
    row.state==='match'?'Helt brutt ned':row.state==='over'?`${number(Math.abs(row.diff),1)} uker over teamraden`:`${number(row.diff,1)} uker ikke brutt ned`}</span>
   <small>${number(row.taskWeeks,1)} av ${number(row.teamWeeks,1)} ressursuker${row.roleId?' · '+esc(roleName(roster,row.roleId)):' · uten rolle'}</small></div>
  ${row.tasks.length?row.tasks.map(task=>`<div class="task-row"><span class="task-status status-${task.status}">${taskStatuses[task.status]}</span>
   <div><strong>${esc(task.title)}</strong><small>${number(task.estimateWeeks,1)} ressursuker${task.roleId?' · '+esc(roleName(roster,task.roleId)):''}</small></div>
   ${link(task)}</div>`).join(''):'<p class="field-help">Ingen oppgaver lagt til på denne teamraden.</p>'}
 </div>`).join(''):'<p class="field-help">Legg til team på tiltaket for å kunne bryte arbeidet ned i oppgaver.</p>';
 const roles=measureRoles(t,roster);
 $('measure-roles').innerHTML=roles.length
  ?`<span class="roles-label">Hvem må være med:</span>${roles.map(r=>`<span class="role-chip">${esc(r.name)}<small>${esc((r.skills??[]).slice(0,3).join(', '))}</small></span>`).join('')}`
  :'<span class="roles-label">Ingen roller er knyttet til dette tiltaket ennå.</span>';
 $('task-orphans').innerHTML=orphans.length
  ?`<strong>${orphans.length} ${orphans.length===1?'oppgave peker':'oppgaver peker'} på en teamrad som ikke finnes lenger:</strong> ${esc(orphans.map(o=>o.title).join(', '))}. Flytt dem til en teamrad eller slett dem.`:'';
}

export function bindRoster(getItems,onChange){
 readItems=getItems;
 const refresh=()=>{renderRoster();onChange?.()};
 $('add-role').addEventListener('click',()=>{armed=null;roster.roles.push({id:uid(),name:'Ny rolle',capacity:1,skills:[],note:''});refresh()});
 $('role-rows').addEventListener('input',e=>{
  const field=e.target.dataset.field;if(!field)return;
  const role=roster.roles.find(r=>r.id===e.target.closest('[data-role-id]').dataset.roleId);
  if(field==='skills')role.skills=e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
  else if(field==='capacity')role.capacity=e.target.valueAsNumber;
  else role.name=e.target.value;
  renderCapacity();onChange?.();
 });
 $('role-rows').addEventListener('click',e=>{
  const id=e.target.closest('button')?.dataset.removeRole;if(!id)return;
  if(armed!=='role:'+id){armed='role:'+id;return renderRoster()}
  armed=null;roster.roles=roster.roles.filter(r=>r.id!==id);refresh();
 });
 for(const [id,key] of [['github-repo','repo'],['github-project','project']])
  $(id).addEventListener('input',e=>{github[key]=e.target.value;renderGithubStatus();onChange?.()});
 $('export-tasks').addEventListener('click',()=>{
  const csv=tasksToCsv(readItems(),id=>roleName(roster,id));
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='churn-studio-oppgaver.csv';a.click();
  URL.revokeObjectURL(url);
 });
}
