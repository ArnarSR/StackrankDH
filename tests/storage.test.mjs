import test from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_VERSION,STORAGE_KEY,makeEnvelope,parseEnvelope,checkWorkspace,safeRead,safeWrite,safeClear,exportName} from '../dist/storage.mjs';
import {examples} from '../dist/model.mjs';
import {seedRoadmap} from '../dist/roadmap-model.mjs';
import {seedRoster} from '../dist/roster.mjs';
import {seedProblems} from '../dist/problems.mjs';
import {seedParameters} from '../dist/parameters.mjs';

const workspace=()=>({items:structuredClone(examples),roadmap:seedRoadmap(),roster:seedRoster(),problems:seedProblems(),parameters:seedParameters()});
const fakeStore=(initial={})=>{const data={...initial};return {
 getItem:k=>k in data?data[k]:null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>{delete data[k]},_data:data};};

test('En full arbeidsflate overlever lagring og gjenlesing',()=>{
 const store=fakeStore(),w=workspace();
 assert.equal(safeWrite(STORAGE_KEY,w,store).ok,true);
 const read=safeRead(STORAGE_KEY,store);
 assert.equal(read.ok,true);
 assert.equal(read.workspace.items.length,examples.length);
 assert.equal(read.workspace.items[0].name,examples[0].name);
 assert.equal(read.workspace.parameters.customerValue.monthlyContribution,500);
 assert.equal(read.workspace.roadmap.scenarios.length,2);
 assert.ok(read.savedAt,'tidspunkt lagres');
});

test('Tom lagring gir ingen data, men heller ingen feil',()=>{
 const read=safeRead(STORAGE_KEY,fakeStore());
 assert.equal(read.ok,true);
 assert.equal(read.workspace,null);
});

test('Data fra en annen versjon avvises i stedet for å lastes halvveis',()=>{
 const gammel=JSON.stringify({...makeEnvelope(workspace()),version:STORAGE_VERSION+1});
 const read=safeRead(STORAGE_KEY,fakeStore({[STORAGE_KEY]:gammel}));
 assert.equal(read.ok,false);
 assert.match(read.error,/version/);
});

test('Import avviser tull, fremmede filer og feil struktur',()=>{
 assert.match(parseEnvelope('ikke json').error,/gyldig JSON/);
 assert.match(parseEnvelope('[]').error,/lagret arbeidsområde/);
 assert.match(parseEnvelope(JSON.stringify({app:'noe-annet',version:STORAGE_VERSION,workspace:{}})).error,/Churn Studio/);
 assert.match(parseEnvelope(JSON.stringify(makeEnvelope({items:'ikke en liste'}))).error,/Tiltakslisten/);
 assert.match(parseEnvelope(JSON.stringify(makeEnvelope({roadmap:[]}))).error,/roadmap/);
 assert.match(parseEnvelope(JSON.stringify(makeEnvelope({roster:{roles:'nei'}}))).error,/Rollelisten/);
 assert.match(parseEnvelope(JSON.stringify(makeEnvelope({roadmap:{scenarios:'nei'}}))).error,/Scenariolisten/);
});

test('En gyldig eksportfil kan leses inn igjen',()=>{
 const text=JSON.stringify(makeEnvelope(workspace()));
 const result=parseEnvelope(text);
 assert.equal(result.ok,true);
 assert.equal(result.workspace.items.length,examples.length);
 assert.equal(checkWorkspace(result.workspace),null);
});

test('Delvis arbeidsflate godtas, så en eldre eksport uten alle felt kan leses',()=>{
 assert.equal(checkWorkspace({items:[]}),null);
 assert.equal(checkWorkspace({}),null,'tomt objekt er strukturelt greit');
 assert.ok(checkWorkspace(null));
 assert.ok(checkWorkspace([]));
});

test('Appen faller tilbake når nettleserlagring kaster',()=>{
 const kaster={getItem(){throw new Error('blokkert')},setItem(){const e=new Error('full');e.name='QuotaExceededError';throw e},removeItem(){throw new Error('nei')}};
 const read=safeRead(STORAGE_KEY,kaster);
 assert.equal(read.ok,false);
 assert.match(read.error,/Kunne ikke lese/);
 const write=safeWrite(STORAGE_KEY,workspace(),kaster);
 assert.equal(write.ok,false);
 assert.match(write.error,/full/i,'kvotefeil forklares som plassmangel');
 assert.equal(safeClear(STORAGE_KEY,kaster).ok,false);
 // Uten lagring i det hele tatt skal ingenting kaste.
 assert.equal(safeRead(STORAGE_KEY,undefined).ok,true);
 assert.equal(safeWrite(STORAGE_KEY,workspace(),undefined).ok,true);
});

test('Nullstilling fjerner lagret data',()=>{
 const store=fakeStore();
 safeWrite(STORAGE_KEY,workspace(),store);
 assert.ok(store._data[STORAGE_KEY]);
 safeClear(STORAGE_KEY,store);
 assert.equal(safeRead(STORAGE_KEY,store).workspace,null);
});

test('Eksportnavnet inneholder datoen',()=>{
 assert.equal(exportName(new Date('2026-09-25T10:00:00Z')),'churn-studio-2026-09-25.json');
});
