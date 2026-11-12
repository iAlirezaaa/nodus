import test from 'node:test';
import assert from 'node:assert/strict';
import { findDirectionalNode, getThoughtParent, insertThought, prepareThought } from '../lib/flow.ts';
import { makeNode } from '../lib/graph.ts';
import { validateWorkspace } from '../lib/server/validation.ts';
import { buildNodeGrowth, projectCardNode } from '../lib/node-growth.ts';
import type { GraphNode, Language, Workspace } from '../lib/types.ts';

const createdAt = '2026-11-12T00:00:00.000Z';
function workspace(nodes: GraphNode[] = []): Workspace {
  return { version: 1, homeBoardId: 'home', boards: [{ id: 'home', title: 'Home', description: '', parentNodeId: null, createdAt }], nodes, edges: [] };
}
function note(id: string, x = 0, y = 0, boardId = 'home'): GraphNode {
  return makeNode(boardId, 'note', x, y, { id, title: id, createdAt });
}
function assertNoOverlap(nodes: GraphNode[]): void {
  for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
    const left = nodes[a], right = nodes[b];
    if (left.boardId !== right.boardId) continue;
    const overlap = left.x < right.x + right.width && left.x + left.width > right.x && left.y < right.y + right.height && left.y + left.height > right.y;
    assert.equal(overlap, false, `${left.id} overlaps ${right.id}`);
  }
}
function commit(document: Workspace, prepared: ReturnType<typeof prepareThought>, title: string): Workspace {
  return insertThought(document, { ...prepared.node, title }, prepared.parentId);
}

test('preparation creates an ephemeral empty note at the requested center without changing input', () => {
  const document = workspace();
  const before = structuredClone(document);
  const plan = prepareThought(document, 'home', null, 'child', { anchor: { x: 700, y: -100 } });
  assert.equal(plan.parentId, null);
  assert.equal(plan.node.title, '');
  assert.equal(plan.node.text, '');
  assert.equal(plan.node.kind, 'note');
  assert.equal(plan.node.asset, null);
  assert.equal(plan.node.childBoardId, null);
  assert.equal(plan.node.x + plan.node.width / 2, 700);
  assert.equal(plan.node.y + plan.node.height / 2, -100);
  assert.deepEqual(document, before);
  const saved = commit(document, plan, 'My first thought');
  assert.equal(saved.nodes.length, 1);
  assert.equal(saved.edges.length, 0);
  assert.equal(validateWorkspace(saved), saved);
});

test('Tab creates a child, Enter creates its sibling, and Enter on a root creates another root', () => {
  const root = { ...note('root'), color: 'rose' as const, text: 'Keep the source contents' };
  let document = workspace([root]);
  const child = prepareThought(document, 'home', root.id, 'child', { language: 'en' });
  assert.equal(child.parentId, root.id);
  assert.equal(child.node.color, 'rose');
  assert.equal(child.node.text, '');
  assert.ok(child.node.x > root.x + root.width);
  document = commit(document, child, 'Child');
  const sibling = prepareThought(document, 'home', child.node.id, 'sibling', { language: 'en' });
  assert.equal(sibling.parentId, root.id);
  document = commit(document, sibling, 'Sibling');
  const nextSibling = prepareThought(document, 'home', sibling.node.id, 'sibling', { language: 'en' });
  assert.equal(nextSibling.parentId, root.id);
  const newRoot = prepareThought(document, 'home', root.id, 'sibling');
  assert.equal(newRoot.parentId, null);
  document = commit(document, newRoot, 'Another independent thought');
  assert.equal(document.edges.length, 2);
  assert.ok(document.edges.every(edge => edge.sourceId === root.id));
  assert.equal(getThoughtParent(document, newRoot.node.id), null);
  assertNoOverlap(document.nodes);
  assert.equal(validateWorkspace(document), document);
});

