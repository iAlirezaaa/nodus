import test from 'node:test';
import assert from 'node:assert/strict';
import type { GraphNode, NodeAnnotation, Workspace } from '../lib/types';
import { addBranches, deleteNode, ensureChildBoard, makeNode } from '../lib/graph.ts';
import { getThoughtParent, insertThought, prepareThought } from '../lib/flow.ts';
import { convertToTask, patchNode, reanchorAnnotations, removeTask, setTaskStatus, taskProgress } from '../lib/node-features.ts';
import { validateWorkspace } from '../lib/server/validation.ts';
import { copyWorkspaceAsRoots } from '../hooks/workspace-store.ts';

const time = '2026-11-12T00:00:00.000Z';
const later = '2026-11-12T01:00:00.000Z';
function base(): Workspace {
  return { version: 1, homeBoardId: 'root', boards: [{ id: 'root', title: 'My space', description: '', parentNodeId: null, createdAt: time }],
    nodes: [makeNode('root', 'note', 0, 0, { id: 'a', title: 'Alpha', text: 'alpha target omega', createdAt: time }),
      makeNode('root', 'note', 500, 0, { id: 'b', title: 'Beta', text: '', createdAt: time }),
      makeNode('root', 'note', 1000, 0, { id: 'c', title: 'Gamma', text: '', createdAt: time })],
    edges: [{ id: 'edge', boardId: 'root', sourceId: 'a', targetId: 'b', label: 'related' }],
  };
}
function annotation(patch: Partial<NodeAnnotation> = {}): NodeAnnotation {
  return { id: 'comment', field: 'text', start: 6, end: 12, quote: 'target', body: 'Make this more precise.', color: 'amber',
    resolved: false, createdAt: time, updatedAt: time, ...patch };
}
function taskDocument(): Workspace {
  const doc = base();
  doc.nodes[0].task = { status: 'todo', parentId: null };
  doc.nodes[1].task = { status: 'doing', parentId: 'a' };
  doc.nodes[2].task = { status: 'done', parentId: 'b' };
  return doc;
}

test('old documents remain valid and untouched; optional metadata round-trips without schema changes', () => {
  const legacy = base(), encoded = JSON.stringify(legacy);
  assert.equal(validateWorkspace(legacy), legacy);
  assert.equal(JSON.stringify(legacy), encoded);
  assert.equal(Object.hasOwn(legacy.nodes[0], 'task'), false);
  assert.equal(Object.hasOwn(legacy.nodes[0], 'annotations'), false);
  const doc = taskDocument();
  doc.nodes[0].appearance = 'sticky'; doc.nodes[0].annotations = [annotation()];
  Object.assign(doc.edges[0], { route: 'elbow', stroke: 'dashed', color: 'rose', width: 2.5, animated: true, bend: { x: -80, y: 220 } });
  const restored = JSON.parse(JSON.stringify(doc));
  assert.deepEqual(validateWorkspace(restored), doc);
  assert.equal(restored.nodes[0].annotations[0].body, 'Make this more precise.');
});

test('task ancestry is explicit and independent of graph edges', () => {
  const doc = taskDocument();
  doc.edges = [
    { id: 'one', boardId: 'root', sourceId: 'a', targetId: 'c', label: '' },
    { id: 'two', boardId: 'root', sourceId: 'c', targetId: 'a', label: '' },
  ];
  assert.equal(validateWorkspace(doc), doc, 'An ordinary graph cycle is permitted.');
  assert.equal(getThoughtParent(doc, 'c')?.id, 'b');
  assert.equal(getThoughtParent(doc, 'a'), null, 'A task root stays a root despite incoming graph edges.');
});

