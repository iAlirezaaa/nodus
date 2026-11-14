import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoardPaths, searchThoughts, SEARCH_PAGE_SIZE } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

const thought = (id: string, title: string, boardId = 'root', text = '', assetName?: string): GraphNode =>
  ({ id, boardId, title, text, kind: 'note', asset: assetName ? { name: assetName } : null }) as GraphNode;
const board = (id: string, title: string, parentNodeId: string | null = null): Workspace['boards'][number] =>
  ({ id, title, parentNodeId, description: '', createdAt: '2026-11-14T00:00:00Z' });

test('Arabic hamzated and wasla alef match Persian plain alef in both directions', () => {
  const nodes = [thought('below', 'إسلام'), thought('above', 'أمل'), thought('wasla', 'ٱسم'), thought('plain', 'اسلام')];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'اسلام').visible.map(n => n.id), ['below', 'plain']);
  assert.deepEqual(searchThoughts(nodes, 'إسلام').visible.map(n => n.id), ['below', 'plain']);
  assert.deepEqual(searchThoughts(nodes, 'امل').visible.map(n => n.id), ['above']);
  assert.deepEqual(searchThoughts(nodes, 'اسم').visible.map(n => n.id), ['wasla']);
  assert.equal(JSON.stringify(nodes), before);
});

test('alef parity applies to notes, filenames and exact quoted phrases without joining fields', () => {
  const nodes = [thought('note', 'Other', 'root', 'إدارة المشروع'), thought('asset', 'Other', 'root', '', 'أرشيف.pdf'), thought('phrase', 'اسلام نو')];
  assert.deepEqual(searchThoughts(nodes, 'ادارة').visible.map(n => n.id), ['note']);
  assert.deepEqual(searchThoughts(nodes, 'ارشيف').visible.map(n => n.id), ['asset']);
  assert.deepEqual(searchThoughts(nodes, '«إسلام نو»').visible.map(n => n.id), ['phrase']);
  assert.equal(searchThoughts([thought('split', 'اسلام', 'root', 'نو')], '«إسلام نو»').total, 0);
});

test('nested project path with alef variants is searchable without replacing canonical board titles', () => {
  const doc = {
    boards: [board('root', 'مكتبة الأمل'), board('child', 'ٱرشيف', 'owner')],
    nodes: [thought('owner', 'Folder', 'root'), thought('inside', 'Lighting', 'child')],
  };
  doc.nodes[0] = { ...doc.nodes[0], childBoardId: 'child' };
  const before = JSON.stringify(doc);
  const paths = buildBoardPaths(doc, 'Untitled');
  assert.equal(paths.get('child'), 'مكتبة الأمل / ٱرشيف');
  assert.deepEqual(searchThoughts(doc.nodes, 'مکتبة الامل', 70, 0, paths).visible.map(n => n.id), ['owner', 'inside']);
  assert.deepEqual(searchThoughts([doc.nodes[1]], 'ارشیف', 70, 0, paths).visible.map(n => n.id), ['inside']);
  assert.equal(JSON.stringify(doc), before);
});

test('alef madda stays distinct and 151 hits retain honest bounded 70/70/11 pages', () => {
  const distinct = [thought('madda', 'آباد'), thought('plain', 'اباد')];
  assert.deepEqual(searchThoughts(distinct, 'اباد').visible.map(n => n.id), ['plain']);
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'إسلام ' + i));
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'اسلام', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.visible.length, p.offset]), [[151,70,0],[151,70,70],[151,11,140]]);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
});
