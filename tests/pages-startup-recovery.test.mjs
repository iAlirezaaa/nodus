import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function fn(name,ctx){
 const line=script.split('\n').find(s=>s.startsWith('function '+name+'(')||s.startsWith('async function '+name+'('));
 assert.ok(line,'Missing exact code: '+name);
 return vm.runInNewContext('('+line+')',ctx);
}
const good={version:1,homeBoardId:'root',boards:[{id:'root',title:'Root'}],nodes:[],edges:[]};
const bad={...good,homeBoardId:'missing'};
const copy=x=>JSON.parse(JSON.stringify(x));
function db(value,present=value!==undefined,failKey=false){return {transaction:()=>({objectStore:()=>({get:()=>{
 const req={result:value};queueMicrotask(()=>req.onsuccess?.());return req;
},getKey:()=>{const req={result:present?'main':undefined,error:failKey?Error('probe blocked'):null};queueMicrotask(()=>failKey?req.onerror?.():req.onsuccess?.());return req;}})})}}
function harness(){
 const state={hasLoaded:true,restorePending:false,storageRecovery:{raw:bad,rawAvailable:true,backupTaken:false},
 doc:{old:true},boardId:'old',selected:'a',selectedIds:new Set(['a']),history:['prior'],future:['redo'],
 groupMode:true,linkFrom:'a',gesture:null,magnetFrame:null,magnetRunning:false,
 magnetPositions:null,magnetPins:new Set(),viewByBoard:new Map(),saveQueue:Promise.resolve()};
 let writes=[],renders=0,focused=0,status=[];
 const elements={'recovery-modal':{hidden:false},'canvas':{focus:()=>focused++}};
 const ctx={state,JSON,copy,persist:async x=>{writes.push(copy(x))},persistRecoveryIfUnchanged:async x=>{writes.push(copy(x))},saveStatus:s=>status.push(s),
 toast:()=>{},L:(a,b)=>b,$:n=>elements[n]||{},render:()=>renders++,showRecovery:()=>{},cancelAnimationFrame:()=>{},
 flushEditor:()=>{throw Error('unexpected editor')},console:{error:()=>{}}};
 return {state,ctx,elements,stats:()=>({writes,renders,focused,status})};
}
test('inline JS compiles with matching CSP digest and accessible recovery dialog',()=>{
 new vm.Script(script);
 assert.equal(html.match(/script-src 'sha256-([^']+)'/)[1],createHash('sha256').update(script).digest('base64'));
 assert.match(html,/role="alertdialog"/);assert.match(html,/aria-modal="true"/);
});
test('only absent IndexedDB record is blank; malformed falsy values preserve raw',async()=>{
 for(const value of [undefined,good,0,null,bad]){
  const ctx={db:null,getDB:async()=>db(value),blank:()=>({new:true}),
   validate:x=>{if(x!==good)throw Error('Invalid workspace');return x}};
  const load=fn('load',ctx);
  if(value===undefined)assert.equal((await load()).new,true);
  else if(value===good)assert.equal(await load(),good);
  else await assert.rejects(load(),e=>e.name==='CorruptWorkspaceError'&&e.raw===value);
 }
});
test('recovery lock blocks edit/Undo/Redo/save',async()=>{
 const h=harness();h.ctx.queueSave=()=>{throw Error('queued')};
 fn('mutate',h.ctx)(d=>{d.old=false});fn('undo',h.ctx)();fn('redo',h.ctx)();
 await fn('queueSave',h.ctx)();
 assert.deepEqual(h.state.doc,{old:true});assert.deepEqual(h.state.history,['prior']);
 assert.deepEqual(h.state.future,['redo']);assert.equal(h.stats().writes.length,0);
 assert.match(h.stats().status.at(-1),/paused/);
});
test('import requires prior backup; storage failures keep original and locked',async()=>{
 const h=harness(),restore=fn('restoreLocalDocument',h.ctx);
 assert.equal(await restore(good),false);assert.equal(h.stats().writes.length,0);
 h.state.storageRecovery.backupTaken=true;h.ctx.persistRecoveryIfUnchanged=async()=>{throw Error('quota')};
 assert.equal(await restore(good),false);assert.deepEqual(h.state.doc,{old:true});
 assert.ok(h.state.storageRecovery);assert.equal(h.stats().renders,0);
});
test('confirmed import commits before unlocking; no fake blank Undo',async()=>{
 const h=harness();h.state.storageRecovery.backupTaken=true;
 assert.equal(await fn('restoreLocalDocument',h.ctx)(good),true);
 assert.deepEqual(h.stats().writes,[good]);assert.equal(h.state.doc,good);
 assert.equal(h.state.storageRecovery,null);assert.deepEqual(h.state.history,[]);
 assert.deepEqual(h.state.future,[]);assert.equal(h.elements['recovery-modal'].hidden,true);
 assert.equal(h.stats().focused,1);
});
test('raw JSON export enables recovery; failed JSON serialization does not',()=>{
 const h=harness(),controls={'recovery-import':{disabled:true},'recovery-reset':{disabled:true}};
 let payload,clicks=0;
 const ctx={state:h.state,JSON,Date,Blob:function(parts){payload=parts.join('')},
 URL:{createObjectURL:()=>'/blob',revokeObjectURL:()=>{}},document:{
 createElement:()=>({click:()=>clicks++,remove:()=>{}}),body:{append:()=>{}}},
 setTimeout:()=>{},toast:()=>{},console:{error:()=>{}},L:(a,b)=>b,$:n=>controls[n]};
 assert.equal(fn('downloadRecovery',ctx)(),true);assert.deepEqual(JSON.parse(payload),bad);
 assert.equal(clicks,1);assert.equal(h.state.storageRecovery.backupTaken,true);
 assert.equal(controls['recovery-import'].disabled,false);assert.equal(controls['recovery-reset'].disabled,false);
 const cyc={};cyc.self=cyc;h.state.storageRecovery={raw:cyc,rawAvailable:true,backupTaken:false};
 assert.equal(fn('downloadRecovery',ctx)(),false);
 assert.equal(h.state.storageRecovery.backupTaken,false);
});
test('startup chooses recovery UI, not blank editable storage',async()=>{
 const state={doc:{},hasLoaded:false,storageRecovery:null,lang:'fa',theme:'dark',
 design:{nodeStyle:'neural',density:'comfortable',motion:'calm',background:'dots'},view:{},boardId:null};
 let shown=0,rendered=0;const err=Error('Corrupted');err.name='CorruptWorkspaceError';err.raw=bad;
 const ctx={state,setup:()=>{},localStorage:{getItem:()=>null},load:async()=>{throw err},
 blank:()=>({homeBoardId:'fake'}),saveStatus:()=>{},L:(fa,en)=>fa,toast:()=>{},
 $:()=>({clientWidth:390,clientHeight:800}),render:()=>rendered++,showRecovery:()=>shown++,
 onBoard:()=>[],fit:()=>{}};
 await fn('init',ctx)();assert.equal(state.storageRecovery.raw,bad);
 assert.equal(state.storageRecovery.backupTaken,false);assert.equal(shown,1);assert.equal(rendered,1);
});
test('present undefined IndexedDB value is quarantined rather than replaced with blank',async()=>{
 const ctx={getDB:async()=>db(undefined,true),blank:()=>({new:true}),validate:()=>{throw Error('Invalid undefined workspace')}};
 await assert.rejects(fn('load',ctx),e=>e.name==='CorruptWorkspaceError'&&Object.prototype.hasOwnProperty.call(e,'raw')&&e.raw===undefined);
});
test('failed IndexedDB key-presence check fails closed',async()=>{
 const ctx={getDB:async()=>db(undefined,true,true),blank:()=>({new:true}),validate:()=>{throw Error('invalid')}};
 await assert.rejects(fn('load',ctx),e=>e.name==='CorruptWorkspaceError'&&/Cannot check stored workspace key/.test(e.message));
});

