import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function source(name){const line=script.split('\n').find(s=>s.startsWith('function '+name+'('));assert.ok(line,'missing exact '+name);return line}
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


function guardedRawExportFixture({fail=null,lang='en',cleanupThrows=false}={}){
 const raw={version:1,title:'حفظ اطلاعات',nodes:[]};
 const state={storageRecovery:{raw,rawAvailable:true,backupTaken:false},doc:{unchanged:true},history:['undo'],unsavedChanges:true};
 const controls={'recovery-import':{disabled:true},'recovery-reset':{disabled:true}};
 const stats={created:0,clicked:0,removed:0,revoked:[],scheduled:[],toasts:[],attached:0};
 const anchor={href:'',download:'',click(){stats.clicked++;if(fail==='click')throw Error('synthetic click blocked')},
  remove(){stats.removed++;stats.attached=0}};
 const context={JSON,Date,Number,Object,Reflect,WeakSet,Error,Array,RegExp,state,
  Blob:class{constructor(parts){if(fail==='blob')throw Error('Blob blocked');this.parts=parts}},
  URL:{createObjectURL(){stats.created++;if(fail==='url')throw Error('Object URL blocked');return 'blob:raw-fixture'},
   revokeObjectURL(url){stats.revoked.push(url);if(cleanupThrows)throw Error('Revoke denied')}},
  document:{createElement(){if(fail==='element')throw Error('Element denied');return anchor},
   body:{append(){if(fail==='append')throw Error('DOM append denied');stats.attached++}}},
  setTimeout(callback){if(fail==='timer')throw Error('Timer denied');stats.scheduled.push(callback)},
  toast(message){stats.toasts.push(message)},console:{error(){}},
  L:(fa,en)=>lang==='fa'?fa:en,$:name=>controls[name]};
 context.serializeRecoverySafely=vm.runInNewContext('('+source('serializeRecoverySafely')+')',context);
 const exportRaw=vm.runInNewContext('('+source('downloadRecovery')+')',context);
 const ok=exportRaw();
 return {ok,state,controls,stats,anchor};
}
for(const lang of ['fa','en']){
 test('raw recovery '+lang+' success claims preparation, schedules cleanup, and preserves data',()=>{
  const h=guardedRawExportFixture({lang});
  assert.equal(h.ok,true);assert.equal(h.stats.created,1);assert.equal(h.stats.clicked,1);
  assert.equal(h.stats.attached,0);assert.equal(h.stats.removed,1);
  assert.match(h.anchor.download,/^nodus-recovery-raw-\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(h.state.storageRecovery.backupTaken,true);
  assert.equal(h.controls['recovery-import'].disabled,false);
  assert.equal(h.controls['recovery-reset'].disabled,false);
  assert.match(h.stats.toasts.at(-1),lang==='fa'?/آماده/:/prepared/i);
  assert.doesNotMatch(h.stats.toasts.at(-1),/downloaded/i);
  assert.equal(h.stats.scheduled.length,1);
  h.stats.scheduled[0]();
  assert.deepEqual(h.stats.revoked,['blob:raw-fixture']);
  assert.deepEqual(h.state.doc,{unchanged:true});assert.deepEqual(h.state.history,['undo']);
  assert.equal(h.state.unsavedChanges,true);
 });
 for(const fail of ['blob','url','element','append','click','timer']){
  test('raw recovery '+lang+' '+fail+' failure cleans resources and keeps restore locked',()=>{
   const h=guardedRawExportFixture({lang,fail});
   assert.equal(h.ok,false);assert.equal(h.stats.attached,0);
   assert.equal(h.state.storageRecovery.backupTaken,false);
   assert.equal(h.controls['recovery-import'].disabled,true);
   assert.equal(h.controls['recovery-reset'].disabled,true);
   assert.equal(h.stats.scheduled.length,0);
   const allocated=['element','append','click','timer'].includes(fail);
   assert.deepEqual(h.stats.revoked,allocated?['blob:raw-fixture']:[]);
   assert.equal(h.stats.removed,allocated?1:0);
   assert.match(h.stats.toasts.at(-1),lang==='fa'?/نسخهٔ خام/:/raw data/i);
   assert.deepEqual(h.state.doc,{unchanged:true});assert.deepEqual(h.state.history,['undo']);
   assert.equal(h.state.unsavedChanges,true);
  });
 }
}
test('raw recovery cleanup exceptions do not unlock destructive actions or suppress localized error',()=>{
 const failed=guardedRawExportFixture({fail:'click',cleanupThrows:true,lang:'fa'});
 assert.equal(failed.ok,false);assert.equal(failed.stats.attached,0);
 assert.deepEqual(failed.stats.revoked,['blob:raw-fixture']);
 assert.equal(failed.state.storageRecovery.backupTaken,false);
 assert.equal(failed.controls['recovery-reset'].disabled,true);
 assert.match(failed.stats.toasts.at(-1),/نسخهٔ خام/);
 const completed=guardedRawExportFixture({cleanupThrows:true});
 assert.equal(completed.ok,true);assert.doesNotThrow(()=>completed.stats.scheduled[0]());
});
