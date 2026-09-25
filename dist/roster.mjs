import {problem} from './validation.mjs';
import {teamEffort} from './resources.mjs';
export const taskStatuses={todo:'Ikke startet',doing:'Pågår',done:'Ferdig'};
export const seedRoster=()=>({roles:[
 {id:'role-platform',name:'Plattform & nettverk',capacity:3,skills:['Telemetri','API','Datamodellering'],note:'Illustrativ kapasitet.'},
 {id:'role-wifi',name:'Wi-Fi & CPE',capacity:2,skills:['Firmware','Radiodekning','Feilsøking'],note:'Illustrativ kapasitet.'},
 {id:'role-app',name:'App & digitale flater',capacity:2.5,skills:['iOS','Android','Analyse'],note:'Illustrativ kapasitet.'},
 {id:'role-cx',name:'Kundeopplevelse',capacity:1.5,skills:['Tjenestedesign','Brukertest','Innholdsdesign'],note:'Illustrativ kapasitet.'},
 {id:'role-service',name:'Kundeservice',capacity:2,skills:['Arbeidsprosess','Opplæring','Pilotdrift'],note:'Illustrativ kapasitet.'},
 {id:'role-security',name:'Sikkerhet & personvern',capacity:1,skills:['Personvern','Risikovurdering','Leverandøravtaler'],note:'Illustrativ kapasitet.'}
]});
export const roleById=(roster,id)=>(roster?.roles??[]).find(r=>r.id===id)??null;
export const roleName=(roster,id)=>roleById(roster,id)?.name??'';
// Oppgaver brytes ned under en teamrad. Teamraden er fortsatt eneste kilde til
// kostnad; differansen rapporteres i stedet for å avstemmes i stillhet.
export function taskBreakdown(t,key='expected'){
 const tasks=t.tasks??[],teams=t.teams??[];
 const known=new Set(teams.map(r=>r.id));
 return {
  rows:teams.map(team=>{
   const own=tasks.filter(x=>x.teamId===team.id);
   const taskWeeks=own.reduce((n,x)=>n+(Number(x.estimateWeeks)||0),0);
   const teamWeeks=teamEffort(team,key);
   const diff=teamWeeks-taskWeeks;
   return {teamId:team.id,name:team.name,roleId:team.roleId??'',tasks:own,taskWeeks,teamWeeks,diff,
    state:Math.abs(diff)<1e-9?'match':diff>0?'under':'over'};
  }),
  orphans:tasks.filter(x=>!known.has(x.teamId))
 };
}
// Hvem må være med: distinkte roller på tiltakets teamrader og oppgaver.
export function measureRoles(t,roster){
 const ids=new Set();
 for(const team of t.teams??[])if(team.roleId)ids.add(team.roleId);
 for(const task of t.tasks??[]){
  if(task.roleId)ids.add(task.roleId);
  else{const team=(t.teams??[]).find(r=>r.id===task.teamId);if(team?.roleId)ids.add(team.roleId)}
 }
 return [...ids].map(id=>roleById(roster,id)).filter(Boolean);
}
// Etterspørsel mot kapasitet. Ressursuker er samme enhet som ellers i verktøyet.
export function roleDemand(items,roster,key='expected',horizonWeeks=104){
 const roles=(roster?.roles??[]).map(role=>{
  let demand=0,measures=new Set();
  for(const t of items)for(const team of t.teams??[])if(team.roleId===role.id){demand+=teamEffort(team,key);measures.add(t.id)}
  const available=(role.capacity||0)*horizonWeeks;
  return {id:role.id,name:role.name,skills:role.skills??[],capacity:role.capacity||0,
   demand,available,measures:measures.size,
   utilisation:available>0?demand/available*100:null,over:available>0&&demand>available};
 });
 let unassigned=0;
 for(const t of items)for(const team of t.teams??[])if(!team.roleId)unassigned+=teamEffort(team,key);
 return {roles,unassigned};
}
export function validateRoster(roster){return validateRosterIssue(roster)?.message??'';}
export function validateRosterIssue(roster){
 const ids=new Set();
 for(const [i,role] of (roster?.roles??[]).entries()){
  const fail=(message,...fields)=>problem(`Rolle ${i+1}${role.name?' – '+role.name:''}: ${message}`,'role',role.id,fields);
  if(!role.name?.trim())return fail('gi rollen et navn.','name');
  if(ids.has(role.id))return fail('rollen har en duplisert ID.','name');ids.add(role.id);
  if(!Number.isFinite(role.capacity)||role.capacity<0)return fail('kapasitet må være et gyldig tall som er 0 eller større.','capacity');
 }
 return null;
}
export function validateTasks(t,roster){return validateTaskIssue(t,roster)?.message??'';}
export function validateTaskIssue(t,roster){
 const teams=new Set((t.teams??[]).map(r=>r.id));
 const roles=new Set((roster?.roles??[]).map(r=>r.id));
 for(const [i,task] of (t.tasks??[]).entries()){
  const fail=(message,...fields)=>problem(`Oppgave ${i+1}${task.title?' – '+task.title:''}: ${message}`,'task',task.id,fields);
  if(!task.title?.trim())return fail('gi oppgaven en tittel.','title');
  if(!teams.has(task.teamId))return fail('velg hvilken teamrad oppgaven hører til.','teamId');
  if(!taskStatuses[task.status])return fail('velg en gyldig status.','status');
  if(!Number.isFinite(task.estimateWeeks)||task.estimateWeeks<0)return fail('estimatet må være et gyldig antall ressursuker som er 0 eller større.','estimateWeeks');
  if(task.roleId&&!roles.has(task.roleId))return fail('velg rollen på nytt; den forrige finnes ikke lenger.','roleId');
 }
 return null;
}
