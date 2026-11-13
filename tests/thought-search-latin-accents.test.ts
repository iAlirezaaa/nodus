import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts, buildBoardPaths } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';
const node = (id: string, title: string, text = '', boardId = 'root', assetName?: string) =>
  ({ id, title, text, boardId, asset: assetName ? { name: assetName } : null }) as GraphNode;
const board = (id: string, title: string, parentNodeId: string | null = null) =>
  ({ id, title, parentNodeId, description: '', createdAt: '2026-11-13T00:00:00Z' }) as Workspace['boards'][number];

test('unaccented searches find composed French and Turkish Latin titles without changing text', () => {
  const nodes = [node('a', 'Café'), node('b', 'RÉSUMÉ'), node('c', 'İstanbul')];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'cafe').visible.map(n => n.id), ['a']);
  assert.deepEqual(searchThoughts(nodes, 'resume').visible.map(n => n.id), ['b']);
  assert.deepEqual(searchThoughts(nodes, 'istanbul').visible.map(n => n.id), ['c']);
  assert.equal(JSON.stringify(nodes), before);
});

test('decomposed accents and comparison-only path/file/note search retain ranking', () => {
  const nodes = [node('note', 'Unrelated', 'Crème brûlée'), node('asset', 'Unrelated', '', 'root', 'Cafe\u0301.pdf'), node('path', 'Unrelated', '', 'nested'), node('title', 'CafÉ design')];
  const paths = new Map([['nested', 'Studio / CafÉ location']]);
  const before = JSON.stringify({ nodes, paths: [...paths] });
  assert.deepEqual(searchThoughts(nodes, 'cafe', 70, 0, paths).visible.map(n => n.id), ['title','path','asset']);
  assert.deepEqual(searchThoughts(nodes, 'creme brulee', 70, 0, paths).visible.map(n => n.id), ['note']);
  assert.equal(JSON.stringify({ nodes, paths: [...paths] }), before);
});

test('nested project names and mixed words remain restricted to supplied board paths', () => {
  const nodes = [node('holder', 'Project', '', 'root'), node('inside','Light plan','', 'nested'),node('other','Light plan', '', 'other')];
  const paths = buildBoardPaths({ nodes, boards: [board('root','Production'),board('nested','Résumé', 'holder'),board('other','Other')] },'Untitled');
  assert.deepEqual(searchThoughts(nodes,'resume',70,0,paths).visible.map(n=>n.id), ['inside']);
  assert.deepEqual(searchThoughts(nodes,'resume light',70,0,paths).visible.map(n=>n.id), ['inside']);
  assert.equal(searchThoughts(nodes,'resume light').total,0);
});

test('Persian, Arabic numerals, and unrelated non-Latin diacritics keep earlier behavior', () => {
  const nodes = [node('fa','کتاب‌های ۱۲۳'),node('ar','مُدَوَّن'),node('el','άνοιξη'),node('en','spring')];
  assert.deepEqual(searchThoughts(nodes,'كتابهاي 123').visible.map(n=>n.id),['fa']);
  assert.deepEqual(searchThoughts(nodes,'مدون').visible.map(n=>n.id),['ar']);
  assert.deepEqual(searchThoughts(nodes,'άνοιξη').visible.map(n=>n.id),['el']);
  assert.equal(searchThoughts(nodes,'ανοιξη').total,0);
});

test('punctuation does not fabricate a split Latin word across fields',()=>{
  const nodes=[node('bad','F-oo','B-ar'),node('bad2','Ca','fe'),node('good','Café-related')];
  assert.equal(searchThoughts(nodes,'foobar').total,0);
  assert.equal(searchThoughts(nodes,'cafe').total,1);
  assert.deepEqual(searchThoughts(nodes,'cafe').visible.map(n=>n.id),['good']);
});

test('151 accent-folded hits keep stable 70/70/11 paging and source identity',()=>{
  const nodes=Array.from({length:151},(_,i)=>node(String(i),'Café ' + i));
  const pages=[0,70,140].map(offset=>searchThoughts(nodes,'cafe',SEARCH_PAGE_SIZE,offset));
  assert.deepEqual(pages.map(p=>[p.total,p.offset,p.visible.length]),[[151,0,70],[151,70,70],[151,140,11]]);
  assert.deepEqual(pages.flatMap(p=>p.visible.map(n=>n.id)),nodes.map(n=>n.id));
  assert.deepEqual(searchThoughts(nodes.slice(0,71),'cafe',SEARCH_PAGE_SIZE,140).visible.map(n=>n.id),['70']);
});