// ND-024: source-exact, non-destructive read-retry behavior (no IndexedDB write).
test('recovery retry rereads a valid workspace and clears the quarantine without writing',async()=>{
 const h=harness();h.state.storageRecovery={raw:undefined,rawAvailable:false,backupTaken:false,reason:'present undefined'};
 h.ctx.load=async()=>good;h.ctx.showRecovery=()=>{throw Error('Unexpected recovery dialog')};
 h.ctx.onBoard=()=>[];h.ctx.fit=()=>{};
 const retry=fn('retryRecovery',h.ctx);
 assert.equal(await retry(),true);assert.equal(h.state.doc,good);
 assert.equal(h.state.storageRecovery,null);assert.deepEqual(h.state.history,[]);assert.deepEqual(h.state.future,[]);
 assert.equal(h.elements['recovery-modal'].hidden,true);assert.equal(h.stats().writes.length,0);
});
test('failed recovery retry keeps the original record locked and revokes stale download consent',async()=>{
 const h=harness();h.state.storageRecovery.backupTaken=true;
 const err=Error('new bad value');err.name='CorruptWorkspaceError';err.raw={changed:'record'};
 h.ctx.load=async()=>{throw err};h.ctx.showRecovery=()=>{};
 h.ctx.onBoard=()=>[];h.ctx.fit=()=>{};
 assert.equal(await fn('retryRecovery',h.ctx)(),false);
 assert.deepEqual(h.state.doc,{old:true});assert.deepEqual(h.state.history,['prior']);
 assert.equal(h.state.storageRecovery.raw,err.raw);assert.equal(h.state.storageRecovery.backupTaken,false);
 assert.equal(h.state.restorePending,false);assert.equal(h.stats().writes.length,0);
});
test('recovery retry UI includes a focusable fallback when raw JSON cannot be downloaded',()=>{
 assert.match(html,/id="recovery-retry" type="button"/);
 assert.match(script,/\['recovery-download','recovery-retry','recovery-import','recovery-reset'\]/);
 assert.match(script,/recovery.rawAvailable\?\$\('recovery-download'\):\$\('recovery-retry'\)/);
});


