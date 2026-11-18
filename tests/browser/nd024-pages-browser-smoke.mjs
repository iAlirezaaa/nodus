/**
 * ND-024: real Chromium/IndexedDB smoke, isolated profile; no live account data.
 * Nodus test URL is fixed http://127.0.0.1:4173/. Fixture is NOT Site/auth proof.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const TEST_URL='http://127.0.0.1:4173/',dir=resolve('artifacts/nd024-browser');
const html=await readFile(resolve('pages/index.html'),'utf8');
assert.match(html,/Nodus Pages/);
const server=createServer((req,res)=>{
  if(req.method!=='GET'||!['/','/index.html'].includes(new URL(req.url,TEST_URL).pathname)){res.writeHead(404).end();return;}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html);
});
try{await new Promise((yes,no)=>{server.once('error',no);server.listen(4173,'127.0.0.1',yes)})}
catch(e){throw Error(e.code==='EADDRINUSE'?'BLOCKED: 4173 occupied; never replace another preview':String(e))}
let browser;
const errors=[];
try{
  await mkdir(dir,{recursive:true});
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:1440,height:900},locale:'fa-IR'});
  const a=await ctx.newPage();a.on('pageerror',e=>errors.push('A: '+e.message));
  await a.goto(TEST_URL,{waitUntil:'load'});await a.waitForFunction(()=>state.hasLoaded);
  assert.equal(await a.evaluate(()=>state.lang),'fa');
  assert.equal(await a.evaluate(()=>state.doc.nodes.length),0);
  console.log('PASS: FA desktop actual Pages boot at 4173');
  await a.locator('#add').click();
  await a.locator('#nodes input').fill('ایدهٔ آغازین');
  await a.keyboard.press('Shift+Enter');
  assert.equal(await a.evaluate(()=>state.doc.nodes.length),1);
  assert.equal(await a.evaluate(()=>state.doc.nodes[0].title),'ایدهٔ آغازین');
  await a.waitForFunction(()=>!state.unsavedChanges);
  // Fault-injected blocked schema open in a separate real Chromium page: no owner data.
  // A blocked open must move to safe recovery, and late upgrade/success must not leak a handle.
  const blockedCtx=await browser.newContext({viewport:{width:390,height:844},locale:'fa-IR'});
  try{
    await blockedCtx.addInitScript(()=>{
      const nativeOpen=IDBFactory.prototype.open;
      window.nd024BlockedOpen={aborts:0,creates:0,closes:0};
      IDBFactory.prototype.open=function(...args){
        if(args[0]!=='nodus-pages-v1')return nativeOpen.apply(this,args);
        const metric=window.nd024BlockedOpen;
        const req={result:{objectStoreNames:{contains:()=>false},createObjectStore(){metric.creates++},close(){metric.closes++}},transaction:{abort(){metric.aborts++}}};
        setTimeout(()=>{req.onblocked?.();setTimeout(()=>{req.onupgradeneeded?.();req.onsuccess?.()},30)},0);
        return req;
      };
    });
    const p=await blockedCtx.newPage();p.on('pageerror',e=>errors.push('BlockedOpen: '+e.message));
    await p.goto(TEST_URL,{waitUntil:'load'});
    await p.waitForFunction(()=>state.hasLoaded&&!!state.storageRecovery);
    assert.equal(await p.locator('#recovery-modal').isVisible(),true);
    assert.equal(await p.locator('#recovery-reset').isDisabled(),true);
    assert.match(await p.locator('#recovery-detail').textContent(),/تب دیگری/);
    assert.match(await p.locator('#recovery-detail').getAttribute('title'),/blocked by another tab/);
    assert.equal(await p.evaluate(()=>state.doc.nodes.length),0);
    await p.waitForFunction(()=>window.nd024BlockedOpen.closes===1);
    assert.deepEqual(await p.evaluate(()=>window.nd024BlockedOpen),{aborts:1,creates:0,closes:1});
    await p.screenshot({path:resolve(dir,'nd024-blocked-open-recovery-fa-mobile.png'),animations:'disabled'});
    await p.evaluate(()=>{state.lang='en';render();showRecovery()});
    assert.match(await p.locator('#recovery-detail').textContent(),/blocked by another tab/);
    await p.screenshot({path:resolve(dir,'nd024-blocked-open-recovery-en-mobile.png'),animations:'disabled'});
    console.log('PASS: 390px FA blocked open enters recovery and closes late connection without IDB writes');
  }finally{await blockedCtx.close()}

  // Real two-tab version upgrade: old connections must relinquish IndexedDB
  // and keep current drafts read-only until the user exports and reloads.
  const versionCtx=await browser.newContext({viewport:{width:390,height:844},locale:'fa-IR'});
  try{
    const p=await versionCtx.newPage();p.on('pageerror',e=>errors.push('VersionA: '+e.message));
    await p.goto(TEST_URL,{waitUntil:'load'});await p.waitForFunction(()=>state.hasLoaded);
    await p.locator('#add').click();await p.locator('#nodes input').fill('ایدهٔ حفظ‌شده');
    await p.keyboard.press('Shift+Enter');await p.waitForFunction(()=>!state.unsavedChanges);
    const q=await versionCtx.newPage();q.on('pageerror',e=>errors.push('VersionB: '+e.message));
    await q.goto(TEST_URL,{waitUntil:'load'});await q.waitForFunction(()=>state.hasLoaded);
    const before=await p.evaluate(()=>({doc:JSON.stringify(state.doc),history:JSON.stringify(state.history)}));
    await p.evaluate(()=>{
      window.versionChangeWrites=0;
      const original=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args){if(this.name==='workspace')window.versionChangeWrites++;return original.apply(this,args)};
    });
    const upgraded=await q.evaluate(()=>new Promise((resolve,reject)=>{
      const req=indexedDB.open('nodus-pages-v1',2);
      const timeout=setTimeout(()=>reject(Error('Upgrade blocked by an old open connection')),4500);
      req.onupgradeneeded=()=>{};
      req.onsuccess=()=>{clearTimeout(timeout);req.result.close();resolve(true)};
      req.onerror=()=>{clearTimeout(timeout);reject(req.error||Error('Upgrade failed'))};
    }));
    assert.equal(upgraded,true);
    await p.waitForFunction(()=>state.localConflict&&db===null);
    await q.waitForFunction(()=>state.localConflict&&db===null);
    const after=await p.evaluate(()=>({doc:JSON.stringify(state.doc),history:JSON.stringify(state.history),
      writes:window.versionChangeWrites,unsaved:state.unsavedChanges,status:document.getElementById('save-status')?.textContent}));
    assert.equal(after.doc,before.doc);assert.equal(after.history,before.history);
    assert.equal(after.writes,0);assert.equal(after.unsaved,true);
    assert.match(await p.locator('#toast').textContent(),/اتصال ذخیره/);
    await p.screenshot({path:resolve(dir,'nd024-indexeddb-versionchange-fa-mobile.png'),animations:'disabled'});
    console.log('PASS: real 390px two-tab IndexedDB versionchange releases both connections, preserves draft/Undo, prevents writes');
  }finally{await versionCtx.close()}

  // An actual readonly IndexedDB transaction can abort after an individual request succeeds.
  // Fault injection is limited to this isolated tab; the saved fixture in the normal tab stays intact.
  const abortPage=await ctx.newPage();abortPage.on('pageerror',e=>errors.push('ABORT: '+e.message));
  await abortPage.addInitScript(()=>{
    const original=IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get=function(...args){
      const request=original.apply(this,args);
      if(this.name==='workspace'&&this.transaction.mode==='readonly'&&args[0]==='main'){
        request.addEventListener('success',()=>this.transaction.abort(),{once:true});
      }
      return request;
    };
  });
  await abortPage.goto(TEST_URL,{waitUntil:'load'});
  await abortPage.waitForFunction(()=>state.hasLoaded);
  assert.equal(await abortPage.evaluate(()=>!!state.storageRecovery),true);
  assert.equal(await abortPage.evaluate(()=>state.doc.nodes.length),0);
  assert.equal(await abortPage.locator('#recovery-modal').isVisible(),true);
  assert.equal(await abortPage.locator('#recovery-reset').isDisabled(),true);
  await abortPage.screenshot({path:resolve(dir,'nd024-read-transaction-abort-fa.png'),animations:'disabled'});
  await abortPage.close();
  assert.equal(await a.evaluate(()=>state.doc.nodes[0].title),'ایدهٔ آغازین');
  console.log('PASS: real IndexedDB readonly abort opens safe recovery without changing saved work');
  console.log('PASS: Unicode/FA edit and IndexedDB save');
  await a.locator('#nodes .node').first().dblclick();
  await a.locator('#nodes input').fill('متن اشتباه؛ لغو شود');
  const before=await a.evaluate(()=>state.history.length);
  await a.keyboard.press('Escape');
  assert.equal(await a.evaluate(()=>state.doc.nodes[0].title),'ایدهٔ آغازین');
  assert.equal(await a.evaluate(()=>state.history.length),before);
  assert.equal(await a.locator('#nodes input').count(),0);
  assert.equal(await a.evaluate(()=>document.activeElement?.classList.contains('node')),true);
  console.log('PASS: Escape cancels edit, no Undo/write, returns keyboard focus');
  await a.locator('#nodes .node').first().focus();
  await a.keyboard.press('Enter');
  await a.locator('#nodes input').fill('Second node');
  await a.keyboard.press('Shift+Enter');
  assert.equal(await a.evaluate(()=>state.doc.nodes.length),2);
  console.log('PASS: ordinary Enter creates sibling');
  await a.locator('#nodes .node').last().dblclick();
  await a.locator('#nodes input').fill('Second node with child');
  await a.keyboard.press('Tab');
  assert.equal(await a.evaluate(()=>state.doc.nodes.length),3);
  assert.ok(await a.evaluate(()=>state.doc.edges.length>0));
  console.log('PASS: ordinary Tab creates connected child');
  // inlineEdit is scheduled in requestAnimationFrame, so await its real focus target.
  await a.locator('#nodes input').first().waitFor({state:'visible'});
  const beforeIme=await a.evaluate(()=>state.doc.nodes.length);
  const simulated=await a.evaluate(()=>{
    const input=document.querySelector('#nodes input');if(!input)return false;
    input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'ف'}));
    input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true,isComposing:true}));
    input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'فارسی'}));
    return true;
  });
  assert.equal(simulated,true);
  assert.equal(await a.evaluate(()=>state.doc.nodes.length),beforeIme);
  await a.keyboard.press('Escape');
  console.log('PASS: synthetic composition Enter guard (not physical IME)');
  await a.waitForFunction(()=>!state.unsavedChanges);
  const b=await ctx.newPage();b.on('pageerror',e=>errors.push('B: '+e.message));
  b.on('dialog',d=>d.accept());
  await b.goto(TEST_URL,{waitUntil:'load'});await b.waitForFunction(()=>state.hasLoaded);
  assert.equal(await b.evaluate(()=>state.doc.nodes.length),3);
  await a.locator('#add').click();
  await a.locator('#nodes input').fill('Newer tab edit');
  await a.keyboard.press('Shift+Enter');
  await a.waitForFunction(()=>!state.unsavedChanges);
  await b.locator('#add').click();
  await b.waitForFunction(()=>state.localConflict);
  assert.equal(await b.evaluate(()=>state.unsavedChanges),true);
  await b.reload({waitUntil:'load'});
  await b.waitForFunction(()=>state.hasLoaded);
  assert.equal(await b.evaluate(()=>state.doc.nodes.length),4);
  assert.equal(await b.evaluate(()=>state.localConflict),false);
  console.log('PASS: real two tabs, stale IndexedDB write blocked and reload recovers newer data');
  await a.reload({waitUntil:'load'});await a.waitForFunction(()=>state.hasLoaded);
  assert.equal(await a.evaluate(()=>state.doc.nodes[0].title),'ایدهٔ آغازین');
  assert.equal(await a.evaluate(()=>state.doc.nodes.length),4);
  assert.equal(await a.evaluate(()=>state.lang),'fa');
  await a.screenshot({path:resolve(dir,'nd024-fa-desktop.png'),animations:'disabled'});
  await a.locator('#language').click();assert.equal(await a.evaluate(()=>state.lang),'en');
  await a.locator('#motion').selectOption('calm');
  const motionBaseline=await a.evaluate(()=>{
    window.nd024WorkspaceWrites=0;
    const oldPut=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(...args){
      if(this.name==='workspace')window.nd024WorkspaceWrites++;
      return oldPut.apply(this,args);
    };
    return {document:JSON.stringify(state.doc),history:state.history.length};
  });
  await a.locator('#magnet-start').click();
  await a.waitForFunction(()=>!state.magnetRunning&&!!state.magnetPositions);
  const motionReport=()=>a.evaluate(()=>({
    document:JSON.stringify(state.doc),history:state.history.length,
    writes:window.nd024WorkspaceWrites,unsaved:state.unsavedChanges
  }));
  let report=await motionReport();
  assert.equal(report.document,motionBaseline.document);
  assert.equal(report.history,motionBaseline.history);
  assert.equal(report.writes,0);
  assert.equal(report.unsaved,false);
  await a.locator('#magnet-reset').click();
  await a.locator('#motion').selectOption('off');
  assert.equal(await a.locator('#canvas').getAttribute('data-motion'),'off');
  await a.locator('#magnet-start').click();
  assert.equal(await a.evaluate(()=>state.magnetRunning),false);
  assert.equal(await a.evaluate(()=>!!state.magnetPositions),true);
  await a.locator('#magnet-reset').click();
  await a.emulateMedia({reducedMotion:'reduce'});
  await a.locator('#motion').selectOption('full');
  await a.locator('#magnet-start').click();
  assert.equal(await a.evaluate(()=>state.magnetRunning),false);
  await a.locator('#magnet-reset').click();
  report=await motionReport();
  assert.equal(report.document,motionBaseline.document);
  assert.equal(report.history,motionBaseline.history);
  assert.equal(report.writes,0);
  assert.equal(report.unsaved,false);
  await a.emulateMedia({reducedMotion:'no-preference'});
  await a.locator('#motion').selectOption('off');
  await a.screenshot({path:resolve(dir,'nd024-en-desktop.png'),animations:'disabled'});
  console.log('PASS: magnetic calm/off/reduced-motion preview makes zero document writes/Undo entries');
  console.log('PASS: reload, FA and EN desktop, motion off and real screenshots');
  const m=await ctx.newPage();await m.setViewportSize({width:390,height:844});
  m.on('pageerror',e=>errors.push('M: '+e.message));
  await m.goto(TEST_URL,{waitUntil:'load'});await m.waitForFunction(()=>state.hasLoaded);
  const dim=await m.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,n:state.doc.nodes.length}));
  assert.equal(dim.w,390);assert.equal(dim.n,4);assert.ok(dim.scroll<=392,'390px overflow: '+JSON.stringify(dim));
  if(await m.evaluate(()=>state.lang)!=='fa')await m.locator('#language').click();
  assert.equal(await m.evaluate(()=>state.lang),'fa');
  assert.equal(await m.evaluate(()=>document.documentElement.dir),'rtl');
  await m.screenshot({path:resolve(dir,'nd024-fa-mobile-390.png'),animations:'disabled'});
  await m.locator('#language').click();
  assert.equal(await m.evaluate(()=>state.lang),'en');
  assert.equal(await m.evaluate(()=>document.documentElement.dir),'ltr');
  assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=392));
  await m.screenshot({path:resolve(dir,'nd024-en-mobile-390.png'),animations:'disabled'});
  // Source-exact Media handler in a real browser: the same ID can survive a
  // complete workspace restore while a FileReader still owns an old file.
  const racePage=await ctx.newPage();
  racePage.on('pageerror',e=>errors.push('Media race: '+e.message));
  await racePage.goto(TEST_URL,{waitUntil:'load'});
  await racePage.waitForFunction(()=>state.hasLoaded);
  await racePage.locator('#nodes .node').first().click();
  const race=await racePage.evaluate(async()=>{
    const input=document.getElementById('media-file');
    const oldReader=window.FileReader;
    const oldPut=IDBObjectStore.prototype.put;
    const previousDoc=state.doc,initialHistory=state.history.length;
    let reader=null,writes=0;
    try{
      window.FileReader=class{readAsDataURL(){reader=this}};
      IDBObjectStore.prototype.put=function(...args){if(this.name==='workspace')writes++;return oldPut.apply(this,args)};
      Object.defineProperty(input,'files',{configurable:true,value:[{size:24,name:'stale-before-restore.png'}]});
      const pending=input.onchange({target:input});
      if(!reader)return {error:'FileReader not started',selected:state.selected};
      state.doc={...previousDoc,nodes:previousDoc.nodes.map(n=>({...n}))};
      reader.result='data:image/png;base64,WA==';reader.onload();
      await pending;
      await new Promise(resolve=>setTimeout(resolve,40));
      return {selected:state.selected,historyDelta:state.history.length-initialHistory,
        attached:state.doc.nodes.some(n=>n.mediaName==='stale-before-restore.png'),
        writes,unsaved:state.unsavedChanges};
    }finally{
      state.doc=previousDoc;
      window.FileReader=oldReader;
      IDBObjectStore.prototype.put=oldPut;
    }
  });
  assert.equal(race.error,undefined,JSON.stringify(race));
  assert.ok(race.selected,'selected thought required for real FileReader path');
  assert.equal(race.attached,false,'stale attachment must not write to restored thought with same ID');
  assert.equal(race.historyDelta,0,'stale media must not add an Undo entry');
  assert.equal(race.writes,0,'stale media must not save the replaced workspace');
  assert.equal(race.unsaved,false,'stale media must not mark the document dirty');
  await racePage.screenshot({path:resolve(dir,'nd024-media-stale-restore.png'),animations:'disabled'});
  await racePage.close();
  console.log('PASS: delayed FileReader cannot attach stale media to restored workspace with matching node IDs');
  // Verify the visible localized failure notice in an actual 4173 Chromium page.
  // Deliberately trigger the browser FileReader lifecycle without modifying user files.
  const failurePage=await ctx.newPage();
  failurePage.on('pageerror',e=>errors.push('Media failure: '+e.message));
  await failurePage.goto(TEST_URL,{waitUntil:'load'});
  await failurePage.waitForFunction(()=>state.hasLoaded);
  await failurePage.locator('#nodes .node').first().click();
  const failures=await failurePage.evaluate(async()=>{
    const input=document.getElementById('media-file');
    const oldReader=window.FileReader;
    const oldPut=IDBObjectStore.prototype.put;
    const original=JSON.stringify(state.doc),history=state.history.length;
    let writes=0;const results=[];
    try{
      IDBObjectStore.prototype.put=function(...args){if(this.name==='workspace')writes++;return oldPut.apply(this,args)};
      for(const mode of ['abort','error','throw']){
        window.FileReader=class{
          readAsDataURL(){
            if(mode==='throw')throw Error('synthetic inaccessible file');
            if(mode==='abort')this.onabort();
            else this.onerror();
          }
        };
        Object.defineProperty(input,'files',{configurable:true,value:[{size:24,name:mode+'.png'}]});
        await input.onchange({target:input});
        results.push({mode,notice:document.getElementById('toast').textContent,
          untouched:JSON.stringify(state.doc)===original,
          undo:state.history.length===history,unsaved:state.unsavedChanges,writes});
      }
      return results;
    }finally{
      window.FileReader=oldReader;
      IDBObjectStore.prototype.put=oldPut;
    }
  });
  assert.equal(failures.length,3,JSON.stringify(failures));
  for(const result of failures){
    assert.match(result.notice,/Could not read media|خواندن رسانه انجام نشد/,JSON.stringify(result));
    assert.equal(result.untouched,true,JSON.stringify(result));
    assert.equal(result.undo,true,JSON.stringify(result));
    assert.equal(result.unsaved,false,JSON.stringify(result));
    assert.equal(result.writes,0,JSON.stringify(result));
  }
  await failurePage.screenshot({path:resolve(dir,'nd024-media-read-failure.png'),animations:'disabled'});
  await failurePage.close();
  console.log('PASS: real Chromium reader abort/error/throw show retry notice with zero workspace writes or Undo');

  // Recovery fixture in an independent real Chromium IndexedDB profile.
  const recoverCtx=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true,locale:'fa-IR'});
  try{
    const p=await recoverCtx.newPage();
    p.on('pageerror',e=>errors.push('Recovery: '+e.message));
    p.on('dialog',d=>d.accept());
    await p.goto(TEST_URL,{waitUntil:'load'});
    await p.waitForFunction(()=>state.hasLoaded);
    const valid=await p.evaluate(()=>JSON.stringify(state.doc));
    await p.evaluate(async()=>new Promise((resolve,reject)=>{
      const tx=db.transaction('workspace','readwrite');
      tx.objectStore('workspace').put({version:1,homeBoardId:'missing',boards:[{id:'root',title:'invalid'}],nodes:[],edges:[]},'main');
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    }));
    await p.reload({waitUntil:'load'});
    await p.waitForFunction(()=>state.hasLoaded&&!!state.storageRecovery);
    assert.equal(await p.evaluate(()=>state.storageRecovery.rawAvailable),true);
    // A second, transient database-open failure must not discard the corrupt raw snapshot
    // captured by the first real IndexedDB read. This fault is fixture-only.
    const retained=await p.evaluate(async()=>{
      const oldOpen=IDBFactory.prototype.open,oldPut=IDBObjectStore.prototype.put;
      let writes=0;
      const initial=JSON.stringify(state.storageRecovery.raw);
      const documentBefore=JSON.stringify(state.doc),undo=state.history.length;
      try{
        IDBFactory.prototype.open=function(){throw new DOMException('Synthetic transient open denied','UnknownError')};
        IDBObjectStore.prototype.put=function(...args){if(this.name==='workspace')writes++;return oldPut.apply(this,args)};
        const ok=await retryRecovery();
        return {ok,writes,rawPreserved:JSON.stringify(state.storageRecovery.raw)===initial,
          rawAvailable:state.storageRecovery.rawAvailable,staleRaw:state.storageRecovery.staleRaw,backupTaken:state.storageRecovery.backupTaken,
          rawHome:state.storageRecovery.raw?.homeBoardId,
          exportEnabled:!document.getElementById('recovery-download').disabled,
          importLocked:document.getElementById('recovery-import').disabled,
          resetLocked:document.getElementById('recovery-reset').disabled,
          documentUnchanged:JSON.stringify(state.doc)===documentBefore,undoUnchanged:state.history.length===undo};
      }finally{IDBFactory.prototype.open=oldOpen;IDBObjectStore.prototype.put=oldPut}
    });
    assert.equal(retained.ok,false,JSON.stringify(retained));
    assert.equal(retained.rawPreserved,true,JSON.stringify(retained));
    assert.equal(retained.rawAvailable,true,JSON.stringify(retained));
    assert.equal(retained.staleRaw,true,JSON.stringify(retained));
    assert.equal(retained.backupTaken,false,JSON.stringify(retained));
    assert.equal(retained.rawHome,'missing',JSON.stringify(retained));
    assert.equal(retained.exportEnabled,true,JSON.stringify(retained));
    assert.equal(retained.importLocked,true,JSON.stringify(retained));
    assert.equal(retained.resetLocked,true,JSON.stringify(retained));
    assert.equal(retained.documentUnchanged,true,JSON.stringify(retained));
    assert.equal(retained.undoUnchanged,true,JSON.stringify(retained));
    assert.equal(retained.writes,0,JSON.stringify(retained));
    await p.setViewportSize({width:390,height:844});
    await p.screenshot({path:resolve(dir,'nd024-raw-retained-after-transient-retry-fa-mobile.png'),animations:'disabled'});
    await p.reload({waitUntil:'load'});await p.waitForFunction(()=>state.hasLoaded&&!!state.storageRecovery);
    assert.equal(await p.evaluate(()=>state.storageRecovery.rawAvailable),true);
    console.log('PASS: 390px real IndexedDB corrupt recovery retains raw export after transient retry; destructive controls locked');
    // A denied click must never unlock destructive recovery, leak an anchor or
    // claim the quarantined raw record was saved.
    const rawFailure=await p.evaluate(()=>{
      const oldClick=HTMLAnchorElement.prototype.click;
      const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
      const oldPut=IDBObjectStore.prototype.put;
      const original=JSON.stringify(state.doc),history=state.history.length;
      let allocated=0,revoked=0,writes=0;
      try{
        URL.createObjectURL=()=>{allocated++;return 'blob:synthetic-raw'};
        URL.revokeObjectURL=()=>{revoked++};
        HTMLAnchorElement.prototype.click=function(){throw Error('Synthetic raw click blocked')};
        IDBObjectStore.prototype.put=function(...args){if(this.name==='workspace')writes++;return oldPut.apply(this,args)};
        const result=downloadRecovery();
        return {result,allocated,revoked,writes,
          notice:document.getElementById('toast').textContent,
          attached:document.querySelectorAll('a[download^="nodus-recovery-raw-"]').length,
          locked:!state.storageRecovery.backupTaken&&
            document.getElementById('recovery-import').disabled&&
            document.getElementById('recovery-reset').disabled,
          rawHome:state.storageRecovery.raw?.homeBoardId,
          documentUnchanged:JSON.stringify(state.doc)===original,undoUnchanged:state.history.length===history};
      }finally{
        HTMLAnchorElement.prototype.click=oldClick;
        URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;
        IDBObjectStore.prototype.put=oldPut;
      }
    });
    assert.equal(rawFailure.result,false,JSON.stringify(rawFailure));
    assert.equal(rawFailure.allocated,1);
    assert.equal(rawFailure.revoked,1);
    assert.equal(rawFailure.attached,0);
    assert.equal(rawFailure.locked,true);
    assert.equal(rawFailure.rawHome,'missing');
    assert.equal(rawFailure.documentUnchanged,true);
    assert.equal(rawFailure.undoUnchanged,true);
    assert.equal(rawFailure.writes,0);
    assert.match(rawFailure.notice,/نسخهٔ خام/);
    await p.screenshot({path:resolve(dir,'nd024-recovery-raw-export-failure-fa.png'),animations:'disabled'});
    const englishNotice=await p.evaluate(()=>{
      state.lang='en';render();showRecovery();
      const oldCreate=URL.createObjectURL;
      try{
        URL.createObjectURL=()=>{throw Error('Synthetic raw allocation denied')};
        const ok=downloadRecovery();
        return {ok,notice:document.getElementById('toast').textContent};
      }finally{URL.createObjectURL=oldCreate}
    });
    assert.equal(englishNotice.ok,false);
    assert.match(englishNotice.notice,/Cannot export raw data/i);
    await p.screenshot({path:resolve(dir,'nd024-recovery-raw-export-failure-en.png'),animations:'disabled'});
    await p.evaluate(()=>{state.lang='fa';render();showRecovery()});
    const d=p.waitForEvent('download');
    await p.locator('#recovery-download').click();
    assert.match((await d).suggestedFilename(),/nodus-recovery-raw/);
    assert.equal(await p.evaluate(()=>state.storageRecovery.backupTaken),true);
    await p.evaluate(()=>{
      window.oldPut=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args){
        if(this.name==='workspace')throw new DOMException('Synthetic quota failure','QuotaExceededError');
        return window.oldPut.apply(this,args);
      };
    });
    const file={name:'backup.json',mimeType:'application/json',buffer:Buffer.from(valid)};
    await p.locator('#import-file').setInputFiles(file);
    await p.waitForFunction(()=>state.storageRecovery?.reason==='Synthetic quota failure');
    const frozen=await p.evaluate(()=>({
      rawAvailable:state.storageRecovery.rawAvailable,backupTaken:state.storageRecovery.backupTaken,
      rawHome:state.storageRecovery.raw?.homeBoardId,docHome:state.doc.homeBoardId,
      history:state.history.length,modalOpen:!document.getElementById('recovery-modal').hidden,
      importEnabled:!document.getElementById('recovery-import').disabled
    }));
    assert.equal(frozen.rawAvailable,true,JSON.stringify(frozen));
    assert.equal(frozen.backupTaken,true,JSON.stringify(frozen));
    assert.equal(frozen.rawHome,'missing',JSON.stringify(frozen));
    assert.notEqual(frozen.docHome,'missing',JSON.stringify(frozen));
    assert.equal(frozen.history,0,JSON.stringify(frozen));
    assert.equal(frozen.modalOpen,true,JSON.stringify(frozen));
    assert.equal(frozen.importEnabled,true,JSON.stringify(frozen));
    await p.screenshot({path:resolve(dir,'nd024-recovery-quota-retry.png'),animations:'disabled'});
    await p.evaluate(()=>{IDBObjectStore.prototype.put=window.oldPut;delete window.oldPut});
    await p.locator('#import-file').setInputFiles(file);
    await p.waitForFunction(()=>state.storageRecovery===null);
    await p.reload({waitUntil:'load'});await p.waitForFunction(()=>state.hasLoaded);
    assert.equal(await p.evaluate(()=>state.storageRecovery),null);
    assert.equal(await p.evaluate(()=>state.doc.homeBoardId),JSON.parse(valid).homeBoardId);
    console.log('PASS: real IndexedDB raw export, failed restore, retained consent, retry and reload');
  }finally{await recoverCtx.close()}


  // Fresh, isolated Chromium profile: preference storage may be denied independently of IndexedDB.
  const deniedCtx=await browser.newContext({viewport:{width:390,height:844},locale:'fa-IR'});
  try{
    await deniedCtx.addInitScript(()=>{
      Storage.prototype.getItem=function(){throw new DOMException('Preference read blocked','SecurityError')};
      Storage.prototype.setItem=function(){throw new DOMException('Preference write blocked','SecurityError')};
    });
    const p=await deniedCtx.newPage();p.on('pageerror',e=>errors.push('DeniedPrefs: '+e.message));
    await p.goto(TEST_URL,{waitUntil:'load'});await p.waitForFunction(()=>state.hasLoaded);
    assert.equal(await p.evaluate(()=>state.storageRecovery),null);
    assert.equal(await p.evaluate(()=>state.lang),'fa');
    assert.equal(await p.evaluate(()=>state.theme),'dark');
    await p.locator('#add').click();await p.locator('#nodes input').fill('فکر محفوظ');
    await p.keyboard.press('Shift+Enter');await p.waitForFunction(()=>!state.unsavedChanges);
    await p.evaluate(()=>{
      window.preferenceGraphWrites=0;
      const oldPut=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args){if(this.name==='workspace')window.preferenceGraphWrites++;return oldPut.apply(this,args)};
    });
    const doc=await p.evaluate(()=>JSON.stringify(state.doc));
    const undo=await p.evaluate(()=>state.history.length);
    await p.locator('#language').click();assert.equal(await p.evaluate(()=>state.lang),'en');
    await p.locator('#theme').click();assert.equal(await p.evaluate(()=>state.theme),'light');
    assert.equal(await p.evaluate(()=>JSON.stringify(state.doc)),doc);
    assert.equal(await p.evaluate(()=>state.history.length),undo);
    assert.equal(await p.evaluate(()=>window.preferenceGraphWrites),0);
    await p.screenshot({path:resolve(dir,'nd024-denied-preferences-mobile.png'),animations:'disabled'});
    await p.reload({waitUntil:'load'});await p.waitForFunction(()=>state.hasLoaded);
    assert.equal(await p.evaluate(()=>state.doc.nodes[0].title),'فکر محفوظ');
    assert.equal(await p.evaluate(()=>state.lang),'fa');
    assert.equal(await p.evaluate(()=>state.theme),'dark');
    assert.equal(await p.evaluate(()=>state.storageRecovery),null);
    console.log('PASS: denied localStorage boot, FA/EN and theme toggles, zero preference graph writes, IndexedDB reload');
  }finally{await deniedCtx.close()}

  // Genuine Chromium export of one fixture document. The browser cannot attest
  // the user saved the file to disk, so Nodus only claims preparation.
  const exportCtx=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true,locale:'en-US'});
  try{
    const p=await exportCtx.newPage();p.on('pageerror',e=>errors.push('BackupExport: '+e.message));
    await p.goto(TEST_URL,{waitUntil:'load'});await p.waitForFunction(()=>state.hasLoaded);
    await p.locator('#language').click();
    assert.equal(await p.evaluate(()=>state.lang),'en');
    await p.locator('#add').click();
    await p.locator('#nodes input').fill('فکر برای پشتیبان');
    await p.keyboard.press('Shift+Enter');
    await p.waitForFunction(()=>!state.unsavedChanges);
    const baseline=await p.evaluate(()=>({doc:JSON.stringify(state.doc),history:state.history.length}));
    const event=p.waitForEvent('download');
    await p.locator('#export').click();
    const downloaded=await event;
    assert.match(downloaded.suggestedFilename(),/^nodus-local-backup-.*\.json$/);
    const exported=JSON.parse(await readFile(await downloaded.path(),'utf8'));
    assert.deepEqual(JSON.stringify(exported),baseline.doc);
    assert.match(await p.locator('#toast').textContent(),/prepared/i);
    const outcome=await p.evaluate(()=>{
      const old=URL.createObjectURL,oldPut=IDBObjectStore.prototype.put;
      let writes=0;
      const before=JSON.stringify(state.doc),history=state.history.length;
      try{
        URL.createObjectURL=()=>{throw Error('synthetic backup URL allocation error')};
        IDBObjectStore.prototype.put=function(...args){if(this.name==='workspace')writes++;return oldPut.apply(this,args)};
        const result=download();
        return {result,notice:document.getElementById('toast').textContent,
          documentUnchanged:JSON.stringify(state.doc)===before,
          historyUnchanged:state.history.length===history,
          writes,unsaved:state.unsavedChanges};
      }finally{URL.createObjectURL=old;IDBObjectStore.prototype.put=oldPut}
    });
    assert.equal(outcome.result,false,JSON.stringify(outcome));
    assert.match(outcome.notice,/Could not prepare backup/i);
    assert.equal(outcome.documentUnchanged,true);
    assert.equal(outcome.historyUnchanged,true);
    assert.equal(outcome.writes,0);
    assert.equal(outcome.unsaved,false);
    await p.screenshot({path:resolve(dir,'nd024-backup-export-failure-en.png'),animations:'disabled'});
    await p.locator('#language').click();
    const fa=await p.evaluate(()=>{
      const old=URL.createObjectURL;
      try{URL.createObjectURL=()=>{throw Error('synthetic')};download();
        return document.getElementById('toast').textContent}
      finally{URL.createObjectURL=old}
    });
    assert.match(fa,/پشتیبان/);
    await p.screenshot({path:resolve(dir,'nd024-backup-export-failure-fa.png'),animations:'disabled'});
    console.log('PASS: real browser JSON backup and localized allocation failure with no graph/Undo/IDB writes');
  }finally{await exportCtx.close()}

  assert.deepEqual(errors,[]);
  console.log('PASS: FA/EN 390px layout/RTL-LTR without overflow and real mobile screenshots');
  console.log('ND-024: 18/18 real Chromium scenario groups; fixture tabs, not actual accounts/Sites/native IME');
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done))}
