import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\\s\\S]*?)<\\/script>/)[1];
const loadLine=script.split('\\n').find(line=>line.startsWith('async function load()'));
assert.ok(loadLine,'Test the exact inline IndexedDB load handler');

function fixture(){
 const doc={version:1,homeBoardId:'root',boards:[{id:'root',title:'ایده'}],nodes:[],edges:[]};
 const blankDoc={version:1,homeBoardId:'new',boards:[{id:'new',title:'Blank'}],nodes:[],edges:[]};
 const state={storedBaseline:{version:1,marker:'previous'},localConflict:true};
 const req={result:undefined},keyReq={result:undefined};
 const store={get(key){assert.equal(key,'main');return req},getKey(key){assert.equal(key,'main');return keyReq}};
 const tx={error:null,objectStore(name){assert.equal(name,'workspace');return store},abort(){this.onabort?.()}};
 const db={transaction(name,mode){assert.equal(name,'workspace');assert.equal(mode,'readonly');return tx}};
 const ctx={db:null,state,getDB:()=>Promise.resolve(db),validate(value){if(!value||value.version!==1)throw Error('invalid stored workspace');return value},blank:()=>blankDoc,Error};
 const load=vm.runInNewContext('('+loadLine+')',ctx);
 const start=async()=>{const pending=load();await Promise.resolve();await Promise.resolve();assert.equal(typeof req.onsuccess,'function');return {pending}};
 return {doc,blankDoc,state,req,keyReq,tx,load,start};
}

test('exact source script is parseable and CSP matches its digest',()=>{
 new vm.Script(script);
 assert.equal(html.match(/script-src 'sha256-([^']+)'/)[1],createHash('sha256').update(script).digest('base64'));
});
test('a valid get response cannot be accepted before transaction completion',async()=>{
 const f=fixture(),pending=f.load();
 await Promise.resolve();await Promise.resolve();
 let status='pending';pending.then(()=>status='resolved',()=>status='rejected');
 f.req.result=f.doc;f.req.onsuccess();await Promise.resolve();
 assert.equal(status,'pending');assert.equal(f.state.storedBaseline.marker,'previous');
 f.tx.oncomplete();assert.deepEqual(await pending,f.doc);
 assert.equal(f.state.storedBaseline,f.doc);assert.equal(f.state.localConflict,false);
});
for(const failed of ['abort','error']){
 test('late readonly '+failed+' after successful get rejects without trusting baseline',async()=>{
  const f=fixture(),pending=f.load();await Promise.resolve();await Promise.resolve();
  f.req.result=f.doc;f.req.onsuccess();
  f.tx.error=Error('transaction '+failed);
  f.tx['on'+failed]();
  await assert.rejects(pending,e=>e.name==='CorruptWorkspaceError'&&/transaction/.test(e.message)&&e.raw===f.doc);
  f.tx.oncomplete();assert.equal(f.state.storedBaseline.marker,'previous');assert.equal(f.state.localConflict,true);
 });
}
test('getKey-confirmed missing key becomes a blank document only after tx commit',async()=>{
 const f=fixture(),pending=f.load();await Promise.resolve();await Promise.resolve();
 f.req.result=undefined;f.req.onsuccess();f.keyReq.result=undefined;f.keyReq.onsuccess();
 let settled=false;pending.then(()=>settled=true,()=>settled=true);await Promise.resolve();
 assert.equal(settled,false);
 f.tx.oncomplete();assert.deepEqual(await pending,f.blankDoc);assert.equal(f.state.storedBaseline,null);
});
test('existing undefined-valued key is never mistaken for missing workspace',async()=>{
 const f=fixture(),pending=f.load();await Promise.resolve();await Promise.resolve();
 f.req.result=undefined;f.req.onsuccess();f.keyReq.result='main';f.keyReq.onsuccess();f.tx.oncomplete();
 await assert.rejects(pending,e=>e.name==='CorruptWorkspaceError'&&/validation/.test(e.message));
 assert.equal(f.state.storedBaseline.marker,'previous');
});
test('getKey success followed by abort cannot admit a new empty workspace',async()=>{
 const f=fixture(),pending=f.load();await Promise.resolve();await Promise.resolve();
 f.req.result=undefined;f.req.onsuccess();f.keyReq.result=undefined;f.keyReq.onsuccess();f.tx.onabort();
 await assert.rejects(pending,e=>e.name==='CorruptWorkspaceError'&&/aborted/.test(e.message));
 assert.equal(f.state.storedBaseline.marker,'previous');assert.equal(f.state.localConflict,true);
});
test('request error and premature complete are fail-closed',async()=>{
 const one=fixture(),p1=one.load();await Promise.resolve();await Promise.resolve();
 one.req.error=Error('disk read failed');one.req.onerror();
 await assert.rejects(p1,e=>e.name==='CorruptWorkspaceError'&&/Cannot read/.test(e.message));
 assert.equal(one.state.storedBaseline.marker,'previous');
 const two=fixture(),p2=two.load();await Promise.resolve();await Promise.resolve();
 two.tx.oncomplete();
 await assert.rejects(p2,e=>e.name==='CorruptWorkspaceError'&&/before requests finished/.test(e.message));
 assert.equal(two.state.storedBaseline.marker,'previous');
});