test('generic startup IndexedDB open/read errors quarantine before any mutation or save',async()=>{
 for(const message of ['IDB open denied','read transaction aborted']){
  const state={doc:null,hasLoaded:false,storageRecovery:null,lang:'en',theme:'dark',
   design:{nodeStyle:'neural',density:'comfortable',motion:'calm',background:'dots'},
   history:[],future:[],boardId:null};
  let shown=0,writes=0;
  const ctx={state,setup:()=>{},localStorage:{getItem:()=>null},
   load:async()=>{throw Error(message)},blank:()=>copy(good),L:(fa,en)=>en,
   saveStatus:()=>{},toast:()=>{},$:()=>({clientWidth:390,clientHeight:844}),
   render:()=>{},showRecovery:()=>shown++,onBoard:()=>[],fit:()=>{}};
  await fn('init',ctx)();
  assert.equal(state.hasLoaded,true);
  assert.equal(shown,1);
  assert.ok(state.storageRecovery);
  assert.equal(state.storageRecovery.rawAvailable,false);
  assert.equal(state.storageRecovery.backupTaken,false);
  assert.equal(state.storageRecovery.reason,message);
  const original=JSON.stringify(state.doc);
  fn('mutate',{...ctx,copy,queueSave:()=>writes++})(doc=>{doc.boards=[]});
  assert.equal(JSON.stringify(state.doc),original);
  assert.equal(await fn('queueSave',{...ctx,copy,persist:async()=>writes++})(),false);
  assert.equal(writes,0);
 }
});

test('normal startup remains unlocked after a valid IndexedDB read',async()=>{
 const state={doc:null,hasLoaded:false,storageRecovery:null,design:{},history:[],future:[]};
 let shown=0;
 const ctx={state,setup:()=>{},localStorage:{getItem:()=>null},load:async()=>good,
  blank:()=>copy(good),L:(fa,en)=>en,saveStatus:()=>{},toast:()=>{},
  $:()=>({clientWidth:390,clientHeight:844}),render:()=>{},
  showRecovery:()=>shown++,onBoard:()=>[],fit:()=>{}};
 await fn('init',ctx)();
 assert.equal(state.doc,good);
 assert.equal(state.storageRecovery,null);
 assert.equal(shown,0);
 assert.equal(state.boardId,good.homeBoardId);
});

