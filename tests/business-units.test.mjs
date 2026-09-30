import test from 'node:test';
import assert from 'node:assert/strict';
import {businessUnitReport,removeBusinessUnit,validateBusinessUnits} from '../dist/business-units.mjs';
import {examples,calculate} from '../dist/model.mjs';
import {teamEffort} from '../dist/resources.mjs';
import {seedRoster} from '../dist/roster.mjs';
import {makeEnvelope,parseEnvelope} from '../dist/storage.mjs';

const units=[{id:'owner',name:'Verdi'},{id:'contributor',name:'Leveranse'}];
function workspace(){
 const items=structuredClone(examples),roster=seedRoster();
 for(const t of items)t.businessUnitId='owner';
 for(const r of roster.roles)r.businessUnitId='contributor';
 return {items,roster,businessUnits:structuredClone(units)};
}
test('Én BU eier hele nettoverdien uten dobbelttelling hos deltakerne',()=>{
 const {items,roster}=workspace(),before=structuredClone(items);
 const report=businessUnitReport(items,roster,units);
 assert.equal(report.groups[0].net,items.reduce((n,t)=>n+calculate(t).net,0));
 assert.equal(report.groups[1].net,0);
 assert.equal(report.total,report.groups[0].net);
 assert.deepEqual(items,before,'rapporten endrer ikke tiltakene');
});
test('Bidragsmatrisen summerer teamrader én gang og beholder utelatt teamkostnad',()=>{
 const {items,roster}=workspace();
 const t=items[0];t.teams[0].includeCost=false;
 const report=businessUnitReport([t],roster,units),cell=report.matrix.get('owner').get('contributor');
 assert.equal(cell.weeks,t.teams.reduce((n,r)=>n+teamEffort(r,'expected'),0));
 assert.equal(cell.items.size,1);
 assert.deepEqual(report.measures[0].participants,['contributor']);
});
test('Oppgaver, evidens og risiko endrer ikke BU-fordelingen',()=>{
 const {items,roster}=workspace(),before=businessUnitReport(items,roster,units);
 items[0].tasks=[{id:'extra',roleId:roster.roles[0].id,estimateWeeks:999}];
 items[0].confidence='hypothesis';items[0].risks=[];items[0].strategicFit='low';
 assert.deepEqual(businessUnitReport(items,roster,units),before);
});
test('Manglende og slettede eiere, roller og BU-er forsvinner ikke fra regnskapet',()=>{
 const {items,roster}=workspace();items[0].businessUnitId='deleted';items[0].teams[0].roleId='deleted';
 roster.roles[0].businessUnitId='deleted';
 const report=businessUnitReport(items,roster,units);
 assert.equal(report.groups.find(u=>u.id==='').net,calculate(items[0]).net);
 const totalWeeks=items.flatMap(t=>t.teams).reduce((n,r)=>n+teamEffort(r,'expected'),0);
 assert.equal(report.groups.reduce((n,g)=>n+g.effort,0),totalWeeks);
 assert.ok(report.measures[0].unassignedWeeks>0);
});
test('Fjerning av BU gjør koblinger ufordelte uten å endre økonomien',()=>{
 const {items,roster,businessUnits}=workspace(),before=items.map(t=>calculate(t));
 let remaining=removeBusinessUnit(businessUnits,'owner',items,roster);
 remaining=removeBusinessUnit(remaining,'contributor',items,roster);
 assert.equal(remaining.length,0);
 assert.ok(items.every(t=>t.businessUnitId===''));
 assert.ok(roster.roles.every(r=>r.businessUnitId===''));
 assert.deepEqual(items.map(t=>calculate(t)),before);
});
test('Negative verdier og tiltak uten team bevares, også i en tom portefølje',()=>{
 const {items,roster}=workspace();const t=items.find(t=>t.id==='telemetry');t.teams=[];
 const report=businessUnitReport([t],roster,units);
 assert.ok(report.total<0);assert.deepEqual(report.measures[0].participants,[]);
 assert.equal(businessUnitReport([],roster,[]).total,0);
});
test('BU-er, eierskap og rollefordeling overlever eksport og import',()=>{
 const w=workspace();assert.deepEqual(parseEnvelope(JSON.stringify(makeEnvelope(w))).workspace,w);
 assert.match(validateBusinessUnits([{id:'x',name:''}]),/navn/);
 assert.match(validateBusinessUnits([{id:'x',name:'A'},{id:'y',name:' a '}]),/samme navn/);
 for(const businessUnits of ['wrong',[null],[{id:'x',name:1}],[{id:'x',name:'a'},{id:'x',name:'b'}]]){
  assert.equal(parseEnvelope(JSON.stringify(makeEnvelope({...w,businessUnits}))).ok,false);
 }
 assert.equal(parseEnvelope(JSON.stringify(makeEnvelope({...w,items:[{businessUnitId:['x','y']}]}))).ok,false);
});
