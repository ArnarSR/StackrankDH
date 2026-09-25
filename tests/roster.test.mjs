import test from 'node:test';
import assert from 'node:assert/strict';
import {estimate,costBreakdown} from '../dist/resources.mjs';
import {calculate,examples,scenario} from '../dist/model.mjs';
import {seedRoster,taskBreakdown,measureRoles,roleDemand,validateRoster,validateTasks,roleName} from '../dist/roster.mjs';

const roster=seedRoster();
const team={id:'tm',name:'Plattform',role:'Bygg',roleId:'role-platform',fte:estimate(1,2,2),weeks:estimate(4,5,6),start:0,rate:10000,includeCost:true};
const base={...examples[0],id:'m',name:'M',teams:[team],tasks:[],requires:[],keyResultIds:[]};

test('Oppgaver endrer verken kostnad, nettoverdi eller ROI',()=>{
 const withTasks={...base,tasks:[
  {id:'a',teamId:'tm',title:'A',estimateWeeks:4,status:'todo',roleId:''},
  {id:'b',teamId:'tm',title:'B',estimateWeeks:99,status:'doing',roleId:''}]};
 assert.deepEqual(costBreakdown(withTasks),costBreakdown(base));
 assert.deepEqual(calculate(withTasks),calculate(base));
 assert.equal(scenario(withTasks).net,scenario(base).net);
});

test('Differansen mot teamraden rapporteres i stedet for å avstemmes',()=>{
 const teamWeeks=2*5; // fte.expected × weeks.expected
 const under=taskBreakdown({...base,tasks:[{id:'a',teamId:'tm',title:'A',estimateWeeks:6,status:'todo'}]}).rows[0];
 assert.equal(under.teamWeeks,teamWeeks);
 assert.equal(under.taskWeeks,6);
 assert.equal(under.diff,4);
 assert.equal(under.state,'under');
 const over=taskBreakdown({...base,tasks:[{id:'a',teamId:'tm',title:'A',estimateWeeks:14,status:'todo'}]}).rows[0];
 assert.equal(over.state,'over');
 const match=taskBreakdown({...base,tasks:[{id:'a',teamId:'tm',title:'A',estimateWeeks:teamWeeks,status:'todo'}]}).rows[0];
 assert.equal(match.state,'match');
});

test('Oppgaver som peker på en slettet teamrad blir synlige, ikke borte',()=>{
 const result=taskBreakdown({...base,tasks:[{id:'x',teamId:'finnes-ikke',title:'X',estimateWeeks:2,status:'todo'}]});
 assert.equal(result.rows[0].tasks.length,0);
 assert.deepEqual(result.orphans.map(t=>t.id),['x']);
});

test('Hvem må være med utledes av både teamrader og oppgaver',()=>{
 const t={...base,tasks:[{id:'a',teamId:'tm',title:'A',estimateWeeks:1,status:'todo',roleId:'role-security'}]};
 assert.deepEqual(measureRoles(t,roster).map(r=>r.id).sort(),['role-platform','role-security']);
 // Oppgave uten egen rolle arver teamradens.
 const inherited={...base,tasks:[{id:'a',teamId:'tm',title:'A',estimateWeeks:1,status:'todo',roleId:''}]};
 assert.deepEqual(measureRoles(inherited,roster).map(r=>r.id),['role-platform']);
});

test('Kapasitet måles som ressursuker mot tilgjengelige rolleuker',()=>{
 const demand=roleDemand([base],roster,'expected',100);
 const platform=demand.roles.find(r=>r.id==='role-platform');
 assert.equal(platform.demand,10);
 assert.equal(platform.available,300); // kapasitet 3 × 100 uker
 assert.ok(Math.abs(platform.utilisation-10/3)<1e-9);
 assert.equal(platform.over,false);
 assert.equal(platform.measures,1);
 const tight=roleDemand([base],{roles:[{id:'role-platform',name:'P',capacity:0.05}]},'expected',100);
 assert.equal(tight.roles[0].over,true);
});

test('Teamrader uten rolle telles som ufordelt etterspørsel',()=>{
 const loose={...base,teams:[{...team,roleId:''}]};
 assert.equal(roleDemand([loose],roster).unassigned,10);
 assert.equal(roleDemand([base],roster).unassigned,0);
});

test('Roller og oppgaver valideres med konkrete feltreferanser',()=>{
 assert.equal(validateRoster(roster),'');
 assert.match(validateRoster({roles:[{id:'r',name:'',capacity:1}]}),/gi rollen et navn/);
 assert.match(validateRoster({roles:[{id:'r',name:'R',capacity:-1}]}),/0 eller større/);
 const ok={...base,tasks:[{id:'a',teamId:'tm',title:'A',estimateWeeks:2,status:'todo',roleId:''}]};
 assert.equal(validateTasks(ok,roster),'');
 assert.match(validateTasks({...base,tasks:[{id:'a',teamId:'tm',title:'',estimateWeeks:2,status:'todo'}]},roster),/tittel/);
 assert.match(validateTasks({...base,tasks:[{id:'a',teamId:'nei',title:'A',estimateWeeks:2,status:'todo'}]},roster),/teamrad/);
 assert.match(validateTasks({...base,tasks:[{id:'a',teamId:'tm',title:'A',estimateWeeks:-1,status:'todo'}]},roster),/ressursuker/);
 assert.match(validateTasks({...base,tasks:[{id:'a',teamId:'tm',title:'A',estimateWeeks:1,status:'todo',roleId:'borte'}]},roster),/finnes ikke lenger/);
});

test('Eksempeldataene har gyldige roller og oppgaver',()=>{
 assert.equal(validateRoster(roster),'');
 for(const t of examples)assert.equal(validateTasks(t,roster),'',`${t.name} har ugyldige oppgaver`);
 const diagnostics=examples.find(t=>t.id==='diagnostics');
 const rows=taskBreakdown(diagnostics).rows;
 assert.equal(rows[0].state,'match','plattformraden er brutt helt ned');
 const telemetry=taskBreakdown(examples.find(t=>t.id==='telemetry')).rows[0];
 assert.equal(telemetry.state,'under','telemetriraden har arbeid som ikke er brutt ned');
 assert.equal(roleName(roster,'role-security'),'Sikkerhet & personvern');
});
