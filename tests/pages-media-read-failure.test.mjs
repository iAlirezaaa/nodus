import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'exact checked-in Pages script');
const handlerLine=script.split('\n').find(line=>line.includes("$('media-file').onchange=async e=>"));
assert.ok(handlerLine,'real media input handler');
const handler=handlerLine.slice(handlerLine.indexOf("$('media-file').onchange=async e=>"));

function harness(options={}){
 const input={files:[],value:''};
 const state={selected:'A',boardId:'home',doc:{nodes:[{id:'A'}]},restorePending:false,storageRecovery:null,localConflict:false};
 const notices=[],readers=[];let mutations=0;
 class Reader{
   readAsDataURL(){readers.push(this);if(options.throwOnRead)throw Error('Reader unavailable');}
 }
 new Function('$','state','toast','L','mutate','byId','FileReader',handler)(
  ()=>input,state,message=>notices.push(message),(_fa,en)=>en,
  edit=>{mutations++;edit(state.doc)},(doc,id)=>doc.nodes.find(node=>node.id===id),Reader);
 function choose(name='file.png'){
  input.files=[{name,size:20}];input.value=name;
  const promise=input.onchange({target:input});
  return {promise,reader:readers.at(-1)};
 }
 async function complete(p,kind){
  if(kind==='success'){p.reader.result='data:image/png;base64,WA==';p.reader.onload();}
  else if(kind==='error')p.reader.onerror();
  else if(kind==='abort'){assert.equal(typeof p.reader.onabort,'function');p.reader.onabort();}
  await p.promise;
 }
 return {choose,complete,state,notices,get mutations(){return mutations}};
}

test('ND-024 FileReader error is explained and never writes',async()=>{
 const h=harness(),pending=h.choose();await h.complete(pending,'error');
 assert.equal(h.mutations,0);assert.equal(h.state.doc.nodes[0].media,undefined);
 assert.equal(h.notices.filter(s=>s.includes('Could not read media')).length,1);
});
test('ND-024 FileReader abort settles and never writes',async()=>{
 const h=harness(),pending=h.choose();await h.complete(pending,'abort');
 assert.equal(h.mutations,0);assert.equal(h.notices.filter(s=>s.includes('Could not read media')).length,1);
});
test('ND-024 synchronous FileReader exception does not reject onchange',async()=>{
 const h=harness({throwOnRead:true}),pending=h.choose();
 await assert.doesNotReject(pending.promise);assert.equal(h.mutations,0);
 assert.equal(h.notices.filter(s=>s.includes('Could not read media')).length,1);
});
test('ND-024 canceled stale FileReader never overrides a later selection',async()=>{
 const h=harness(),old=h.choose('old.png'),latest=h.choose('new.png');
 await h.complete(old,'abort');await h.complete(latest,'success');
 assert.equal(h.mutations,1);assert.equal(h.state.doc.nodes[0].mediaName,'new.png');
 assert.equal(h.notices.length,0);
});
test('ND-024 ordinary successful FileReader still attaches once',async()=>{
 const h=harness(),pending=h.choose();await h.complete(pending,'success');
 assert.equal(h.mutations,1);assert.equal(h.state.doc.nodes[0].mediaName,'file.png');
});
test('ND-024 exact inline script parses and CSP matches',()=>{
 new Function(script);
 assert.equal(html.match(/script-src 'sha256-([^']+)'/)?.[1],createHash('sha256').update(script).digest('base64'));
});
