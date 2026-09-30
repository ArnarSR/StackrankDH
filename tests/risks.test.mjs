import test from 'node:test';
import assert from 'node:assert/strict';
import {riskSummary,validateRisks,riskMatrix,riskOrder,commonRisks,riskLevels} from '../dist/risks.mjs';
import {calculate,examples} from '../dist/model.mjs';
const risk={id:'r',kind:'risk',title:'Lav adopsjon',status:'open',severity:'high',probability:'low',owner:'',consequence:'Redusert rekkevidde',action:'Test',trigger:'Lav aktivering',sourceId:''};
test('Risikooversikt viser konsekvens, blokkerte avhengigheter og manglende eier separat',()=>{const t={risks:[risk,{...risk,id:'d',kind:'dependency',status:'blocked',owner:'Team A'}]};assert.deepEqual(riskSummary(t),{total:2,active:2,blocked:1,unconfirmed:0,severe:1,unowned:1})});
test('Lukket risiko og bekreftet avhengighet teller ikke som åpne forhold',()=>{const t={risks:[{...risk,status:'closed'},{...risk,id:'d',kind:'dependency',status:'confirmed'}]};assert.equal(riskSummary(t).active,0);assert.equal(riskSummary(t).severe,0);assert.equal(riskSummary(t).unowned,0)});
test('Tittel, konsekvens, gyldig type/status og kildereferanser valideres',()=>{assert.equal(validateRisks({risks:[risk]}),'');assert.ok(validateRisks({risks:[{...risk,title:''}]}));assert.ok(validateRisks({risks:[{...risk,consequence:''}]}));assert.ok(validateRisks({risks:[{...risk,status:'blocked'}]}));assert.ok(validateRisks({risks:[{...risk,sourceId:'missing'}]}));assert.equal(validateRisks({sources:[{id:'source'}],risks:[{...risk,sourceId:'source'}]}),'')});
test('Risiko er synlig uten å omregnes til et kunstig verdifradrag',()=>assert.deepEqual(calculate({...examples[0],risks:[]}),calculate({...examples[0],risks:[risk]})));

test('Risikomatrisen plasserer aktive risikoer i sannsynlighet × konsekvens',()=>{
 const t={risks:[
  {...risk,id:'a',probability:'high',severity:'high'},
  {...risk,id:'b',probability:'low',severity:'medium'},
  {...risk,id:'c',probability:'high',severity:'high',status:'closed'},
  {...risk,id:'d',kind:'dependency',status:'blocked'}
 ]};
 const m=riskMatrix(t);
 assert.equal(m.cells.length,3);assert.equal(m.cells[0].length,3);
 const celle=(p,s)=>m.cells[riskOrder.indexOf(p)][riskOrder.indexOf(s)];
 assert.deepEqual(celle('high','high').risks.map(r=>r.id),['a'],'lukket risiko plasseres ikke');
 assert.deepEqual(celle('low','medium').risks.map(r=>r.id),['b']);
 assert.equal(celle('medium','low').risks.length,0);
 assert.equal(m.placed,2);
 assert.equal(m.closed,1);
 assert.deepEqual(m.dependencies.map(r=>r.id),['d'],'avhengigheter står utenfor matrisen');
});

test('Matrisen endrer ingen økonomiske tall',()=>{
 const uten={...examples[0],risks:[]};
 const med={...examples[0],risks:[{...risk,probability:'high',severity:'high'}]};
 assert.deepEqual(calculate(uten),calculate(med));
 // Ingen score-funksjon finnes å kalle.
 assert.equal(riskMatrix(med).score,undefined);
});

test('Typiske risikoer er gyldige og kan legges rett inn',()=>{
 assert.ok(commonRisks.length>=5);
 for(const mal of commonRisks){
  const lagt={...mal,id:'x',kind:'risk',status:'open',owner:'',sourceId:''};
  assert.equal(validateRisks({risks:[lagt]}),'',`«${mal.title}» skulle vært gyldig`);
  assert.ok(riskLevels[mal.severity]&&riskLevels[mal.probability],'nivåene må være gyldige');
 }
});
