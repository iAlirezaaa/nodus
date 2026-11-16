import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../pages/index.html', import.meta.url), 'utf8');
const text = html.match(/^function mutate\(fn\)\{[^\n]+\}$/m)?.[0];
assert.ok(text, 'must inspect mutate from the exact published bundle, not a duplicate implementation');
function harness() {
  let saves=0, renders=0, cancellations=0;
  const ctx={state:{hasLoaded:true, doc:{nodes:[{id:'n1',title:'اصل'}]},history:[],future:[],magnetFrame:null,magnetRunning:false,magnetPositions:null},
    cancelAnimationFrame:()=>{cancellations++}, queueSave:()=>{saves++},render:()=>{renders++},toast:()=>{},JSON};
  return {ctx,mutate:vm.runInNewContext(`(${text})`,ctx), counters:()=>({saves,renders,cancellations})};
}
test('failed partial edit rolls back canonical graph, history, future and saves',()=>{
 const {ctx,mutate,counters}=harness();ctx.state.future=['future'];const old=ctx.state.doc;
 mutate(d=>{d.nodes[0].title='خراب';d.nodes.push({id:'z',title:'bad'});throw Error('failure after partial write')});
 assert.deepEqual(ctx.state.doc,{nodes:[{id:'n1',title:'اصل'}]});
 assert.equal(ctx.state.doc,old);
 assert.equal(ctx.state.history.length,0);
 assert.deepEqual(ctx.state.future,['future']);
 assert.deepEqual(counters(),{saves:0,renders:0,cancellations:0});
});
test('following successful edit cannot persist a previously failed partial edit',()=>{
 const {ctx,mutate,counters}=harness();
 mutate(d=>{d.nodes.push({id:'ghost',title:'ghost'});throw Error('no')});
 mutate(d=>{d.nodes[0].title='درست'});
 assert.deepEqual(ctx.state.doc,{nodes:[{id:'n1',title:'درست'}]});
 assert.equal(ctx.state.history.length,1);
 assert.deepEqual(JSON.parse(ctx.state.history[0]),{nodes:[{id:'n1',title:'اصل'}]});
 assert.deepEqual(counters(),{saves:1,renders:1,cancellations:0});
});
test('one legitimate edit is one undo snapshot and one save; no-op emits neither',()=>{
 const {ctx,mutate,counters}=harness();
 mutate(d=>{d.nodes[0].title='اول'});
 assert.equal(ctx.state.history.length,1);
 assert.equal(ctx.state.doc.nodes[0].title,'اول');
 assert.deepEqual(JSON.parse(ctx.state.history[0]),{nodes:[{id:'n1',title:'اصل'}]});
 mutate(()=>{});
 assert.deepEqual(counters(),{saves:1,renders:1,cancellations:0});
});
