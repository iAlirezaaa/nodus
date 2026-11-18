import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'actual inline Pages source');
const source=script.split('\n').find(x=>x.includes("$('media-file').onchange=async e=>"));
assert.ok(source,'actual media input handler');
const handler=source.slice(source.indexOf("$('media-file').onchange=async e=>"));
function setup(){
 const input={files:[],value:''},state={selected:'A',boardId:'home',doc:{nodes:[{id:'A'}]},restorePending:false,storageRecovery:null,localConflict:false};
 let writes=0;const readers=[],notices=[];
 class Reader{readAsDataURL(){readers.push(this)}}
 new Function('$','state','toast','L','mutate','byId','FileReader',handler)(
 ()=>input,state,t=>notices.push(t),(_fa,en)=>en,fn=>{writes++;fn(state.doc)},(doc,id)=>doc.nodes.find(n=>n.id===id),Reader);
 function choose(name='old.png'){input.files=[{size:20,name}];input.value=name;const done=input.onchange({target:input});return {done,reader:readers.at(-1)}}
 async function finish(p){p.reader.result='data:image/png;base64,WA==';p.reader.onload();await p.done}
 return {state,input,notices,choose,finish,get writes(){return writes}}
}
test('ND-024 normal stable media read still attaches to selected thought',async()=>{const f=setup(),p=f.choose();await f.finish(p);assert.equal(f.writes,1);assert.equal(f.state.doc.nodes[0].mediaName,'old.png')});
test('ND-024 restored document with identical node IDs cannot inherit old media read',async()=>{const f=setup(),p=f.choose();f.state.doc={nodes:[{id:'A',title:'restored'}]};await f.finish(p);assert.equal(f.writes,0);assert.equal(f.state.doc.nodes[0].media,undefined);assert.match(f.notices.join(' '),/Workspace changed while reading media/)});
test('ND-024 edit to another thought also invalidates pending media read',async()=>{const f=setup(),p=f.choose();f.state.doc={nodes:[{id:'A',title:'edited'}]};await f.finish(p);assert.equal(f.writes,0)});
for(const [label,key,value] of [['restore pending','restorePending',true],['storage recovery','storageRecovery',{backupTaken:true}],['cross-tab conflict','localConflict',true]])test('ND-024 media canceled during '+label,async()=>{const f=setup(),p=f.choose();f.state[key]=value;await f.finish(p);assert.equal(f.writes,0);assert.match(f.notices.join(' '),/Workspace changed/)});
test('ND-024 last media choice wins if two file reads overlap',async()=>{const f=setup(),a=f.choose('old.png'),b=f.choose('new.png');await f.finish(b);await f.finish(a);assert.equal(f.writes,1);assert.equal(f.state.doc.nodes[0].mediaName,'new.png')});
test('ND-024 patched script syntax and matching CSP digest',()=>{new Function(script);assert.equal(html.match(/script-src 'sha256-([^']+)'/)?.[1],createHash('sha256').update(script).digest('base64'))});
