import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts, buildBoardPaths } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';
const n=(id:string,title:string,text='',boardId='root',name?:string) => ({id,title,text,boardId,asset:name?{name}:null}) as GraphNode;

test('exact title before prefix before substring before path before attachment before notes',()=>{
 const nodes=[n('notes','Unrelated','Lighting'),n('asset','Unrelated','','root','Lighting.PDF'),n('path','Unrelated','','nested'),n('partial','Scene Lighting setup'),n('prefix','Lighting plan'),n('exact','LIGHTING')];
 const result=searchThoughts(nodes,'lighting',70,0,new Map([['nested','Movie / Lighting']]));
 assert.equal(result.total,6);assert.deepEqual(result.visible.map(x=>x.id),['exact','prefix','partial','path','asset','notes']);
});
test('stable ties and every page remains a non-overlapping 70-result window',()=>{
 const nodes=Array.from({length:151},(_,i)=>n(String(i),'Ideas','Lighting'));
 nodes[148].title='Lighting';nodes[150].title='Lighting plan';
 const pages=[0,70,140].map(offset=>searchThoughts(nodes,'Lighting',SEARCH_PAGE_SIZE,offset));
 assert.deepEqual(pages.map(p=>[p.total,p.offset,p.visible.length]),[[151,0,70],[151,70,70],[151,140,11]]);
 assert.deepEqual(pages.flatMap(p=>p.visible.map(n=>n.id)).slice(0,4),['148','150','0','1']);
 assert.equal(new Set(pages.flatMap(p=>p.visible.map(n=>n.id))).size,151);
 assert.deepEqual(searchThoughts(nodes,'Lighting',SEARCH_PAGE_SIZE,200).visible.map(n=>n.id),pages[2].visible.map(n=>n.id));
});
test('Persian compound variants and nested path matches are read-only',()=>{
 const nodes=[n('a','کتاب‌های من'),n('b','Other','','book'),n('c','Other','کتابهای من')];
 const paths=new Map([['book','کتاب های زندگی']]);
 const copy=JSON.stringify(nodes);
 assert.deepEqual(searchThoughts(nodes,'كتابهاي',70,0,paths).visible.map(x=>x.id),['a','b','c']);
 assert.equal(JSON.stringify(nodes),copy);
});
test('legacy exact cross-field search retained, compact cross-field false positives excluded',()=>{
 const nodes=[n('legacy','Foo','Bar'),n('separate','F-oo','B-ar')];
 assert.deepEqual(searchThoughts(nodes,'foo bar').visible.map(n=>n.id),['legacy']);
 assert.deepEqual(searchThoughts(nodes,'foobar').visible.map(n=>n.id),[]);
});
test('empty query, zero cap, missing paths and stale offset remain safe',()=>{
 const nodes=[n('a','AAA'),n('b','BBB')];
 assert.deepEqual(searchThoughts(nodes,'').visible.map(n=>n.id),['a','b']);
 assert.deepEqual(searchThoughts(nodes,'a',0,100),{visible:[],total:1,offset:0});
 assert.deepEqual(searchThoughts(nodes,'z',70,140),{visible:[],total:0,offset:0});
 assert.deepEqual(searchThoughts(nodes,'a',70,140).visible.map(n=>n.id),['a']);
});
