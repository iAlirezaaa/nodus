import test from 'node:test';
import assert from 'node:assert/strict';
import { addBranches, addEdge, addNode, arrangeBoard, boardTrail, createWorkspace, deleteNode, ensureChildBoard, fitViewport, makeNode, uid } from '../lib/graph.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

function empty(): Workspace {
  return { version: 1, homeBoardId: 'home', boards: [{ id: 'home', title: 'Home', description: '', parentNodeId: null, createdAt: new Date().toISOString() }], nodes: [], edges: [] };
}

function assertNoOverlap(nodes: GraphNode[]): void {
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const first = nodes[a];
      const second = nodes[b];
      const overlap = first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y;
      assert.equal(overlap, false, `${first.title} overlaps ${second.title}`);
    }
  }
}

test('welcome graph is editable guidance with a genuine nested project and no fake assets', () => {
  for (const language of ['fa', 'en'] as const) {
    const doc = createWorkspace(language);
    const rootNodes = doc.nodes.filter(node => node.boardId === doc.homeBoardId);
    assert.ok(rootNodes.length >= 6 && rootNodes.length <= 8);
    assertNoOverlap(rootNodes);
    const project = rootNodes.find(node => node.childBoardId)!;
    assert.equal(doc.nodes.filter(node => node.boardId === project.childBoardId).length, 3);
    assert.deepEqual(boardTrail(doc, project.childBoardId!).map(board => board.id), [doc.homeBoardId, project.childBoardId]);
    assert.ok(doc.nodes.every(node => node.asset === null));
    assert.equal(new Set(doc.nodes.map(node => node.id)).size, doc.nodes.length);
    assert.ok(doc.edges.every(edge => doc.nodes.find(node => node.id === edge.sourceId)?.boardId === edge.boardId && doc.nodes.find(node => node.id === edge.targetId)?.boardId === edge.boardId));
  }
});

test('ordinary cycles are supported while invalid and duplicate connections are no-ops', () => {
  let doc = empty();
  const a = makeNode('home', 'note', 0, 0, { title: 'A' });
  const b = makeNode('home', 'note', 320, 0, { title: 'B' });
  doc = addNode(addNode(doc, a), b);
  doc = addEdge(doc, a.id, b.id, 'related');
  doc = addEdge(doc, b.id, a.id);
  assert.equal(doc.edges.length, 2);
  assert.equal(addEdge(doc, a.id, b.id), doc);
  assert.equal(addEdge(doc, a.id, a.id), doc);
  assert.equal(addEdge(doc, a.id, 'missing'), doc);
  const nested = ensureChildBoard(doc, a.id);
  const child = makeNode(nested.boardId, 'note', 0, 0);
  doc = addNode(nested.document, child);
  assert.equal(addEdge(doc, a.id, child.id), doc);
});

test('a node becomes a containing project without losing its content or mutating the input', () => {
  let doc = empty();
  const idea = makeNode('home', 'image', 10, 20, { title: 'Reference', text: 'Keep this text', url: 'https://example.com/reference', color: 'rose' });
  doc = addNode(doc, idea);
  const before = structuredClone(doc);
  const result = ensureChildBoard(doc, idea.id);
  const updated = result.document.nodes.find(node => node.id === idea.id)!;
  assert.deepEqual(doc, before);
  assert.deepEqual({ ...updated, childBoardId: null }, idea);
  assert.equal(updated.childBoardId, result.boardId);
  assert.equal(result.document.boards.find(board => board.id === result.boardId)?.parentNodeId, idea.id);
  const repeated = ensureChildBoard(result.document, idea.id);
  assert.equal(repeated.boardId, result.boardId);
  assert.equal(repeated.document, result.document);
  assert.throws(() => ensureChildBoard(doc, 'missing'), /does not exist/);
});

test('recursive deletion removes only contained projects and incident edges', () => {
  let doc = empty();
  const parent = makeNode('home', 'note', 0, 0, { title: 'Delete me' });
  const keep = makeNode('home', 'note', 320, 0, { title: 'Keep me' });
  const alsoKeep = makeNode('home', 'note', 640, 0, { title: 'Also keep' });
  doc = addNode(addNode(addNode(doc, parent), keep), alsoKeep);
  doc = addEdge(addEdge(doc, parent.id, keep.id), keep.id, alsoKeep.id);
  const inside = ensureChildBoard(doc, parent.id);
  const child = makeNode(inside.boardId, 'note', 0, 0);
  const sibling = makeNode(inside.boardId, 'note', 320, 0);
  doc = addEdge(addNode(addNode(inside.document, child), sibling), child.id, sibling.id);
  const deeper = ensureChildBoard(doc, child.id);
  const grandchild = makeNode(deeper.boardId, 'note', 0, 0);
  doc = addNode(deeper.document, grandchild);
  const before = structuredClone(doc);
  const after = deleteNode(doc, parent.id);
  assert.deepEqual(doc, before);
  assert.deepEqual(after.boards.map(board => board.id), ['home']);
  assert.deepEqual(after.nodes.map(node => node.id), [keep.id, alsoKeep.id]);
  assert.equal(after.edges.length, 1);
  assert.equal(after.edges[0].sourceId, keep.id);
  assert.equal(after.edges[0].targetId, alsoKeep.id);
  assert.equal(deleteNode(after, 'missing'), after);
});

