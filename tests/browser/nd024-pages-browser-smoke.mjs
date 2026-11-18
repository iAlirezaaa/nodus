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
  assert.deepEqual(errors,[]);
  console.log('PASS: FA/EN 390px layout/RTL-LTR without overflow and real mobile screenshots');
  console.log('ND-024: 11/11 real Chromium scenario groups; fixture tabs, not actual accounts/Sites/native IME');
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done))}
