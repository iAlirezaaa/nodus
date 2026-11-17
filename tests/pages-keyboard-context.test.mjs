import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../pages/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Pages inline script is required');
const graphHandler = script.split('\n').find(s => s.includes("document.addEventListener('keydown',e=>"));
const nodeHandler = script.split('\n').find(s => s.includes("el.addEventListener('keydown',ev=>"));
assert.ok(graphHandler && nodeHandler, 'Exact Pages keyboard handlers must remain testable');

function simulate(target, key, options = {}) {
  let documentHandler, nodeKeyHandler;
  const calls = { add:0, sibling:0, child:0, undo:0, redo:0, remove:0, edit:0, search:0, fit:0 };
  const canvas = {classList:{contains:()=>false},closest:()=>null};
  const node = {classList:{contains:s=>s==='node'},closest:s=>s==='.node'?node:null};
  const button = {classList:{contains:()=>false},closest:()=>null};
  class Input {}
  class Textarea {}
  const focused = target==='node'?node:target==='canvas'?canvas:target==='input'?new Input():button;
  const document = {activeElement:focused,addEventListener:(type,handler)=>{if(type==='keydown')documentHandler=handler}};
  const state = {selected:target==='node'?'n':null,storageRecovery:null,groupMode:false,linkFrom:null,selectedIds:new Set(),boardId:'b',doc:{}};
  const $ = id=>id==='canvas'?canvas:id==='search-modal'?{hidden:true}:null;
  const fn = new Function('document','el','n','$','state','HTMLInputElement','HTMLTextAreaElement','L',
    'addNode','addSibling','addChild','undo','redo','removeSelected','inlineEdit','fit','select','openSearch','render','onBoard',
    "const canvas=$('canvas'); "+nodeHandler+'; '+graphHandler);
  fn(document,{addEventListener:(type,handler)=>{if(type==='keydown')nodeKeyHandler=handler}},{id:'n'},$,state,Input,Textarea,(_fa,en)=>en,
    ()=>calls.add++,()=>calls.sibling++,()=>calls.child++,()=>calls.undo++,()=>calls.redo++,()=>calls.remove++,
    ()=>calls.edit++,()=>calls.fit++,()=>{},()=>calls.search++,()=>{},()=>[]);
  const event = {key,shiftKey:!!options.shiftKey,ctrlKey:!!options.ctrlKey,metaKey:!!options.metaKey,altKey:!!options.altKey,isComposing:!!options.isComposing,
    keyCode:options.keyCode??(options.isComposing?229:0),defaultPrevented:!!options.handled,target:focused,
    preventDefault(){this.defaultPrevented=true;}};
  if(target==='node' && options.bubble!==false)nodeKeyHandler(event);
  documentHandler(event);
  return {calls,event};
}
test('ND-024 native buttons and toolbar keys are not graph commands',()=>{
  const enter=simulate('button','Enter');
  assert.equal(enter.calls.add,0);
  assert.equal(enter.event.defaultPrevented,false);
  assert.equal(simulate('button','z',{ctrlKey:true}).calls.undo,0);
  assert.equal(simulate('button','Delete').calls.remove,0);
});
test('ND-024 graph Enter/F2/Delete are handled exactly once during bubbling',()=>{
  assert.equal(simulate('canvas','Enter').calls.add,1);
  assert.equal(simulate('node','Enter').calls.sibling,1);
  assert.equal(simulate('node','F2').calls.edit,1);
  assert.equal(simulate('node','Delete').calls.remove,1);
});
test('ND-024 Tab child retains native Shift+Tab reverse focus',()=>{
  assert.equal(simulate('node','Tab',{bubble:false}).calls.child,1);
  const backwards=simulate('node','Tab',{shiftKey:true,bubble:false});
  assert.equal(backwards.calls.child,0);
  assert.equal(backwards.event.defaultPrevented,false);
});
test('ND-024 composition, already-handled and input keys never create ideas',()=>{
  assert.equal(simulate('canvas','Enter',{isComposing:true}).calls.add,0);
  assert.equal(simulate('canvas','Enter',{handled:true}).calls.add,0);
  assert.equal(simulate('input','Enter').calls.add,0);
});
test('ND-024 exact inline source parses and matches CSP hash',()=>{
  new Function(script);
  assert.equal(html.match(/script-src 'sha256-([^']+)'/)?.[1],createHash('sha256').update(script).digest('base64'));
});


test('ND-024 modified Enter/Tab never mutate graph or intercept browser shortcuts',()=>{
  for(const modifier of ['ctrlKey','metaKey','altKey']){
    for(const target of ['canvas','node']){
      for(const key of ['Enter','Tab']){
        const result=simulate(target,key,{[modifier]:true});
        assert.equal(result.calls.add,0,`${target} ${modifier}+${key} must not create a root`);
        assert.equal(result.calls.sibling,0,`${target} ${modifier}+${key} must not create a sibling`);
        assert.equal(result.calls.child,0,`${target} ${modifier}+${key} must not create a child`);
        assert.equal(result.event.defaultPrevented,false,`${target} ${modifier}+${key} must remain native`);
      }
    }
  }
  for(const target of ['canvas','node']){
    const result=simulate(target,'Enter',{shiftKey:true});
    assert.equal(result.calls.add+result.calls.sibling+result.calls.child,0,'Shift+Enter must not create a node');
    assert.equal(result.event.defaultPrevented,false,'Shift+Enter stays available for the surrounding interface');
  }
  assert.equal(simulate('canvas','Enter').calls.add,1,'plain Enter still creates a root');
  assert.equal(simulate('node','Enter').calls.sibling,1,'plain Enter still creates a sibling');
  assert.equal(simulate('node','Tab').calls.child,1,'plain Tab still creates one child');
  assert.equal(simulate('node','Tab',{shiftKey:true}).event.defaultPrevented,false,'Shift+Tab stays native');
  assert.equal(simulate('node','Enter',{isComposing:true}).calls.sibling,0,'IME Enter must not commit a sibling');
  assert.equal(simulate('node','Enter',{keyCode:229}).calls.sibling,0,'229 IME fallback must not commit a sibling');
  assert.equal(simulate('node','Enter',{handled:true}).calls.sibling,0,'already-handled Enter must not commit a sibling');
});
