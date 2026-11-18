import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const source=script.split('\n').find(line=>line.startsWith('async function restoreLocalDocument('));
assert.ok(source,'Must execute the exact Pages restore handler');
const copy=value=>JSON.parse(JSON.stringify(value));
const raw={version:1,homeBoardId:'broken',boards:[{id:'elsewhere',title:'دادهٔ قبلی'}],nodes:[],edges:[]};
const replacement={version:1,homeBoardId:'new',boards:[{id:'new',title:'Recovered'}],nodes:[],edges:[]};

function harness(){
 const oldDoc={version:1,homeBoardId:'ephemeral',boards:[{id:'ephemeral',title:'locked'}],nodes:[],edges:[]};
 const state={doc:copy(oldDoc),boardId:'ephemeral',selected:'old',selectedIds:new Set(['old']),hasLoaded:true,restorePending:false,storageRecovery:{raw:copy(raw),rawAvailable:true,backupTaken:true,reason:'invalid graph'},storedBaseline:undefined,localConflict:false,history:['past'],future:['future'],magnetFrame:null,magnetRunning:false,magnetPositions:null,magnetPins:new Set(),groupMode:true,linkFrom:'old',gesture:null,viewByBoard:new Map(),saveQueue:Promise.resolve(),unsavedChanges:false};
 let attempts=0,writes=[],renders=0,dialogs=0,notices=[],shouldFail=true,remoteRaw=copy(raw);
 const ctx={state,copy,JSON,console:{error:()=>{}},L:(fa,en)=>en,
  persistRecoveryIfUnchanged:async (doc,expected)=>{attempts++;assert.equal(JSON.stringify(expected),JSON.stringify(raw));if(JSON.stringify(remoteRaw)!==JSON.stringify(expected)){const error=Error('Stored workspace changed since backup; retry reading');error.name='LocalRecoveryConflictError';throw error;}if(shouldFail)throw Error('QuotaExceededError');writes.push(copy(doc));},
  persistImportIfUnchanged:()=>{throw Error('Unexpected ordinary import')},
  saveStatus:()=>{},toast:message=>notices.push(message),showRecovery:()=>dialogs++,
  $:id=>id==='recovery-modal'?{hidden:false}:id==='canvas'?{focus:()=>{}}:{},
  cancelAnimationFrame:()=>{},render:()=>renders++};
 const restore=vm.runInNewContext('('+source+')',ctx);
 return {state,restore,oldDoc,stats:()=>({attempts,writes,renders,dialogs,notices}),allowRetry:()=>{shouldFail=false},changeStoredRaw:()=>{remoteRaw={different:true}}};
}

test('inline Pages script parses and its CSP digest remains correct',()=>{
 new vm.Script(script);
 assert.equal(html.match(/script-src 'sha256-([^']+)'/)[1],createHash('sha256').update(script).digest('base64'));
});
test('quota failure preserves already-exported quarantined raw record and consent',async()=>{
 const h=harness();assert.equal(await h.restore(copy(replacement)),false);
 assert.equal(JSON.stringify(h.state.storageRecovery.raw),JSON.stringify(raw));
 assert.equal(h.state.storageRecovery.rawAvailable,true);
 assert.equal(h.state.storageRecovery.backupTaken,true);
 assert.match(h.state.storageRecovery.reason,/QuotaExceededError/);
 assert.equal(h.state.restorePending,false);assert.deepEqual(h.state.history,['past']);
 assert.deepEqual(h.state.future,['future']);assert.equal(h.state.selected,'old');
 assert.equal(JSON.stringify(h.state.doc),JSON.stringify(h.oldDoc));
 assert.equal(h.state.boardId,'ephemeral');assert.equal(h.stats().writes.length,0);
 assert.equal(h.stats().renders,0);assert.equal(h.stats().dialogs,1);
});
test('retry after transient storage failure succeeds without another destructive unlock',async()=>{
 const h=harness();assert.equal(await h.restore(copy(replacement)),false);
 h.allowRetry();assert.equal(await h.restore(copy(replacement)),true);
 assert.equal(h.stats().attempts,2);assert.equal(h.stats().writes.length,1);
 assert.equal(JSON.stringify(h.state.doc),JSON.stringify(replacement));
 assert.equal(h.state.storageRecovery,null);assert.equal(h.state.restorePending,false);
 assert.deepEqual(Array.from(h.state.history),[]);assert.deepEqual(Array.from(h.state.future),[]);
});
test('a changed external record still fails closed, even with old raw backup consent',async()=>{
 const h=harness();h.changeStoredRaw();h.allowRetry();
 assert.equal(await h.restore(copy(replacement)),false);
 assert.equal(h.stats().writes.length,0);
 assert.equal(h.state.storageRecovery.backupTaken,false);
 assert.equal(h.state.storageRecovery.rawAvailable,false);
 assert.equal(JSON.stringify(h.state.doc),JSON.stringify(h.oldDoc));
 assert.deepEqual(h.state.history,['past']);assert.equal(h.state.restorePending,false);
});
test('unknown raw record cannot acquire backup consent after a write failure',async()=>{
 const h=harness();h.state.storageRecovery={raw:undefined,rawAvailable:false,backupTaken:false,reason:'locked'};
 assert.equal(await h.restore(copy(replacement)),false);
 assert.equal(h.state.storageRecovery.rawAvailable,false);
 assert.equal(h.state.storageRecovery.backupTaken,false);
 assert.equal(h.state.storageRecovery.raw,undefined);
 assert.equal(h.stats().writes.length,0);
});
