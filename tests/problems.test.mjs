import test from 'node:test';
import assert from 'node:assert/strict';
import {seedProblems,annualCost,addressableCost,problemTotals,doNothingCurve,problemCoverage,validateProblems} from '../dist/problems.mjs';
import {HORIZON_MONTHS} from '../dist/timeline.mjs';
import {examples,scenario} from '../dist/model.mjs';
import {scenarioCurve} from '../dist/roadmap-model.mjs';

const p={id:'p',name:'P',customers:1000,frequency:2,unitCost:500,addressableShare:50,evidence:'estimated'};

test('Årlig problemkostnad er berørte × hendelser × enhetskostnad',()=>{
 assert.equal(annualCost(p),1000*2*500);
 assert.equal(addressableCost(p),500000,'halvparten er påvirkbar');
 assert.equal(annualCost({}),0,'tomme felt gir null, ikke NaN');
});

test('Å gjøre ingenting koster månedlig og akkumulerer over horisonten',()=>{
 const curve=doNothingCurve([p]);
 assert.equal(curve.length,HORIZON_MONTHS);
 assert.ok(curve.every(m=>m.cumulative<0),'kostnaden går bare én vei');
 assert.equal(curve.at(-1).cumulative,-annualCost(p)/12*HORIZON_MONTHS);
 const totals=problemTotals([p]);
 assert.equal(totals.horizonCost,annualCost(p)/12*HORIZON_MONTHS);
 assert.equal(totals.monthly,annualCost(p)/12);
});

test('Påvirkbar andel er bruttopotensial, aldri hele problemkostnaden',()=>{
 const totals=problemTotals([p]);
 assert.equal(totals.annual,1000000);
 assert.equal(totals.addressable,500000);
 assert.ok(totals.addressable<totals.annual,'påvirkbart er en delmengde');
 assert.equal(totals.horizonAddressable,500000/12*HORIZON_MONTHS);
});

test('Problemkostnad endrer ingen tiltaksverdi og ingen scenariokurve',()=>{
 const before=scenarioCurve(['diagnostics'],examples);
 const totals=problemTotals(seedProblems());
 assert.ok(totals.annual>0);
 const after=scenarioCurve(['diagnostics'],examples);
 assert.deepEqual(before.curve,after.curve);
 assert.equal(before.net,after.net);
 // Kurvene er to atskilte regnskap; det finnes ingen felt som slår dem sammen.
 assert.equal(Object.keys(after).includes('problemCost'),false);
 assert.equal(scenario(examples[0]).net,scenario(examples[0]).net);
});

test('Dekning viser hvilke problemer ingen tiltak adresserer',()=>{
 const problems=[{...p,id:'a',measureIds:['diagnostics']},{...p,id:'b',measureIds:[]},{...p,id:'c',measureIds:['borte']}];
 const result=problemCoverage(problems,examples);
 assert.deepEqual(result.unaddressed.map(x=>x.id).sort(),['b','c']);
 assert.deepEqual(result.staleLinks.map(x=>x.id),['c']);
 assert.deepEqual(result.byProblem.find(x=>x.id==='a').measures,['diagnostics']);
});

test('Problemer valideres med konkrete feltreferanser',()=>{
 assert.equal(validateProblems(seedProblems()),'');
 assert.match(validateProblems([{...p,name:''}]),/gi problemet et navn/);
 assert.match(validateProblems([{...p,customers:-1}]),/Antall berørte/);
 assert.match(validateProblems([{...p,unitCost:NaN}]),/Kostnad per hendelse/);
 assert.match(validateProblems([{...p,addressableShare:140}]),/mellom 0 og 100/);
 assert.match(validateProblems([{...p,evidence:'tull'}]),/målt, anslått eller antatt/);
});

test('Eksempelproblemene er gyldige og peker på tiltak som finnes',()=>{
 const problems=seedProblems();
 assert.equal(validateProblems(problems),'');
 assert.equal(problemCoverage(problems,examples).staleLinks.length,0);
 assert.ok(problemTotals(problems).annual>0);
});
