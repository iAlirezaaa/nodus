import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function fn(name,ctx){
 const line=script.split('\n').find(s=>s.startsWith('function '+name+'(')||s.startsWith('async function '+name+'('));
 assert.ok(line,'Missing exact code: '+name);
 return vm.runInNewContext('('+line+')',ctx);
}
const good={version:1,homeBoardId:'root',boards:[{id:'root',title:'Root'}],nodes:[],edges:[]};
const bad={...good,homeBoardId:'missing'};
const copy=x=>JSON.parse(JSON.stringify(x));
function db(value,present=value!==undefined,failKey=false){return {transaction:()=>({objectStore:()=>({get:()=>{
 const req={result:value};queueMicrotask(()=>req.onsuccess?.());return req;
},getKey:()=>{const req={result:present?'main':undefined,error:failKey?Error('probe blocked'):null};queueMicrotask(()=>failKey?req.onerror?.():req.onsuccess?.());return req;}})})}}
function harness(){
 const state={hasLoaded:true,restorePending:false,storageRecovery:{raw:bad,rawAvailable:true,backupTaken:false},
 doc:{old:true},boardId:'old',selected:'a',selectedIds:new Set(['a']),history:['prior'],future:['redo'],
 groupMode:true,linkFrom:'a',gesture:null,magnetFrame:null,magnetRunning:false,
 magnetPositions:null,magnetPins:new Set(),viewByBoard:new Map(),saveQueue:Promise.resolve()};
 let writes=[],renders=0,focused=0,status=[];
 const elements={'recovery-modal':{hidden:false},'canvas':{focus:()=>focused++}};
 const ctx={state,JSON,copy,persist:async x=>{writes.push(copy(x))},saveStatus:s=>status.push(s),
 toast:()=>{},L:(a,b)=>b,$:n=>elements[n]||{},render:()=>renders++,cancelAnimationFrame:()=>{},
 flushEditor:()=>{throw Error('unexpected editor')},console:{error:()=>{}}};
 return {state,ctx,elements,stats:()=>({writes,renders,focused,status})};
}
test('inline JS compiles with matching CSP digest and accessible recovery dialog',()=>{
 new vm.Script(script);
 assert.equal(html.match(/script-src 'sha256-([^']+)'/)[1],createHash('sha256').update(script).digest('base64'));
 assert.match(html,/role="alertdialog"/);assert.match(html,/aria-modal="true"/);
});
test('only absent IndexedDB record is blank; malformed falsy values preserve raw',async()=>{
 for(const value of [undefined,good,0,null,bad]){
  const ctx={db:null,getDB:async()=>db(value),blank:()=>({new:true}),
   validate:x=>{if(x!==good)throw Error('Invalid workspace');return x}};
  const load=fn('load',ctx);
  if(value===undefined)assert.equal((await load()).new,true);
  else if(value===good)assert.equal(await load(),good);
  else await assert.rejects(load(),e=>e.name==='CorruptWorkspaceError'&&e.raw===value);
 }
});
test('recovery lock blocks edit/Undo/Redo/save',async()=>{
 const h=harness();h.ctx.queueSave=()=>{throw Error('queued')};
 fn('mutate',h.ctx)(d=>{d.old=false});fn('undo',h.ctx)();fn('redo',h.ctx)();
 await fn('queueSave',h.ctx)();
 assert.deepEqual(h.state.doc,{old:true});assert.deepEqual(h.state.history,['prior']);
 assert.deepEqual(h.state.future,['redo']);assert.equal(h.stats().writes.length,0);
 assert.match(h.stats().status.at(-1),/paused/);
});
test('import requires prior backup; storage failures keep original and locked',async()=>{
 const h=harness(),restore=fn('restoreLocalDocument',h.ctx);
 assert.equal(await restore(good),false);assert.equal(h.stats().writes.length,0);
 h.state.storageRecovery.backupTaken=true;h.ctx.persist=async()=>{throw Error('quota')};
 assert.equal(await restore(good),false);assert.deepEqual(h.state.doc,{old:true});
 assert.ok(h.state.storageRecovery);assert.equal(h.stats().renders,0);
});
test('confirmed import commits before unlocking; no fake blank Undo',async()=>{
 const h=harness();h.state.storageRecovery.backupTaken=true;
 assert.equal(await fn('restoreLocalDocument',h.ctx)(good),true);
 assert.deepEqual(h.stats().writes,[good]);assert.equal(h.state.doc,good);
 assert.equal(h.state.storageRecovery,null);assert.deepEqual(h.state.history,[]);
 assert.deepEqual(h.state.future,[]);assert.equal(h.elements['recovery-modal'].hidden,true);
 assert.equal(h.stats().focused,1);
});
test('raw JSON export enables recovery; failed JSON serialization does not',()=>{
 const h=harness(),controls={'recovery-import':{disabled:true},'recovery-reset':{disabled:true}};
 let payload,clicks=0;
 const ctx={state:h.state,JSON,Date,Blob:function(parts){payload=parts.join('')},
 URL:{createObjectURL:()=>'/blob',revokeObjectURL:()=>{}},document:{
 createElement:()=>({click:()=>clicks++,remove:()=>{}}),body:{append:()=>{}}},
 setTimeout:()=>{},toast:()=>{},console:{error:()=>{}},L:(a,b)=>b,$:n=>controls[n]};
 assert.equal(fn('downloadRecovery',ctx)(),true);assert.deepEqual(JSON.parse(payload),bad);
 assert.equal(clicks,1);assert.equal(h.state.storageRecovery.backupTaken,true);
 assert.equal(controls['recovery-import'].disabled,false);assert.equal(controls['recovery-reset'].disabled,false);
 const cyc={};cyc.self=cyc;h.state.storageRecovery={raw:cyc,rawAvailable:true,backupTaken:false};
 assert.equal(fn('downloadRecovery',ctx)(),false);
 assert.equal(h.state.storageRecovery.backupTaken,false);
});
test('startup chooses recovery UI, not blank editable storage',async()=>{
 const state={doc:{},hasLoaded:false,storageRecovery:null,lang:'fa',theme:'dark',
 design:{nodeStyle:'neural',density:'comfortable',motion:'calm',background:'dots'},view:{},boardId:null};
 let shown=0,rendered=0;const err=Error('Corrupted');err.name='CorruptWorkspaceError';err.raw=bad;
 const ctx={state,setup:()=>{},localStorage:{getItem:()=>null},load:async()=>{throw err},
 blank:()=>({homeBoardId:'fake'}),saveStatus:()=>{},L:(fa,en)=>fa,toast:()=>{},
 $:()=>({clientWidth:390,clientHeight:800}),render:()=>rendered++,showRecovery:()=>shown++,
 onBoard:()=>[],fit:()=>{}};
 await fn('init',ctx)();assert.equal(state.storageRecovery.raw,bad);
 assert.equal(state.storageRecovery.backupTaken,false);assert.equal(shown,1);assert.equal(rendered,1);
});
test('present undefined IndexedDB value is quarantined rather than replaced with blank',async()=>{
 const ctx={getDB:async()=>db(undefined,true),blank:()=>({new:true}),validate:()=>{throw Error('Invalid undefined workspace')}};
 await assert.rejects(fn('load',ctx),e=>e.name==='CorruptWorkspaceError'&&Object.prototype.hasOwnProperty.call(e,'raw')&&e.raw===undefined);
});
test('failed IndexedDB key-presence check fails closed',async()=>{
 const ctx={getDB:async()=>db(undefined,true,true),blank:()=>({new:true}),validate:()=>{throw Error('invalid')}};
 await assert.rejects(fn('load',ctx),e=>e.name==='CorruptWorkspaceError'&&/Cannot check stored workspace key/.test(e.message));
});
