import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeWorkspace, DEFAULT_LAYOUT_OPTIONS, layoutGuides, suggestLayouts, type LayoutKind, type LayoutOptions } from '../lib/layouts.ts';
import { buildNodeGrowth, projectCardNode } from '../lib/node-growth.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

const createdAt = '2026-11-12T12:00:00.000Z';
const node = (id: string, patch: Partial<GraphNode> = {}): GraphNode => ({ id, boardId: 'home', kind: 'note', title: id, text: 'Preserved body', x: 7, y: 11, width: 244, height: 172, color: 'sage', asset: null, url: '', childBoardId: null, createdAt, ...patch });
function fixture(count = 24): Workspace {
  const nodes = Array.from({ length: count }, (_, index) => node(`n${String(index).padStart(3, '0')}`, { width: 200 + index % 3 * 44, height: 150 + index % 4 * 40, scheduledAt: `2026-11-${String(12 + index % 3).padStart(2, '0')}`, task: index % 4 === 3 ? undefined : { status: (['todo', 'doing', 'done'] as const)[index % 3], parentId: index > 0 && index % 4 !== 3 ? 'n000' : null } }));
  return { version: 1, homeBoardId: 'home', boards: [{ id: 'home', title: 'Home', description: '', parentNodeId: null, createdAt }], nodes, edges: nodes.slice(1).map((item, index) => ({ id: `e${index}`, boardId: 'home', sourceId: index < 8 ? 'n000' : nodes[index].id, targetId: item.id, label: `edge ${index}` })) };
}
function assertGeometry(document: Workspace) {
  for (const item of document.nodes) { assert.ok(Number.isFinite(item.x) && Number.isFinite(item.y)); assert.ok(Math.abs(item.x) <= 1e7 && Math.abs(item.y) <= 1e7); }
  const growth = buildNodeGrowth(document), visible = document.nodes.map(item => projectCardNode(item, growth.get(item.id)));
  for (let a = 0; a < visible.length; a++) for (let b = a + 1; b < visible.length; b++) {
    const left = visible[a], right = visible[b]; if (left.boardId !== right.boardId) continue;
    assert.equal(left.x < right.x + right.width - .01 && left.x + left.width > right.x + .01 && left.y < right.y + right.height - .01 && left.y + left.height > right.y + .01, false, `${left.id} overlaps ${right.id}`);
  }
}

test('arrangement preserves content and foreign board identity; only local bends reset', () => {
  const document = fixture(8), foreign = node('foreign', { boardId: 'other', x: 900, y: 800 });
  document.nodes.push(foreign, node('foreign-2', { boardId: 'other', x: 1300, y: 800 }));
  document.boards.push({ ...document.boards[0], id: 'other' });
  document.edges[0] = { ...document.edges[0], bend: { x: 12, y: 24 }, route: 'elbow', stroke: 'dotted', color: 'rose', width: 3, animated: false };
  const foreignEdge = { id: 'foreign-edge', boardId: 'other', sourceId: 'foreign', targetId: 'foreign-2', label: 'Keep', bend: { x: 1000, y: 900 } };
  document.edges.push(foreignEdge);
  const before = structuredClone(document), after = arrangeWorkspace(document, 'home', DEFAULT_LAYOUT_OPTIONS);
  assert.deepEqual(document, before);
  assert.deepEqual(after.boards[0].layout, DEFAULT_LAYOUT_OPTIONS);
  assert.equal(after.boards[1], document.boards[1]);
  assert.equal(after.nodes.find(item => item.id === 'foreign'), foreign);
  assert.equal(after.edges.at(-1), foreignEdge);
  assert.equal(after.edges[0].bend, undefined);
  assert.equal(after.edges[0].route, 'elbow'); assert.equal(after.edges[0].animated, false);
  for (const item of after.nodes) { const original = before.nodes.find(other => other.id === item.id)!; assert.deepEqual({ ...item, x: original.x, y: original.y }, original); }
  assert.equal(arrangeWorkspace(document, 'missing', DEFAULT_LAYOUT_OPTIONS), document);
});

