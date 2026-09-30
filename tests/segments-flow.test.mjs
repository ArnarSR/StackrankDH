import test from 'node:test';
import assert from 'node:assert/strict';
import {bindSegments,renderSegments,renderMeasureSegments,restoreSegments,snapshotSegments,setMeasureContext} from '../dist/segments-ui.mjs';

// En liten DOM-dobbel oppdager om input-raden erstattes under hendelsesflyten.
// Native markør/fokus og layout må også kontrolleres i nettleser.
function flow(run){
 const previous=globalThis.document,saved=structuredClone(snapshotSegments()),elements=new Map();
 const segment={id:'families',name:'Familier',customers:120,sourceId:'',note:''};
 const impact={segmentId:segment.id,sam:50,som:50,low:0,expected:1,high:2};
 const item={id:'measure',segmentImpact:[impact]},items=[item];
 const element=id=>{
  if(!elements.has(id))elements.set(id,{html:'',writes:0,rows:[],textContent:'',listeners:{},
   get innerHTML(){return this.html},
   set innerHTML(value){
    this.html=value;this.writes++;
    if(document.activeElement?.container===this)document.activeElement=null;
    this.rows=[...value.matchAll(/data-(segment|impact)-id="([^"]+)"/g)].map(([,kind,id])=>{
     const output={innerHTML:''};return {dataset:{[kind==='segment'?'segmentId':'impactId']:id},querySelector:()=>output};
    });
   },
   addEventListener(type,handler){this.listeners[type]=handler},
   querySelectorAll(){return this.rows}
  });
  return elements.get(id);
 };
 globalThis.document={getElementById:element,activeElement:null};
 let changes=0,view='segments',fail=false;
 const render=()=>view==='segments'?renderSegments():renderMeasureSegments(item);
 const input=(container,field)=>({container:element(container),dataset:{field},value:'',
  closest:()=>({dataset:{segmentId:segment.id,impactId:segment.id}})});
 const type=(target,value)=>{
  document.activeElement=target;target.value=value;target.valueAsNumber=value===''?NaN:Number(value);
  target.container.listeners.input({target});
 };
 try{
  restoreSegments({segments:[segment]});setMeasureContext(item.id);
  bindSegments(()=>items,()=>1000,()=>{changes++;render();if(fail)throw Error('renderfeil')});render();
  run({element,segment,impact,item,input,type,render,changes:()=>changes,
   measure(){view='measure';render()},fail(value){fail=value}});
 }finally{globalThis.document=previous;restoreSegments(saved);setMeasureContext(null)}
}

test('Segmentfelt beholder input-raden gjennom flere tegn, tømming og navneendring',()=>flow(f=>{
 const container=f.element('segment-rows'),writes=container.writes;
 const customers=f.input('segment-rows','customers');
 for(const value of ['','1','12','122','1220']){
  f.type(customers,value);
  assert.equal(document.activeElement,customers);assert.equal(customers.value,value);
  assert.equal(container.writes,writes,'raden må ikke erstattes under inntasting');
  assert.equal(f.segment.customers,Number(value));assert.equal(f.item.customers,Number(value));
 }
 assert.match(container.rows[0].querySelector().innerHTML,/122,0 %/);
 assert.match(f.element('segment-totals').innerHTML,/Overlapp/);
 assert.match(f.element('segment-error').textContent,/mer enn kundebasen/);
 f.type(customers,'122');
 assert.equal(f.element('segment-error').textContent,'');
 assert.match(f.element('segment-totals').innerHTML,/878/);
 const name=f.input('segment-rows','name');
 for(const value of ['F','Fa','Familier med barn']){f.type(name,value);assert.equal(document.activeElement,name)}
 assert.equal(f.segment.name,'Familier med barn');assert.equal(container.writes,writes);
 assert.equal(f.changes(),9);
}));

test('SAM, SOM og effektfelter beholder input-raden mens beregninger og validering oppdateres',()=>flow(f=>{
 f.measure();const container=f.element('measure-segment-rows'),writes=container.writes;
 for(const [field,values] of Object.entries({sam:['','1','10','100'],som:['8','80'],low:['-','-0.5'],expected:['1','1.5'],high:['2','2.5'],valueOverride:['1','1200','']})){
  const target=f.input('measure-segment-rows',field);
  for(const value of values){
   f.type(target,value);assert.equal(document.activeElement,target);assert.equal(target.value,value);
   assert.equal(container.writes,writes);
  }
 }
 assert.equal(f.item.reach,80);assert.equal(f.item.expected,1.5);
 assert.equal(f.impact.valueOverride,undefined);
 assert.match(container.rows[0].querySelector().innerHTML,/96<small>eksponerte/);
 assert.match(f.element('measure-segment-summary').innerHTML,/1,50 pp/);
 assert.equal(f.element('measure-segment-error').textContent,'');
 const sam=f.input('measure-segment-rows','sam');f.type(sam,'101');
 assert.match(f.element('measure-segment-error').textContent,/SAM må være/);
 f.type(sam,'100');assert.equal(f.element('measure-segment-error').textContent,'');
}));

test('Segmenter kan fortsatt legges til og fjernes med bekreftelse etter inntasting',()=>flow(f=>{
 f.type(f.input('segment-rows','customers'),'122');
 const rows=f.element('segment-rows'),writes=rows.writes;
 f.element('add-segment').listeners.click();assert.equal(rows.writes,writes+1);
 assert.equal(snapshotSegments().segments.length,2);
 const click={target:{closest:()=>({dataset:{removeSegment:f.segment.id}})}};
 rows.listeners.click(click);assert.equal(snapshotSegments().segments.length,2);
 assert.match(rows.innerHTML,/Bekreft/);
 rows.listeners.click(click);assert.equal(snapshotSegments().segments.length,1);
 assert.equal(f.item.segmentImpact.length,0);
 f.measure();assert.match(f.element('measure-segment-rows').innerHTML,/Ingen segmenter/);
 const added=snapshotSegments().segments[0];
 f.element('measure-segment-add').listeners.change({target:{value:added.id}});
 assert.match(f.element('measure-segment-rows').innerHTML,/data-impact-id/);
 const remove={target:{closest:()=>({dataset:{removeImpact:added.id}})}};
 f.element('measure-segment-rows').listeners.click(remove);assert.equal(f.item.segmentImpact.length,1);
 f.element('measure-segment-rows').listeners.click(remove);assert.equal(f.item.segmentImpact.length,0);
 assert.match(f.element('measure-segment-rows').innerHTML,/Ingen segmenter/);
}));

test('En renderfeil låser ikke senere oppdateringer av segmentradene',()=>flow(f=>{
 f.fail(true);
 assert.throws(()=>f.type(f.input('segment-rows','customers'),'123'),/renderfeil/);
 f.fail(false);const rows=f.element('segment-rows'),writes=rows.writes;
 f.render();assert.equal(rows.writes,writes+1);assert.match(rows.innerHTML,/value="123"/);
}));
