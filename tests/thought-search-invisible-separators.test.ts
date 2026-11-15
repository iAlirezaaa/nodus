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


test('Persian zero-width joiner between letters is search-equivalent to a half-space, without modifying the stored title', () => {
  const n = thought('persian-zwj-title', 'پروژه\u200Dهای زمستانی');
  const before = structuredClone(n);
  assert.deepEqual(searchThoughts([n], 'پروژه‌های').visible.map(item => item.id), ['persian-zwj-title']);
  assert.deepEqual(searchThoughts([n], 'پروژههای').visible.map(item => item.id), ['persian-zwj-title']);
  assert.deepEqual(n, before);
});

test('copied joiner in a Persian query finds a clean note and nested project path', () => {
  const note = thought('note', 'Untitled', { text: 'نقشه‌های فیلم' });
  const nested = thought('path', 'Untitled', { boardId: 'nested' });
  const paths = new Map([['nested', 'استودیو / پروژه‌های فیلم']]);
  const originalNodes = JSON.stringify([note, nested]);
  const originalPaths = JSON.stringify([...paths]);
  assert.deepEqual(searchThoughts([note, nested], 'نقشه\u200Dهای').visible.map(n => n.id), ['note']);
  assert.deepEqual(searchThoughts([note, nested], 'پروژه\u200Dهای', 70, 0, paths).visible.map(n => n.id), ['path']);
  assert.deepEqual(searchThoughts([note, nested], '«پروژه\u200Dهای فیلم»', 70, 0, paths).visible.map(n => n.id), ['path']);
  assert.equal(JSON.stringify([note, nested]), originalNodes);
  assert.equal(JSON.stringify([...paths]), originalPaths);
});

test('Arabic-script joiner comparison keeps 151 hits across 70/70/11 pages', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'ایده\u200Dهای ' + i));
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'ایده‌های', 70, offset));
  assert.deepEqual(pages.map(page => [page.total, page.offset, page.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(page => page.visible.map(n => n.id)), nodes.map(n => n.id));
});

test('joiners in emoji and at punctuation boundaries are not erased by Persian folding', () => {
  const nodes = [thought('emoji', '👩‍💻'), thought('punctuation', 'کتاب\u200D!')];
  assert.equal(searchThoughts(nodes, '👩💻').total, 0);
  assert.equal(searchThoughts(nodes, 'کتاب!').total, 0);
  assert.deepEqual(searchThoughts(nodes, '👩‍💻').visible.map(n => n.id), ['emoji']);
});
