import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Exact Pages inline source required');
const lines=script.split('\n');
const queue=lines.find(line=>line.startsWith('function queueSave()'));
const conflict=lines.find(line=>line.startsWith('function localImportConflict('));
assert.ok(queue&&conflict,'Production save handlers must exist');

function scenario(){
 let release,started=0;
 const state={doc:{name:'my draft'},storedBaseline:{name:'prior stored'},saveQueue:Promise.resolve(true),
  localConflict:false,storageRecovery:null,unsavedChanges:true,history:['undo-snapshot'],future:['redo-snapshot']};
 const status=[],notices=[];
 const fn=new Function('state','persist','copy','saveStatus','L','toast','console',conflict+'\n'+queue+'\nreturn queueSave');
 const save=fn(state,()=>{
   started++;
   return new Promise(resolve=>{release=resolve});
  },structuredClone,value=>status.push(value),(fa,en)=>en,text=>notices.push(text),{error:()=>{}});
 return {save,state,status,notices,get started(){return started},finish(){assert.equal(typeof release,'function');release()}};
}
async function waitForPersist(app){
 for(let attempt=0;attempt<20&&!app.started;attempt++)await Promise.resolve();
 assert.equal(app.started,1,'queued save must enter persistence');
}
test('ND-024 delayed IndexedDB versionchange must never falsely acknowledge an old save',async()=>{
 const app=scenario(),pending=app.save();await waitForPersist(app);
 // onversionchange closes storage and quarantines the document before the pending save callback
 app.state.localConflict=true;app.state.unsavedChanges=true;
 app.finish();
 assert.equal(await pending,false);
 assert.deepEqual(app.state.storedBaseline,{name:'prior stored'});
 assert.equal(app.state.unsavedChanges,true);
 assert.equal(app.state.localConflict,true);
 assert.deepEqual(app.state.history,['undo-snapshot']);
 assert.deepEqual(app.state.future,['redo-snapshot']);
 assert.match(app.status.at(-1),/conflict/i);
 assert.match(app.notices.at(-1),/export json and reload/i);
});
test('ND-024 ordinary acknowledged save still updates baseline and clears dirty state',async()=>{
 const app=scenario(),pending=app.save();await waitForPersist(app);app.finish();
 assert.equal(await pending,true);
 assert.deepEqual(app.state.storedBaseline,{name:'my draft'});
 assert.equal(app.state.unsavedChanges,false);
 assert.match(app.status.at(-1),/saved/i);
});
test('ND-024 pending second queued save cannot run after a retired connection',async()=>{
 const app=scenario(),first=app.save(),second=app.save();
 await waitForPersist(app);app.state.localConflict=true;app.state.unsavedChanges=true;app.finish();
 assert.deepEqual(await Promise.all([first,second]),[false,false]);
 assert.equal(app.started,1,'no second database write after conflict');
 assert.deepEqual(app.state.storedBaseline,{name:'prior stored'});
 assert.equal(app.state.unsavedChanges,true);
});
test('ND-024 bundled inline script stays parseable and its CSP is exact',()=>{
 assert.equal(html.match(/script-src 'sha256-([^']+)'/)?.[1],createHash('sha256').update(script).digest('base64'));
 new Function(script);
});
