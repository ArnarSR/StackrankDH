import test from 'node:test';
import assert from 'node:assert/strict';
import {estimate} from '../dist/resources.mjs';
import {examples,scenario} from '../dist/model.mjs';
import {HORIZON_MONTHS,schedule,scenarioCurve,compareScenarios,unlocks,coverage,placementSignals,seedRoadmap,validateRoadmap,validateRoadmapIssue,costOfDelay,suggestedOrder,breakEvenMonth,throughput,switchingLoss,focusFactor,defaultSwitchingLoss} from '../dist/roadmap-model.mjs';

// Tall valgt slik at gevinst og drift er delelig på 12; da kan likhet med porteføljen sjekkes eksakt.
const base={...examples[0],id:'base',name:'Base',customers:100000,reach:100,baseline:10,low:0,expected:.4,high:.8,value:9000,
 costItems:[{id:'c-a',name:'Drift',kind:'annual',basis:'known',...estimate(120000)},{id:'c-o',name:'Etablering',kind:'once',basis:'known',...estimate(200000)}],
 teams:[],risks:[],sources:[],effectSourceId:'',requires:[],keyResultIds:[],horizon:'now'};
const team={id:'tm',name:'Team',role:'Bygg',fte:estimate(1,1,1),weeks:estimate(4,4,4),start:0,rate:10000,includeCost:true,note:''};
const built={...base,id:'built',name:'Built',teams:[team]};
const sum=(curve,field)=>curve.reduce((n,m)=>n+m[field],0);

test('Tiltak uten varighet lander i måned 0 og gir porteføljens nettoverdi etter tolv måneder',()=>{
 const {rows,curve}=scenarioCurve(['base'],[base]);
 assert.equal(rows[0].landing,0);
 assert.equal(curve[11].cumulative,scenario(base).net);
 assert.equal(curve[11].cumulative,3280000);
});

test('Tolv effektmåneder fra landing gir nøyaktig porteføljens nettoverdi uansett landingsmåned',()=>{
 const {rows,curve}=scenarioCurve(['built'],[built]);
 assert.equal(rows[0].landing,1);
 assert.equal(curve[rows[0].landing+11].cumulative,scenario(built).net);
});

test('Kostnadene i kurven summerer til drift, engang og lønn – aldri til den ferdige totalsummen',()=>{
 const {rows,curve}=scenarioCurve(['built'],[built]);
 const r=rows[0];
 assert.equal(sum(curve,'once'),r.once);
 assert.equal(sum(curve,'labor'),r.labor);
 assert.equal(sum(curve,'operating'),r.annual/12*r.effectMonths);
 // costBreakdown.total ville vært 360 000; det beløpet skal aldri opptre i kurven.
 assert.equal(sum(curve,'once')+sum(curve,'labor'),r.once+r.labor);
});

test('Lønn påløper mens arbeidet pågår, drift og gevinst først fra landing',()=>{
 const {curve}=scenarioCurve(['built'],[built]);
 assert.equal(curve[0].labor,40000);
 assert.equal(curve[0].gross,0);
 assert.equal(curve[0].operating,0);
 assert.ok(curve[1].gross>0);
 assert.equal(curve[1].labor,0);
});

test('Rekkefølge forskyver landing og endrer kurven, men ikke samlet kostnad',()=>{
 const other={...built,id:'other',name:'Other'};
 const first=scenarioCurve(['built','other'],[built,other]);
 const second=scenarioCurve(['other','built'],[built,other]);
 assert.deepEqual(first.rows.map(r=>r.landing),second.rows.map(r=>r.landing));
 assert.equal(sum(first.curve,'labor'),sum(second.curve,'labor'));
 assert.equal(first.rows[1].landing,2);
 assert.ok(first.rows[1].landing>first.rows[0].landing);
});

