import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts, buildBoardPaths } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

const note = (id: string, title: string, text = '', boardId = 'root', filename?: string) =>
  ({ id, title, text, boardId, asset: filename ? { name: filename } : null }) as GraphNode;
const board = (id: string, title: string, parentNodeId: string | null = null) =>
  ({ id, title, parentNodeId, description: '', createdAt: '2026-11-13T00:00:00Z' }) as Workspace['boards'][number];

test('reversed keywords find titles and title/note combinations', () => {
  const nodes = [note('a', 'Lighting in the forest'), note('b', 'Forest scene', 'Lighting references'), note('c', 'Forest scene', 'Camera notes')];
  assert.deepEqual(searchThoughts(nodes, 'forest lighting').visible.map(x => x.id), ['a', 'b']);
  assert.deepEqual(searchThoughts(nodes, 'lighting forest').visible.map(x => x.id), ['a', 'b']);
  assert.equal(searchThoughts(nodes, 'forest missing').total, 0);
});

test('contiguous phrase matches retain priority over unordered fallback', () => {
  const nodes = [note('fallback', 'Forest film notes', 'Lighting'), note('notes', 'Other', 'Forest Lighting'), note('exact', 'Forest Lighting'), note('prefix', 'Forest Lighting plan'), note('partial', 'The Forest Lighting setup')];
  assert.deepEqual(searchThoughts(nodes, 'forest lighting').visible.map(x => x.id), ['exact','prefix','partial','notes','fallback']);
});

test('Persian keyboard variants and out-of-order project paths work without mutation', () => {
  const nodes = [note('parent', 'پروژه', '', 'root'), note('child', 'طرح لباس', 'چراغ', 'inner'), note('other', 'چراغ', '', 'other')];
  const doc = { boards: [board('root', 'فیلم'),board('inner', 'جنگل‌های ۱۲۳','parent'),board('other','استودیو')], nodes };
  const before = JSON.stringify(doc);
  const paths = buildBoardPaths(doc, 'بدون عنوان');
  assert.deepEqual(searchThoughts(nodes, '١٢٣ جنگلهاي طرح', 70, 0, paths).visible.map(x => x.id), ['child']);
  assert.deepEqual(searchThoughts(nodes, 'چراغ جنگلهای', 70, 0, paths).visible.map(x => x.id), ['child']);
  assert.deepEqual(searchThoughts(nodes, 'چراغ جنگلهای', 70, 0).visible, []);
  assert.equal(JSON.stringify(doc), before);
});

test('filename, notes and location may each supply one keyword; missing keyword never matches', () => {
  const nodes = [note('a', 'Establishing', 'Night', 'shot', 'Forest-Storyboard.PDF'), note('b', 'Night shot', 'Unrelated', 'other')];
  const paths = new Map([['shot', 'Movie / Act 3'], ['other', 'Daylight']]);
  assert.deepEqual(searchThoughts(nodes, 'night forest act', 70, 0, paths).visible.map(x => x.id), ['a']);
  assert.equal(searchThoughts(nodes, 'night forest act missing', 70, 0, paths).total, 0);
});

test('151 multi-keyword matches maintain full count, stable paging, and stale-page clamping', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => note(String(i), 'Forest scene', 'Lighting reference'));
  const pages = [0,70,140].map(offset => searchThoughts(nodes,'lighting forest',SEARCH_PAGE_SIZE,offset));
  assert.deepEqual(pages.map(p => [p.total,p.offset,p.visible.length]), [[151,0,70],[151,70,70],[151,140,11]]);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
  assert.deepEqual(searchThoughts(nodes.slice(0,81),'lighting forest',70,140).visible.map(n => n.id), nodes.slice(70,81).map(n => n.id));
});

test('blank and single-word searches preserve existing behavior', () => {
  const nodes = [note('a','One title','Other'), note('b','Other','One title')];
  assert.deepEqual(searchThoughts(nodes,' ').visible.map(n=>n.id),['a','b']);
  assert.deepEqual(searchThoughts(nodes,'one').visible.map(n=>n.id),['a','b']);
  assert.deepEqual(searchThoughts(nodes,'one',0),{visible:[],total:2,offset:0});
});
