// Lagring i nettleseren, med versjon. Lagret data som ikke stemmer med dagens
// modell avvises heller enn å lastes halvveis inn – da er eksempeldataene et
// tryggere utgangspunkt enn en halvt gjenopprettet arbeidsflate.
export const STORAGE_VERSION=1;
export const STORAGE_KEY='churn-studio:workspace';
export const LAB_STORAGE_KEY='churn-studio:lab';
const APP='churn-studio';
export const makeEnvelope=(workspace,version=STORAGE_VERSION)=>({app:APP,version,savedAt:new Date().toISOString(),workspace});
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
// Strukturkrav. Valideringsfeil i innholdet er brukerens sak; feil form er vår.
export function checkWorkspace(workspace){
 if(!isObject(workspace))return 'Filen mangler et gyldig arbeidsområde.';
 if('items' in workspace&&!Array.isArray(workspace.items))return 'Tiltakslisten har feil format.';
 if('problems' in workspace&&!Array.isArray(workspace.problems))return 'Problemlisten har feil format.';
 for(const key of ['roadmap','roster','parameters','github'])
  if(key in workspace&&!isObject(workspace[key]))return `Feltet «${key}» har feil format.`;
 if(isObject(workspace.roadmap)&&'scenarios' in workspace.roadmap&&!Array.isArray(workspace.roadmap.scenarios))
  return 'Scenariolisten har feil format.';
 if(isObject(workspace.roster)&&'roles' in workspace.roster&&!Array.isArray(workspace.roster.roles))
  return 'Rollelisten har feil format.';
 return null;
}
export function parseEnvelope(text){
 let data;
 try{data=JSON.parse(text)}catch{return {ok:false,error:'Filen er ikke gyldig JSON.'}}
 if(!isObject(data))return {ok:false,error:'Filen inneholder ikke et lagret arbeidsområde.'};
 if(data.app!==APP)return {ok:false,error:'Filen ser ikke ut til å komme fra Churn Studio.'};
 if(data.version!==STORAGE_VERSION)
  return {ok:false,error:`Filen er lagret med version ${data.version??'ukjent'}, men denne utgaven bruker ${STORAGE_VERSION}. Den kan ikke leses inn.`};
 const problem=checkWorkspace(data.workspace);
 if(problem)return {ok:false,error:problem};
 return {ok:true,workspace:data.workspace,savedAt:data.savedAt??null};
}
// Nettleserlagring kan kaste: privat modus, full kvote, blokkerte data.
// Alt pakkes inn, og appen skal virke også når lagring ikke er tilgjengelig.
export function safeRead(key,store=globalThis.localStorage){
 try{
  const raw=store?.getItem(key);
  if(!raw)return {ok:true,workspace:null};
  const result=parseEnvelope(raw);
  return result.ok?{ok:true,workspace:result.workspace,savedAt:result.savedAt}:{ok:false,error:result.error};
 }catch(e){return {ok:false,error:'Kunne ikke lese lagret data: '+(e?.message??'ukjent feil')}}
}
export function safeWrite(key,workspace,store=globalThis.localStorage){
 try{
  store?.setItem(key,JSON.stringify(makeEnvelope(workspace)));
  return {ok:true};
 }catch(e){
  const full=e?.name==='QuotaExceededError'||e?.code===22;
  return {ok:false,error:full?'Lagringsplassen i nettleseren er full. Eksporter til fil og rydd i data.':'Kunne ikke lagre: '+(e?.message??'ukjent feil')};
 }
}
export function safeClear(key,store=globalThis.localStorage){
 try{store?.removeItem(key);return {ok:true}}catch(e){return {ok:false,error:e?.message??'ukjent feil'}}
}
export const exportName=(date=new Date())=>`churn-studio-${date.toISOString().slice(0,10)}.json`;