test('every layout packs grown card bounds, preserves saved dimensions, and is deterministic and stable when reapplied', () => {
  const document = fixture();
  document.edges.push({ id: 'cycle', boardId: 'home', sourceId: 'n023', targetId: 'n000', label: '' });
  for (const kind of ['neural', 'tree', 'orbit', 'grid', 'timeline', 'kanban'] as LayoutKind[]) {
    const options = { ...DEFAULT_LAYOUT_OPTIONS, kind, language: 'en' as const };
    const first = arrangeWorkspace(document, 'home', options), second = arrangeWorkspace(document, 'home', options);
    assert.deepEqual(first, second, kind); assert.equal(arrangeWorkspace(first, 'home', options), first, kind);
    assertGeometry(first); assert.equal(first.nodes.length, document.nodes.length); assert.equal(first.edges.length, document.edges.length);
    assert.deepEqual(first.nodes.map(({ id, width, height }) => ({ id, width, height })), document.nodes.map(({ id, width, height }) => ({ id, width, height })), kind);
  }
});

test('large neural boards use deterministic collision-free connected clusters', () => {
  const document = fixture(320), options = { ...DEFAULT_LAYOUT_OPTIONS, spacing: 40 };
  const first = arrangeWorkspace(document, 'home', options);
  assertGeometry(first); assert.deepEqual(arrangeWorkspace(first, 'home', options), first);
  assert.ok(Math.max(...first.nodes.map(item => Math.abs(item.x))) < 100000);
});

test('tree handles cycles and disconnected roots without dropping any node', () => {
  const document = fixture(18); document.edges = document.edges.slice(0, 4);
  document.edges.push({ id: 'back', boardId: 'home', sourceId: 'n004', targetId: 'n000', label: '' });
  const first = arrangeWorkspace(document, 'home', { ...DEFAULT_LAYOUT_OPTIONS, kind: 'tree' });
  assertGeometry(first); assert.equal(new Set(first.nodes.map(item => item.id)).size, 18);
});

test('timeline prioritizes scheduled dates, falls back to creation dates, and labels date groups', () => {
  const document = fixture(3);
  document.nodes = [node('a', { scheduledAt: '2026-12-02' }), node('b', { createdAt: '2026-10-01T10:30:00Z' }), node('c', { scheduledAt: '2026-12-02' })];
  document.edges = [];
  const options: LayoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, kind: 'timeline', language: 'en' };
  const result = arrangeWorkspace(document, 'home', options), byId = new Map(result.nodes.map(item => [item.id, item]));
  assert.ok(byId.get('b')!.x < byId.get('a')!.x); assert.equal(byId.get('a')!.x, byId.get('c')!.x);
  const guides = layoutGuides(result, 'home', options);
  assert.deepEqual(guides.map(guide => guide.subtitle), ['2026-10-01', '2026-12-02']);
  assert.ok(guides.every(guide => guide.title && guide.width > 0 && guide.height > 0));
  const descending = arrangeWorkspace(document, 'home', { ...options, direction: 'desc' });
  assert.ok(descending.nodes.find(item => item.id === 'b')!.x > descending.nodes.find(item => item.id === 'a')!.x);
});

test('kanban keeps four visible lanes including non-tasks and mirrors lane order in Persian', () => {
  const document = fixture(8);
  for (const language of ['en', 'fa'] as const) {
    const options = { ...DEFAULT_LAYOUT_OPTIONS, kind: 'kanban' as const, language }, result = arrangeWorkspace(document, 'home', options);
    const guides = layoutGuides(result, 'home', options);
    assert.equal(guides.length, 4);
    assert.ok(language === 'en' ? guides[0].x < guides[3].x : guides[0].x > guides[3].x);
    for (const item of result.nodes) { const guide = guides.find(guide => guide.id === `lane-${item.task?.status ?? 'ideas'}`)!; assert.ok(item.x >= guide.x && item.x + item.width <= guide.x + guide.width); }
    assertGeometry(result);
  }
});

test('shared Kanban geometry survives translation, status changes, and wider additions until reapplication', () => {
  const options = { ...DEFAULT_LAYOUT_OPTIONS, kind: 'kanban' as const, language: 'en' as const };
  const result = arrangeWorkspace(fixture(8), 'home', options), layout = result.boards[0].layout!;
  const growth = buildNodeGrowth(result);
  assert.equal(layout.columnStep, Math.max(244, ...result.nodes.map(item => projectCardNode(item, growth.get(item.id)).width)) + options.spacing * 2);
  const before = layoutGuides(result, 'home', layout, 'en');
  const translated = layoutGuides(result, 'home', layout, 'fa');
  assert.deepEqual(translated.map(({ x, width, id }) => ({ x, width, id })), before.map(({ x, width, id }) => ({ x, width, id })));
  assert.notEqual(translated[0].title, before[0].title);
  const updated: Workspace = { ...result, nodes: [...result.nodes.map((item, index) => index === 0 ? { ...item, task: { status: 'done' as const, parentId: null } } : item), node('wide', { width: 800, x: 1600, y: 1200 })] };
  const guides = layoutGuides(updated, 'home', layout, 'en');
  assert.deepEqual(guides.map(({ x, width, id }) => ({ x, width, id })), before.map(({ x, width, id }) => ({ x, width, id })));
  assert.ok(guides.every(guide => guide.subtitle === undefined));
  const reapplied = arrangeWorkspace(updated, 'home', layout);
  assert.equal(reapplied.boards[0].layout!.columnStep, 800 + options.spacing * 2);
  assert.equal(result.boards[0].layout, layout);
});