test('Tiltak som lander etter horisonten bidrar med null gevinst og klippes ikke inn',()=>{
 const long={...base,teams:[{...team,weeks:estimate(52,52,52)}]};
 const a={...long,id:'a',name:'A'},b={...long,id:'b',name:'B'},c={...long,id:'c',name:'C'};
 const {rows}=scenarioCurve(['a','b','c'],[a,b,c]);
 assert.equal(rows[2].landing,36);
 assert.ok(rows[2].beyondHorizon);
 assert.equal(rows[2].effectMonths,0);
 assert.equal(rows[2].applied.gross,0);
});

test('Enablende tiltak uten churn-effekt gir bare kostnad, aldri gevinst',()=>{
 const enabler={...base,id:'enabler',name:'Enabler',customers:0,reach:0,low:0,expected:0,high:0};
 const {curve,net}=scenarioCurve(['enabler'],[enabler]);
 assert.equal(sum(curve,'gross'),0);
 assert.ok(net<0);
});

test('Låst verdi endrer ingen total, og kurven er identisk med og uten kobling',()=>{
 const a={...base,id:'a',name:'A'},b={...base,id:'b',name:'B',requires:['a']};
 const linked=scenarioCurve(['a','b'],[a,b]);
 const loose=scenarioCurve(['a','b'],[a,{...b,requires:[]}]);
 assert.deepEqual(linked.curve,loose.curve);
 assert.equal(linked.net,loose.net);
});

test('Låst verdi overlapper i en kjede og kan derfor aldri summeres på tvers',()=>{
 const a={...base,id:'a',name:'A'},b={...base,id:'b',name:'B',requires:['a']},c={...base,id:'c',name:'C',requires:['b']};
 const result=unlocks([a,b,c]);
 const byId=Object.fromEntries(result.map(r=>[r.id,r]));
 assert.deepEqual(byId.a.direct,['b']);
 assert.deepEqual(byId.a.downstream.sort(),['b','c']);
 assert.deepEqual(byId.b.downstream,['c']);
 // C teller i både A og B sin låste verdi. En sum på tvers ville dobbeltelt C.
 assert.equal(byId.a.unlockedNet,scenario(b).net+scenario(c).net);
 assert.equal(byId.c.unlockedNet,0);
});

test('Forskjellen mellom to scenarioer er planforskjellen alene',()=>{
 const a={...base,id:'a',name:'A'},b={...built,id:'b',name:'B'};
 const {delta,a:first,b:second}=compareScenarios(['a'],['b'],[a,b]);
 assert.equal(delta,second.net-first.net);
});

test('Key results og strategisk fit endrer ingen økonomiske resultater',()=>{
 const plain=scenarioCurve(['base'],[base]);
 const tagged=scenarioCurve(['base'],[{...base,keyResultIds:['kr-churn'],strategicFit:'low'}]);
 assert.deepEqual(plain.curve,tagged.curve);
});

test('Lavscenarioet bruker høy kostnad og dermed lengste varighet',()=>{
 const spread={...base,id:'spread',teams:[{...team,weeks:estimate(2,4,8)}]};
 assert.equal(schedule([spread],'low')[0].duration,8);
 assert.equal(schedule([spread],'expected')[0].duration,4);
 assert.equal(schedule([spread],'high')[0].duration,2);
});

test('Sirkulær avhengighet avvises med navngitt kjede',()=>{
 const a={...base,id:'a',name:'A',requires:['b']},b={...base,id:'b',name:'B',requires:['a']};
 const issue=validateRoadmapIssue({scenarios:[]},[a,b]);
 assert.ok(issue);
 assert.match(issue.message,/Sirkulær avhengighet/);
 assert.match(issue.message,/«A»/);
 assert.match(issue.message,/«B»/);
 assert.ok(issue.targets.every(t=>t.field==='requires'));
});

test('Tiltak kan ikke forutsette seg selv eller noe som er slettet',()=>{
 const self={...base,id:'a',name:'A',requires:['a']};
 assert.match(validateRoadmap({scenarios:[]},[self]),/kan ikke forutsette seg selv/);
 const orphan={...base,id:'a',name:'A',requires:['borte']};
 assert.match(validateRoadmap({scenarios:[]},[orphan]),/ikke finnes lenger/);
});