test('unknown raw data explains Retry in Persian and English with download disabled',()=>{
 for(const lang of ['fa','en']){
  const state={lang,storageRecovery:{raw:undefined,rawAvailable:false,backupTaken:false,reason:'read blocked'},restorePending:false};
  const controls={};
  for(const id of ['recovery-title','recovery-desc','recovery-detail','recovery-download','recovery-retry','recovery-import','recovery-reset','recovery-hint','recovery-modal']){
   controls[id]={disabled:false,hidden:true,textContent:'',focused:false,focus(){this.focused=true}};
  }
  fn('showRecovery',{state,$:id=>controls[id]})();
  assert.equal(controls['recovery-modal'].hidden,false);
  assert.equal(controls['recovery-download'].disabled,true);
  assert.equal(controls['recovery-import'].disabled,true);
  assert.equal(controls['recovery-reset'].disabled,true);
  assert.equal(controls['recovery-retry'].disabled,false);
  assert.equal(controls['recovery-retry'].focused,true);
  assert.match(controls['recovery-hint'].textContent,lang==='fa'?/دوباره/:/Retry/);
 }
});

test('generic retry failure revokes a previously readable raw snapshot rather than enabling stale reset',async()=>{
 for(const error of [new Error('IDB transaction blocked'),Object.assign(new Error('aborted'),{name:'AbortError'})]){
  const h=harness(),oldRaw=h.state.storageRecovery.raw,oldDoc=h.state.doc;
  h.state.storageRecovery.backupTaken=true;
  let dialogs=0,reads=0;
  h.ctx.load=async()=>{reads++;throw error};h.ctx.showRecovery=()=>{dialogs++};
  assert.equal(await fn('retryRecovery',h.ctx)(),false);
  assert.equal(reads,1);assert.equal(dialogs,1);
  assert.equal(h.state.doc,oldDoc);assert.deepEqual(h.state.history,['prior']);
  assert.deepEqual(h.state.future,['redo']);assert.equal(h.state.selected,'a');
  assert.equal(h.state.storageRecovery.rawAvailable,false);
  assert.equal(h.state.storageRecovery.raw,undefined);
  assert.notEqual(h.state.storageRecovery.raw,oldRaw);
  assert.equal(h.state.storageRecovery.backupTaken,false);
  assert.equal(h.state.restorePending,false);
  assert.equal(h.stats().writes.length,0);assert.equal(h.stats().renders,0);
 }
});
test('fresh corrupt raw record can still be exported after a failed retry',async()=>{
 const h=harness(),fresh={version:'invalid fresh record'};
 h.state.storageRecovery.backupTaken=true;
 const err=Object.assign(new Error('bad stored record'),{name:'CorruptWorkspaceError',raw:fresh});
 h.ctx.load=async()=>{throw err};h.ctx.showRecovery=()=>{};
 assert.equal(await fn('retryRecovery',h.ctx)(),false);
 assert.equal(h.state.storageRecovery.raw,fresh);
 assert.equal(h.state.storageRecovery.rawAvailable,true);
 assert.equal(h.state.storageRecovery.backupTaken,false);
 assert.equal(h.stats().writes.length,0);
});

