import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPersonalSpace, deletePersonalSpace } from '../lib/personal-spaces.ts';
import { validateWorkspace } from '../lib/server/validation.ts';
import { WorkspaceStore } from '../hooks/workspace-store.ts';
import type { Board, GraphEdge, GraphNode, Workspace } from '../lib/types.ts';

const createdAt = '2026-11-12T12:00:00.000Z';
function board(id: string, parentNodeId: string | null = null): Board {
  return { id, title: id, description: '', parentNodeId, createdAt };
}
function node(id: string, boardId: string, patch: Partial<GraphNode> = {}): GraphNode {
  return { id, boardId, kind: 'note', title: id, text: `${id} content`, x: 0, y: 0, width: 244, height: 172,
    color: 'sage', asset: null, url: '', childBoardId: null, createdAt, ...patch };
}
function edge(boardId: string, sourceId: string, targetId: string): GraphEdge {
  return { id: `${sourceId}-to-${targetId}`, boardId, sourceId, targetId, label: '' };
}
function fixture(): Workspace {
  return {
    version: 1, homeBoardId: 'home',
    boards: [board('home'), board('inside', 'home-project'), board('deep', 'inside-project'), board('other'), board('other-inside', 'other-project')],
    nodes: [
      node('home-parent', 'home', { task: { status: 'doing', parentId: null } }),
      node('home-child', 'home', { task: { status: 'done', parentId: 'home-parent' } }),
      node('home-project', 'home', { kind: 'project', childBoardId: 'inside' }),
      node('inside-project', 'inside', { childBoardId: 'deep' }),
      node('inside-note', 'inside'),
      node('deep-note', 'deep', { kind: 'pdf', asset: { id: 'removed-file', name: 'notes.pdf', mime: 'application/pdf', size: 1200, url: '/api/assets/removed-file' } }),
      node('other-parent', 'other', { task: { status: 'todo', parentId: null } }),
      node('other-child', 'other', { task: { status: 'doing', parentId: 'other-parent' } }),
      node('other-project', 'other', { kind: 'project', childBoardId: 'other-inside' }),
      node('other-reference', 'other', { kind: 'image', asset: { id: 'kept-file', name: 'reference.png', mime: 'image/png', size: 800, url: '/api/assets/kept-file' } }),
      node('other-inside-note', 'other-inside'),
    ],
    edges: [edge('home', 'home-parent', 'home-child'), edge('home', 'home-parent', 'home-project'), edge('inside', 'inside-project', 'inside-note'),
      edge('other', 'other-parent', 'other-child'), edge('other', 'other-parent', 'other-project')],
  };
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function onlyHome(): Workspace { return deletePersonalSpace(fixture(), 'other'); }

test('inspecting a personal root counts all contained boards and nodes without linked or sibling spaces', () => {
  const document = freeze(fixture());
  validateWorkspace(document);
  assert.deepEqual(inspectPersonalSpace(document, 'home'), { boardIds: ['home', 'inside', 'deep'], nodeCount: 6, projectCount: 2 });
  assert.deepEqual(inspectPersonalSpace(document, 'other'), { boardIds: ['other', 'other-inside'], nodeCount: 5, projectCount: 1 });
  assert.deepEqual(document, fixture());
});

test('deleting the home space removes its whole subtree and chooses a surviving root', () => {
  const document = freeze(fixture());
  const after = deletePersonalSpace(document, 'home');
  assert.equal(after.homeBoardId, 'other');
  assert.deepEqual(after.boards.map(item => item.id), ['other', 'other-inside']);
  assert.deepEqual(after.nodes.map(item => item.id), ['other-parent', 'other-child', 'other-project', 'other-reference', 'other-inside-note']);
  assert.deepEqual(after.edges, document.edges.filter(item => item.boardId === 'other'));
  assert.equal(after.nodes.find(item => item.id === 'other-reference')!.asset, document.nodes.find(item => item.id === 'other-reference')!.asset);
  assert.deepEqual(after.nodes.find(item => item.id === 'other-child')!.task, { status: 'doing', parentId: 'other-parent' });
  assert.equal(after.boards[0], document.boards[3], 'Unrelated roots retain their metadata and identity.');
  assert.equal(document.nodes.find(item => item.id === 'deep-note')!.asset!.id, 'removed-file', 'The old snapshot retains its file reference.');
  assert.deepEqual(document, fixture());
  validateWorkspace(after);
});

test('deleting another root preserves the current home, its descendants and their relationships', () => {
  const document = fixture();
  const snapshot = structuredClone(document);
  const after = deletePersonalSpace(document, 'other');
  assert.equal(after.homeBoardId, 'home');
  assert.deepEqual(after.boards.map(item => item.id), ['home', 'inside', 'deep']);
  assert.deepEqual(after.nodes, document.nodes.slice(0, 6));
  assert.deepEqual(after.edges, document.edges.slice(0, 3));
  for (const item of after.nodes) assert.equal(item, document.nodes.find(original => original.id === item.id));
  assert.deepEqual(document, snapshot);
  validateWorkspace(after);
});

test('deleting the last root leaves one fresh blank valid space in either language', () => {
  for (const language of ['fa', 'en'] as const) {
    const document = freeze(onlyHome());
    const after = deletePersonalSpace(document, 'home', language);
    assert.equal(after.boards.length, 1);
    assert.equal(after.homeBoardId, after.boards[0].id);
    assert.ok(!document.boards.some(item => item.id === after.homeBoardId));
    assert.equal(after.boards[0].title, language === 'fa' ? 'فضای فکر تازه' : 'New thinking space');
    assert.equal(after.boards[0].parentNodeId, null);
    assert.equal(after.boards[0].description, '');
    assert.deepEqual(after.nodes, [], 'A new empty root does not recreate the welcome/sample nodes.');
    assert.deepEqual(after.edges, []);
    validateWorkspace(after);
  }
  assert.equal(deletePersonalSpace(onlyHome(), 'home').boards[0].title, 'فضای فکر تازه');
});

test('missing, nested and foreign identifiers are identity no-ops', () => {
  const document = freeze(fixture());
  for (const id of ['', 'missing', 'foreign-space', 'inside', 'deep', 'other-inside', 'home-project']) {
    assert.equal(inspectPersonalSpace(document, id), null);
    assert.equal(deletePersonalSpace(document, id), document);
  }
  const deleted = deletePersonalSpace(document, 'other');
  assert.equal(deletePersonalSpace(deleted, 'other'), deleted);
  validateWorkspace(deleted);
});

test('a malformed child pointer cannot pull another root or its projects into deletion', () => {
  const document = fixture();
  document.nodes.find(item => item.id === 'home-project')!.childBoardId = 'other';
  const snapshot = structuredClone(document);
  assert.deepEqual(inspectPersonalSpace(document, 'home')!.boardIds, ['home', 'inside', 'deep']);
  const after = deletePersonalSpace(document, 'home');
  assert.deepEqual(after.boards.map(item => item.id), ['other', 'other-inside']);
  assert.deepEqual(after.nodes, snapshot.nodes.filter(item => item.boardId === 'other' || item.boardId === 'other-inside'));
  assert.deepEqual(document, snapshot);
  validateWorkspace(after);
});

test('surviving stale task/project references are detached without discarding their content or status', () => {
  const document = fixture();
  const survivor = document.nodes.find(item => item.id === 'other-reference')!;
  survivor.task = { status: 'done', parentId: 'home-parent' };
  survivor.childBoardId = 'inside';
  document.edges.push(edge('other', 'other-parent', 'home-parent'));
  const after = deletePersonalSpace(document, 'home');
  const kept = after.nodes.find(item => item.id === survivor.id)!;
  assert.deepEqual(kept.task, { status: 'done', parentId: null });
  assert.equal(kept.childBoardId, null);
  assert.equal(kept.text, survivor.text);
  assert.equal(kept.asset, survivor.asset);
  assert.equal(survivor.task.parentId, 'home-parent');
  assert.ok(after.edges.every(item => item.sourceId !== 'home-parent' && item.targetId !== 'home-parent'));
  validateWorkspace(after);
});

test('space deletion and a last-root replacement each occupy one complete undo snapshot', async () => {
  for (const original of [fixture(), onlyHome()]) {
    const store = new WorkspaceStore({ storage: null, debounceMs: 60_000, makeWorkspace: () => original,
      fetcher: async () => Response.json({ document: original, revision: 1, userId: 'personal-spaces-owner', updatedAt: createdAt }),
    });
    try {
      await store.load();
      const before = store.exportDraft()!;
      store.update(document => deletePersonalSpace(document, 'home'));
      const deleted = store.exportDraft()!;
      validateWorkspace(deleted);
      assert.equal(store.getSnapshot().canUndo, true);
      store.undo();
      assert.deepEqual(store.exportDraft(), before, 'One undo restores root, contained projects, tasks, edges and file references.');
      assert.equal(store.getSnapshot().canUndo, false);
      assert.equal(store.getSnapshot().canRedo, true);
      store.redo();
      assert.deepEqual(store.exportDraft(), deleted, 'Redo reuses the same replacement root instead of creating another one.');
      store.update(document => deletePersonalSpace(document, 'home'));
      assert.equal(store.exportDraft(), deleted);
      store.undo();
      assert.deepEqual(store.exportDraft(), before, 'A repeated no-op deletion does not create another history entry.');
      validateWorkspace(store.exportDraft());
    } finally { store.suspend(); }
  }
});

test('deep containment is inspected and deleted iteratively at the supported board limit', () => {
  const document: Workspace = { version: 1, homeBoardId: 'chain-0', boards: [board('chain-0')], nodes: [], edges: [] };
  for (let index = 1; index < 2000; index++) {
    const owner = `owner-${index}`;
    document.nodes.push(node(owner, `chain-${index - 1}`, { childBoardId: `chain-${index}` }));
    document.boards.push(board(`chain-${index}`, owner));
  }
  const info = inspectPersonalSpace(document, 'chain-0')!;
  assert.equal(info.boardIds.length, 2000);
  assert.equal(info.nodeCount, 1999);
  assert.equal(info.projectCount, 1999);
  const after = deletePersonalSpace(document, 'chain-0');
  assert.equal(after.boards.length, 1);
  assert.equal(after.nodes.length, 0);
  assert.equal(document.boards.length, 2000);
  validateWorkspace(after);
});
