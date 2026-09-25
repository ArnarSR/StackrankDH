import test from 'node:test';
import assert from 'node:assert/strict';
import {planValue,painValue,delayValue,initialOptions,initialPain,breakEvenMonth,HORIZON_MONTHS} from '../dist/decision-model.mjs';
import {parseDocumentLinks} from '../dist/document-links.mjs';
import {validateIssue,examples} from '../dist/model.mjs';
const settings={fte:2,weeks:13,weeklyRate:30000};
test('Laben bruker veikartets tidsmodell: månedlig opptjening fra landingsmåned',()=>{
 const r=planValue(initialOptions,['diagnostics'],settings);
 assert.equal(r.effort,12);
 assert.equal(r.finish,6,'12 ressursuker på 2 FTE gir 6 kalenderuker');
 const row=r.rows[0];
 assert.equal(row.landing,2,'6 uker runder opp til måned 2');
 assert.equal(row.effectMonths,22,'22 av 24 måneder gir effekt');
 assert.equal(r.gross,2600000/12*22);
 // Gevinst minus drift over effektmånedene, minus lønn og engangskostnad.
 assert.equal(r.net,(2600000-200000)/12*22-12*30000-100000);
 assert.equal(r.net,3940000);
});
test('Kurven er månedlig og går i null på et bestemt tidspunkt',()=>{
 const r=planValue(initialOptions,['diagnostics'],settings);
 assert.equal(r.curve.length,HORIZON_MONTHS);
 assert.equal(r.curve.at(-1).cumulative,r.net);
 const month=breakEvenMonth(r.curve);
 assert.ok(month!==null&&r.curve[month].cumulative>=0);
 assert.ok(month===0||r.curve[month-1].cumulative<0);
});
test('Parallelt arbeid i laben koster gjennomstrømning, som i veikartet',()=>{
 const ids=['diagnostics','wifi'];
 const sequential=planValue(initialOptions,ids,{...settings,wip:1});
 const parallel=planValue(initialOptions,ids,{...settings,wip:2});
 assert.equal(sequential.effort,parallel.effort,'samme arbeidsmengde');
 assert.ok(parallel.rows[1].landing<sequential.rows[1].landing,'det andre tiltaket lander tidligere');
 // Strekket måles i uker; månedsavrunding kan skjule det på landingsmåneden.
 assert.ok(Math.abs(parallel.rows[0].endWeek-6/0.8)<1e-9,'20 % tap strekker 6 uker til 7,5');
 assert.ok(parallel.rows[0].endWeek>sequential.rows[0].endWeek,'det første tiltaket blir ferdig senere');
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
 // Et helt års utsettelse koster et helt års netto driftsbidrag.
 assert.equal(delayValue(o,settings,52),2400000);
 // Avgrenses til det som er igjen av horisonten: 104 uker minus 6 ukers arbeid.
 assert.equal(delayValue(o,settings,500),2400000*(104-6)/52);
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
