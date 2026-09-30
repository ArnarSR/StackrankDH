import {STORAGE_VERSION,LAB_STORAGE_VERSION,checkWorkspace} from './storage.mjs';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const objects=x=>Array.isArray(x)&&x.every(object);
const strings=x=>Array.isArray(x)&&x.every(v=>typeof v==='string');
const triple=x=>object(x)&&['low','expected','high'].every(k=>typeof x[k]==='number'||x[k]===null);
export const documentVersion=kind=>kind==='portfolio'?STORAGE_VERSION:kind==='lab'?LAB_STORAGE_VERSION:null;

// Valider formen, ikke om forretningsantakelsene er ferdig utfylt. Utkast med
// tomme navn eller uavklart økonomi skal kunne lagres uten nye modellregler.
export function validateDocument(kind,version,w){
 if(version!==documentVersion(kind)||!documentVersion(kind))return 'Ukjent dokumenttype eller modellversjon.';
 const error=checkWorkspace(w);if(error)return error;
 if(kind==='lab'){
  if(!objects(w.options)||!object(w.pain)||!object(w.plans)||!object(w.settings)||!Number.isFinite(w.delay))return 'Laben mangler alternativer, problem, planer eller parametre.';
  if(!strings(w.plans.A)||!strings(w.plans.B)||!triple(w.pain.reduction))return 'Labens planer eller problem har feil format.';
  if(w.options.some(o=>typeof o.id!=='string'||typeof o.name!=='string'||!triple(o.effort)||!triple(o.benefit)))return 'Et labalternativ har feil format.';
  return '';
 }
 for(const key of ['items','segments','businessUnits','problems'])if(!objects(w[key]))return `Porteføljen mangler listen ${key}.`;
 if(!object(w.roster)||!objects(w.roster.roles)||!object(w.parameters?.product)||!object(w.parameters?.customerValue))return 'Roller eller parametre mangler.';
 if(!object(w.roadmap?.vision)||!objects(w.roadmap?.objectives)||!objects(w.roadmap?.scenarios))return 'Veikartet har feil format.';
 if(w.roadmap.objectives.some(o=>!objects(o.keyResults)))return 'Key results har feil format.';
 if(w.roadmap.scenarios.some(s=>typeof s.id!=='string'||typeof s.name!=='string'||!strings(s.order)))return 'Et scenario har feil format.';
 if(w.github&&(['repo','project'].some(k=>typeof w.github[k]!=='string')))return 'GitHub-innstillinger har feil format.';
 if(w.roster.roles.some(r=>typeof r.id!=='string'||typeof r.name!=='string'||!strings(r.skills??[])))return 'En rolle har feil format.';
 for(const t of w.items){
  if(typeof t.id!=='string'||typeof t.name!=='string'||!['hypothesis','benchmark','observational','quasi','randomized'].includes(t.confidence)||!['low','medium','high'].includes(t.strategicFit))return 'Tiltakets identitet eller vurderinger har feil format.';
  for(const key of ['teams','costItems','sources','risks','tasks','segmentImpact'])if(key in t&&!objects(t[key]))return `Tiltakets ${key} har feil format.`;
  for(const key of ['requires','keyResultIds'])if(key in t&&!strings(t[key]))return `Tiltakets ${key} har feil format.`;
  if((t.teams??[]).some(team=>!triple(team.fte)||!triple(team.weeks)))return 'Teamradens anslag har feil format.';
 }
 for(const list of [w.items,w.segments,w.businessUnits,w.problems,w.roster.roles]){
  const ids=new Set();for(const row of list){if(typeof row.id!=='string'||!row.id||ids.has(row.id))return 'Lister må ha unike, ikke-tomme ID-er.';ids.add(row.id)}
 }
 return '';
}