test('rejects missing, non-task, cross-board and cyclic task parents', () => {
  const changes: ((doc: Workspace) => void)[] = [
    doc => { doc.nodes[1].task!.parentId = 'missing'; },
    doc => { delete doc.nodes[0].task; },
    doc => { doc.nodes[1].task!.parentId = 'b'; },
    doc => { doc.nodes[0].task!.parentId = 'c'; },
    doc => { doc.boards.push({ ...doc.boards[0], id: 'other' }); doc.nodes[0].boardId = 'other'; doc.edges = []; },
    doc => { (doc.nodes[0].task as unknown as { status: string }).status = 'later'; },
  ];
  for (const change of changes) { const doc = taskDocument(); change(doc); assert.throws(() => validateWorkspace(doc)); }
});

test('validates annotation bounds, exact quote, state, dates and bounded count/comment length', () => {
  const changes: ((value: NodeAnnotation) => void)[] = [
    value => { value.start = -1; }, value => { value.start = 6.5; }, value => { value.end = 500; },
    value => { value.end = value.start; }, value => { value.quote = 'different'; },
    value => { value.body = 'x'.repeat(10001); }, value => { value.createdAt = 'not a date'; },
    value => { (value as unknown as { resolved: string }).resolved = 'yes'; },
    value => { (value as unknown as { orphaned: string }).orphaned = 'yes'; },
    value => { (value as unknown as { color: string }).color = 'black'; },
  ];
  for (const change of changes) { const doc = base(), item = annotation(); change(item); doc.nodes[0].annotations = [item]; assert.throws(() => validateWorkspace(doc)); }
  const tooMany = base(); tooMany.nodes[0].annotations = Array.from({ length: 201 }, (_, index) => annotation({ id: `comment-${index}` }));
  assert.throws(() => validateWorkspace(tooMany));
  const duplicates = base(); duplicates.nodes[0].annotations = [annotation(), annotation()]; assert.throws(() => validateWorkspace(duplicates));
  const orphan = base(); orphan.nodes[0].text = ''; orphan.nodes[0].annotations = [annotation({ start: 0, end: 0, orphaned: true })];
  assert.equal(validateWorkspace(orphan), orphan, 'An orphan retains its original quote after all source text is deleted.');
  orphan.nodes[0].annotations[0].end = 1; assert.throws(() => validateWorkspace(orphan), 'Orphan offsets remain bounded by the current source.');
});

test('validates node appearances and every optional edge style/route value', () => {
  const badEdges = [
    { route: 'arc' }, { stroke: 'dots' }, { color: 'red' }, { width: 0 }, { width: 5.1 }, { width: NaN },
    { animated: 1 }, { bend: null }, { bend: { x: Infinity, y: 0 } }, { bend: { x: 0, y: -1e7 - 1 } },
  ];
  for (const patch of badEdges) { const doc = base(); Object.assign(doc.edges[0], patch); assert.throws(() => validateWorkspace(doc)); }
  const doc = base(); (doc.nodes[0] as unknown as { appearance: string }).appearance = 'round'; assert.throws(() => validateWorkspace(doc));
});

test('Enter/Tab inherit explicit task hierarchy while independent tasks begin as roots', () => {
  let doc = taskDocument();
  const child = prepareThought(doc, 'root', 'b', 'child');
  assert.deepEqual(child.node.task, { status: 'todo', parentId: 'b' }); assert.equal(child.parentId, 'b');
  doc = insertThought(doc, { ...child.node, title: 'Subtask' }, child.parentId);
  const sibling = prepareThought(doc, 'root', 'b', 'sibling');
  assert.deepEqual(sibling.node.task, { status: 'todo', parentId: 'a' }); assert.equal(sibling.parentId, 'a');
  const rootSibling = prepareThought(doc, 'root', 'a', 'sibling');
  assert.deepEqual(rootSibling.node.task, { status: 'todo', parentId: null }); assert.equal(rootSibling.parentId, null);
  const standalone = prepareThought(base(), 'root', null, 'sibling', { asTask: true });
  assert.deepEqual(standalone.node.task, { status: 'todo', parentId: null });
  const plain = prepareThought(base(), 'root', 'a', 'child'); assert.equal(plain.node.task, undefined);
  const taskFromPlain = prepareThought(base(), 'root', 'a', 'child', { asTask: true });
  assert.equal(taskFromPlain.node.task?.parentId, null); assert.equal(taskFromPlain.parentId, 'a');
  assert.equal(validateWorkspace(insertThought(base(), { ...taskFromPlain.node, title: 'Task linked to an idea' }, taskFromPlain.parentId)).nodes.length, 4);
  assert.equal(validateWorkspace(doc), doc);
});