test('40 keyboard siblings in either writing direction avoid blockers and preserve existing positions', () => {
  for (const language of ['fa', 'en'] as Language[]) {
    const root = { ...note('root'), width: 300, height: 220, color: 'violet' as const };
    const side = language === 'fa' ? -1 : 1;
    const blocker = { ...note('blocker', side > 0 ? 404 : -348, -25), width: 310, height: 330 };
    let document = workspace([root, blocker]);
    const original = structuredClone(document);
    let sourceId = root.id;
    for (let index = 0; index < 40; index++) {
      const relation = index === 0 ? 'child' : 'sibling';
      const plan = prepareThought(document, 'home', sourceId, relation, { language });
      const repeated = prepareThought(document, 'home', sourceId, relation, { language });
      assert.equal(plan.node.x, repeated.node.x);
      assert.equal(plan.node.y, repeated.node.y);
      assert.equal(plan.parentId, root.id);
      assert.equal(plan.node.color, 'violet');
      assert.ok(side > 0 ? plan.node.x > root.x + root.width : plan.node.x + plan.node.width < root.x);
      document = commit(document, plan, `Sibling ${index + 1}`);
      sourceId = plan.node.id;
    }
    assert.equal(document.nodes.length, 42);
    assert.equal(document.edges.length, 40);
    assertNoOverlap(document.nodes);
    assert.deepEqual(document.nodes.slice(0, 2), original.nodes);
    assert.ok(document.edges.every(edge => edge.sourceId === root.id));
    assert.equal(validateWorkspace(document), document);
  }
});

test('placement and parent lookup stay on the requested board', () => {
  const document = workspace([note('root'), note('foreign', 348, 0, 'other')]);
  document.boards.push({ id: 'other', title: 'Other', description: '', parentNodeId: null, createdAt });
  const before = structuredClone(document);
  const child = prepareThought(document, 'home', 'root', 'child', { language: 'en' });
  const saved = commit(document, child, 'Local child');
  const visibleRoot = projectCardNode(saved.nodes[0], buildNodeGrowth(saved).get('root'));
  assert.equal(child.node.x, visibleRoot.x + visibleRoot.width + 104);
  assert.ok(Math.abs(child.node.y) < 1e-9);
  assert.equal(saved.nodes.find(node => node.id === 'foreign'), document.nodes[1]);
  assert.equal(saved.boards, document.boards);
  const staleSelection = prepareThought(document, 'home', 'foreign', 'child', { anchor: { x: 900, y: 200 } });
  assert.equal(staleSelection.node.boardId, 'home');
  assert.equal(staleSelection.parentId, null);
  assert.equal(staleSelection.node.x + staleSelection.node.width / 2, 900);
  assert.deepEqual(document, before);
});

test('Tab anticipates the first branch growth and Enter uses tall visible bounds without resizing or moving existing nodes', () => {
  for (const language of ['en', 'fa'] as const) for (const childCount of [0, 20]) {
    const root = { ...note('root'), width: 4096, height: 4096 };
    const leaves = Array.from({ length: childCount }, (_, index) => note(`leaf-${index}`, 15000, index * 1000));
    const document = workspace([root, ...leaves]);
    document.edges = leaves.map(leaf => ({ id: `edge-${leaf.id}`, boardId: 'home', sourceId: root.id, targetId: leaf.id, label: '' }));
    const before = structuredClone(document);
    for (const relation of ['child', 'sibling'] as const) {
      const plan = prepareThought(document, 'home', root.id, relation, { language });
      const repeated = prepareThought(document, 'home', root.id, relation, { language });
      assert.equal(plan.node.x, repeated.node.x);
      assert.equal(plan.node.y, repeated.node.y);
      const saved = commit(document, plan, 'New thought'), growth = buildNodeGrowth(saved);
      const visible = saved.nodes.map(item => projectCardNode(item, growth.get(item.id)));
      const visibleRoot = visible.find(item => item.id === root.id)!;
      if (relation === 'child') {
        const clearance = language === 'en' ? plan.node.x - visibleRoot.x - visibleRoot.width : visibleRoot.x - plan.node.x - plan.node.width;
        assert.ok(Math.abs(clearance - 104) < 1e-9, `${language}: the new child clears the parent's post-insert growth`);
      } else assert.ok(Math.abs(plan.node.y - visibleRoot.y - visibleRoot.height - 48) < 1e-9);
      assertNoOverlap(visible);
      assert.equal(plan.node.width, 244); assert.equal(plan.node.height, 172);
      assert.deepEqual(saved.nodes.slice(0, document.nodes.length), document.nodes);
      assert.equal(validateWorkspace(saved), saved);
    }
    assert.deepEqual(document, before);
  }
});

