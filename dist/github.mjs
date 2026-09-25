// GitHub-integrasjon uten autentisering. Projects v2 er GraphQL-only og krever
// read:project, og en statisk side har ingen trygg plass å holde en token. I stedet
// bygger vi forhåndsutfylte issue-URL-er som brukeren selv sender inn på github.com.
import {taskStatuses} from './roster.mjs';
const REPO=/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
export function parseRepo(input){
 const value=String(input??'').trim().replace(/\.git$/,'').replace(/\/+$/,'');
 if(!value)return null;
 if(REPO.test(value))return value;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||!/^(www\.)?github\.com$/.test(url.hostname))return null;
  const parts=url.pathname.split('/').filter(Boolean);
  const repo=parts.slice(0,2).join('/');
  return REPO.test(repo)?repo:null;
 }catch{return null}
}
// title/body/labels/assignees/projects er dokumenterte parametere på GitHubs nye-issue-skjema.
export function issueUrl(repo,{title='',body='',labels=[],assignees=[],projects=[]}={}){
 const target=parseRepo(repo);if(!target)return null;
 const url=new URL(`https://github.com/${target}/issues/new`);
 const list=v=>(Array.isArray(v)?v:[v]).map(s=>String(s).trim()).filter(Boolean);
 if(title.trim())url.searchParams.set('title',title.trim());
 if(body.trim())url.searchParams.set('body',body.trim());
 if(list(labels).length)url.searchParams.set('labels',list(labels).join(','));
 if(list(assignees).length)url.searchParams.set('assignees',list(assignees).join(','));
 if(list(projects).length)url.searchParams.set('projects',list(projects).join(','));
 return url.href;
}
export function safeIssueUrl(value){
 try{
  const url=new URL(String(value));
  return url.protocol==='https:'&&/^(www\.)?github\.com$/.test(url.hostname)&&!url.username&&!url.password?url.href:null;
 }catch{return null}
}
// Én linje per oppgave. Regnearkformler nøytraliseres slik at en eksport ikke kan
// kjøre noe når den åpnes i Excel eller Sheets.
const cell=value=>{
 const text=String(value??'');
 const safe=/^[=+\-@\t\r]/.test(text)?`'${text}`:text;
 return /[",\n\r]/.test(safe)?`"${safe.replace(/"/g,'""')}"`:safe;
};
export function tasksToCsv(items,roleName=()=>''){
 const header=['Tiltak','Team','Rolle','Oppgave','Estimat (ressursuker)','Status','Issue'];
 const rows=items.flatMap(t=>(t.tasks??[]).map(task=>{
  const team=(t.teams??[]).find(r=>r.id===task.teamId);
  return [t.name,team?.name??'',roleName(task.roleId||team?.roleId)||'',task.title,task.estimateWeeks??'',taskStatuses[task.status]??'',task.issueUrl??''];
 }));
 return [header,...rows].map(row=>row.map(cell).join(',')).join('\n');
}
