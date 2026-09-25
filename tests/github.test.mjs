import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRepo,issueUrl,safeIssueUrl,tasksToCsv} from '../dist/github.mjs';

test('Repo godtas som eier/navn eller full GitHub-adresse',()=>{
 assert.equal(parseRepo('ArnarSR/StackrankDH'),'ArnarSR/StackrankDH');
 assert.equal(parseRepo('https://github.com/ArnarSR/StackrankDH'),'ArnarSR/StackrankDH');
 assert.equal(parseRepo('https://github.com/ArnarSR/StackrankDH.git'),'ArnarSR/StackrankDH');
 assert.equal(parseRepo('https://github.com/ArnarSR/StackrankDH/issues/4'),'ArnarSR/StackrankDH');
 assert.equal(parseRepo('  ArnarSR/StackrankDH/  '),'ArnarSR/StackrankDH');
});

test('Repo avviser andre verter, usikre protokoller og ufullstendige navn',()=>{
 for(const bad of ['','ArnarSR','https://gitlab.com/a/b','http://github.com/a/b','javascript:alert(1)','https://github.com.evil.no/a/b','a/b/c/d/e f'])
  assert.equal(parseRepo(bad),null,`skulle avvist: ${bad}`);
});

test('Issue-URL koder inn parametere og hopper over tomme felt',()=>{
 const url=new URL(issueUrl('a/b',{title:'Feil & mangler',body:'Linje 1\nLinje 2',labels:['churn','tiltak'],projects:['a/1']}));
 assert.equal(url.origin+url.pathname,'https://github.com/a/b/issues/new');
 assert.equal(url.searchParams.get('title'),'Feil & mangler');
 assert.equal(url.searchParams.get('body'),'Linje 1\nLinje 2');
 assert.equal(url.searchParams.get('labels'),'churn,tiltak');
 assert.equal(url.searchParams.get('projects'),'a/1');
 assert.equal(url.searchParams.has('assignees'),false);
 assert.ok(!url.href.includes(' '),'mellomrom må være kodet');
 assert.equal(issueUrl('ikke et repo',{title:'x'}),null);
});

test('Issue-lenker avviser alt som ikke er https på github.com',()=>{
 assert.equal(safeIssueUrl('https://github.com/a/b/issues/7'),'https://github.com/a/b/issues/7');
 for(const bad of ['javascript:alert(1)','http://github.com/a/b','https://user:pass@github.com/a/b','https://evil.no/a/b','ikke en url'])
  assert.equal(safeIssueUrl(bad),null,`skulle avvist: ${bad}`);
});

test('CSV-eksport skiller felt og nøytraliserer regnearkformler',()=>{
 const items=[{name:'Tiltak, med komma',teams:[{id:'tm',name:'Plattform',roleId:'r1'}],
  tasks:[{id:'t1',teamId:'tm',title:'=SUM(A1:A9)',estimateWeeks:3,status:'doing',issueUrl:'https://github.com/a/b/issues/1'},
         {id:'t2',teamId:'tm',title:'Si "hei"',estimateWeeks:1,status:'todo',issueUrl:''}]}];
 const csv=tasksToCsv(items,id=>id==='r1'?'Utvikler':'');
 const lines=csv.split('\n');
 assert.match(lines[0],/^Tiltak,Team,Rolle,Oppgave/);
 assert.ok(lines[1].includes('"Tiltak, med komma"'),'komma må siteres');
 assert.ok(lines[1].includes(`,'=SUM(A1:A9),`),'formel må nøytraliseres med apostrof');
 assert.ok(lines[1].includes('Utvikler'));
 assert.ok(lines[2].includes('"Si ""hei"""'),'anførselstegn må dobles');
 assert.equal(tasksToCsv([]).split('\n').length,1,'uten oppgaver gjenstår bare overskriften');
});
