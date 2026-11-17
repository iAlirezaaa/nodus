import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Execute exact implementation lines extracted from the single-file Pages bundle.
const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
function read(name){const line=html.split('\n').find(s=>s.startsWith('function '+name+'(')||s.startsWith('async function '+name+'('));assert.ok(line,'Missing exact Pages function '+name);return line}
const source={restore:read('restoreLocalDocument'),mutate:read('mutate'),undo:read('undo'),redo:read('redo')};
const original={version:1,homeBoardId:'old',boards:[{id:'old',title:'قبلی'}],nodes:[{id:'1',title:'ایده'}],edges:[]};
const imported={version:1,homeBoardId:'new',boards:[{id:'new',title:'پشتیبان'}],nodes:[{id:'2',title:'نسخه'}],edges:[]};
const copy=d=>JSON.parse(JSON.stringify(d));
function harness(fail=false){
 let writes=[],renders=0,notices=[];
 const state={doc:copy(original),hasLoaded:true,restorePending:false,boardId:'old',selected:'1',selectedIds:new Set(['1']),history:['prior'],future:['redo'],groupMode:true,linkFrom:'1',gesture:null,magnetFrame:null,magnetRunning:false,magnetPositions:null,magnetPins:new Set(['1']),viewByBoard:new Map()};
 const context={state,JSON,copy,console:{error:()=>{}},persist:async d=>{writes.push(copy(d));if(fail)throw Error('quota')},saveStatus:()=>{},toast:t=>notices.push(t),L:(fa,en)=>en,render:()=>{renders++},cancelAnimationFrame:()=>{},queueSave:()=>{},flushEditor:()=>{}};
 state.saveQueue=Promise.resolve();
 const get=name=>vm.runInNewContext('('+source[name]+')',context);
 return {state,restore:get('restore'),mutate:get('mutate'),undo:get('undo'),redo:get('redo'),stats:()=>({writes,renders,notices})};
}
test('successful import becomes visible only after durable save; creates a single Undo snapshot',async()=>{
 const h=harness();assert.equal(await h.restore(copy(imported)),true);
 assert.deepEqual(h.stats().writes,[imported]);assert.deepEqual(h.state.doc,imported);
 assert.equal(h.state.boardId,'new');assert.deepEqual(JSON.parse(h.state.history.at(-1)),original);
 assert.equal(h.state.history.length,2);assert.deepEqual(Array.from(h.state.future),[]);
 assert.equal(h.state.restorePending,false);assert.equal(h.stats().renders,1);
});
test('IndexedDB error retains previous board, selection, history, redo and display',async()=>{
 const h=harness(true);assert.equal(await h.restore(copy(imported)),false);
 assert.deepEqual(h.state.doc,original);assert.equal(h.state.boardId,'old');assert.equal(h.state.selected,'1');
 assert.deepEqual([...h.state.selectedIds],['1']);assert.deepEqual(Array.from(h.state.history),['prior']);
 assert.deepEqual(Array.from(h.state.future),['redo']);assert.equal(h.stats().renders,0);
 assert.deepEqual(h.stats().notices,['Import failed; previous workspace is unchanged.']);
});
test('pending prior write drains before import; edits and Undo/Redo are blocked while pending',async()=>{
 const h=harness();let done;h.state.saveQueue=new Promise(resolve=>{done=resolve});
 const pending=h.restore(copy(imported));h.mutate(d=>d.nodes.push({id:'race'}));h.undo();h.redo();
 assert.deepEqual(h.state.doc,original);assert.equal(h.stats().writes.length,0);assert.equal(h.state.history.length,1);
 done();assert.equal(await pending,true);assert.deepEqual(h.stats().writes,[imported]);
});
test('rejected prior save prevents replacement; concurrent import is rejected',async()=>{
 const h=harness();h.state.saveQueue=Promise.reject(Error('old save failed'));
 assert.equal(await h.restore(copy(imported)),false);assert.deepEqual(h.state.doc,original);assert.equal(h.stats().writes.length,0);
 const h2=harness();let done;h2.state.saveQueue=new Promise(resolve=>{done=resolve});
 const first=h2.restore(copy(imported));assert.equal(await h2.restore(copy(original)),false);
 done();assert.equal(await first,true);assert.equal(h2.stats().writes.length,1);
});
