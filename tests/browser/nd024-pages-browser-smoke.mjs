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
  await a.locator('#language').click();assert.equal(await a.evaluate(()=>state.lang),'en');
  await a.locator('#motion').selectOption('off');
  assert.equal(await a.locator('#canvas').getAttribute('data-motion'),'off');
  await a.screenshot({path:resolve(dir,'nd024-en-desktop.png'),animations:'disabled'});
  console.log('PASS: reload, EN, motion off and genuine desktop screenshot');
  const m=await ctx.newPage();await m.setViewportSize({width:390,height:844});
  m.on('pageerror',e=>errors.push('M: '+e.message));
  await m.goto(TEST_URL,{waitUntil:'load'});await m.waitForFunction(()=>state.hasLoaded);
  const dim=await m.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,n:state.doc.nodes.length}));
  assert.equal(dim.w,390);assert.equal(dim.n,4);assert.ok(dim.scroll<=392,'390px overflow: '+JSON.stringify(dim));
  await m.screenshot({path:resolve(dir,'nd024-fa-mobile-390.png'),animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: 390px viewport without horizontal overflow, real screenshot');
  console.log('ND-024: 10/10 real Chromium scenario groups; actual accounts/Sites/native IME NOT tested');
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done))}
