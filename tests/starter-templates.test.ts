import test from 'node:test';
import assert from 'node:assert/strict';
import { makeNode } from '../lib/graph.ts';
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
      assert.ok(result.document.nodes.every(node => node.boardId === 'home' && !node.asset && !node.childBoardId));
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