// ND-024 recovery writes must serialize other tabs via one readwrite transaction.
function guardDb(value,{readFail=false,putFail=false}={}){
 const stats={reads:0,writes:[],aborts:0};
 const db={transaction:(store,mode)=>{assert.equal(store,'workspace');assert.equal(mode,'readwrite');
 const tx={abort(){stats.aborts++;queueMicrotask(()=>tx.onabort?.())},
  objectStore:()=>({
   get:()=>{stats.reads++;const req={result:value,error:readFail?Error('read failure'):null};
    queueMicrotask(()=>readFail?req.onerror?.():req.onsuccess?.());return req},
   put:(next,key)=>{assert.equal(key,'main');if(putFail)throw Error('put failed');
    stats.writes.push(copy(next));queueMicrotask(()=>tx.oncomplete?.())}
  })};
 return tx}};
 return {db,stats};
}
test('guarded recovery replaces only the unchanged raw IndexedDB record',async()=>{
 const saved={version:0,homeBoardId:'bad'},fresh=copy(good);
 const safe=fn('serializeRecoverySafely',{});
 for(const [name,current,opt,shouldSave] of [
  ['unchanged',copy(saved),{},true],['changed by another tab',{version:0,homeBoardId:'different'},{},false],
  ['record deleted',undefined,{},false],['transaction unreadable',copy(saved),{readFail:true},false],
  ['storage put rejected',copy(saved),{putFail:true},false]]){
  const mock=guardDb(current,opt),guard=fn('persistRecoveryIfUnchanged',{db:mock.db,serializeRecoverySafely:safe});
  if(shouldSave)await guard(fresh,saved);
  else await assert.rejects(guard(fresh,saved),e=>Boolean(e?.message),name);
  assert.equal(mock.stats.reads,1,name);
  assert.equal(mock.stats.writes.length,shouldSave?1:0,name);
  if(shouldSave)assert.deepEqual(mock.stats.writes[0],fresh);
 }
});
test('changed stored raw revokes stale backup consent and keeps prior Undo/selection',async()=>{
 const h=harness(),prior=h.state.doc;h.state.storageRecovery.backupTaken=true;
 h.ctx.persistRecoveryIfUnchanged=async()=>{throw Error('Stored workspace changed since backup')};
 h.ctx.showRecovery=()=>{};
 assert.equal(await fn('restoreLocalDocument',h.ctx)(copy(good)),false);
 assert.equal(h.state.doc,prior);assert.deepEqual(h.state.history,['prior']);assert.deepEqual(h.state.future,['redo']);
 assert.equal(h.state.selected,'a');assert.equal(h.state.storageRecovery.backupTaken,false);
 assert.equal(h.state.storageRecovery.rawAvailable,false);assert.equal(h.state.storageRecovery.raw,undefined);
 assert.equal(h.stats().writes.length,0);
});
test('ordinary non-quarantined restore still uses the existing persist path',async()=>{
 const h=harness();h.state.storageRecovery=null;
 h.ctx.persistRecoveryIfUnchanged=()=>{throw Error('unexpected guarded restore')};
 assert.equal(await fn('restoreLocalDocument',h.ctx)(copy(good)),true);
 assert.equal(h.stats().writes.length,1);assert.equal(h.state.storageRecovery,null);
});

// ND-024: loss-aware regular saves and import preflight.
test('failed queued save reports false while retaining in-memory edits',async()=>{
 const h=harness();h.state.storageRecovery=null;
 let attempts=0;const ctx={...h.ctx,copy,persist:async()=>{attempts++;throw Error('quota')}};
 assert.equal(await fn('queueSave',ctx)(),false);
 assert.equal(await h.state.saveQueue,false);
 assert.equal(attempts,1);assert.deepEqual(h.state.doc,{old:true});
 assert.match(h.stats().status.at(-1),/failed/i);
});
test('pending failed save blocks ordinary replacement import without losing Undo',async()=>{
 const h=harness();h.state.storageRecovery=null;h.state.saveQueue=Promise.resolve(false);
 let writes=0;h.ctx.persist=async()=>{writes++};
 assert.equal(await fn('restoreLocalDocument',h.ctx)(copy(good)),false);
 assert.equal(writes,0);assert.deepEqual(h.state.doc,{old:true});
 assert.deepEqual(h.state.history,['prior']);assert.deepEqual(h.state.future,['redo']);
 assert.equal(h.state.restorePending,false);
});
test('Save retry success permits a subsequent import only after storage acknowledgement',async()=>{
 const h=harness();h.state.storageRecovery=null;h.state.saveQueue=Promise.resolve(false);
 let writes=0;const ctx={...h.ctx,copy,persist:async()=>{writes++}};
 assert.equal(await fn('queueSave',ctx)(),true);
 assert.equal(await fn('restoreLocalDocument',ctx)(copy(good)),true);
 assert.equal(writes,2);assert.equal(h.state.doc.homeBoardId,'root');
});
test('Details Save only confirms after persistence settles',async()=>{
 const line=script.split('\n').find(s=>s.includes("$('edit-save').onclick="));
 const expression=line.slice(line.indexOf("$('edit-save').onclick="),line.indexOf("$('sub-project').onclick="));
 for(const [outcome,pattern] of [[false,/failed/i],[true,/^Saved$/]]){
  const h=harness();h.state.storageRecovery=null;
  const btn={'edit-save':{}},messages=[];let resolveSave;
  new Function('$','state','flushEditor','queueSave','toast','L',expression)(
   name=>btn[name],h.state,()=>{},()=>new Promise(resolve=>resolveSave=resolve),
   msg=>messages.push(msg),(fa,en)=>en);
  const action=btn['edit-save'].onclick();assert.equal(messages.length,0);
  resolveSave(outcome);await action;assert.match(messages[0],pattern);
 }
});

