import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const line=script.split('\n').find(s=>s.startsWith('function download('));
assert.ok(line,'The actual Pages download handler must be tested');
const run=ctx=>vm.runInNewContext('('+line+')',ctx)();

function fixture({lang='en',fail=null,recovery=false}={}){
 const original={version:1,homeBoardId:'root',boards:[{id:'root',title:'ایده'}],nodes:[],edges:[]};
 const state={doc:original,lang,history:['undo'],future:[],unsavedChanges:true,localConflict:true,
  storageRecovery:recovery?{raw:original,backupTaken:false}:null};
 const stats={toasts:[],clicks:0,removed:0,created:0,revoked:[],scheduled:[],writes:0,flushes:0,restores:0,
  url:'blob:backup'};
 const anchor={href:'',download:'',click(){stats.clicks++;if(fail==='click')throw Error('download blocked')},
  remove(){stats.removed++}};
 const ctx={state,JSON,Date,
  flushEditor(){stats.flushes++},
  downloadRecovery(){stats.restores++;return true},
  Blob:function(parts){if(fail==='blob')throw Error('blob denied');this.parts=parts},
  URL:{createObjectURL(){stats.created++;if(fail==='url')throw Error('createObjectURL denied');return stats.url},
    revokeObjectURL(url){stats.revoked.push(url);if(fail==='revoke')throw Error('revoke denied')}},
  document:{createElement(){return anchor},body:{append(){if(fail==='append')throw Error('append denied')}}},
  setTimeout(fn){if(fail==='timer')throw Error('timer denied');stats.scheduled.push(fn)},
  toast(message){stats.toasts.push(message)},
  L(fa,en){return lang==='fa'?fa:en},
  console:{error(){}},
 };
 return {ctx,state,stats,anchor,original};
}

test('backup handler is source-exact and script CSP still matches',()=>{
 new vm.Script(script);
 assert.equal(html.match(/script-src 'sha256-([^']+)'/)[1],
  createHash('sha256').update(script).digest('base64'));
});
test('normal export prepares actual Persian document, keeps undo/dirty state, and reports preparation only',()=>{
 const h=fixture(),res=run(h.ctx);
 assert.equal(res,true);
 assert.equal(h.stats.flushes,1);assert.equal(h.stats.created,1);assert.equal(h.stats.clicks,1);
 assert.equal(h.stats.removed,1);assert.equal(h.stats.revoked.length,0);
 assert.equal(h.stats.scheduled.length,1);
 h.stats.scheduled[0]();assert.deepEqual(h.stats.revoked,['blob:backup']);
 assert.match(h.anchor.download,/^nodus-local-backup-\d{4}-\d{2}-\d{2}\.json$/);
 assert.match(h.stats.toasts.at(-1),/prepared/i);
 assert.doesNotMatch(h.stats.toasts.at(-1),/downloaded/i);
 assert.deepEqual(h.state.doc,h.original);
 assert.equal(h.state.unsavedChanges,true);assert.deepEqual(h.state.history,['undo']);
});
test('recovering data keeps its separate safe raw export path',()=>{
 const h=fixture({recovery:true});assert.equal(run(h.ctx),true);
 assert.equal(h.stats.restores,1);assert.equal(h.stats.created,0);assert.equal(h.stats.clicks,0);
});
for(const fail of ['blob','url','append','click']){
 for(const lang of ['fa','en']){
  test(fail+' error uses '+lang+' retry message, cleans any allocated URL and changes no user data',()=>{
   const h=fixture({lang,fail});
   assert.equal(run(h.ctx),false);
   assert.match(h.stats.toasts.at(-1),lang==='fa'?/پشتیبان|دانلود/:/backup|export/i);
   assert.doesNotMatch(h.stats.toasts.at(-1),/downloaded/i);
   assert.deepEqual(h.state.doc,h.original);assert.deepEqual(h.state.history,['undo']);
   assert.equal(h.state.unsavedChanges,true);assert.equal(h.state.localConflict,true);
   assert.equal(h.stats.revoked.length,fail==='click'||fail==='append'?1:0);
   if(fail==='click'||fail==='append')assert.deepEqual(h.stats.revoked,['blob:backup']);
   assert.equal(h.stats.restores,0);
  });
 }
}
test('JSON serialization failure does not crash or pretend export succeeded',()=>{
 const h=fixture();h.state.doc.nodes.push(h.state.doc);
 assert.equal(run(h.ctx),false);
 assert.match(h.stats.toasts.at(-1),/backup|export/i);
 assert.equal(h.stats.created,0);assert.equal(h.stats.clicks,0);
 assert.equal(h.state.unsavedChanges,true);
});
test('failed URL revocation during failed click still leaves a useful error notice',()=>{
 const h=fixture({fail:'click'});h.ctx.URL.revokeObjectURL=()=>{throw Error('cleanup denied')};
 assert.equal(run(h.ctx),false);assert.match(h.stats.toasts.at(-1),/backup|export/i);
});

test('delayed ordinary-backup URL revocation errors stay isolated after the prepared notification',()=>{
 const h=fixture({fail:'revoke'});
 assert.equal(run(h.ctx),true);
 assert.equal(h.stats.scheduled.length,1);
 assert.doesNotThrow(()=>h.stats.scheduled[0]());
 assert.deepEqual(h.stats.revoked,['blob:backup']);
 assert.equal(h.stats.removed,1);
 assert.match(h.stats.toasts.at(-1),/prepared/i);
 assert.deepEqual(h.state.doc,h.original);
 assert.deepEqual(h.state.history,['undo']);
 assert.equal(h.state.unsavedChanges,true);
});
test('timer scheduling failure revokes URL and reports retry without affecting document or Undo',()=>{
 const h=fixture({lang:'fa',fail:'timer'});
 assert.equal(run(h.ctx),false);
 assert.equal(h.stats.clicks,1);
 assert.equal(h.stats.scheduled.length,0);
 assert.deepEqual(h.stats.revoked,['blob:backup']);
 assert.equal(h.stats.removed,1);
 assert.match(h.stats.toasts.at(-1),/پشتیبان|دانلود/);
 assert.deepEqual(h.state.doc,h.original);
 assert.deepEqual(h.state.history,['undo']);
 assert.equal(h.state.unsavedChanges,true);
 assert.equal(h.state.localConflict,true);
});
