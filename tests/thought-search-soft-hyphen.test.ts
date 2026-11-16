import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, buildBoardPaths, normalizeSearchText, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

const thought = (id: string, title: string, boardId = 'root', text = ''): GraphNode =>
  ({ id, title, boardId, text, asset: null, url: null }) as GraphNode;

test('invisible PDF soft hyphen compares as ordinary text in both directions', () => {
  for (const [pasted, typed] of [
    ['برنامه\u00ADریزی', 'برنامهریزی'],
    ['co\u00ADoperation', 'cooperation'],
    ['پرو\u00ADژه', 'پروژه'],
  ]) {
    assert.equal(normalizeSearchText(pasted), normalizeSearchText(typed));
    assert.equal(searchThoughts([thought('pasted', pasted)], typed).total, 1);
    assert.equal(searchThoughts([thought('typed', typed)], pasted).total, 1);
  }
});

test('Persian title and Latin notes are searchable without rewriting imported content', () => {
  const nodes = [thought('fa', 'برنامه\u00ADریزی'), thought('en', 'Other', 'root', 'Team co\u00ADoperation')];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'برنامهریزی').visible.map(n => n.id), ['fa']);
  assert.deepEqual(searchThoughts(nodes, 'cooperation').visible.map(n => n.id), ['en']);
  assert.deepEqual(searchThoughts(nodes, '"cooperation"').visible.map(n => n.id), ['en']);
  assert.equal(JSON.stringify(nodes), before);
});

test('complete nested project location accepts invisible soft hyphens in a copied board title', () => {
  const folder = { ...thought('folder', 'Container'), childBoardId: 'child' };
  const nodes = [folder, thought('inside', 'Shot', 'child'), thought('outside', 'Shot', 'other')];
  const doc = { nodes, boards: [
    { id: 'root', title: 'استودیو', parentNodeId: null },
    { id: 'child', title: 'پرو\u00ADژه نور', parentNodeId: 'folder' },
    { id: 'other', title: 'Other root', parentNodeId: null },
  ] } as Pick<Workspace, 'boards' | 'nodes'>;
  const before = JSON.stringify(doc);
  const paths = buildBoardPaths(doc, 'Untitled');
  assert.deepEqual(searchThoughts(nodes, 'پروژه', 70, 0, paths).visible.map(n => n.id), ['inside']);
  assert.deepEqual(searchThoughts(nodes, '«استودیو / پروژه نور»', 70, 0, paths).visible.map(n => n.id), ['inside']);
  assert.equal(JSON.stringify(doc), before);
});

test('151 pasted titles retain exact counts, ranking, 70-result page windows and data', () => {
  const nodes = Array.from({ length: 151 }, (_, i) =>
    thought(String(i), (i % 2 ? 'پرو\u00ADژه ' : 'پروژه ') + i));
  const before = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'پروژه', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
  assert.equal(JSON.stringify(nodes), before);
});

test('emoji ZWJ, digit variants and explicit empty searches preserve old semantics', () => {
  assert.equal(normalizeSearchText('👩\u200D💻'), '👩\u200D💻');
  assert.equal(normalizeSearchText('۱۲۳'), normalizeSearchText('123'));
  assert.deepEqual(searchThoughts([thought('a', 'Hello')], '""'), { visible: [], total: 0, offset: 0 });
});

test('copied soft-hyphen outside quotes retains exact field matching in English and Persian', () => {
  const nodes = [
    thought('en', 'Forest Lighting'),
    thought('fa', 'پروژه نور'),
    thought('split', 'Forest', 'root', 'Lighting'),
    thought('extended', 'Forest Lighting supplementary'),
  ];
  const saved = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, '\u00AD"Forest Lighting"\u00AD').visible.map(n => n.id), ['en', 'extended']);
  assert.deepEqual(searchThoughts(nodes, '\u2067\u00AD«پروژه نور»\u00AD\u2069').visible.map(n => n.id), ['fa']);
  assert.equal(JSON.stringify(nodes), saved);
});
