import test from 'node:test';
import assert from 'node:assert/strict';
import {seedSegments,segmentTotals,rowExposed,deriveMeasure,applySegments,usesSegments,
        validateSegments,validateSegmentImpact} from '../dist/segments.mjs';
import {calculate} from '../dist/model.mjs';

const segments=seedSegments();
const row=(segmentId,sam,som,expected,extra={})=>({segmentId,sam,som,low:expected/2,expected,high:expected*2,...extra});

test('Segmentene deler kundebasen uten å overlappe',()=>{
 const t=segmentTotals(segments,250000);
 assert.equal(t.total,250000,'eksempelsegmentene summerer til hele basen');
 assert.equal(t.remaining,0);
 assert.equal(t.over,false);
 assert.equal(segmentTotals(segments,200000).over,true);
});

test('Eksponerte er TAM × SAM × SOM, og rekkevidde anvendes bare én gang',()=>{
 assert.equal(rowExposed({sam:50,som:80},{customers:75000}),30000);
 assert.equal(rowExposed({sam:100,som:100},{customers:1000}),1000,'fullt gjennomslag gir hele segmentet');
 assert.equal(rowExposed({sam:0,som:100},{customers:1000}),0);
 assert.equal(rowExposed({},{}),0,'tomme felt gir null, ikke NaN');
});

test('Et tiltak over flere segmenter dobbelteller ingen kunde',()=>{
 const t={baseline:10,segmentImpact:[row('seg-families',50,80,.6),row('seg-business',60,80,.6)]};
 const d=deriveMeasure(t,segments,6000);
 assert.equal(d.customers,75000+15000,'TAM er summen av segmentene, ikke hele basen');
 assert.equal(d.exposed,30000+7200);
 assert.ok(d.customers<=250000);
});

test('Utledet rekkevidde gir nøyaktig samme eksponerte som segmentradene',()=>{
 const t={baseline:10,segmentImpact:[row('seg-families',50,80,.6),row('seg-couples',40,75,.5)]};
 const d=deriveMeasure(t,segments,6000);
 assert.ok(Math.abs(d.customers*d.reach/100-d.exposed)<1e-9,'skalarene reproduserer segmentsummen');
});

test('Effekt vektes etter eksponerte, ikke som et rått gjennomsnitt',()=>{
 // 30 000 eksponerte med 1,0 pp og 7 200 med 0,2 pp.
 const t={baseline:10,segmentImpact:[row('seg-families',50,80,1),row('seg-business',60,80,.2)]};
 const d=deriveMeasure(t,segments,6000);
 const vektet=(30000*1+7200*.2)/(30000+7200);
 assert.ok(Math.abs(d.expected-vektet)<1e-9);
 assert.ok(d.expected>0.6,'et rått snitt ville gitt 0,6');
});

test('Kundeverdi kan overstyres per segment og vektes etter beholdte kunder',()=>{
 const t={baseline:10,segmentImpact:[
  row('seg-families',50,80,1,{valueOverride:5000}),
  row('seg-business',60,80,1,{valueOverride:20000})]};
 const d=deriveMeasure(t,segments,6000);
 const beholdteF=30000*1/100, beholdteB=7200*1/100;
 assert.ok(Math.abs(d.value-((beholdteF*5000+beholdteB*20000)/(beholdteF+beholdteB)))<1e-9);
 // Uten overstyring brukes standarden.
 assert.equal(deriveMeasure({baseline:10,segmentImpact:[row('seg-families',50,80,1)]},segments,6000).value,6000);
});

test('Utledningen mates inn i den eksisterende beregningen uten å endre den',()=>{
 const t={baseline:10,cost:0,setup:0,costItems:[],teams:[],
  segmentImpact:[row('seg-families',50,80,1)]};
 applySegments([t],segments,6000);
 const c=calculate(t);
 assert.equal(c.exposed,30000);
 assert.equal(c.retained,300);
 assert.equal(c.gross,300*6000);
});

test('Tiltak uten segmentrader røres ikke',()=>{
 const t={customers:1000,reach:50,expected:.4,value:6000,segmentImpact:[]};
 assert.equal(deriveMeasure(t,segments,9000),null);
 assert.equal(applySegments([t],segments,9000),0);
 assert.equal(t.customers,1000,'skalarene står urørt');
 assert.equal(usesSegments(t),false);
});

test('Segmenter valideres, og overlapp mot kundebasen rapporteres',()=>{
 assert.equal(validateSegments(segments,250000),'');
 assert.match(validateSegments(segments,200000),/skal ikke overlappe/);
 assert.match(validateSegments([{id:'a',name:'',customers:1}],250000),/gi segmentet et navn/);
 assert.match(validateSegments([{id:'a',name:'A',customers:2.5}],250000),/heltall/);
});

test('Segmentrader valideres mot segmentene og mot baseline',()=>{
 const t={baseline:10,segmentImpact:[row('seg-families',50,80,.6)]};
 assert.equal(validateSegmentImpact(t,segments),'');
 assert.match(validateSegmentImpact({baseline:10,segmentImpact:[row('borte',50,80,.6)]},segments),/finnes ikke lenger/);
 assert.match(validateSegmentImpact({baseline:10,segmentImpact:[row('seg-families',50,80,.6),row('seg-families',10,10,.1)]},segments),/flere ganger/);
 assert.match(validateSegmentImpact({baseline:10,segmentImpact:[row('seg-families',140,80,.6)]},segments),/SAM må være mellom 0 og 100/);
 assert.match(validateSegmentImpact({baseline:10,segmentImpact:[row('seg-families',50,-5,.6)]},segments),/SOM må være mellom 0 og 100/);
 assert.match(validateSegmentImpact({baseline:1,segmentImpact:[row('seg-families',50,80,.6)]},segments),/overstiger baseline/);
 assert.match(validateSegmentImpact({baseline:10,segmentImpact:[{segmentId:'seg-families',sam:50,som:80,low:2,expected:1,high:3}]},segments),/lav churn-reduksjon er høyere/);
});

test('Null eksponerte gir null, ikke deling på null',()=>{
 const t={baseline:10,segmentImpact:[row('seg-families',0,0,.6)]};
 const d=deriveMeasure(t,segments,6000);
 assert.equal(d.exposed,0);
 assert.equal(d.expected,0);
 assert.equal(d.reach,0);
 assert.equal(d.value,6000,'faller tilbake på standardverdien');
 assert.ok(Number.isFinite(d.value));
});
