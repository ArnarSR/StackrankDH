import test from 'node:test';
import assert from 'node:assert/strict';
import {seedRoster,applyWeeklyRates,rateDrift,validateRoster,roleDemand} from '../dist/roster.mjs';
import {examples,calculate,scenario} from '../dist/model.mjs';
import {costBreakdown} from '../dist/resources.mjs';
import {seedRoadmap,keyResultProgress,keyResults,coverage,scenarioCurve} from '../dist/roadmap-model.mjs';
import {defaultSwitchingLoss,validateSwitchingLosses,throughput} from '../dist/timeline.mjs';
import {planValue,initialOptions} from '../dist/decision-model.mjs';
import {seedParameters} from '../dist/parameters.mjs';
import {makeEnvelope,parseEnvelope,STORAGE_VERSION} from '../dist/storage.mjs';

test('Ukesats arves på tvers av tiltak, men overstyrte rader røres aldri',()=>{
 const items=structuredClone(examples),roster=seedRoster();
 const platform=items[0].teams[0],telemetry=items.at(-1).teams[0];
 platform.rateOverride=true;platform.rate=33000;
 roster.roles[0].weeklyRate=40000;
 const before=costBreakdown(items.at(-1));
 applyWeeklyRates(items,roster);
 assert.equal(platform.rate,33000);assert.equal(telemetry.rate,40000);
 assert.equal(costBreakdown(items.at(-1)).labor-before.labor,before.effort*10000);
 assert.equal(costBreakdown(items.at(-1)).duration,before.duration);
 assert.equal(rateDrift(items,roster)[0].diff,-7000);
 platform.rateOverride=false;applyWeeklyRates(items,roster);
 assert.equal(platform.rate,40000);assert.equal(rateDrift(items,roster).length,0);
});
test('Egen ukesats beholdes også når den først var lik standarden',()=>{
 const items=structuredClone(examples),roster=seedRoster(),team=items[0].teams[0];
 team.rateOverride=true;assert.equal(rateDrift(items,roster).length,0);
 roster.roles[0].weeklyRate=31000;applyWeeklyRates(items,roster);
 assert.equal(team.rate,30000);assert.equal(rateDrift(items,roster)[0].standard,31000);
});
test('Slettet rolle beholder kostnaden og rapporteres som uavklart',()=>{
 const items=structuredClone(examples),roster=seedRoster(),before=items.map(calculate);
 roster.roles=roster.roles.filter(r=>r.id!=='role-platform');applyWeeklyRates(items,roster);
 assert.deepEqual(items.map(calculate),before);
 assert.equal(rateDrift(items,roster).filter(d=>d.standard===null).length,2);
 assert.equal(roleDemand(items,roster).unassigned,44);
});
test('Ugyldige standardsatser avvises, mens null er en gyldig sats',()=>{
 const items=structuredClone(examples),roster=seedRoster();
 for(const bad of [-1,NaN,Infinity]){roster.roles[0].weeklyRate=bad;assert.match(validateRoster(roster),/ukesats/);applyWeeklyRates(items,roster);assert.equal(items[0].teams[0].rate,30000)}
 roster.roles[0].weeklyRate=0;assert.equal(validateRoster(roster),'');applyWeeklyRates(items,roster);assert.equal(items[0].teams[0].rate,0);
});
test('Tapstabellen avviser uendelig kalendertid og ugyldige andeler',()=>{
 assert.equal(validateSwitchingLosses(defaultSwitchingLoss),'');
 for(const bad of [-.1,1,2,NaN,Infinity,null])assert.ok(validateSwitchingLosses({...defaultSwitchingLoss,2:bad}));
 assert.ok(validateSwitchingLosses({...defaultSwitchingLoss,1:.1}));assert.ok(validateSwitchingLosses({}));
 assert.equal(throughput(3,{...defaultSwitchingLoss,3:.1}),2.7);
});
test('Redigert tap flytter landing og tidsverdi, aldri porteføljekostnaden',()=>{
 const items=structuredClone(examples),before=items.map(calculate),order=['adoption','wifi'];
 const normal=scenarioCurve(order,items,'expected',{wip:2});
 const faster=scenarioCurve(order,items,'expected',{wip:2,losses:{...defaultSwitchingLoss,2:0}});
 assert.ok(faster.net>normal.net);assert.ok(faster.rows[1].endWeek<normal.rows[1].endWeek);
 assert.deepEqual(items.map(calculate),before);
 assert.deepEqual(faster.rows.map(r=>r.labor),normal.rows.map(r=>r.labor));
});
test('Laben bruker sin redigerte tapstabell i alle verdiutfall',()=>{
 const settings={fte:2,weeks:104,weeklyRate:30000,wip:2},ids=['diagnostics','wifi'];
 for(const key of ['low','expected','high']){
  const normal=planValue(initialOptions,ids,settings,key);
  const changed=planValue(initialOptions,ids,{...settings,losses:{...defaultSwitchingLoss,2:0}},key);
  assert.notDeepEqual(changed,normal);
 }
});
test('Fremdrift støtter både økende og synkende måltall',()=>{
 assert.equal(keyResultProgress({baseline:10,current:9.5,target:9}).percent,50);
 assert.equal(keyResultProgress({baseline:0,current:50,target:100}).percent,50);
 assert.equal(keyResultProgress({baseline:0,current:0,target:100}).percent,0);
 assert.equal(keyResultProgress({baseline:-10,current:-5,target:0}).percent,50);
});
test('Tilbakegang og overoppfyllelse skjules ikke av prosentgrensene',()=>{
 assert.deepEqual(keyResultProgress({baseline:10,current:11,target:9}),{state:'regressed',percent:-100});
 assert.deepEqual(keyResultProgress({baseline:10,current:8,target:9}),{state:'achieved',percent:200});
});
test('Ufullstendige og like måltall gir ingen oppdiktet fremdrift',()=>{
 assert.equal(keyResultProgress({baseline:10,current:null,target:9}).state,'missing');
 assert.equal(keyResultProgress({baseline:10,current:10,target:10}).state,'equal');
 assert.equal(keyResultProgress({baseline:10,current:NaN,target:9}).state,'invalid');
 assert.ok(keyResults(seedRoadmap()).every(k=>k.current===null));
});
test('Måltall endrer verken økonomi, scenariokurve eller dekningsrapport',()=>{
 const roadmap=seedRoadmap(),items=structuredClone(examples),before=items.map(t=>scenario(t)),curve=scenarioCurve(['adoption'],items);
 const c=coverage(roadmap,items);
 for(const o of roadmap.objectives)for(const k of o.keyResults){k.current=42;k.target=123;k.unit='kunder'}
 assert.deepEqual(items.map(t=>scenario(t)),before);assert.deepEqual(scenarioCurve(['adoption'],items),curve);
 assert.deepEqual(coverage(roadmap,items).measuresWithoutKeyResult,c.measuresWithoutKeyResult);
});
test('Tap, satsvalg og måltall overlever eksport og import med nytt versjonsnummer',()=>{
 const w={items:structuredClone(examples),parameters:seedParameters(),roster:seedRoster(),roadmap:seedRoadmap()};
 w.parameters.losses[2]=.15;w.items[0].teams[0].rateOverride=true;w.items[0].teams[0].rate=34567;
 Object.assign(w.roadmap.objectives[0].keyResults[0],{current:9.5,measuredAt:'2026-09-25',measurementNote:'Illustrativ test'});
 assert.equal(STORAGE_VERSION,2);
 assert.deepEqual(parseEnvelope(JSON.stringify(makeEnvelope(w))).workspace,w);
 assert.equal(parseEnvelope(JSON.stringify(makeEnvelope(w,1))).ok,false);
});
test('Import avviser ugyldige nye parametre før arbeidsflaten endres',()=>{
 for(const workspace of [
  {parameters:{losses:{...defaultSwitchingLoss,2:1}}},
  {settings:{losses:null}},
  {roster:{roles:[{weeklyRate:-1}]}},
  {roadmap:{objectives:[{keyResults:[{current:'ukjent'}]}]}}
 ])assert.equal(parseEnvelope(JSON.stringify(makeEnvelope(workspace))).ok,false);
});
