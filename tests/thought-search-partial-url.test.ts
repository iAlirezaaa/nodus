import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts, SEARCH_PAGE_SIZE } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

const linked = (id: string, url: string, title = 'پیوست') => ({
  id, boardId: 'root', title, text: '', url, asset: null,
}) as GraphNode;

test('recovers valid Persian encoded phrase even with malformed escape at end', () => {
  const nodes = [linked('broken', 'https://example.test/find?q=%D9%86%D9%88%D8%B1%20%D8%B5%D8%AD%D9%86%D9%87&bad=%ZZ')];
  assert.deepEqual(searchThoughts(nodes, '«نور صحنه»').visible.map(x => x.id), ['broken']);
});

test('recovers valid encoded phrase even after malformed unrelated escape', () => {
  const nodes = [linked('english', 'https://example.test/?bad=%QG&q=shot%20list')];
  assert.deepEqual(searchThoughts(nodes, '"shot list"').visible.map(x => x.id), ['english']);
});

test('query plus recovery remains conservative when no valid escaped run exists', () => {
  const nodes = [linked('query', 'https://example.test/?q=shot+list&bad=%QG')];
  assert.equal(searchThoughts(nodes, '"shot list"').total, 0);
});

test('incomplete UTF-8 escape leaves other valid span searchable', () => {
  const nodes = [linked('incomplete', 'https://example.test/?q=shot%20list&bad=%D9')];
  assert.deepEqual(searchThoughts(nodes, '"shot list"').visible.map(x => x.id), ['incomplete']);
});

test('malformed raw escapes remain searchable without throwing', () => {
  const nodes = [linked('raw', 'https://example.test/?bad=%QG&x=%D9')];
  assert.deepEqual(searchThoughts(nodes, '%QG').visible.map(x => x.id), ['raw']);
  assert.equal(searchThoughts(nodes, '"unknown phrase"').total, 0);
});

test('literal plus in path and hash remains distinct from a space', () => {
  const nodes = [linked('path', 'https://example.test/shot+list#bad=%QG')];
  assert.equal(searchThoughts(nodes, '"shot list"').total, 0);
  assert.equal(searchThoughts(nodes, 'shot+list').total, 1);
});

test('exact title outranks recovered links and total pages remain 70/70/11', () => {
  const nodes = [linked('exact', 'https://example.test/?q=miss', 'shot list'), ...Array.from({length:151}, (_,i)=>linked(String(i), 'https://example.test/?bad=%QG&q=shot%20list'))];
  const pages = [0,70,140].map(offset => searchThoughts(nodes, '"shot list"', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(page => [page.total,page.offset,page.visible.length]), [[152,0,70],[152,70,70],[152,140,12]]);
  assert.equal(pages[0].visible[0]?.id, 'exact');
  assert.equal(new Set(pages.flatMap(page=>page.visible.map(x=>x.id))).size, 152);
});

test('search does not rewrite malformed saved URLs, nodes or project paths', () => {
  const nodes = [linked('a', 'https://example.test/?bad=%QG&q=%D9%86%D9%88%D8%B1')];
  const paths = new Map([['root','داستان / صحنه']]);
  const before = JSON.stringify({nodes,paths:[...paths]});
  assert.equal(searchThoughts(nodes, 'نور', 70, 0, paths).total, 1);
  assert.equal(JSON.stringify({nodes,paths:[...paths]}), before);
});

test('existing invalid UTF-8 plus-query fallback remains unchanged', () => {
  const nodes = [linked('legacy', 'https://example.test/?q=shot+list%E0%A4%A')];
  assert.equal(searchThoughts(nodes, '"shot list"').total, 0);
  assert.equal(searchThoughts(nodes, '%E0').total, 1);
});
