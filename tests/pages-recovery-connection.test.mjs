import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Use the exact checked-in Pages source');
const line=script.split('\n').find(s=>s.startsWith('async function retryRecovery()'));
assert.ok(line,'Recovery Retry must be source exact');
const good={version:1,homeBoardId:'root',boards:[{id:'root',title:'ایده'}],nodes:[],edges:[]};

function fixture(oldConnection,loader=async()=>good){
 const state={hasLoaded:true,storageRecovery:{raw:{invalid:true},rawAvailable:true,backupTaken:true,reason:'old error'},
  restorePending:false,doc:{previous:true},boardId:'old',selected:'old',selectedIds:new Set(['old']),
  groupMode:true,linkFrom:'old',gesture:null,magnetFrame:null,magnetRunning:false,
  magnetPositions:null,magnetPins:new Set(),viewByBoard:new Map(),history:['undo'],future:['redo'],unsavedChanges:false};
 const controls={'recovery-retry':{disabled:false},'recovery-modal':{hidden:false},canvas:{focus(){this.focused=true}}};
 let writes=0,dialogs=0,renders=0,reads=0;
 const ctx={state,db:oldConnection,load:async()=>{reads++;return loader(ctx)},$:name=>controls[name],
  render:()=>renders++,onBoard:()=>[],fit:()=>{},showRecovery:()=>dialogs++,
  saveStatus:()=>{},toast:()=>{},L:(fa,en)=>en,cancelAnimationFrame:()=>{},console:{error:()=>{}},
  queueSave:()=>writes++,persist:()=>writes++};
 const retry=vm.runInNewContext('('+line+')',ctx);
 return {ctx,state,controls,retry,counts:()=>({reads,dialogs,renders,writes})};
}
test('exact Pages JavaScript parses and its inline CSP digest matches',()=>{
 new vm.Script(script);
 assert.equal(html.match(/script-src 'sha256-([^']+)'/)[1],createHash('sha256').update(script).digest('base64'));
});
test('Retry closes stale database before opening another and restores a valid document',async()=>{
 let closes=0;
 const f=fixture({close(){closes++}},async ctx=>{assert.equal(closes,1);assert.equal(ctx.db,null);return good});
 assert.equal(await f.retry(),true);
 assert.equal(closes,1);assert.equal(f.state.doc,good);assert.equal(f.state.storageRecovery,null);
 assert.equal(f.controls['recovery-modal'].hidden,true);assert.equal(f.counts().writes,0);
 assert.equal(f.controls.canvas.focused,true);
});
test('failed read after stale handle closure keeps recovery locked and does not write',async()=>{
 let closes=0;
 const f=fixture({close(){closes++}},async()=>{throw Error('readonly transaction failed')});
 assert.equal(await f.retry(),false);assert.equal(closes,1);
 assert.ok(f.state.storageRecovery);assert.equal(f.state.storageRecovery.backupTaken,false);
 assert.equal(f.state.doc.previous,true);assert.equal(f.counts().dialogs,1);
 assert.equal(f.counts().writes,0);assert.equal(f.state.restorePending,false);
 assert.equal(f.controls['recovery-retry'].disabled,false);
});
test('a stale close exception cannot unlock recovery or prevent the actual read',async()=>{
 let reads=0;
 const f=fixture({close(){throw Error('close failed')}},async()=>{reads++;throw Error('still unavailable')});
 assert.equal(await f.retry(),false);assert.equal(reads,1);assert.equal(f.ctx.db,null);
 assert.ok(f.state.storageRecovery);assert.equal(f.state.doc.previous,true);
 assert.equal(f.counts().writes,0);
});
test('Retry remains available without a previous connection',async()=>{
 const f=fixture(null);assert.equal(await f.retry(),true);
 assert.equal(f.counts().reads,1);assert.equal(f.state.doc,good);
 assert.equal(f.counts().writes,0);
});
test('repeated retries close the old connection and a newly failed read connection',async()=>{
 let closes=0,reads=0;
 const f=fixture({close(){closes++}},async ctx=>{
  reads++;
  if(reads===1){ctx.db={close(){closes++}};throw Error('still inaccessible')}
  assert.equal(closes,2);assert.equal(ctx.db,null);return good;
 });
 assert.equal(await f.retry(),false);assert.equal(closes,1);
 assert.equal(await f.retry(),true);assert.equal(closes,2);
 assert.equal(f.state.doc,good);assert.equal(f.counts().writes,0);
});

test('transient Retry failure retains the last captured raw record for safe export',async()=>{
 const f=fixture(null,async()=>{throw Error('open blocked by another tab')});
 const raw=f.state.storageRecovery.raw;
 assert.equal(await f.retry(),false);
 assert.equal(f.state.storageRecovery.raw,raw);
 assert.equal(f.state.storageRecovery.rawAvailable,true);
 assert.equal(f.state.storageRecovery.staleRaw,true);
 assert.equal(f.state.storageRecovery.backupTaken,false);
 assert.match(f.state.storageRecovery.reason,/blocked/);
 assert.equal(f.state.doc.previous,true);
 assert.equal(f.state.history[0],'undo');
 assert.equal(f.counts().writes,0);
});
test('Retry failure with a newer corrupt raw snapshot prefers that latest record',async()=>{
 const updated={newlyCorrupt:true};
 const f=fixture(null,async()=>{const e=Error('new validation failed');e.name='CorruptWorkspaceError';e.raw=updated;throw e});
 assert.equal(await f.retry(),false);
 assert.equal(f.state.storageRecovery.raw,updated);
 assert.equal(f.state.storageRecovery.rawAvailable,true);
 assert.equal(f.state.storageRecovery.staleRaw,false);
 assert.equal(f.state.storageRecovery.backupTaken,false);
 assert.equal(f.counts().writes,0);
});
test('Retry validation failure without a new raw value preserves the prior captured backup',async()=>{
 const f=fixture(null,async()=>{const e=Error('invalid');e.name='CorruptWorkspaceError';throw e});
 const prior=f.state.storageRecovery.raw;
 assert.equal(await f.retry(),false);
 assert.equal(f.state.storageRecovery.raw,prior);
 assert.equal(f.state.storageRecovery.rawAvailable,true);
 assert.equal(f.state.storageRecovery.backupTaken,false);
});
test('Retry error cannot invent an available raw record if the earlier read had none',async()=>{
 const f=fixture(null,async()=>{throw Error('read failed')});
 f.state.storageRecovery={raw:undefined,rawAvailable:false,backupTaken:false,reason:'old'};
 assert.equal(await f.retry(),false);
 assert.equal(f.state.storageRecovery.raw,undefined);
 assert.equal(f.state.storageRecovery.rawAvailable,false);
 assert.equal(f.state.storageRecovery.backupTaken,false);
 assert.equal(f.state.doc.previous,true);
 assert.equal(f.counts().writes,0);
});
