import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Exact Pages inline source required');
const lines=script.split('\n');
const handler=lines.find(line=>line.startsWith('async function restoreLocalDocument('));
const conflict=lines.find(line=>line.startsWith('function localImportConflict('));
assert.ok(handler&&conflict,'Exact production import handlers must exist');
const factory=new Function('state','persistRecoveryIfUnchanged','persistImportIfUnchanged','copy',
 'cancelAnimationFrame','$','saveStatus','toast','L','render','showRecovery','console',
 conflict+'\n'+handler+'\nreturn restoreLocalDocument');

function fixture({recovery=false,queued=false}={}){
 let finishWrite,finishQueue,writeCount=0,renderCount=0,recoveryCount=0;
 const original={version:1,homeBoardId:'old',boards:[],nodes:[],edges:[]};
 const stored={version:1,homeBoardId:'stored',boards:[],nodes:[],edges:[]};
 const statuses=[],notices=[],elements={'recovery-modal':{hidden:false},canvas:{focus(){}}};
 const state={
  hasLoaded:true,restorePending:false,localConflict:false,
  storageRecovery:recovery?{raw:{corrupt:'old'},rawAvailable:true,staleRaw:false,backupTaken:true,reason:'Invalid'}:null,
  saveQueue:queued?new Promise(resolve=>{finishQueue=resolve}):Promise.resolve(true),
  doc:original,boardId:'old',storedBaseline:stored,unsavedChanges:true,
  history:['original undo'],future:['original redo'],magnetFrame:null,magnetRunning:false,
  magnetPositions:null,magnetPins:new Set(),selectedIds:new Set(['existing']),groupMode:false,
  linkFrom:null,gesture:null,viewByBoard:new Map()
 };
 const persist=()=>{writeCount++;return new Promise(resolve=>{finishWrite=resolve})};
 const restore=factory(state,persist,persist,value=>structuredClone(value),
 ()=>{},key=>elements[key]||(elements[key]={}),value=>statuses.push(value),value=>notices.push(value),
 (fa,en)=>en,()=>{renderCount++},()=>{recoveryCount++},{error(){}});
 const imported={version:1,homeBoardId:'imported',boards:[],nodes:[],edges:[]};
 return {state,original,stored,imported,statuses,notices,restore,
  get writes(){return writeCount},get renders(){return renderCount},
  get recoveryShows(){return recoveryCount},
  finishWrite(){assert.equal(typeof finishWrite,'function');finishWrite()},
  finishQueue(){assert.equal(typeof finishQueue,'function');finishQueue(true)}
 };
}
async function enterWrite(app){
 for(let i=0;i<30&&!app.writes;i++)await Promise.resolve();
 assert.equal(app.writes,1,'import reached IndexedDB persistence');
}
function unchanged(app){
 assert.equal(app.state.doc,app.original,'do not replace working document');
 assert.equal(app.state.storedBaseline,app.stored,'do not change prior baseline');
 assert.deepEqual(app.state.history,['original undo'],'keep Undo');
 assert.deepEqual(app.state.future,['original redo'],'keep Redo');
 assert.equal(app.state.unsavedChanges,true,'retain dirty draft');
 assert.equal(app.renders,0,'do not render unacknowledged backup');
 assert.notEqual(app.statuses.at(-1),'Saved · local');
}
test('ND-024 import cannot acknowledge retired storage after IndexedDB settles',async()=>{
 const app=fixture(),pending=app.restore(app.imported);await enterWrite(app);
 app.state.localConflict=true;app.state.unsavedChanges=true;app.finishWrite();
 assert.equal(await pending,false);unchanged(app);
 assert.equal(app.state.localConflict,true);assert.equal(app.state.restorePending,false);
});
test('ND-024 queued save retirement prevents backup import from starting',async()=>{
 const app=fixture({queued:true}),pending=app.restore(app.imported);
 await Promise.resolve();app.state.localConflict=true;app.finishQueue();
 assert.equal(await pending,false);assert.equal(app.writes,0);
 unchanged(app);assert.equal(app.state.restorePending,false);
});
test('ND-024 recovery import remains quarantined after retirement',async()=>{
 const app=fixture({recovery:true}),raw=app.state.storageRecovery.raw,pending=app.restore(app.imported);
 await enterWrite(app);app.state.localConflict=true;app.finishWrite();
 assert.equal(await pending,false);unchanged(app);
 assert.equal(app.state.storageRecovery.raw,raw);
 assert.equal(app.recoveryShows,1,'keep recovery UI available');
});
test('ND-024 ordinary healthy import still succeeds with one Undo record',async()=>{
 const app=fixture(),pending=app.restore(app.imported);await enterWrite(app);app.finishWrite();
 assert.equal(await pending,true);assert.equal(app.writes,1);assert.equal(app.renders,1);
 assert.equal(app.state.doc,app.imported);
 assert.deepEqual(app.state.storedBaseline,app.imported);
 assert.equal(app.state.history.length,2);assert.deepEqual(app.state.future,[]);
 assert.equal(app.state.unsavedChanges,false);assert.equal(app.statuses.at(-1),'Saved · local');
});
test('ND-024 healthy recovery import clears stale history without changing schema',async()=>{
 const app=fixture({recovery:true}),pending=app.restore(app.imported);
 await enterWrite(app);app.finishWrite();
 assert.equal(await pending,true);assert.equal(app.state.storageRecovery,null);
 assert.deepEqual(app.state.history,[]);assert.deepEqual(app.state.future,[]);
 assert.equal(app.state.doc,app.imported);assert.equal(app.state.unsavedChanges,false);
});
test('ND-024 production inline script parses and matching CSP hash is present',()=>{
 assert.doesNotThrow(()=>new Function(script));
 const digest=createHash('sha256').update(script).digest('base64');
 assert.ok(html.includes("script-src 'sha256-"+digest+"'"));
});
