import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoardPaths, normalizeSearchText, SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

const thought = (id: string, title: string, boardId = 'root', text = '', assetName?: string): GraphNode =>
  ({ id, title, boardId, text, asset: assetName ? { name: assetName } : null }) as GraphNode;

test('Latin ligatures, French oe/ae and German sharp-s compare in both directions without source edits', () => {
  for (const [original, typed] of [
    ['Cœur', 'coeur'],
    ['Œuvre', 'oeuvre'],
    ['Æther', 'aether'],
    ['encyclopædia', 'encyclopaedia'],
    ['Straße', 'strasse'],
    ['ẞ', 'ss'],
  ]) {
    assert.equal(normalizeSearchText(original), normalizeSearchText(typed));
    assert.equal(searchThoughts([thought('original', original)], typed).total, 1);
    assert.equal(searchThoughts([thought('typed', typed)], original).total, 1);
  }
});

test('ligature queries find individual titles, notes and filenames with existing relevance tiers', () => {
  const nodes = [
    thought('note', 'Other', 'root', 'An Œuvre in progress'),
    thought('file', 'Other', 'root', '', 'Straße-ref.pdf'),
    thought('title', 'Cœur story'),
    thought('unrelated', 'Core data'),
  ];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'oeuvre').visible.map(n => n.id), ['note']);
  assert.deepEqual(searchThoughts(nodes, 'strasse').visible.map(n => n.id), ['file']);
  assert.deepEqual(searchThoughts(nodes, 'coeur').visible.map(n => n.id), ['title']);
  assert.equal(searchThoughts(nodes, 'core').total, 1);
  assert.equal(JSON.stringify(nodes), before);
});

test('full nested project names match without leaking into another root', () => {
  const parent = { ...thought('parent', 'Container'), childBoardId: 'child' };
  const nodes = [parent, thought('inside', 'Shot', 'child'), thought('outside', 'Shot', 'other')];
  const document = { nodes, boards: [
    { id: 'root', title: 'Library', parentNodeId: null },
    { id: 'child', title: 'Œuvre', parentNodeId: 'parent' },
    { id: 'other', title: 'Another space', parentNodeId: null },
  ] } as Pick<Workspace, 'boards' | 'nodes'>;
  const before = JSON.stringify(document);
  const paths = buildBoardPaths(document, 'Untitled');
  assert.equal(paths.get('child'), 'Library / Œuvre');
  assert.deepEqual(searchThoughts(nodes, 'oeuvre', 70, 0, paths).visible.map(n => n.id), ['inside']);
  assert.deepEqual(searchThoughts(nodes, '"library / oeuvre"', 70, 0, paths).visible.map(n => n.id), ['inside']);
  assert.equal(JSON.stringify(document), before);
});

test('quoted ligature phrases stay within one field and preserve word order', () => {
  const nodes = [
    thought('match', 'Cœur du film'),
    thought('fragmented', 'Cœur', 'root', 'du film'),
    thought('reverse', 'du film Cœur'),
  ];
  assert.deepEqual(searchThoughts(nodes, '"coeur du film"').visible.map(n => n.id), ['match']);
  assert.deepEqual(searchThoughts(nodes, '"cœur du film"').visible.map(n => n.id), ['match']);
});

test('151 ligature results retain accurate count, 70-item pages and stable ordering', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), i % 2 ? 'Cœur' : 'Coeur'));
  const before = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'coeur', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
  assert.equal(JSON.stringify(nodes), before);
});

test('Persian, emoji, Greek and ordinary Latin behavior is unchanged', () => {
  assert.equal(normalizeSearchText('کتاب‌های ۱۲۳'), normalizeSearchText('كتابهاي 123'));
  assert.equal(normalizeSearchText('👩\u200D💻'), '👩\u200D💻');
  assert.equal(normalizeSearchText('Café'), normalizeSearchText('cafe'));
  assert.notEqual(normalizeSearchText('άνοιξη'), normalizeSearchText('ανοιξη'));
});