test('Scenario avvises ved duplikat, manglende forutsetning og feil rekkefølge',()=>{
 const a={...base,id:'a',name:'A'},b={...base,id:'b',name:'B',requires:['a']};
 const items=[a,b];
 assert.match(validateRoadmap({scenarios:[{id:'s',name:'S',order:['a','a']}]},items),/flere ganger/);
 assert.match(validateRoadmap({scenarios:[{id:'s',name:'S',order:['b']}]},items),/ikke er med i scenarioet/);
 assert.match(validateRoadmap({scenarios:[{id:'s',name:'S',order:['b','a']}]},items),/ligger før sin forutsetning/);
 assert.equal(validateRoadmap({scenarios:[{id:'s',name:'S',order:['a','b']}]},items),'');
});

test('Dekning skiller key results uten tiltak fra tiltak uten key result, uten å gi feil',()=>{
 const roadmap=seedRoadmap();
 const result=coverage(roadmap,examples);
 assert.deepEqual(result.keyResultsWithoutMeasures.map(k=>k.id),['kr-contacts']);
 assert.deepEqual(result.measuresWithoutKeyResult.map(t=>t.id).sort(),['parental','telemetry']);
 assert.equal(result.staleLinks.length,0);
 assert.equal(validateRoadmap(roadmap,examples),'');
});

test('Uenighet mellom plassert horisont og beregnet landing er et signal, ikke en feil',()=>{
 const late={...base,id:'late',name:'Late',horizon:'now',teams:[{...team,weeks:estimate(30,30,30)}]};
 const signals=placementSignals(['late'],[late]);
 assert.equal(signals.length,1);
 assert.equal(signals[0].horizon,'now');
 assert.ok(signals[0].landing>=3);
 assert.equal(validateRoadmap({scenarios:[{id:'s',name:'S',order:['late']}]},[late]),'');
});

test('Rekkefølgefeil i et scenario som ikke vises blokkerer ikke de andre',()=>{
 const a={...base,id:'a',name:'A'},b={...base,id:'b',name:'B',requires:['a']};
 const roadmap={scenarios:[{id:'ok',name:'OK',order:['a','b']},{id:'broken',name:'Broken',order:['b']}]};
 assert.match(validateRoadmap(roadmap,[a,b]),/ikke er med i scenarioet/);
 assert.equal(validateRoadmap(roadmap,[a,b],['ok']),'');
 // Koblinger mellom tiltak sjekkes fortsatt globalt, uansett filter.
 const cyclic=[{...a,requires:['b']},b];
 assert.match(validateRoadmap({scenarios:[]},cyclic,['ok']),/Sirkulær avhengighet/);
});

test('CD3 er månedlig netto driftsbidrag delt på varighet',()=>{
 const r=costOfDelay(built);
 assert.equal(r.monthly,(scenario(built).gross-120000)/12);
 assert.ok(Math.abs(r.months-4/(52/12))<1e-9);
 assert.ok(Math.abs(r.cd3-r.monthly/r.months)<1e-9);
 assert.equal(costOfDelay(base).cd3,null,'uten varighet er CD3 udefinert');
});

test('Foreslått rekkefølge sorterer på CD3, men aldri foran en forutsetning',()=>{
 const slow={...built,id:'slow',name:'Slow',teams:[{...team,weeks:estimate(20,20,20)}]};
 const fast={...built,id:'fast',name:'Fast'};
 assert.deepEqual(suggestedOrder([slow,fast]),['fast','slow'],'høyest CD3 først');
 // Enabler har CD3 = 0, men må likevel foran det den låser opp.
 const enabler={...base,id:'enabler',name:'Enabler',customers:0,reach:0,low:0,expected:0,high:0,teams:[team]};
 const blocked={...fast,id:'blocked',name:'Blocked',requires:['enabler']};
 const order=suggestedOrder([blocked,enabler]);
 assert.ok(order.indexOf('enabler')<order.indexOf('blocked'));
});

