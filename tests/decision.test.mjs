import test from 'node:test';
import assert from 'node:assert/strict';
import {planValue,painValue,delayValue,initialOptions,initialPain} from '../dist/decision-model.mjs';
import {parseDocumentLinks} from '../dist/document-links.mjs';
import {validateIssue,examples} from '../dist/model.mjs';
const settings={fte:2,weeks:13,weeklyRate:30000};
test('Planen bruker faktisk kapasitet og proraterer effekt etter levering',()=>{
 const r=planValue(initialOptions,['diagnostics'],settings);
 assert.equal(r.effort,12);assert.equal(r.finish,6);assert.equal(r.gross,2600000*46/52);
 assert.ok(Math.abs(r.net-((2600000-200000)*46/52-12*30000-100000))<1e-8);
});
test('Rekkefølge påvirker økonomi, men ikke samlet ressursbehov',()=>{
 const a=planValue(initialOptions,['diagnostics','wifi','discovery'],settings),b=planValue(initialOptions,['discovery','wifi','diagnostics'],settings);
 assert.equal(a.effort,b.effort);assert.ok(a.net>b.net);assert.equal(a.feasible,true);
 assert.equal(planValue(initialOptions,['diagnostics','wifi','discovery'],settings,'low').feasible,false);
});
test('Innsiktsarbeid gir bare kostnad, ikke hele problemets potensial',()=>{
 const r=planValue(initialOptions,['discovery'],settings);
 assert.equal(r.gross,0);assert.equal(r.net,-135000);assert.equal(r.discoveryCost,135000);
 const p=painValue(initialPain);assert.equal(p.burden,25200000);assert.equal(p.potential.expected,3780000);
});
test('Ingen arbeid og slutt etter horisonten skaper ikke positiv fantomverdi',()=>{
 assert.equal(planValue(initialOptions,[],settings).net,0);
 const r=planValue(initialOptions,['diagnostics'],{...settings,fte:.1});
 assert.equal(r.gross,0);assert.equal(r.feasible,false);assert.ok(r.net<0);
});
test('Utsettelse bruker netto driftsbidrag, avgrenses til effektuker og dobbeltteller ikke utviklingskostnad',()=>{
 const o=initialOptions[0];assert.equal(delayValue(o,settings,0),0);assert.equal(delayValue(o,settings,13),600000);
 assert.equal(delayValue(o,settings,52),(2600000-200000)*46/52);
});
test('Kundebase begrenser adresserbare kunder uten å multiplisere verdien på nytt',()=>{
 assert.equal(validateIssue({...examples[0],productCustomers:100000}),null);
 const e=validateIssue({...examples[0],productCustomers:99999});assert.equal(e.targets[0].field,'customers');
});
test('Dokumentlenker støtter flere referanser og avviser aktive URL-er',()=>{
 assert.equal(parseDocumentLinks('Presentasjon | https://example.com/deck\nProduktarbeid | https://example.com/discovery').links.length,2);
 assert.ok(parseDocumentLinks('Skadelig | javascript:alert(1)').error);
 assert.ok(parseDocumentLinks('https://user:pass@example.com').error);
 assert.ok(parseDocumentLinks('ikke en lenke').error);
 assert.equal(parseDocumentLinks('').links.length,0);
});
