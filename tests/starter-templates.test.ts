import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteNode, makeNode } from '../lib/graph.ts';
import { insertStarterTemplate, STARTER_TEMPLATES, STARTER_TEMPLATE_IDS } from '../lib/starter-templates.ts';
import { validateWorkspace } from '../lib/server/validation.ts';
import type { Workspace } from '../lib/types.ts';

const empty = (): Workspace => ({
  version: 1, homeBoardId: 'home',
  boards: [{ id: 'home', title: 'Home', description: '', parentNodeId: null, createdAt: new Date().toISOString() }],
  nodes: [], edges: [],
});

for (const templateId of STARTER_TEMPLATE_IDS) {
  for (const language of ['fa', 'en'] as const) {
    test(templateId + ': ' + language + ' template is a valid editable graph', () => {
      const before = empty();
      const result = insertStarterTemplate(before, 'home', templateId, language);
      const definition = STARTER_TEMPLATES[templateId];
      assert.notStrictEqual(result.document, before);
      assert.strictEqual(result.added, definition.items.length);
      assert.strictEqual(result.document.nodes.length, result.added);
      assert.strictEqual(result.document.edges.length, definition.items.length - 1);
      assert.strictEqual(result.document.nodes[0].id, result.rootId);
      assert.strictEqual(result.document.nodes[0].title, definition.items[0].title[language]);
      assert.equal(new Set(result.document.nodes.map(node => node.id)).size, result.added);
      assert.ok(result.document.nodes.every(node => node.boardId === 'home' && !node.asset));
      assert.equal(result.document.boards.length, templateId === 'production' ? 2 : 1);
      assert.equal(result.document.nodes.filter(node => !!node.childBoardId).length, templateId === 'production' ? 1 : 0);
      assert.ok(result.document.edges.every(edge => edge.boardId === 'home' && edge.sourceId !== edge.targetId &&
        result.document.nodes.some(node => node.id === edge.sourceId) && result.document.nodes.some(node => node.id === edge.targetId)));
      validateWorkspace(result.document);
      assert.equal(before.nodes.length, 0);
      assert.equal(before.edges.length, 0);
    });
  }
}

test('template appends without moving or modifying existing nodes, preserves source snapshot for Undo', () => {
  const before = empty();
  const original = makeNode('home', 'note', 100, 75, { title: 'Unchanged title', text: 'Do not overwrite me' });
  before.nodes.push(original);
  const result = insertStarterTemplate(before, 'home', 'brainstorm', 'en');
  assert.equal(before.nodes.length, 1);
  assert.strictEqual(result.document.nodes[0], original);
  assert.strictEqual(result.document.boards, before.boards);
  assert.equal(result.document.nodes[0].x, 100);
  assert.equal(result.document.nodes[0].text, 'Do not overwrite me');
  assert.ok(result.document.nodes.slice(1).every(node => node.x > original.x + original.width));
  assert.strictEqual(before.edges.length, 0);
});

test('task template creates valid task ancestry without modifying ordinary graph relationships', () => {
  const result = insertStarterTemplate(empty(), 'home', 'tasks', 'fa');
  const [root, ...children] = result.document.nodes;
  assert.equal(root.task?.status, 'todo');
  assert.equal(root.task?.parentId, null);
  assert.ok(children.every(node => node.task?.parentId === root.id));
  assert.ok(children.some(node => node.task?.status === 'doing'));
  validateWorkspace(result.document);
});

test('template can be inserted into a nested board without changing other boards', () => {
  const doc = empty();
  doc.boards.push({ id: 'nested', title: 'Child', description: '', parentNodeId: null, createdAt: new Date().toISOString() });
  const first = makeNode('home', 'note', 0, 0);
  doc.nodes.push(first);
  const result = insertStarterTemplate(doc, 'nested', 'research', 'en');
  assert.strictEqual(result.document.nodes[0], first);
  assert.ok(result.document.nodes.slice(1).every(node => node.boardId === 'nested'));
});

test('invalid target and node or edge limits make no mutation', () => {
  const doc = empty();
  assert.strictEqual(insertStarterTemplate(doc, 'missing', 'tasks', 'fa').document, doc);
  const atNodeLimit = { ...doc, nodes: Array(5000).fill(makeNode('home', 'note', 0, 0)) };
  assert.strictEqual(insertStarterTemplate(atNodeLimit, 'home', 'tasks', 'fa').document, atNodeLimit);
  const atEdgeLimit = { ...doc, edges: Array(20000).fill({ id: 'mock', boardId: 'home', sourceId: 'x', targetId: 'y', label: '' }) };
  assert.strictEqual(insertStarterTemplate(atEdgeLimit, 'home', 'tasks', 'fa').document, atEdgeLimit);
});

test('production starter creates a genuine, reversible nested project while retaining its linked pipeline', () => {
  const original = empty();
  const existing = makeNode('home', 'note', 28, 60, { title: 'Saved idea' });
  original.nodes.push(existing);
  const first = insertStarterTemplate(original, 'home', 'production', 'fa');
  assert.equal(first.added, 8);
  assert.equal(first.document.nodes.length, 9);
  assert.equal(first.document.edges.length, 7);
  const root = first.document.nodes.find(node => node.id === first.rootId)!;
  const inner = first.document.boards.find(board => board.id === root.childBoardId);
  assert.equal(root.kind, 'project');
  assert.ok(inner);
  assert.equal(inner.parentNodeId, root.id);
  assert.equal(inner.title, root.title);
  assert.ok(inner.description.length > 0);
  assert.ok(first.document.nodes.every(node => node.boardId === 'home'));
  assert.strictEqual(first.document.nodes[0], existing);
  assert.strictEqual(first.document.boards[0], original.boards[0]);
  assert.equal(original.boards.length, 1);
  assert.equal(original.nodes.length, 1);
  validateWorkspace(first.document);

  const second = insertStarterTemplate(first.document, 'home', 'production', 'en');
  const secondRoot = second.document.nodes.find(node => node.id === second.rootId)!;
  assert.notEqual(root.id, secondRoot.id);
  assert.notEqual(root.childBoardId, secondRoot.childBoardId);
  assert.equal(second.document.boards.length, 3);
  validateWorkspace(second.document);
  // Graph links are not ownership: deleting the project removes only its
  // empty child board; the independently editable pipeline nodes survive.
  const removed = deleteNode(first.document, root.id);
  assert.equal(removed.boards.length, 1);
  assert.equal(removed.nodes.length, 8);
  assert.strictEqual(removed.nodes[0], existing);
  validateWorkspace(removed);
});

test('production starter respects the 2000-board storage ceiling without editing the source', () => {
  const full = empty();
  for (let index = 1; index < 2000; index++) {
    full.boards.push({ id: 'other-' + index, title: 'Other', description: '', parentNodeId: null,
      createdAt: new Date().toISOString() });
  }
  const result = insertStarterTemplate(full, 'home', 'production', 'en');
  assert.strictEqual(result.document, full);
  assert.equal(result.added, 0);
  assert.equal(result.rootId, null);
  assert.equal(full.nodes.length, 0);
  assert.equal(full.boards.length, 2000);
});
