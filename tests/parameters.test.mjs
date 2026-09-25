import test from 'node:test';
import assert from 'node:assert/strict';
import {seedParameters,customerValue,applyCustomerValue,valueDrift,validateParameters,VALUE_HORIZON_MONTHS} from '../dist/parameters.mjs';
import {examples,calculate} from '../dist/model.mjs';

test('Kundeverdi settes sammen av dekningsbidrag, måneder og gjenvinning',()=>{
 const p=seedParameters();
 assert.equal(customerValue(p).total,6000,'500 kr i 12 måneder gir dagens eksempelverdi');
 assert.equal(customerValue({customerValue:{monthlyContribution:400,months:6,winbackCost:1500}}).total,3900);
 assert.equal(customerValue({}).total,0,'tomme parametre gir null, ikke NaN');
});

test('Verdien kappes ved 12 måneder, så full livstidsverdi ikke kan smugles inn',()=>{
 const stretched={...seedParameters(),customerValue:{monthlyContribution:500,months:36,winbackCost:0}};
 const v=customerValue(stretched);
 assert.equal(v.months,VALUE_HORIZON_MONTHS,'kappes til horisonten');
 assert.equal(v.requestedMonths,36,'men det du skrev huskes');
 assert.equal(v.total,6000,'ikke 18 000');
 assert.equal(v.capped,true);
 assert.match(validateParameters(stretched),/innen 12 måneder/);
});

test('Tiltak uten overstyring følger standarden, overstyrte røres aldri',()=>{
 const items=[{id:'a',name:'A',value:6000,valueOverride:false},{id:'b',name:'B',value:5500,valueOverride:true}];
 const result=applyCustomerValue(items,{customerValue:{monthlyContribution:600,months:12}});
 assert.equal(result.total,7200);
 assert.equal(result.updated,1);
 assert.equal(items[0].value,7200,'arvet ny standard');
 assert.equal(items[1].value,5500,'overstyring beholdt');
});

test('Avvik fra standarden rapporteres i stedet for å avstemmes',()=>{
 const items=[{id:'a',name:'A',value:6000,valueOverride:false},{id:'b',name:'B',value:5500,valueOverride:true}];
 const drift=valueDrift(items,seedParameters());
 assert.deepEqual(drift.map(d=>d.id),['b']);
 assert.equal(drift[0].diff,-500);
 assert.equal(drift[0].standard,6000);
 // Et overstyrt tiltak som tilfeldigvis matcher standarden er ikke et avvik.
 assert.equal(valueDrift([{id:'c',name:'C',value:6000,valueOverride:true}],seedParameters()).length,0);
});

test('Standardverdien endrer tiltakets økonomi, men bare gjennom kundeverdien',()=>{
 const t={...examples[0],value:6000,valueOverride:false};
 const before=calculate(t);
 applyCustomerValue([t],{customerValue:{monthlyContribution:1000,months:12}});
 const after=calculate(t);
 assert.equal(t.value,12000);
 assert.equal(after.retained,before.retained,'beholdte kunder er uendret');
 assert.equal(after.cost,before.cost,'kostnaden er uendret');
 assert.equal(after.gross,before.gross*2,'bare bruttoverdien dobles');
});

test('Parametre valideres med konkrete feltreferanser',()=>{
 assert.equal(validateParameters(seedParameters()),'');
 const p=seedParameters();
 assert.match(validateParameters({...p,product:{...p.product,customers:-5}}),/heltall/);
 assert.match(validateParameters({...p,product:{...p.product,customers:2.5}}),/heltall/);
 assert.match(validateParameters({...p,customerValue:{...p.customerValue,monthlyContribution:NaN}}),/Månedlig dekningsbidrag/);
 assert.match(validateParameters({...p,customerValue:{...p.customerValue,winbackCost:-1}}),/Gjenvinningskostnad/);
 const issue=validateParameters({...p,customerValue:{...p.customerValue,months:99}});
 assert.match(issue,/innen 12 måneder/);
});

test('Eksempeldataene stemmer med standarden, bortsett fra det ene bevisste avviket',()=>{
 const drift=valueDrift(examples,seedParameters());
 assert.deepEqual(drift.map(d=>d.id),['parental'],'bare foreldrekontroll har egen kundeverdi');
 assert.equal(drift[0].value,5500);
});
