import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const html=readFileSync(new URL('../pages/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Pages inline script is required');
const lines=script.split('\n');
const openLine=lines.find(x=>x.startsWith('function openSearch('));
const closeLine=lines.find(x=>x.startsWith('function closeSearch('));
const keyLine=lines.find(x=>x.includes("document.addEventListener('keydown',e=>"));
const setupLine=lines.find(x=>x.includes("$('search-close').onclick="));
assert.ok(openLine&&closeLine&&keyLine&&setupLine,'Source-exact search handlers must be present');

function session(origin='node',change='none'){
  let keyHandler;
  const document={activeElement:null,body:{},addEventListener:(type,cb)=>{if(type==='keydown')keyHandler=cb}};
  const make=(node=false,id='')=>{
    const el={dataset:{node:id},isConnected:true,classList:{contains:k=>node&&k==='node'},
      focus(){document.activeElement=el},addEventListener(){},value:''};
    return el;
  };
  const oldCard=make(origin==='node','thought-1'),newCard=make(true,'thought-1');
  const canvas=make(),searchButton=make(),closeButton=make(),input=make();
  const modal={hidden:true,addEventListener:(type,cb)=>{if(type==='pointerdown')modal.onBackdrop=cb}};
  const nodes={children:[oldCard]},elements={'canvas':canvas,'search-open':searchButton,'search-close':closeButton,
    'search-modal':modal,'search-input':input,'nodes':nodes};
  document.activeElement=origin==='button'?searchButton:oldCard;
  const $=id=>elements[id];
  class Input{}; class Textarea{};
  let writes=0;
  const factory=new Function('document','$','state','flushEditor','renderResults','requestAnimationFrame','HTMLInputElement','HTMLTextAreaElement',
    'let searchReturnFocus=null,searchReturnNodeId=null;\n'+openLine+'\n'+closeLine+'\n'+keyLine+'\nreturn {openSearch,closeSearch}');
  const api=factory(document,$,{storageRecovery:null},()=>{
    if(change==='remount'){oldCard.isConnected=false;nodes.children=[newCard]}
    if(change==='remove'){oldCard.isConnected=false;nodes.children=[]}
  },()=>{},cb=>cb(),Input,Textarea);
  const register=new Function('$','openSearch','closeSearch','renderResults',setupLine);
  register($,api.openSearch,api.closeSearch,()=>{});
  function escape(){
    const evt={key:'Escape',target:document.activeElement,defaultPrevented:false,isComposing:false,keyCode:0,
      ctrlKey:false,metaKey:false,preventDefault(){this.defaultPrevented=true}};
    keyHandler(evt);return evt;
  }
  return {document,oldCard,newCard,canvas,searchButton,closeButton,input,modal,nodes,api,escape,
    getWrites:()=>writes};
}

test('Escape restores focus to remounted graph card after the dialog closes',()=>{
  const s=session('node','remount');s.api.openSearch();
  assert.equal(s.document.activeElement,s.input);
  const evt=s.escape();
  assert.equal(s.modal.hidden,true);
  assert.equal(evt.defaultPrevented,true);
  assert.equal(s.document.activeElement,s.newCard);
  assert.equal(s.getWrites(),0);
});

test('Escape returns to toolbar opener and never keeps focus inside a hidden modal',()=>{
  const s=session('button');s.api.openSearch();
  s.escape();assert.equal(s.document.activeElement,s.searchButton);
  assert.equal(s.modal.hidden,true);
});

test('A removed graph opener falls back to the visible canvas',()=>{
  const s=session('node','remove');s.api.openSearch();s.escape();
  assert.equal(s.document.activeElement,s.canvas);
});

test('Close button and backdrop close through the same focus-restoring path',()=>{
  for(const way of ['close','backdrop']){
    const s=session('button');s.api.openSearch();
    if(way==='close')s.closeButton.onclick();
    else s.modal.onBackdrop({target:s.modal});
    assert.equal(s.modal.hidden,true);
    assert.equal(s.document.activeElement,s.searchButton);
  }
});

test('Selecting a search result does not overwrite its destination focus',()=>{
  assert.match(script,/closeSearch\(false\);render\(\);focusSelected\(\)/);
  const s=session('button');s.api.openSearch();
  s.api.closeSearch(false);
  assert.equal(s.document.activeElement,s.input,'Caller must focus the chosen result');
  s.canvas.focus();
  assert.equal(s.document.activeElement,s.canvas);
});

test('Script parses, CSP hash matches, and modal closure has no persistence side effect',()=>{
  new Function(script);
  assert.equal(html.match(/script-src 'sha256-([^']+)'/)?.[1],createHash('sha256').update(script).digest('base64'));
  const s=session('button');s.api.openSearch();s.closeButton.onclick();assert.equal(s.getWrites(),0);
});
