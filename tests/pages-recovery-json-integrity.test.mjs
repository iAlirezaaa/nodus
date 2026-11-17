import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\\s\\S]*?)<\\/script>/)[1];
function source(name){const line=script.split('\\n').find(s=>s.startsWith('function '+name+'('));assert.ok(line,'missing exact '+name);return line}
function run(raw){
 const rec={raw,rawAvailable:true,backupTaken:false};
 const controls={'recovery-import':{disabled:true},'recovery-reset':{disabled:true}};
 let clicked=0,payload;
 const context={JSON,Date,Number,Object,Reflect,WeakSet,Error,Array,RegExp,state:{storageRecovery:rec},
  Blob:class{constructor(parts){payload=parts.join('')}},
  URL:{createObjectURL:()=>'/blob',revokeObjectURL:()=>{}},
  document:{createElement:()=>({click:()=>clicked++,remove:()=>{}}),body:{append:()=>{}}},
  setTimeout:()=>{},toast:()=>{},console:{error:()=>{}},L:(fa,en)=>en,$:name=>controls[name]};
 context.serializeRecoverySafely=vm.runInNewContext('('+source('serializeRecoverySafely')+')',context);
 const exportRaw=vm.runInNewContext('('+source('downloadRecovery')+')',context);
 const ok=exportRaw();
 return {ok,clicked,payload,rec,controls};
}
test('raw recovery script syntax and CSP hash match exact source',()=>{
 new vm.Script(script);
 assert.equal(html.match(/script-src 'sha256-([^']+)'/)[1],createHash('sha256').update(script).digest('base64'));
});
test('plain JSON incl Persian text exports and unlocks after download click',()=>{
 for(const raw of [null,1,{path:'پروژه / خانه',nodes:[{id:'a',title:'یادداشت'}]}]){
  const a=run(raw);assert.equal(a.ok,true);assert.equal(a.clicked,1);
  assert.deepEqual(JSON.parse(a.payload),raw);assert.equal(a.rec.backupTaken,true);
  assert.equal(a.controls['recovery-import'].disabled,false);assert.equal(a.controls['recovery-reset'].disabled,false);
 }
});
test('lossy structured-clone types cannot unlock replacement with bogus JSON',()=>{
 for(const raw of [{meta:new Map([['kept','not-json']])},{s:new Set([1,2])},{at:new Date('2026-11-17')},{bytes:new Uint8Array([1,2])},{bad:undefined},{x:NaN},{x:Infinity},{x:-0},[1,,3],Object.assign([1],{extra:'lost'})]){
  const a=run(raw);assert.equal(a.ok,false);assert.equal(a.clicked,0);
  assert.equal(a.rec.backupTaken,false);assert.equal(a.controls['recovery-import'].disabled,true);assert.equal(a.controls['recovery-reset'].disabled,true);
 }
});
test('cyclic and aliasing objects refuse incomplete recovery backups',()=>{
 const cyc={};cyc.self=cyc;const shared={value:1};
 for(const raw of [cyc,{first:shared,second:shared}]){const a=run(raw);assert.equal(a.ok,false);assert.equal(a.clicked,0);assert.equal(a.rec.backupTaken,false)}
});