test('bulk branches from a task become subtasks and progress counts descendants without changing their status', () => {
  const doc = taskDocument();
  assert.deepEqual(taskProgress(doc, 'a'), { done: 1, total: 2, percent: 50 });
  const changed = setTaskStatus(doc, 'a', 'done');
  assert.equal(changed.nodes[1].task!.status, 'doing');
  assert.deepEqual(taskProgress(changed, 'a'), { done: 1, total: 2, percent: 50 });
  assert.equal(setTaskStatus(changed, 'a', 'done'), changed);
  const branched = addBranches(doc, 'a', ['One', 'Two']);
  assert.ok(branched.nodes.slice(3).every(node => node.task?.parentId === 'a' && node.task.status === 'todo'));
  assert.deepEqual(taskProgress(branched, 'a'), { done: 1, total: 4, percent: 25 });
  assert.equal(validateWorkspace(branched), branched);
});

test('task conversion/removal and node deletion preserve surviving descendants as roots', () => {
  const ordinary = base(), converted = convertToTask(ordinary, 'a');
  assert.deepEqual(converted.nodes[0].task, { status: 'todo', parentId: null });
  assert.equal(convertToTask(converted, 'a'), converted);
  assert.equal(ordinary.nodes[0].task, undefined);
  const doc = taskDocument();
  const removed = removeTask(doc, 'a');
  assert.equal(Object.hasOwn(removed.nodes[0], 'task'), false);
  assert.equal(removed.nodes[1].task!.parentId, null);
  assert.equal(removed.nodes[2].task!.parentId, 'b');
  assert.equal(removed.edges, doc.edges, 'Task ancestry removal does not delete independent graph connections.');
  assert.equal(validateWorkspace(removed), removed);
  const deleted = deleteNode(doc, 'b');
  assert.equal(deleted.nodes.find(node => node.id === 'c')?.task?.parentId, null);
  assert.equal(deleted.nodes.find(node => node.id === 'c')?.task?.status, 'done');
  assert.equal(validateWorkspace(deleted), deleted);
});

test('recovery remaps task/annotation identity while preserving content and edge metadata', () => {
  const source = taskDocument(); source.nodes[0].annotations = [annotation()]; source.nodes[0].appearance = 'outline';
  Object.assign(source.edges[0], { route: 'straight', color: 'blue', stroke: 'dotted', width: 3, animated: false, bend: { x: 10, y: 20 } });
  const combined = copyWorkspaceAsRoots(base(), source, 'en');
  const [a, b, c] = combined.nodes.slice(3);
  assert.equal(b.task!.parentId, a.id); assert.equal(c.task!.parentId, b.id);
  assert.notEqual(a.annotations![0].id, source.nodes[0].annotations![0].id);
  assert.equal(a.annotations![0].quote, 'target'); assert.equal(a.annotations![0].body, source.nodes[0].annotations![0].body);
  assert.equal(a.appearance, 'outline'); assert.equal(combined.edges[1].stroke, 'dotted');
  assert.deepEqual(combined.edges[1].bend, { x: 10, y: 20 });
  assert.equal(validateWorkspace(combined), combined);
});

