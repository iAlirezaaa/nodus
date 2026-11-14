import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoardPaths, searchThoughts } from '../lib/thought-search.ts';
import type { Board, GraphNode } from '../lib/types.ts';

const board = (id: string, title: string, parentNodeId: string | null = null): Board =>
  ({ id, title, parentNodeId, description: '', createdAt: '2026-11-13T00:00:00Z' });
const thought = (id: string, boardId: string, childBoardId: string | null = null): GraphNode =>
  ({ id, boardId, childBoardId, title: 'Untitled', text: '', kind: 'note', asset: null }) as GraphNode;

test('verified reciprocal containment retains full deep multilingual project path', () => {
  const document = {
    boards: [board('root', 'استودیو'), board('episode', 'Episode', 'p1'), board('shot', 'پلان ۳', 'p2')],
    nodes: [thought('p1', 'root', 'episode'), thought('p2', 'episode', 'shot'), thought('item', 'shot')],
  };
  const before = JSON.stringify(document);
  const paths = buildBoardPaths(document, 'Untitled');
  assert.equal(paths.get('shot'), 'استودیو / Episode / پلان ۳');
  assert.equal(searchThoughts(document.nodes, 'استوديو episode پلان 3', 70, 0, paths).total, 1);
  assert.equal(JSON.stringify(document), before);
});

test('mismatched containing node never claims unrelated root or hides the valid project', () => {
  const document = {
    boards: [board('private', 'Private root'), board('actual', 'Actual child', 'p'), board('forged', 'Forged child', 'p')],
    nodes: [thought('p', 'private', 'actual'), thought('good', 'actual'), thought('bad', 'forged')],
  };
  const paths = buildBoardPaths(document, 'Untitled');
  assert.equal(paths.get('actual'), 'Private root / Actual child');
  assert.equal(paths.get('forged'), 'Forged child');
  assert.deepEqual(searchThoughts([document.nodes[2]], 'Private root', 70, 0, paths).visible, []);
  assert.equal(searchThoughts([document.nodes[1]], 'Private root', 70, 0, paths).total, 1);
});

test('orphan parent on a missing board stops at the first invalid boundary', () => {
  const document = { boards: [board('known', 'Known'), board('orphan', 'Orphan', 'ghost')], nodes: [thought('ghost', 'missing', 'orphan'), thought('item', 'orphan')] };
  const paths = buildBoardPaths(document, 'Untitled');
  assert.equal(paths.get('orphan'), 'Orphan');
  assert.equal(searchThoughts([document.nodes[1]], 'Known', 70, 0, paths).total, 0);
});

test('malformed but reciprocal cycle remains bounded without touching canonical graph', () => {
  const document = { boards: [board('a', 'Alpha', 'bOwner'), board('b', 'Beta', 'aOwner')], nodes: [thought('aOwner', 'a', 'b'), thought('bOwner', 'b', 'a')] };
  const before = JSON.stringify(document);
  const paths = buildBoardPaths(document, 'Untitled');
  assert.equal(paths.size, 2);
  assert.ok(paths.get('a')?.includes('Alpha'));
  assert.ok(paths.get('b')?.includes('Beta'));
  assert.equal(JSON.stringify(document), before);
});