test('Enter avoids the expanded bounds of unrelated occupied cards, including nested content', () => {
  const source = note('source', 272, -220);
  const blocker = { ...note('blocker'), childBoardId: 'nested' };
  const document = workspace([source, blocker, ...Array.from({ length: 40 }, (_, index) => note(`inside-${index}`, 0, 0, 'nested'))]);
  document.boards.push({ id: 'nested', title: 'Nested', description: '', parentNodeId: blocker.id, createdAt });
  const before = structuredClone(document);
  const plan = prepareThought(document, 'home', source.id, 'sibling', { language: 'en' });
  assert.equal(plan.node.x, source.x);
  assert.ok(plan.node.y > 0, 'The old stored-only position at y=0 intersects the grown blocker.');
  const saved = commit(document, plan, 'Clear of the project'), growth = buildNodeGrowth(saved);
  assertNoOverlap(saved.nodes.filter(item => item.boardId === 'home').map(item => projectCardNode(item, growth.get(item.id))));
  assert.deepEqual(saved.nodes.slice(0, document.nodes.length), document.nodes);
  assert.deepEqual(document, before);
});

test('parent lookup takes the first valid incoming edge and never follows cycles recursively', () => {
  const document = workspace([note('a'), note('b', 400), note('c', 800), note('elsewhere', 0, 0, 'other')]);
  document.boards.push({ id: 'other', title: 'Other', description: '', parentNodeId: null, createdAt });
  document.edges = [
    { id: 'missing', boardId: 'home', sourceId: 'gone', targetId: 'a', label: '' },
    { id: 'foreign', boardId: 'home', sourceId: 'elsewhere', targetId: 'a', label: '' },
    { id: 'self', boardId: 'home', sourceId: 'a', targetId: 'a', label: '' },
    { id: 'wrong-board', boardId: 'other', sourceId: 'c', targetId: 'a', label: '' },
    { id: 'first', boardId: 'home', sourceId: 'b', targetId: 'a', label: '' },
    { id: 'second', boardId: 'home', sourceId: 'c', targetId: 'a', label: '' },
    { id: 'cycle', boardId: 'home', sourceId: 'a', targetId: 'b', label: '' },
  ];
  assert.equal(getThoughtParent(document, 'a')?.id, 'b');
  assert.equal(getThoughtParent(document, 'b')?.id, 'a');
  assert.equal(getThoughtParent(document, 'c'), null);
  assert.equal(getThoughtParent(document, 'missing'), null);
  assert.equal(prepareThought(document, 'home', 'a', 'sibling').parentId, 'b');
  const validCycle = { ...document, edges: document.edges.filter(edge => ['first', 'cycle'].includes(edge.id)) };
  const result = commit(validCycle, prepareThought(validCycle, 'home', 'a', 'sibling'), 'Cycle sibling');
  assert.equal(validateWorkspace(result), result);
});

test('arrow navigation follows physical rows and columns, ignores other boards, and has stable ties', () => {
  const current = note('current');
  const nodes = [current, note('right', 700), note('left', -500), note('up', 0, -400), note('down', 0, 400), note('diagonal', 300, 300), note('foreign-near', 270, 0, 'other')];
  for (const direction of ['right', 'left', 'up', 'down'] as const) assert.equal(findDirectionalNode(nodes, 'current', direction), direction);
  assert.equal(findDirectionalNode(nodes, 'missing', 'right'), null);
  assert.equal(findDirectionalNode([current], current.id, 'left'), null);
  const tie = [current, note('z-last', 400, -40), note('a-first', 400, 40)];
  assert.equal(findDirectionalNode(tie, current.id, 'right'), 'a-first');
  assert.equal(findDirectionalNode([...tie].reverse(), current.id, 'right'), 'a-first');
  const corrupt = { ...note('invalid'), x: Number.NaN };
  assert.equal(findDirectionalNode([current, corrupt, nodes[1]], current.id, 'right'), 'right');
});