test('annotation anchors shift for unambiguous insertion before and remain stable for edits after', () => {
  const original = [annotation()];
  const moved = reanchorAnnotations(original, 'text', 'alpha target omega', 'new alpha target omega', later);
  assert.equal(moved[0].start, 10); assert.equal(moved[0].end, 16); assert.equal(moved[0].orphaned, undefined);
  assert.equal(moved[0].updatedAt, later); assert.equal(original[0].start, 6);
  const stable = reanchorAnnotations(original, 'text', 'alpha target omega', 'alpha target omega!', later);
  assert.equal(stable, original);
  assert.equal(reanchorAnnotations(original, 'title', 'Alpha', 'New Alpha'), original);
  const emoji = annotation({ field: 'title', start: 5, end: 7, quote: '🔥' });
  const shiftedEmoji = reanchorAnnotations([emoji], 'title', 'Idea 🔥', 'A: Idea 🔥');
  assert.equal(shiftedEmoji[0].start, 8); assert.equal(shiftedEmoji[0].end, 10);
});

test('changed/deleted quotes remain recoverable orphans and never reattach by matching elsewhere', () => {
  const original = [annotation()];
  const changed = reanchorAnnotations(original, 'text', 'alpha target omega', 'alpha tarXget omega', later);
  assert.equal(changed[0].orphaned, true); assert.equal(changed[0].quote, 'target'); assert.equal(changed[0].body, original[0].body);
  const emptied = reanchorAnnotations(original, 'text', 'alpha target omega', '', later);
  assert.equal(emptied[0].orphaned, true); assert.equal(emptied[0].start, 0); assert.equal(emptied[0].end, 0);
  const reappeared = reanchorAnnotations(emptied, 'text', '', 'alpha target omega', later);
  assert.equal(reappeared[0].orphaned, true);
  const changedField = base(); changedField.nodes[0].text = ''; changedField.nodes[0].annotations = emptied;
  assert.equal(validateWorkspace(changedField), changedField);
});

test('ambiguous repeated-text insertion/deletion orphans affected selections, preserving known outside anchors', () => {
  const echo = annotation({ start: 0, end: 4, quote: 'echo' });
  const inserted = reanchorAnnotations([echo], 'text', 'echo echo', 'echo echo echo');
  assert.equal(inserted[0].orphaned, true);
  const repeated = [annotation({ id: 'first', start: 0, end: 1, quote: 'a' }), annotation({ id: 'last', start: 4, end: 5, quote: 'X' })];
  const deleted = reanchorAnnotations(repeated, 'text', 'aaaaX', 'aaaX');
  assert.equal(deleted[0].orphaned, true);
  assert.equal(deleted[1].orphaned, undefined); assert.equal(deleted[1].start, 3); assert.equal(deleted[1].end, 4);
});

test('patchNode reanchors both fields, synchronizes nested title and preserves original document', () => {
  let doc = base(); doc.nodes[0].annotations = [annotation(), annotation({ id: 'title-comment', field: 'title', start: 0, end: 5, quote: 'Alpha' })];
  doc = ensureChildBoard(doc, 'a').document;
  const changed = patchNode(doc, 'a', { title: 'New Alpha', text: 'new alpha target omega', appearance: 'sticky' });
  assert.equal(changed.nodes[0].annotations![0].start, 10);
  assert.equal(changed.nodes[0].annotations![1].start, 4);
  assert.equal(changed.boards.find(board => board.id === changed.nodes[0].childBoardId)?.title, 'New Alpha');
  assert.equal(doc.nodes[0].title, 'Alpha'); assert.equal(doc.nodes[0].annotations![0].start, 6);
  assert.equal(patchNode(changed, 'a', { title: 'New Alpha' }), changed);
  assert.equal(validateWorkspace(changed), changed);
});

test('patchNode rejects unsafe geometry and identity or task-cycle changes without mutation', () => {
  const doc = taskDocument(), original = JSON.stringify(doc);
  const patches: Partial<GraphNode>[] = [{ x: NaN }, { y: 1e7 + 1 }, { width: 0 }, { height: Infinity }, { width: 4097 },
    { id: 'changed' }, { boardId: 'other' }, { task: { status: 'doing', parentId: 'c' } }];
  for (const patch of patches) assert.throws(() => patchNode(doc, 'a', patch));
  assert.equal(JSON.stringify(doc), original);
  assert.equal(patchNode(doc, 'a', { x: -1e7, width: 32 }).nodes[0].x, -1e7);
});
