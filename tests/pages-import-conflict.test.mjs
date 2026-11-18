import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function source(name){const match=script.split('\n').find(line=>line.startsWith('function '+name+'(')||line.startsWith('async function '+name+'('));assert.ok(match,'Missing exact Pages source '+name);return match}
function checkedImport(db){return new Function('db',[source('localImportConflict'),source('serializeRecoverySafely'),source('persistImportIfUnchanged'),'return persistImportIfUnchanged'].join('\n'))(db)}
const original={version:1,homeBoardId:'root',boards:[{id:'root',title:'Original'}],nodes:[],edges:[]};
const imported={...original,boards:[{id:'root',title:'Imported'}]};
function database(value,present=value!==undefined,{failKey=false,failPut=false}={}){
 let tx,mode='readwrite';const writes=[];let aborts=0;
 const request=(result,fail=false,finishesRead=false)=>{
  const req={result,error:fail?Error('Key read denied'):null};
  queueMicrotask(()=>{
   if(fail)req.onerror?.();
   else{
    req.onsuccess?.();
    // Only a readonly load commits after the last read; readwrite import waits for put.
    if(mode==='readonly'&&finishesRead)queueMicrotask(()=>tx.oncomplete?.());
   }
  });return req
 };
 const store={
  get:()=>request(value,false,value!==undefined),getKey:()=>request(present?'main':undefined,failKey,true),
  put:snapshot=>{if(failPut)throw Error('Quota exceeded');writes.push(snapshot);queueMicrotask(()=>tx.oncomplete?.())}
 };
 tx={objectStore:()=>store,abort:()=>{aborts++;queueMicrotask(()=>tx.onabort?.())}};
 return {db:{transaction:(storeName,txMode)=>{mode=txMode;return tx}},writes,get aborts(){return aborts}};
}
test('ND-024 ordinary import commits atomically with unchanged stored record',async()=>{
 const h=database(original);await checkedImport(h.db)(imported,original);
 assert.deepEqual(h.writes,[imported]);
});
test('ND-024 genuine empty workspace can be imported but newly-created store cannot be overwritten',async()=>{
 const empty=database(undefined,false);await checkedImport(empty.db)(imported,null);
 assert.deepEqual(empty.writes,[imported]);
 for(const [record,present] of [[original,true],[undefined,true]]){
  const h=database(record,present);
  await assert.rejects(checkedImport(h.db)(imported,null),{name:'LocalImportConflictError'});
  assert.equal(h.writes.length,0);
 }
});
test('ND-024 import preserves foreign edits and deletion instead of overwriting',async()=>{
 const updated={...original,boards:[{id:'root',title:'Other tab changed this'}]};
 for(const [record,present] of [[updated,true],[undefined,false],[new Map([['newer',true]]),true]]){
  const h=database(record,present);
  await assert.rejects(checkedImport(h.db)(imported,original),{name:'LocalImportConflictError'});
  assert.equal(h.writes.length,0);
 }
});
test('ND-024 key probe, unknown baseline and failed write do not acknowledge import',async()=>{
 const unknown=database(original);await assert.rejects(checkedImport(unknown.db)(imported,undefined),{name:'LocalImportConflictError'});assert.equal(unknown.writes.length,0);
 const denied=database(undefined,false,{failKey:true});await assert.rejects(checkedImport(denied.db)(imported,null));assert.equal(denied.writes.length,0);
 const quota=database(original,true,{failPut:true});await assert.rejects(checkedImport(quota.db)(imported,original));assert.equal(quota.writes.length,0);
});
test('ND-024 detected foreign edit keeps in-memory graph and Undo; pauses future writes',async()=>{
 const state={hasLoaded:true,restorePending:false,storageRecovery:null,localConflict:false,storedBaseline:original,unsavedChanges:false,
  saveQueue:Promise.resolve(true),doc:original,selected:'n1',history:['older'],future:['redo']};
 const events=[],ctx={state,copy:x=>JSON.parse(JSON.stringify(x)),persistImportIfUnchanged:async()=>{const e=Error('Newer tab');e.name='LocalImportConflictError';throw e},
  L:(fa,en)=>en,saveStatus:s=>events.push(s),toast:()=>{},console:{error:()=>{}}};
 const restore=new Function(...Object.keys(ctx),source('restoreLocalDocument')+';return restoreLocalDocument')(...Object.values(ctx));
 assert.equal(await restore(imported),false);
 assert.equal(state.doc,original);assert.deepEqual(state.history,['older']);assert.deepEqual(state.future,['redo']);assert.equal(state.selected,'n1');
 assert.equal(state.localConflict,true);assert.equal(state.unsavedChanges,true);assert.equal(state.restorePending,false);
 let writes=0;const saveCtx={state,copy:ctx.copy,persist:async()=>writes++,saveStatus:()=>{},L:ctx.L,toast:()=>{},console:{error:()=>{}}};
 const queue=new Function(...Object.keys(saveCtx),source('queueSave')+';return queueSave')(...Object.values(saveCtx));
 assert.equal(await queue(),false);assert.equal(writes,0);
 const warn=new Function('state',source('warnOnUnsavedExit')+';return warnOnUnsavedExit')(state);let blocked=false;
 warn({preventDefault(){blocked=true},returnValue:null});assert.equal(blocked,true);
});
test('ND-024 successful read and save acknowledgement maintain import baseline',async()=>{
 const state={storedBaseline:undefined,localConflict:true};
 const fake=database(original);
 const load=new Function('state','getDB','blank','validate','db',source('load')+';return load')(state,async()=>fake.db,()=>({blank:true}),x=>x,null);
 assert.deepEqual(await load(),original);assert.equal(state.storedBaseline,original);assert.equal(state.localConflict,false);
 const emptyState={storedBaseline:undefined,localConflict:false};
 const noRecord=database(undefined,false);
 const loadEmpty=new Function('state','getDB','blank','validate','db',source('load')+';return load')(emptyState,async()=>noRecord.db,()=>({blank:true}),x=>x,null);
 assert.deepEqual(await loadEmpty(),{blank:true});assert.equal(emptyState.storedBaseline,null);
 const st={doc:imported,storageRecovery:null,localConflict:false,unsavedChanges:true,saveQueue:Promise.resolve()};
 const queue=new Function('state','copy','saveStatus','L','persist','toast','console',source('queueSave')+';return queueSave')(
  st,x=>JSON.parse(JSON.stringify(x)),()=>{},(fa,en)=>en,async()=>{},()=>{},console);
 assert.equal(await queue(),true);assert.deepEqual(st.storedBaseline,imported);assert.equal(st.unsavedChanges,false);
});