test('timeline and persisted Kanban guides enclose nested-project growth and remain fixed until explicit rearrangement', () => {
  const document = fixture(3);
  document.nodes = [node('project', { childBoardId: 'inside', width: 380, height: 260, task: { status: 'todo', parentId: null } }),
    node('next', { scheduledAt: '2026-12-01', task: { status: 'doing', parentId: null } }),
    ...Array.from({ length: 40 }, (_, index) => node(`inside-${index}`, { boardId: 'inside' }))];
  document.boards.push({ ...document.boards[0], id: 'inside', parentNodeId: 'project' });
  document.edges = [];
  const before = structuredClone(document);
  for (const kind of ['timeline', 'kanban'] as const) {
    const result = arrangeWorkspace(document, 'home', { ...DEFAULT_LAYOUT_OPTIONS, kind, language: 'en' });
    const layout = result.boards[0].layout!, growth = buildNodeGrowth(result);
    const guides = layoutGuides(result, 'home', layout);
    for (const item of result.nodes.filter(item => item.boardId === 'home')) {
      const visible = projectCardNode(item, growth.get(item.id));
      const guide = guides.find(guide => guide.id === (kind === 'kanban' ? `lane-${item.task!.status}` : `date-${item.scheduledAt ?? item.createdAt.slice(0, 10)}`))!;
      assert.ok(visible.x >= guide.x && visible.x + visible.width <= guide.x + guide.width);
      assert.ok(visible.y >= guide.y && visible.y + visible.height <= guide.y + guide.height);
    }
    assert.equal(arrangeWorkspace(result, 'home', layout), result);
    assert.equal(result.nodes[0].width, 380);
    assert.equal(result.nodes[0].height, 260);
    assert.equal(result.nodes.find(item => item.id === 'inside-0'), document.nodes.find(item => item.id === 'inside-0'));
    if (kind === 'kanban') {
      const expanded = { ...result, nodes: [...result.nodes, ...Array.from({ length: 40 }, (_, index) => node(`more-${index}`, { boardId: 'inside' }))] };
      assert.deepEqual(layoutGuides(expanded, 'home', layout).map(({ x, width }) => ({ x, width })), guides.map(({ x, width }) => ({ x, width })));
      assert.deepEqual(expanded.nodes.slice(0, result.nodes.length), result.nodes, 'Growing contained content does not move existing cards.');
      const rearranged = arrangeWorkspace(expanded, 'home', layout);
      assert.ok(rearranged.boards[0].layout!.columnStep! > layout.columnStep!);
    }
  }
  assert.deepEqual(document, before);
});

test('grid sorting and content-aware suggestions reflect the selected data', () => {
  const document = fixture(3); document.nodes = [node('c', { title: 'Charlie' }), node('a', { title: 'Alpha' }), node('b', { title: 'Bravo' })]; document.edges = [];
  const result = arrangeWorkspace(document, 'home', { ...DEFAULT_LAYOUT_OPTIONS, kind: 'grid', sort: 'title', language: 'en' });
  const a = result.nodes.find(item => item.id === 'a')!, b = result.nodes.find(item => item.id === 'b')!, c = result.nodes.find(item => item.id === 'c')!;
  assert.equal(a.y, b.y); assert.ok(a.x < b.x); assert.ok(c.y > a.y);
  assert.equal(suggestLayouts(document.nodes.map(item => ({ ...item, task: { status: 'todo', parentId: null } })), [])[0].kind, 'kanban');
  assert.equal(suggestLayouts(document.nodes.map(item => ({ ...item, scheduledAt: '2026-12-01' })), [])[0].kind, 'timeline');
  assert.equal(suggestLayouts(document.nodes.map(item => ({ ...item, kind: 'image' })), [])[0].kind, 'grid');
});