test('invalid insertion is atomic, while maximum title and note lengths remain valid', () => {
  const document = workspace([note('root')]);
  const before = structuredClone(document);
  const planned = prepareThought(document, 'home', 'root', 'child');
  for (const invalid of [
    { ...planned.node, title: 'x'.repeat(501) },
    { ...planned.node, text: 'x'.repeat(100001) },
    { ...planned.node, x: Infinity },
    { ...planned.node, y: 1e7 + 1 },
    { ...planned.node, width: 31 },
    { ...planned.node, url: 'javascript:alert(1)' },
    { ...planned.node, childBoardId: 'home' },
    { ...planned.node, id: 'root' },
  ]) {
    assert.throws(() => insertThought(document, invalid, planned.parentId));
    assert.deepEqual(document, before);
  }
  assert.throws(() => insertThought(document, planned.node, 'gone'), /same board/);
  assert.throws(() => insertThought(document, { ...planned.node, boardId: 'gone' }, null), /no longer exists/);
  const fullText = { ...planned.node, title: 'x'.repeat(500), text: 'x'.repeat(100000) };
  const valid = insertThought(document, fullText, planned.parentId);
  assert.notEqual(valid.nodes[1], fullText);
  assert.equal(validateWorkspace(valid), valid);
  assert.deepEqual(document, before);
});

test('5,000-node capacity is checked before preparation and before committing an older draft', () => {
  const document = workspace(Array.from({ length: 4999 }, (_, index) => note(`node-${index}`, (index % 100) * 300, Math.floor(index / 100) * 220)));
  const plan = prepareThought(document, 'home', null, 'child', { anchor: { x: -1000, y: 0 } });
  const full = commit(document, plan, 'Last available thought');
  assert.equal(full.nodes.length, 5000);
  assert.equal(validateWorkspace(full), full);
  assert.throws(() => prepareThought(full, 'home', null, 'child'), /5,000-node/);
  assert.throws(() => insertThought(full, note('one-too-many'), null), /5,000-node/);
  assert.equal(document.nodes.length, 4999);
});

test('20,000-edge capacity rejects a connected insert but still permits an independent thought', () => {
  const document = workspace(Array.from({ length: 142 }, (_, index) => note(`node-${index}`, index * 300)));
  outer: for (const source of document.nodes) for (const target of document.nodes) {
    if (source.id === target.id) continue;
    document.edges.push({ id: `edge-${document.edges.length}`, boardId: 'home', sourceId: source.id, targetId: target.id, label: '' });
    if (document.edges.length === 19999) break outer;
  }
  const plan = prepareThought(document, 'home', 'node-0', 'child');
  const full = commit(document, plan, 'Last connection');
  assert.equal(full.edges.length, 20000);
  assert.equal(validateWorkspace(full), full);
  assert.throws(() => prepareThought(full, 'home', 'node-0', 'child'), /20,000-connection/);
  assert.throws(() => insertThought(full, note('uncommitted'), 'node-0'), /20,000-connection/);
  const independent = commit(full, prepareThought(full, 'home', null, 'child', { anchor: { x: 0, y: 1000 } }), 'Unconnected');
  assert.equal(independent.edges, full.edges);
  assert.equal(independent.nodes.length, full.nodes.length + 1);
  assert.equal(validateWorkspace(independent), independent);
});

test('placement remains bounded and collision-free near coordinate limits', () => {
  const root = note('root', 1e7, 1e7);
  const document = workspace([root]);
  const plan = prepareThought(document, 'home', root.id, 'child', { language: 'en' });
  assert.ok(Math.abs(plan.node.x) <= 1e7 && Math.abs(plan.node.y) <= 1e7);
  assertNoOverlap([root, plan.node]);
  const saved = commit(document, plan, 'Boundary thought');
  assert.equal(validateWorkspace(saved), saved);
  assert.throws(() => prepareThought(document, 'missing', null, 'child'), /no longer exists/);
  assert.throws(() => prepareThought(document, 'home', null, 'child', { anchor: { x: Infinity, y: 0 } }), /valid canvas position/);
});
