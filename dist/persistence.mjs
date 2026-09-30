import {STORAGE_KEY,STORAGE_VERSION,LAB_STORAGE_VERSION,safeRead,safeWrite,safeClear,makeEnvelope,parseEnvelope} from './storage.mjs';
export function importEnvelope(text,key=STORAGE_KEY){
 const version=key===STORAGE_KEY?STORAGE_VERSION:LAB_STORAGE_VERSION;
 let data;try{data=JSON.parse(text)}catch{return parseEnvelope(text,version)}
 if(data?.app==='churn-studio'&&(key===STORAGE_KEY?!Array.isArray(data.workspace?.items):!Array.isArray(data.workspace?.options)))return {ok:false,error:'Filen tilhører ikke denne arbeidsflaten (portefølje/lab).'};
 if(key===STORAGE_KEY&&data?.app==='churn-studio'&&data.version===1){
  const old=parseEnvelope(text,1);if(!old.ok)return old;
  const workspace=structuredClone(old.workspace);
  workspace.businessUnits??=[];
  for(const item of workspace.items??[])item.businessUnitId??='';
  for(const role of workspace.roster?.roles??[])role.businessUnitId??='';
  return {...parseEnvelope(JSON.stringify(makeEnvelope(workspace)),version),migrated:true};
 }
 return parseEnvelope(text,version);
}

export function createPersistence(key,{fetcher=globalThis.fetch,store=globalThis.localStorage}={}){
 const kind=key===STORAGE_KEY?'portfolio':'lab',version=kind==='portfolio'?STORAGE_VERSION:LAB_STORAGE_VERSION;
 let mode='unknown',workspaceId='',revision=null,queue=Promise.resolve(),blocked='',serial=0;
 const recoveryKey=()=>`${key}:sql-recovery:${workspaceId}`;
 const resultError=error=>({ok:false,error});
 async function request(path,options={}){
  const response=await fetcher(path,{cache:'no-store',signal:AbortSignal.timeout(8000),...options});
  const data=await response.json();
  if(!response.ok)throw new Error(response.status===409?'En annen fane har lagret en nyere versjon. Eksporter utkastet og last inn serverversjonen.':data.error??`Serverfeil (${response.status}).`);
  return data;
 }
 function backup(workspace){
  if(mode!=='sql')return {ok:true};
  serial++;
  try{if(!store)throw new Error('Nettleserlagring er utilgjengelig.');store.setItem(recoveryKey(),JSON.stringify(makeEnvelope(workspace,version)));return {ok:true}}
  catch(e){return resultError(e.message)}
 }
 const api={
  get mode(){return mode},get workspaceId(){return workspaceId},
  backup,
  recovery(){try{return store?.getItem(recoveryKey())??null}catch{return null}},
  legacy(){try{const raw=store?.getItem(key);return raw?importEnvelope(raw,key):resultError('Ingen tidligere nettleserdata på denne adressen.')}catch{return resultError('Nettleserdata kunne ikke leses.')}},
  async load(){
   try{
    const config=await request('./storage-config.json');
    if(!['sql','local'].includes(config.mode))throw new Error('Ukjent lagringsmodus.');
    mode=config.mode;workspaceId=config.workspaceId??'';
    if(mode==='local')return safeRead(key,store);
    const data=await request(`/api/documents/${kind}`);
    if(!Number.isInteger(data.revision)||data.revision<0)throw new Error('Serveren svarte uten gyldig revisjon.');
    if(data.workspace!==null){const parsed=parseEnvelope(JSON.stringify(makeEnvelope(data.workspace,data.version)),version);if(!parsed.ok)throw new Error(parsed.error)}
    revision=data.revision;blocked='';
    return {ok:true,workspace:data.workspace,savedAt:data.savedAt,recovery:!!api.recovery()};
   }catch(e){blocked=e.message||'Kunne ikke koble til lagringen.';return resultError(blocked)}
  },
  save(workspace){
   const snapshot=structuredClone(workspace),recovery=backup(snapshot),ticket=serial;
   const operation=async()=>{
    if(mode==='local')return safeWrite(key,snapshot,store);
    if(blocked||revision===null)return resultError(blocked||'Lagring er ikke initialisert.');
    try{
     const data=await request(`/api/documents/${kind}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({version,workspace:snapshot,expectedRevision:revision})});
     revision=data.revision;
     if(ticket===serial)safeClear(recoveryKey(),store);
     return {ok:true,revision,savedAt:data.savedAt};
    }catch(e){blocked=e.message;return resultError(blocked+(recovery.ok?' Lokalt nødutkast er beholdt.':' Eksporter nå; lokalt nødutkast kunne ikke lagres.'))}
   };
   const result=queue.then(operation);queue=result.catch(()=>{});return result;
  },
  clear(){
   const operation=async()=>{
    if(mode==='local')return safeClear(key,store);
    if(blocked||revision===null)return resultError(blocked||'Lagring er ikke initialisert.');
    try{
     const data=await request(`/api/documents/${kind}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:revision})});
     revision=data.revision;safeClear(recoveryKey(),store);return {ok:true};
    }catch(e){blocked=e.message;return resultError(blocked)}
   };
   const result=queue.then(operation);queue=result.catch(()=>{});return result;
  }
 };
 return api;
}