test('ND-024: failed graph save warns on unload until acknowledged retry',async()=>{
 const h=harness();h.state.storageRecovery=null;h.state.unsavedChanges=false;
 let complete;
 const ctx={...h.ctx,copy,render:()=>{},persist:()=>new Promise((resolve,reject)=>{complete={resolve,reject}})};
 const queueSave=fn('queueSave',ctx),mutate=fn('mutate',{...ctx,queueSave}),warn=fn('warnOnUnsavedExit',{state:h.state});
 const event=()=>{let prevented=false;const e={preventDefault(){prevented=true},returnValue:undefined};warn(e);return {prevented,value:e.returnValue}};
 assert.equal(event().prevented,false);
 mutate(d=>{d.thought='فارسی';});assert.equal(h.state.unsavedChanges,true);
 assert.deepEqual(event(),{prevented:true,value:''});
 await new Promise(resolve=>setImmediate(resolve));complete.reject(Error('quota'));
 assert.equal(await h.state.saveQueue,false);assert.equal(event().prevented,true);
 const retry=queueSave();await new Promise(resolve=>setImmediate(resolve));complete.resolve();
 assert.equal(await retry,true);assert.equal(h.state.unsavedChanges,false);assert.equal(event().prevented,false);
});
test('ND-024: older acknowledged snapshot does not clear newer dirty edits',async()=>{
 const h=harness();h.state.storageRecovery=null;h.state.unsavedChanges=false;
 const complete=[];const ctx={...h.ctx,copy,render:()=>{},persist:()=>new Promise(resolve=>complete.push(resolve))};
 const queueSave=fn('queueSave',ctx),mutate=fn('mutate',{...ctx,queueSave});
 mutate(d=>{d.rev=1});await new Promise(resolve=>setImmediate(resolve));assert.equal(complete.length,1);
 mutate(d=>{d.rev=2});complete[0]();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.state.unsavedChanges,true);assert.match(h.stats().status.at(-1),/Saving/);
 assert.equal(complete.length,2);complete[1]();assert.equal(await h.state.saveQueue,true);
 assert.equal(h.state.unsavedChanges,false);assert.match(h.stats().status.at(-1),/Saved/);
});
test('ND-024: clean unload stays native, dirty export does not acknowledge save',()=>{
 const h=harness();h.state.unsavedChanges=false;let prevented=false;
 const guard=fn('warnOnUnsavedExit',{state:h.state}),e={preventDefault(){prevented=true},returnValue:undefined};
 guard(e);assert.equal(prevented,false);assert.equal(e.returnValue,undefined);
 assert.match(script,/addEventListener\('beforeunload',warnOnUnsavedExit\)/);
 assert.match(script,/state\.unsavedChanges=true;queueSave\(\);render\(\)/);
 assert.doesNotMatch(script.split('\n').find(s=>s.startsWith('function download(){')),/unsavedChanges=false/);
});
