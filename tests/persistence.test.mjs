import test from 'node:test';
import assert from 'node:assert/strict';
import {createPersistence,importEnvelope} from '../dist/persistence.mjs';
import {STORAGE_KEY,LAB_STORAGE_KEY,makeEnvelope} from '../dist/storage.mjs';
import {validateDocument} from '../dist/workspace-schema.mjs';
import {portfolio,lab,memoryStore} from './fixtures.mjs';
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});

test('Statisk modus bruker nettleserlagring og ingen SQL-kall',async()=>{
 const store=memoryStore(),calls=[];
 const adapter=createPersistence(STORAGE_KEY,{store,fetcher:async path=>{calls.push(path);return response({mode:'local'})}});
 assert.equal((await adapter.load()).ok,true);
 await adapter.save(portfolio());assert.ok(store.getItem(STORAGE_KEY));assert.equal(calls.length,1);
 await adapter.clear();assert.equal(store.getItem(STORAGE_KEY),null);
});
test('SQL-køen lagrer raske endringer i rekkefølge med riktig revisjon',async()=>{
 const writes=[],store=memoryStore();let revision=0;
 const adapter=createPersistence(STORAGE_KEY,{store,fetcher:async(path,opts)=>{
  if(path.includes('config'))return response({mode:'sql',workspaceId:'test'});
  if(!opts.method)return response({revision:0,workspace:null});
  const body=JSON.parse(opts.body);writes.push(body);assert.equal(body.expectedRevision,revision);
  return response({revision:++revision});
 }});
 await adapter.load();const a=portfolio(),b=portfolio();b.items[0].name='Endret';
 const first=adapter.save(a),second=adapter.save(b);b.items[0].name='Endret igjen etter lagringskall';
 assert.equal((await first).ok,true);assert.equal((await second).ok,true);
 assert.equal(writes[1].workspace.items[0].name,'Endret');assert.equal(adapter.recovery(),null);
});
test('Konflikt stopper videre skriving og bevarer eksporterbart nødutkast',async()=>{
 const store=memoryStore();let writes=0;
 const adapter=createPersistence(STORAGE_KEY,{store,fetcher:async(path,opts)=>{
  if(path.includes('config'))return response({mode:'sql',workspaceId:'test'});
  if(!opts.method)return response({revision:2,version:2,workspace:portfolio()});
  writes++;return response({},409);
 }});
 await adapter.load();assert.equal((await adapter.save(portfolio())).ok,false);
 assert.equal((await adapter.save(portfolio())).ok,false);assert.equal(writes,1);
 assert.equal(importEnvelope(adapter.recovery()).ok,true);assert.equal(store.getItem(STORAGE_KEY),null);
});
test('Databasefeil gir aldri stille lokal fallback',async()=>{
 const store=memoryStore();let calls=0;
 const adapter=createPersistence(STORAGE_KEY,{store,fetcher:async()=>++calls===1?response({mode:'sql',workspaceId:'test'}):response({error:'Frakoblet'},503)});
 assert.equal((await adapter.load()).ok,false);assert.equal(adapter.mode,'sql');
 assert.equal((await adapter.save(portfolio())).ok,false);assert.equal(store.getItem(STORAGE_KEY),null);
});
test('Et nyere lokalt utkast beholdes når en eldre SQL-lagring fullføres',async()=>{
 let release;const pending=new Promise(r=>release=r);
 const adapter=createPersistence(STORAGE_KEY,{store:memoryStore(),fetcher:async(path,opts)=>{
  if(path.includes('config'))return response({mode:'sql',workspaceId:'test'});
  if(!opts.method)return response({revision:0,workspace:null});
  await pending;return response({revision:1});
 }});
 await adapter.load();const first=adapter.save(portfolio()),newer=portfolio();newer.items[0].name='Nyere utkast';adapter.backup(newer);release();await first;
 assert.equal(importEnvelope(adapter.recovery()).workspace.items[0].name,'Nyere utkast');
});
test('Gammel portefølje oppgraderes bare ved eksplisitt import og originalen bevares',async()=>{
 const w=portfolio();delete w.businessUnits;const raw=JSON.stringify(makeEnvelope(w,1)),store=memoryStore();store.setItem(STORAGE_KEY,raw);
 const adapter=createPersistence(STORAGE_KEY,{store,fetcher:async path=>response(path.includes('config')?{mode:'sql',workspaceId:'test'}:{revision:0,workspace:null})});
 await adapter.load();assert.equal(store.getItem(STORAGE_KEY),raw);
 const imported=adapter.legacy();assert.equal(imported.migrated,true);assert.equal(imported.workspace.items[0].businessUnitId,'');
 assert.equal(store.getItem(STORAGE_KEY),raw);assert.equal(importEnvelope(raw,LAB_STORAGE_KEY).ok,false);
});
test('API-valideringen godtar hele arbeidsflater og avviser ødelagte strukturer',()=>{
 assert.equal(validateDocument('portfolio',2,portfolio()),'');assert.equal(validateDocument('lab',1,lab()),'');
 assert.ok(validateDocument('portfolio',2,{}));assert.ok(validateDocument('lab',2,lab()));
 const w=portfolio();w.items[0].teams[0].fte='feil';assert.ok(validateDocument('portfolio',2,w));
 const empty=portfolio();empty.items=[];assert.equal(validateDocument('portfolio',2,empty),'');
});
