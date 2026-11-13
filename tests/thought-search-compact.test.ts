import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoardPaths, searchThoughts, SEARCH_PAGE_SIZE } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

function node(id: string, title: string, boardId = 'root', text = '', assetName?: string, childBoardId: string | null = null): GraphNode {
  return { id, title, boardId, text, asset: assetName ? { name: assetName } : null, childBoardId } as GraphNode;
}
function board(id: string, title: string, parentNodeId: string | null = null): Workspace['boards'][number] {
  return { id, title, parentNodeId, description: '', createdAt: '2026-11-13T00:00:00Z' };
}
test('Persian compounds search in both directions without rewriting document', () => {
  const items = [node('a', 'کتاب‌های زندگی'), node('b','کتاب های دیگر'), node('c','کتابهای سوم')];
  const before = JSON.stringify(items);
  assert.deepEqual(searchThoughts(items, 'كتابهاي').visible.map(n => n.id), ['a','b','c']);
  assert.deepEqual(searchThoughts(items, 'کتاب های').visible.map(n => n.id), ['a','b','c']);
  assert.deepEqual(searchThoughts(items, 'کتاب‌های').visible.map(n => n.id), ['a','b','c']);
  assert.equal(JSON.stringify(items),before);
});
test('location is found with or without slash and Persian spacing', () => {
  const nodes=[node('container','Holder','root','',undefined,'child'),node('leaf','Shot note','child')];
  const paths=buildBoardPaths({nodes,boards:[board('root','کتاب‌های ۱۲۳'),board('child','بخش دوم', 'container')]},'Untitled');
  const before = JSON.stringify([...paths]);
  assert.deepEqual(searchThoughts(nodes,'کتابهای۱۲۳/بخشدوم',70,0,paths).visible.map(n=>n.id),['leaf']);
  assert.deepEqual(searchThoughts(nodes,'كتاب هاي 123 بخش دوم',70,0,paths).visible.map(n=>n.id),['leaf']);
  assert.equal(JSON.stringify([...paths]),before);
});
test('compact fallback never stitches separate fields into a new match', () => {
  const items=[node('a','نو','root','دوس','word'),node('b','safe','root','unrelated','File Name.pdf')];
  assert.equal(searchThoughts(items,'نودوس').total,0);
  assert.deepEqual(searchThoughts(items,'filenamepdf').visible.map(n=>n.id),['b']);
});
test('paging still counts complete 151 matches and clamps stale offsets', () => {
  const items=Array.from({length:151},(_,i)=>node(String(i),'کتاب های '+i));
  const pages=[0,70,140].map(offset=>searchThoughts(items,'کتابهای',SEARCH_PAGE_SIZE,offset));
  assert.deepEqual(pages.map(p=>[p.total,p.visible.length,p.offset]),[[151,70,0],[151,70,70],[151,11,140]]);
  assert.deepEqual(pages.flatMap(p=>p.visible.map(n=>n.id)),items.map(n=>n.id));
  assert.deepEqual(searchThoughts(items.slice(0,81),'کتابهای',70,140).visible.map(n=>n.id),items.slice(70,81).map(n=>n.id));
});
test('original exact English search, Unicode numbers and malformed paths survive',()=>{
  const items=[node('a','scene ٤٥٦','root','Lighting'),node('b','Reference','root','','Storyboard.PDF')];
  assert.deepEqual(searchThoughts(items,'۴۵۶').visible.map(n=>n.id),['a']);
  assert.deepEqual(searchThoughts(items,'lighting').visible.map(n=>n.id),['a']);
  assert.deepEqual(searchThoughts(items,'pdf').visible.map(n=>n.id),['b']);
  const malformed=buildBoardPaths({boards:[board('a','A','holderb'),board('b','B','holdera')],nodes:[node('holderb','X','b'),node('holdera','Y','a')]},'Untitled');
  assert.equal(malformed.size,2);
});
