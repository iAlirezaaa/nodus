import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

function thought(id: string, title: string, extras: Partial<GraphNode> = {}): GraphNode {
  return { id, title, text: '', boardId: 'home', asset: null, url: null, ...extras } as GraphNode;
}

for (const [name, stored, typed] of [
  ['zero-width space', 'کتاب\u200Bخانه', 'کتابخانه'],
  ['word joiner', 'سند\u2060مالک', 'سندمالک'],
  ['embedded BOM', 'Plan\uFEFF2026', 'plan2026'],
] as const) {
  test(name + ' inside title does not hide a search result', () => {
    const n = thought(name, stored);
    const before = structuredClone(n);
    assert.equal(searchThoughts([n], typed).total, 1);
    assert.deepEqual(n, before, 'comparison may not rewrite saved node content');
  });
}

test('copied invisible separators in notes, attachment names and full paths remain searchable', () => {
  const note = thought('note', 'Untitled', { text: 'گزارش\u200Bنهایی' });
  const file = thought('file', 'Untitled', { asset: { name: 'Budget\u20602026.pdf' } as GraphNode['asset'] });
  const nested = thought('path', 'Untitled', { boardId: 'nested' });
  assert.deepEqual(searchThoughts([note, file, nested], 'گزارشنهایی').visible.map(n => n.id), ['note']);
  assert.deepEqual(searchThoughts([note, file, nested], 'budget2026').visible.map(n => n.id), ['file']);
  assert.deepEqual(searchThoughts([note, file, nested], 'پروژهخاص', 70, 0, new Map([['nested', 'خانه / پروژه\uFEFFخاص']])).visible.map(n => n.id), ['path']);
});

for (const value of ['\u200B', '\u2060', '\uFEFF', ' \uFEFF ', '\u200B\u2060']) {
  test('only invisible formatting cannot become an all-results browse: ' + JSON.stringify(value), () => {
    const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'Idea ' + i));
    assert.deepEqual(searchThoughts(nodes, value), { visible: [], total: 0, offset: 0 });
  });
}

test('emoji ZWJ sequences remain meaningful, including negative match without joiner', () => {
  const n = thought('emoji', '👩‍💻');
  assert.equal(searchThoughts([n], '👩‍💻').total, 1);
  assert.equal(searchThoughts([n], '👩💻').total, 0);
});

test('ordinary blank browsing and total versus bounded pages remain unchanged', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'Idea ' + i));
  assert.deepEqual([0, 70, 140].map(offset => {
    const result = searchThoughts(nodes, 'idea', SEARCH_PAGE_SIZE, offset);
    return [result.total, result.offset, result.visible.length];
  }), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.equal(searchThoughts(nodes, '\t  ').total, 151);
  assert.equal(searchThoughts(nodes, '').visible.length, SEARCH_PAGE_SIZE);
});