test('Nullpunkt er første måned kumulativ verdi ikke er negativ',()=>{
 const {curve}=scenarioCurve(['built'],[built]);
 const month=breakEvenMonth(curve);
 assert.ok(curve[month].cumulative>=0);
 assert.ok(month===0||curve[month-1].cumulative<0);
 assert.equal(breakEvenMonth(scenarioCurve(['enabler'],[{...base,id:'enabler',customers:0,reach:0,low:0,expected:0,high:0}]).curve),null);
});

test('WIP 1 gir nøyaktig den sekvensielle planen, uten tap',()=>{
 const a={...built,id:'a',name:'A'},b={...built,id:'b',name:'B'};
 const plain=schedule([a,b],'expected');
 const explicit=schedule([a,b],'expected',{wip:1});
 assert.deepEqual(plain,explicit);
 assert.equal(plain[0].effectiveDuration,plain[0].duration);
 assert.equal(plain[1].startWeek,plain[0].endWeek,'sekvensielt');
});

test('Parallelle baner starter tidligere, men hvert tiltak tar lenger tid',()=>{
 const a={...built,id:'a',name:'A'},b={...built,id:'b',name:'B'};
 const parallel=schedule([a,b],'expected',{wip:2});
 assert.equal(parallel[0].startWeek,0);
 assert.equal(parallel[1].startWeek,0,'begge starter med en gang');
 assert.equal(parallel[0].lane!==parallel[1].lane,true,'ulike baner');
 // 20 % tap ved to samtidige: 4 uker blir 5.
 assert.ok(Math.abs(parallel[0].effectiveDuration-4/0.8)<1e-9);
 assert.ok(parallel[0].effectiveDuration>parallel[0].duration);
});

test('En forutsetning holder igjen selv når det finnes ledig bane',()=>{
 const a={...built,id:'a',name:'A'},b={...built,id:'b',name:'B',requires:['a']};
 const plan=schedule([a,b],'expected',{wip:3});
 assert.equal(plan[0].startWeek,0);
 assert.equal(plan[1].startWeek,plan[0].endWeek,'B venter på A');
});

test('Gjennomstrømningen topper seg rundt tre samtidige og faller igjen',()=>{
 const values=[1,2,3,4,5].map(n=>throughput(n));
 assert.deepEqual(values.map(v=>+v.toFixed(2)),[1,1.6,1.8,1.6,1.25]);
 const best=values.indexOf(Math.max(...values))+1;
 assert.equal(best,3,'optimum ved tre samtidige med Weinberg-tallene');
 assert.ok(values[4]<values[2],'fem er dårligere enn tre');
});

test('Tapstabellen kan overstyres, og verdier utenfor tabellen bruker siste kjente',()=>{
 const none={1:0,2:0,3:0};
 assert.equal(switchingLoss(3,none),0);
 assert.equal(focusFactor(3,none),1);
 assert.equal(schedule([built],'expected',{wip:3,losses:none})[0].effectiveDuration,4);
 assert.equal(switchingLoss(9),defaultSwitchingLoss[5],'utenfor tabellen brukes siste verdi');
 assert.equal(switchingLoss(0),0,'null behandles som én');
});

test('For mye parallelt gjør planen mindre verdt innen horisonten',()=>{
 const many=['a','b','c','d'].map(id=>({...built,id,name:id.toUpperCase()}));
 const focused=scenarioCurve(many.map(t=>t.id),many,'expected',{wip:1});
 const scattered=scenarioCurve(many.map(t=>t.id),many,'expected',{wip:4});
 assert.ok(scattered.rows[3].landing<focused.rows[3].landing,'siste tiltak lander tidligere');
 assert.ok(scattered.rows[0].landing>focused.rows[0].landing,'men det første lander senere');
});

test('Eksempeldataene er et gyldig veikart og holder seg innenfor horisonten',()=>{
 const roadmap=seedRoadmap();
 assert.equal(validateRoadmap(roadmap,examples),'');
 for(const s of roadmap.scenarios){
  const {rows}=scenarioCurve(s.order,examples);
  assert.equal(rows.length,s.order.length);
  assert.ok(rows.every(r=>r.landing<HORIZON_MONTHS));
 }
});
