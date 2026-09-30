import test from 'node:test';
import assert from 'node:assert/strict';
import {views,DEFAULT_VIEW,measureAnchors,parseRoute,routeHash,sameRoute} from '../dist/router.mjs';

test('Tomme og ukjente ruter faller tilbake til portefølgen',()=>{
 for(const hash of ['','#','#/','#//','#/finnesikke'])
  assert.equal(parseRoute(hash).view,DEFAULT_VIEW,`«${hash}» skulle falt tilbake`);
 assert.equal(parseRoute('#/finnesikke').unknown,'finnesikke','ukjent rute navngis');
 assert.equal(parseRoute(undefined).view,DEFAULT_VIEW);
});

test('Hver visning har en rute begge veier',()=>{
 for(const [key,config] of Object.entries(views)){
  if(key==='measure')continue;
  assert.equal(parseRoute('#/'+config.hash).view,key,`${key} skulle parses`);
  assert.equal(routeHash({view:key}),'#/'+config.hash);
 }
});

test('Tiltaksruten bærer id, og underanker når det er et gyldig et',()=>{
 assert.deepEqual(parseRoute('#/tiltak/diagnostics'),{view:'measure',measureId:'diagnostics'});
 assert.deepEqual(parseRoute('#/tiltak/diagnostics/risiko'),{view:'measure',measureId:'diagnostics',anchor:'risiko'});
 // Ukjent underanker forkastes, men tiltaket beholdes.
 assert.deepEqual(parseRoute('#/tiltak/diagnostics/tull'),{view:'measure',measureId:'diagnostics'});
 for(const anchor of measureAnchors)
  assert.equal(parseRoute(`#/tiltak/x/${anchor}`).anchor,anchor);
});

test('Tiltak uten id er ikke en gyldig rute',()=>{
 assert.equal(parseRoute('#/tiltak').view,DEFAULT_VIEW);
 assert.equal(parseRoute('#/tiltak/').view,DEFAULT_VIEW);
 assert.equal(routeHash({view:'measure'}),'#/portefolje','uten id gir portefølgen');
});

test('Id-er med spesialtegn overlever kodingen begge veier',()=>{
 const id='a b/c#d';
 const hash=routeHash({view:'measure',measureId:id});
 assert.ok(!hash.includes(' '),'mellomrom må kodes');
 assert.equal(parseRoute(hash).measureId,id);
 const uuid='3f2b1c9e-7a44-4d1e-9f2a-8c5b6d7e1a23';
 assert.equal(parseRoute(routeHash({view:'measure',measureId:uuid})).measureId,uuid);
});

test('Samme rute gjenkjennes uavhengig av hvordan den er skrevet',()=>{
 assert.ok(sameRoute({view:'roadmap'},parseRoute('#/veikart')));
 assert.ok(sameRoute(parseRoute('#/tiltak/a/risiko'),{view:'measure',measureId:'a',anchor:'risiko'}));
 assert.ok(!sameRoute({view:'measure',measureId:'a'},{view:'measure',measureId:'b'}));
});

test('Ugyldig visning gir portefølgen i stedet for en ødelagt lenke',()=>{
 assert.equal(routeHash({view:'finnesikke'}),'#/portefolje');
 assert.equal(routeHash(),'#/portefolje');
 assert.equal(routeHash({}),'#/portefolje');
});

test('Underanker uten gyldig navn utelates fra lenken',()=>{
 assert.equal(routeHash({view:'measure',measureId:'a',anchor:'tull'}),'#/tiltak/a');
 assert.equal(routeHash({view:'measure',measureId:'a',anchor:'risiko'}),'#/tiltak/a/risiko');
});

test('Alle visninger peker på en seksjon og har menytekst',()=>{
 for(const [key,config] of Object.entries(views)){
  assert.ok(config.section,`${key} mangler seksjon`);
  assert.ok(config.label,`${key} mangler menytekst`);
  assert.ok(config.title,`${key} mangler sidetittel`);
 }
 const sections=Object.values(views).map(v=>v.section);
 assert.equal(new Set(sections).size,sections.length,'to visninger deler seksjon');
});
