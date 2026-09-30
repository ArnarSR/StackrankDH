import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import '../../server/config.mjs';
import {createPool} from '../../server/database.mjs';
import {migrate} from '../../server/migrate.mjs';
import {createRepository} from '../../server/repository.mjs';
import {createAppServer} from '../../server/http.mjs';
import {portfolio,lab,memoryStore} from '../fixtures.mjs';
import {createPersistence,importEnvelope} from '../../dist/persistence.mjs';
import {STORAGE_KEY,makeEnvelope} from '../../dist/storage.mjs';

test('PostgreSQL og HTTP: lagring, historikk, konflikter, nullstilling og isolasjon',async t=>{
 const url=process.env.TEST_DATABASE_URL;
 assert.ok(url,'Sett TEST_DATABASE_URL til en separat testdatabase.');
 assert.match(new URL(url).pathname,/_test$/,'Tester tillates bare i en database med navn som slutter på _test.');
 const pool=createPool(url),workspaceId='test_'+randomUUID().replaceAll('-','');
 await migrate(pool);await migrate(pool);
 const repository=createRepository(pool,workspaceId),server=createAppServer({repository,pool,workspaceId});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{server.close();await once(server,'close');await pool.end()});
 const call=async(path,method='GET',value,headers={})=>{
  const r=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...headers},body:value===undefined?undefined:JSON.stringify(value)});
  return {status:r.status,headers:r.headers,data:await r.json()};
 };
 let revision=0;
 await t.test('Tom SQL-arbeidsflate lagres, leses og overlever ny tilkobling',async()=>{
  assert.equal((await call('/api/documents/portfolio')).data.workspace,null);
  const w=portfolio();w.items[0].name="Kundens 'nye' tiltak";
  const saved=await call('/api/documents/portfolio','PUT',{expectedRevision:0,version:2,workspace:w});
  assert.equal(saved.status,200);revision=saved.data.revision;assert.deepEqual(saved.data.workspace,w);
  const other=createPool(url);try{assert.deepEqual((await createRepository(other,workspaceId).read('portfolio')).workspace,w)}finally{await other.end()}
  assert.equal((await call('/api/documents/portfolio/history')).data.length,1);
  assert.deepEqual((await call('/api/documents/portfolio/history/1')).data.workspace,w);
 });
 await t.test('To samtidige skrivinger gir én ny revisjon og én konflikt',async()=>{
  const results=await Promise.all([call('/api/documents/portfolio','PUT',{expectedRevision:revision,version:2,workspace:portfolio()}),call('/api/documents/portfolio','PUT',{expectedRevision:revision,version:2,workspace:portfolio()})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);revision++;
  assert.equal((await call('/api/documents/portfolio/history')).data.length,2);
 });
 await t.test('Feil struktur, modellversjon og uventede origins blir avvist',async()=>{
  assert.equal((await call('/api/documents/portfolio','PUT',{expectedRevision:revision,version:2,workspace:{items:'bad'}})).status,422);
  assert.equal((await call('/api/documents/portfolio','PUT',{expectedRevision:revision,version:1,workspace:portfolio()})).status,422);
  assert.equal((await call('/api/documents/portfolio','PUT',{expectedRevision:revision,version:2,workspace:portfolio()},{Origin:'https://unrelated.example'})).status,403);
  assert.equal((await call('/api/documents/portfolio')).data.revision,revision);
 });
 await t.test('Feil ved historikkskriving ruller tilbake hele lagringen',async()=>{
  await assert.rejects(repository.write('portfolio',2,portfolio(),revision,'invalid'));
  assert.equal((await repository.read('portfolio')).revision,revision);
  assert.equal((await repository.history('portfolio')).length,revision);
 });
 await t.test('Laben og andre arbeidsflater har uavhengige dokumenter',async()=>{
  assert.equal((await call('/api/documents/lab','PUT',{expectedRevision:0,version:1,workspace:lab()})).status,200);
  assert.deepEqual((await call('/api/documents/lab')).data.workspace,lab());
  assert.equal((await createRepository(pool,workspaceId+'_other').read('portfolio')).workspace,null);
 });
 await t.test('Nullstilling bevarer historikk og blokkerer en gammel fane',async()=>{
  assert.equal((await call('/api/documents/portfolio','DELETE',{expectedRevision:revision})).status,200);revision++;
  const read=await call('/api/documents/portfolio');assert.equal(read.data.workspace,null);assert.equal(read.data.revision,revision);
  assert.equal((await call('/api/documents/portfolio','PUT',{expectedRevision:revision-1,version:2,workspace:portfolio()})).status,409);
  const history=(await call('/api/documents/portfolio/history')).data;assert.equal(history[0].operation,'reset');assert.equal(history.length,3);
  assert.ok((await call('/api/documents/portfolio/history/1')).data.workspace.items.length);
 });
 await t.test('Tom tiltaksportefølje bevares og kan lagres etter reset',async()=>{
  const w=portfolio();w.items=[];
  assert.equal((await call('/api/documents/portfolio','PUT',{expectedRevision:revision,version:2,workspace:w})).status,200);
  assert.deepEqual((await call('/api/documents/portfolio')).data.workspace.items,[]);
 });
 await t.test('Serveren leverer SQL-konfig, helsesjekk og statiske filer uten cache',async()=>{
  assert.equal((await call('/storage-config.json')).data.mode,'sql');assert.equal((await call('/api/health')).status,200);
  const r=await fetch(origin+'/');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.match(await r.text(),/Business Units/);
  assert.equal((await fetch(origin+'/.env')).status,404);
 });
 await t.test('Brutt databaseforbindelse rapporteres som feil, aldri som tom arbeidsflate',async()=>{
  const broken=createAppServer({workspaceId,repository:{read:async()=>{throw Error('secret db host')}},pool});
  broken.listen(0,'127.0.0.1');await once(broken,'listening');
  try{const r=await fetch(`http://127.0.0.1:${broken.address().port}/api/documents/portfolio`);assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/secret db host/)}finally{broken.close();await once(broken,'close')}
 });
 await t.test('Klientadapteren flytter eldre data, lagrer via HTTP og gjenleser fra SQL',async()=>{
  const store=memoryStore(),legacy=JSON.stringify(makeEnvelope(portfolio(),1));store.setItem(STORAGE_KEY,legacy);
  const options={store,fetcher:(path,opts)=>fetch(new URL(path,origin+'/'),opts)};
  const client=createPersistence(STORAGE_KEY,options);assert.equal((await client.load()).ok,true);
  const migrated=client.legacy();assert.equal(migrated.migrated,true);
  assert.equal((await client.save(migrated.workspace)).ok,true);assert.equal(store.getItem(STORAGE_KEY),legacy);
  const reloaded=createPersistence(STORAGE_KEY,options),loaded=await reloaded.load();
  assert.equal(loaded.ok,true);assert.deepEqual(loaded.workspace,migrated.workspace);
  const next=structuredClone(loaded.workspace);next.items[0].name='Lagret fra en annen fane';await reloaded.save(next);
  assert.equal((await client.save(loaded.workspace)).ok,false);assert.equal(importEnvelope(client.recovery()).ok,true);
 });
 await t.test('Overstore dokumenter avvises før databasen berøres',async()=>{
  const before=await repository.read('portfolio'),w=portfolio();w.extra='x'.repeat(2*1024*1024);
  assert.equal((await call('/api/documents/portfolio','PUT',{expectedRevision:before.revision,version:2,workspace:w})).status,413);
  assert.equal((await repository.read('portfolio')).revision,before.revision);
 });
});
