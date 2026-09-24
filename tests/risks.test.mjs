import test from 'node:test';
import assert from 'node:assert/strict';
import {riskSummary,validateRisks} from '../dist/risks.mjs';
import {calculate,examples} from '../dist/model.mjs';
const risk={id:'r',kind:'risk',title:'Lav adopsjon',status:'open',severity:'high',probability:'low',owner:'',consequence:'Redusert rekkevidde',action:'Test',trigger:'Lav aktivering',sourceId:''};
test('Risikooversikt viser konsekvens, blokkerte avhengigheter og manglende eier separat',()=>{const t={risks:[risk,{...risk,id:'d',kind:'dependency',status:'blocked',owner:'Team A'}]};assert.deepEqual(riskSummary(t),{total:2,active:2,blocked:1,unconfirmed:0,severe:1,unowned:1})});
test('Lukket risiko og bekreftet avhengighet teller ikke som åpne forhold',()=>{const t={risks:[{...risk,status:'closed'},{...risk,id:'d',kind:'dependency',status:'confirmed'}]};assert.equal(riskSummary(t).active,0);assert.equal(riskSummary(t).severe,0);assert.equal(riskSummary(t).unowned,0)});
test('Tittel, konsekvens, gyldig type/status og kildereferanser valideres',()=>{assert.equal(validateRisks({risks:[risk]}),'');assert.ok(validateRisks({risks:[{...risk,title:''}]}));assert.ok(validateRisks({risks:[{...risk,consequence:''}]}));assert.ok(validateRisks({risks:[{...risk,status:'blocked'}]}));assert.ok(validateRisks({risks:[{...risk,sourceId:'missing'}]}));assert.equal(validateRisks({sources:[{id:'source'}],risks:[{...risk,sourceId:'source'}]}),'')});
test('Risiko er synlig uten å omregnes til et kunstig verdifradrag',()=>assert.deepEqual(calculate({...examples[0],risks:[]}),calculate({...examples[0],risks:[risk]})));
