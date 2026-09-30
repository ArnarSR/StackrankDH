import {calculate} from './model.mjs';
import {teamEffort} from './resources.mjs';

export const seedBusinessUnits=()=>[];
export const businessUnitById=(units,id)=>units.find(u=>u.id===id)??null;
export function validateBusinessUnits(units){
 const ids=new Set(),names=new Set();
 for(const unit of units){
  if(typeof unit.id!=='string'||!unit.id||ids.has(unit.id))return 'BU-er må ha unike ID-er.';
  ids.add(unit.id);
  if(!unit.name?.trim())return 'Gi forretningsenheten et navn.';
  const name=unit.name.trim().toLocaleLowerCase('nb-NO');
  if(names.has(name))return 'To forretningsenheter kan ikke ha samme navn.';
  names.add(name);
 }
 return '';
}
// Hver teamrad bidrar én gang. Oppgaver, kostnadsinkludering og antall roller
// skal aldri fordele eller multiplisere tiltaksverdien.
export function businessUnitReport(items,roster,units){
 const known=new Set(units.map(u=>u.id));
 const bucket=id=>known.has(id)?id:'';
 const roles=new Map((roster?.roles??[]).map(r=>[r.id,r]));
 const groups=[...units,{id:'',name:'Ufordelt'}].map(u=>({...u,net:0,gross:0,cost:0,items:[],effort:0}));
 const byId=new Map(groups.map(u=>[u.id,u]));
 const matrix=new Map(groups.map(u=>[u.id,new Map(groups.map(v=>[v.id,{weeks:0,items:new Set()}]))]));
 const measures=items.map(t=>{
  const ownerId=bucket(t.businessUnitId),value=calculate(t),owner=byId.get(ownerId);
  owner.net+=value.net;owner.gross+=value.gross;owner.cost+=value.cost;owner.items.push(t.id);
  const participants=new Set();let unassignedWeeks=0;
  for(const team of t.teams??[]){
   const contributorId=bucket(roles.get(team.roleId)?.businessUnitId),weeks=teamEffort(team,'expected');
   const cell=matrix.get(ownerId).get(contributorId);
   cell.weeks+=weeks;cell.items.add(t.id);byId.get(contributorId).effort+=weeks;
   participants.add(contributorId);if(!contributorId)unassignedWeeks+=weeks;
  }
  return {id:t.id,name:t.name,ownerId,participants:[...participants],unassignedWeeks,net:value.net};
 });
 return {groups,matrix,measures,total:groups.reduce((n,u)=>n+u.net,0)};
}
export function removeBusinessUnit(units,id,items,roster){
 for(const t of items)if(t.businessUnitId===id)t.businessUnitId='';
 for(const role of roster.roles??[])if(role.businessUnitId===id)role.businessUnitId='';
 return units.filter(u=>u.id!==id);
}
