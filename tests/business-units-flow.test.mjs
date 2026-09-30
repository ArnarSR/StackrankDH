import test from 'node:test';
import assert from 'node:assert/strict';
import {examples,calculate} from '../dist/model.mjs';
import {seedRoster} from '../dist/roster.mjs';
import {makeEnvelope,parseEnvelope} from '../dist/storage.mjs';
import {bindBusinessUnits,renderBusinessUnits,snapshotBusinessUnits,restoreBusinessUnits} from '../dist/business-units-ui.mjs';

// Test hendelsesflyten uten nettleser. Layout, native select og fokus krever
// fortsatt separat nettleserverifisering.
test('BU-flyt: opprett, navngi, tildel, eksporter, gjenopprett og fjern med bekreftelse',()=>{
 const previous=globalThis.document,elements=new Map();let changes=0,focused=false;
 const element=id=>{
  if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',listeners:{},
   addEventListener(type,handler){this.listeners[type]=handler},
   lastElementChild:{querySelector:()=>({focus(){focused=true}})}});
  return elements.get(id);
 };
 globalThis.document={getElementById:element};
 try{
  const items=structuredClone(examples),roster=seedRoster(),before=items.map(t=>calculate(t));
  restoreBusinessUnits({businessUnits:[]});bindBusinessUnits(()=>items,()=>roster,()=>changes++);renderBusinessUnits();
  assert.match(element('bu-rows').innerHTML,/Ingen BU-er/);
  element('add-bu').listeners.click();
  const unit=snapshotBusinessUnits().businessUnits[0];assert.ok(focused);
  element('bu-rows').listeners.input({target:{hasAttribute:()=>true,value:'Marked <test>',closest:()=>({dataset:{buId:unit.id}})}});
  assert.equal(unit.name,'Marked <test>');assert.match(element('bu-value-rows').innerHTML,/Marked &lt;test&gt;/);
  element('bu-measures').listeners.change({target:{dataset:{buOwner:items[0].id},value:unit.id}});
  assert.equal(items[0].businessUnitId,unit.id);
  roster.roles[0].businessUnitId=unit.id;
  const exported=JSON.stringify(makeEnvelope({items,roster,...snapshotBusinessUnits()}));
  restoreBusinessUnits({businessUnits:[]});
  const loaded=parseEnvelope(exported);assert.equal(loaded.ok,true);restoreBusinessUnits(loaded.workspace);renderBusinessUnits();
  assert.equal(snapshotBusinessUnits().businessUnits[0].name,'Marked <test>');
  const click={target:{closest:()=>({dataset:{removeBu:unit.id}})}};
  element('bu-rows').listeners.click(click);
  assert.equal(snapshotBusinessUnits().businessUnits.length,1,'første klikk fjerner ingenting');
  assert.match(element('bu-error').textContent,/ufordelt/);
  element('bu-rows').listeners.click(click);
  assert.equal(snapshotBusinessUnits().businessUnits.length,0);
  assert.equal(items[0].businessUnitId,'');assert.equal(roster.roles[0].businessUnitId,'');
  assert.deepEqual(items.map(t=>calculate(t)),before);assert.ok(changes>=4);
 }finally{globalThis.document=previous;restoreBusinessUnits({businessUnits:[]})}
});