test('opening a long note as a project bounds its description and preserves the complete note', () => {
  const text = 'ایدهٔ'.repeat(20000);
  const node = makeNode('home', 'note', 0, 0, { title: 'Long note', text });
  const doc = addNode(empty(), node);
  const result = ensureChildBoard(doc, node.id);
  const board = result.document.boards.find(item => item.id === result.boardId)!;
  const originalNote = result.document.nodes.find(item => item.id === node.id)!;
  assert.equal(text.length, 100000);
  assert.equal(board.description, text.slice(0, 5000));
  assert.equal(board.description.length, 5000);
  assert.equal(originalNote.text, text);
  assert.equal(originalNote.kind, 'note');
  assert.equal(doc.nodes[0].text, text);
  assert.equal(doc.nodes[0].childBoardId, null);
});

test('long branch titles fit the storage contract without losing their full text', () => {
  const parent = makeNode('home', 'note', 0, 0);
  const title = 'A lengthy thought. '.repeat(40);
  const result = addBranches(addNode(empty(), parent), parent.id, [title]);
  const branch = result.nodes.find(node => node.id !== parent.id)!;
  assert.equal(branch.title, title.trim().slice(0, 500));
  assert.equal(branch.title.length, 500);
  assert.equal(branch.text, title.trim());
});

test('25-plus branches have no cap or overlap, including with pre-existing cards', () => {
  let doc = empty();
  const parent = makeNode('home', 'note', 0, 0, { title: 'Parent', width: 310, height: 210 });
  const blocker = makeNode('home', 'note', 340, 0, { title: 'Existing card', width: 490, height: 390 });
  doc = addNode(addNode(doc, parent), blocker);
  const before = structuredClone(doc);
  const titles = Array.from({ length: 40 }, (_, index) => ` Branch ${index + 1} `);
  const result = addBranches(doc, parent.id, [...titles, '', '   ']);
  assert.equal(result.nodes.length, doc.nodes.length + 40);
  assert.equal(result.edges.length, 40);
  assert.ok(result.edges.every(edge => edge.sourceId === parent.id));
  assertNoOverlap(result.nodes);
  assert.ok(result.nodes.slice(2).every(node => node.title === node.title.trim()));
  assert.deepEqual(doc, before);
  assert.equal(addBranches(doc, 'missing', ['A']), doc);
  assert.equal(addBranches(doc, parent.id, ['']), doc);
});

test('arrange handles variable-size cards, cycles, disconnected components, and other boards', () => {
  let doc = empty();
  const root = makeNode('home', 'project', 0, 0, { title: 'Root', width: 320, height: 240 });
  doc = addNode(doc, root);
  const nested = ensureChildBoard(doc, root.id);
  const untouched = makeNode(nested.boardId, 'note', -321, 73, { title: 'Unchanged' });
  doc = addNode(nested.document, untouched);
  doc = addBranches(doc, root.id, Array.from({ length: 25 }, (_, index) => `Branch ${index}`));
  const branches = doc.nodes.filter(node => node.boardId === 'home' && node.id !== root.id);
  for (let index = 0; index < branches.length; index++) {
    doc = addBranches(doc, branches[index].id, [`Detail ${index}`]);
    doc = addEdge(doc, branches[index].id, branches[(index + 1) % branches.length].id);
  }
  for (let index = 0; index < 9; index++) doc = addNode(doc, makeNode('home', 'note', 0, 0, { title: `Separate ${index}`, width: 190 + index * 25, height: 150 + index * 15 }));
  const before = structuredClone(doc);
  const result = arrangeBoard(doc, 'home');
  assertNoOverlap(result.nodes.filter(node => node.boardId === 'home'));
  assert.deepEqual(result.nodes.find(node => node.id === untouched.id), untouched);
  assert.deepEqual(result.edges, doc.edges);
  assert.deepEqual(doc, before);
  assert.deepEqual(arrangeBoard(result, 'home'), result);
});

test('containment trail navigates all layers and is resilient to invalid references', () => {
  let doc = empty();
  let currentBoard = 'home';
  const expected = ['home'];
  for (let depth = 0; depth < 4; depth++) {
    const node = makeNode(currentBoard, 'note', 0, 0);
    const next = ensureChildBoard(addNode(doc, node), node.id);
    doc = next.document;
    currentBoard = next.boardId;
    expected.push(currentBoard);
  }
  assert.deepEqual(boardTrail(doc, currentBoard).map(board => board.id), expected);
  assert.deepEqual(boardTrail(doc, 'missing'), []);
  const corrupt = structuredClone(doc);
  corrupt.boards[0].parentNodeId = corrupt.nodes[corrupt.nodes.length - 1].id;
  assert.ok(boardTrail(corrupt, currentBoard).length <= corrupt.boards.length);
});

test('fit viewport contains every card at the requested padding', () => {
  const doc = createWorkspace();
  const nodes = doc.nodes.filter(node => node.boardId === doc.homeBoardId);
  for (const [width, height] of [[1400, 900], [375, 720], [900, 280]]) {
    const view = fitViewport(nodes, width, height, 32);
    assert.ok(view.zoom > 0 && view.zoom <= 1);
    for (const node of nodes) {
      assert.ok(node.x * view.zoom + view.x >= 32 - 1e-6);
      assert.ok(node.y * view.zoom + view.y >= 32 - 1e-6);
      assert.ok((node.x + node.width) * view.zoom + view.x <= width - 32 + 1e-6);
      assert.ok((node.y + node.height) * view.zoom + view.y <= height - 32 + 1e-6);
    }
  }
  assert.deepEqual(fitViewport([], 1000, 800), { x: 500, y: 400, zoom: 1 });
});

test('node additions require a real board and do not duplicate identifiers', () => {
  const doc = empty();
  assert.equal(addNode(doc, makeNode('missing', 'note', 0, 0)), doc);
  const node = makeNode('home', 'note', 0, 0);
  const added = addNode(doc, node);
  assert.equal(addNode(added, node), added);
  assert.notEqual(uid(), uid());
});
