import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts, SEARCH_PAGE_SIZE, buildBoardPaths } from '../lib/thought-search.ts';
import type { GraphNode, NodeAnnotation, Workspace } from '../lib/types.ts';

const thought = (id: string, title: string, boardId = 'root', text = '') =>
  ({ id, title, boardId, text, asset: null, url: '', annotations: [] }) as GraphNode;

test('literal title outranks earlier whitespace and punctuation aliases', () => {
  const nodes = [thought('dash', 'Frame-12'), thought('joined', 'Frame12'), thought('exact', 'Frame 12')];
  assert.deepEqual(searchThoughts(nodes, 'Frame 12').visible.map(n => n.id), ['exact', 'dash', 'joined']);
});

test('literal title prefix outranks earlier compact exact alias', () => {
  const nodes = [thought('compact', 'Light-ing'), thought('prefix', 'Lighting plan')];
  assert.deepEqual(searchThoughts(nodes, 'lighting').visible.map(n => n.id), ['prefix', 'compact']);
});

test('Persian spaced compound stays searchable but a true exact title ranks first', () => {
  const nodes = [thought('spaced', 'کتاب های کودک'), thought('joined', 'کتابهای کودک')];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'کتابهای کودک').visible.map(n => n.id), ['joined', 'spaced']);
  assert.equal(JSON.stringify(nodes), before);
});

test('151 matches keep honest 70/70/11 pages after rank correction', () => {
  const nodes = [...Array.from({ length: 150 }, (_, i) => thought(String(i), i % 2 ? 'Frame-12' : 'Frame12')), thought('exact', 'Frame 12')];
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'frame 12', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  const ids = pages.flatMap(p => p.visible.map(n => n.id));
  assert.equal(ids[0], 'exact');
  assert.equal(new Set(ids).size, 151);
});

test('nested project path and annotation-only matches remain discoverable', () => {
  const holder = { ...thought('holder', 'Folder'), childBoardId: 'nested' };
  const nested = thought('nested-note', 'Reference', 'nested');
  const comment: NodeAnnotation = { id: 'comment-1', field: 'text', start: 0, end: 8, quote: 'scene 10', body: 'lighting revise', color: 'blue', resolved: false, createdAt: '2026-11-14T00:00:00Z', updatedAt: '2026-11-14T00:00:00Z' };
  const annotated: GraphNode = { ...thought('annotation', 'Reference'), annotations: [comment] };
  const nodes = [holder, nested, annotated];
  const doc: Pick<Workspace, 'boards' | 'nodes'> = { nodes, boards: [
    { id: 'root', title: 'Studio', description: '', parentNodeId: null, createdAt: '2026-11-14T00:00:00Z' },
    { id: 'nested', title: 'Shot 12', description: '', parentNodeId: 'holder', createdAt: '2026-11-14T00:00:00Z' },
  ] };
  const before = JSON.stringify(doc);
  const paths = buildBoardPaths(doc, 'Untitled');
  assert.equal(paths.get('nested'), 'Studio / Shot 12');
  assert.deepEqual(searchThoughts(nodes, 'studio / shot 12', 70, 0, paths).visible.map(n => n.id), ['nested-note']);
  assert.deepEqual(searchThoughts(nodes, 'revise lighting').visible.map(n => n.id), ['annotation']);
  assert.equal(JSON.stringify(doc), before);
});
