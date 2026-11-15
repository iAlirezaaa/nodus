import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, normalizeSearchText, searchThoughts, buildBoardPaths } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

function thought(id: string, title: string, boardId = 'root', text = ''): GraphNode {
  return { id, title, boardId, text, asset: null, url: null } as GraphNode;
}

test('Arabic ta marbuta and Persian final-heh variants match bidirectionally without rewriting source', () => {
  for (const [a, b] of [['مدرسة', 'مدرسه'], ['نامۀ', 'نامه'], ['پروژۀ ۱۲', 'پروژه 12']]) {
    assert.equal(normalizeSearchText(a), normalizeSearchText(b));
    assert.equal(searchThoughts([thought('a', a)], b).total, 1);
    assert.equal(searchThoughts([thought('b', b)], a).total, 1);
  }
  assert.notEqual(normalizeSearchText('مدارس'), normalizeSearchText('مدرسه'));
});

test('the final-heh keyboard variants also locate private notes, without changing them', () => {
  const nodes = [thought('a', 'Unrelated', 'root', 'مدرسۀ کوچک'), thought('b', 'Other', 'root', 'مدرسة شهر')];
  const snapshot = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'مدرسه').visible.map(n => n.id), ['a', 'b']);
  assert.equal(JSON.stringify(nodes), snapshot);
});

test('nested project ancestry is searchable across final-heh spellings and remains root-scoped', () => {
  const owner = { ...thought('folder', 'Folder'), childBoardId: 'nested' };
  const nodes = [owner, thought('nested-idea', 'Shot', 'nested'), thought('other', 'Shot', 'other')];
  const boards = [
    { id: 'root', title: 'مدرسه', parentNodeId: null },
    { id: 'nested', title: 'پروژۀ پایانی', parentNodeId: 'folder' },
    { id: 'other', title: 'Other root', parentNodeId: null },
  ];
  const doc = { boards, nodes } as Pick<Workspace, 'boards' | 'nodes'>;
  const before = JSON.stringify(doc);
  const paths = buildBoardPaths(doc, 'Untitled');
  assert.equal(paths.get('nested'), 'مدرسه / پروژۀ پایانی');
  assert.deepEqual(searchThoughts(nodes, 'پروژه پایانی', 70, 0, paths).visible.map(n => n.id), ['nested-idea']);
  assert.deepEqual(searchThoughts(nodes, 'مدرسة', 70, 0, paths).visible.map(n => n.id), ['folder', 'nested-idea']);
  assert.equal(JSON.stringify(doc), before);
});

test('balanced quoted Persian phrases remain field-local when final-heh spelling differs', () => {
  const nodes = [thought('direct', 'مدرسه نو'), thought('in-note', 'Other', 'root', 'مدرسۀ نو'), thought('split', 'مدرسة', 'root', 'نو')];
  assert.deepEqual(searchThoughts(nodes, '«مدرسة نو»').visible.map(n => n.id), ['direct', 'in-note']);
  assert.deepEqual(searchThoughts(nodes, '"مدرسه نو"').visible.map(n => n.id), ['direct', 'in-note']);
});

test('151 mixed-spelling results retain honest totals and the 70/70/11 boundary', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), i % 2 ? 'مدرسه' : 'مدرسة'));
  const original = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'مدرسۀ', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
  assert.equal(JSON.stringify(nodes), original);
});

test('previous keyboard normalization and emoji ZWJ are unchanged', () => {
  assert.equal(normalizeSearchText('كيان'), normalizeSearchText('کیان'));
  assert.equal(normalizeSearchText('۱۲۳'), normalizeSearchText('123'));
  assert.equal(normalizeSearchText('👩‍💻'), '👩‍💻');
});
