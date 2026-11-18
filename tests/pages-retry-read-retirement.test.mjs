import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Use the exact checked-in Pages inline source');
const lines=script.split('\n');
const retryLine=lines.find(line=>line.startsWith('async function retryRecovery()'));
const conflictLine=lines.find(line=>line.startsWith('function localImportConflict('));
assert.ok(retryLine&&conflictLine,'Extract production retry/conflict handlers');

const good={version:1,homeBoardId:'new',boards:[{id:'new',title:'New'}],nodes:[],edges:[]};
function fixture(loader){
 const original={version:1,homeBoardId:'old',boards:[],nodes:[],edges:[]};
 const raw={invalidRecord:true};
 const state={storageRecovery:{raw,rawAvailable:true,backupTaken:true,staleRaw:false,reason:'validation failed'},
  restorePending:false,localConflict:false,doc:original,boardId:'old',selected:'old',
  selectedIds:new Set(['old']),groupMode:true,linkFrom:'old',gesture:null,
  magnetFrame:null,magnetRunning:false,magnetPositions:null,magnetPins:new Set(),
  viewByBoard:new Map(),history:['undo'],future:['redo'],unsavedChanges:true};
 const nodes={'recovery-retry':{disabled:false},'recovery-modal':{hidden:false},canvas:{focus(){}}};
 const statuses=[],toasts=[];
 let renders=0,recoveryDialogs=0,closes=0;
 const ctx={state,db:{close(){closes++}},load:()=>loader(ctx),$:key=>nodes[key],
  render:()=>{renders++},onBoard:()=>[],fit:()=>{},showRecovery:()=>{recoveryDialogs++},
  saveStatus:message=>statuses.push(message),toast:message=>toasts.push(message),
  L:(fa,en)=>en,cancelAnimationFrame:()=>{},console:{error(){}}
 };
 const retry=vm.runInNewContext(conflictLine+'\n'+retryLine+'\nretryRecovery',ctx);
 return {retry,state,original,raw,ctx,nodes,statuses,toasts,
  counts:()=>({renders,recoveryDialogs,closes})};
}
test('retry must not acknowledge a storage connection retired after load resolves',async()=>{
 const f=fixture(async ctx=>{ctx.state.localConflict=true;ctx.db=null;return good});
 assert.equal(await f.retry(),false,'a retired read must never report recovery success');
 assert.equal(f.state.doc,f.original,'retired read cannot replace current document');
 assert.deepEqual(f.state.history,['undo']);assert.deepEqual(f.state.future,['redo']);
 assert.equal(f.state.unsavedChanges,true);
 assert.equal(f.state.storageRecovery.raw,f.raw,'prior raw backup remains exportable');
 assert.equal(f.state.storageRecovery.rawAvailable,true);
 assert.equal(f.state.storageRecovery.staleRaw,true,'do not allow destructive import from stale raw');
 assert.equal(f.state.storageRecovery.backupTaken,false);
 assert.equal(f.nodes['recovery-modal'].hidden,false);
 assert.equal(f.state.restorePending,false);assert.equal(f.nodes['recovery-retry'].disabled,false);
 assert.deepEqual(f.counts(),{renders:0,recoveryDialogs:1,closes:1});
 assert.ok(!f.statuses.includes('Local storage ready'),'no false ready acknowledgement');
});
test('retry after an intervening versionchange can succeed on a fresh healthy read',async()=>{
 let reads=0;
 const f=fixture(async ctx=>{
  if(++reads===1){ctx.state.localConflict=true;ctx.db=null}
  else{ctx.state.localConflict=false;ctx.db={close(){}}}
  return good;
 });
 assert.equal(await f.retry(),false);
 assert.equal(f.state.doc,f.original);
 assert.equal(await f.retry(),true);
 assert.equal(reads,2);assert.equal(f.state.doc,good);
 assert.equal(f.state.storageRecovery,null);
 assert.equal(f.state.history.length,0);assert.equal(f.state.future.length,0);
 assert.equal(f.nodes['recovery-modal'].hidden,true);
 assert.equal(f.state.unsavedChanges,false);
 assert.equal(f.counts().renders,1);
});
test('healthy retry still reports ready, restores selection and does not write',async()=>{
 const f=fixture(async ctx=>{ctx.db={close(){}};return good});
 assert.equal(await f.retry(),true);
 assert.equal(f.state.doc,good);assert.equal(f.state.boardId,'new');
 assert.equal(f.state.storageRecovery,null);
 assert.equal(f.state.selected,null);assert.equal(f.state.selectedIds.size,0);
 assert.equal(f.state.restorePending,false);assert.equal(f.state.unsavedChanges,false);
 assert.equal(f.counts().renders,1);
 assert.ok(f.statuses.includes('Local storage ready'));
});
test('retry guard remains in the valid production inline script with matching CSP',()=>{
 assert.doesNotThrow(()=>new vm.Script(script));
 assert.equal(html.match(/script-src 'sha256-([^']+)'/)[1],createHash('sha256').update(script).digest('base64'));
});
