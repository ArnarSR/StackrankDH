import test from 'node:test';
import assert from 'node:assert/strict';
import {examples,calculate} from '../dist/model.mjs';
import {seedSegments,applySegments} from '../dist/segments.mjs';
import {mergeMeasureDraft} from '../dist/measure-draft.mjs';

test('Endret BU-eier bevarer segmentrader og økonomi ved lagring i tiltaksdialogen',()=>{
 const original=structuredClone(examples[0]),segments=seedSegments();
 applySegments([original],segments,6000);
 const draft=mergeMeasureDraft(original,{businessUnitId:'new',customers:NaN,reach:NaN,low:NaN,expected:NaN,high:NaN,value:NaN},segments,6000);
 assert.equal(draft.businessUnitId,'new');
 assert.deepEqual(draft.segmentImpact,original.segmentImpact);
 assert.deepEqual(calculate(draft),calculate(original));
 draft.segmentImpact[0].sam=0;
 assert.notEqual(original.segmentImpact[0].sam,0,'utkastet endrer ikke originalen før lagring');
});
test('Tiltak uten segmenter beholder egne antakelser og eksplisitt kundeverdi',()=>{
 const original={...examples[4],valueOverride:true,value:1234};
 const draft=mergeMeasureDraft(original,{name:'Nytt navn',customers:50,reach:20},[],6000);
 assert.equal(draft.value,1234);assert.equal(draft.customers,50);assert.equal(draft.reach,20);
 assert.equal(mergeMeasureDraft(original,{valueOverride:false},[],6000).value,6000);
});
