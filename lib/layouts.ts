import type { BoardLayout, GraphEdge, GraphNode, Language, NodeColor, Workspace } from './types';

export interface CanvasDesign {
  nodeStyle: 'neuron' | 'cards'; background: 'dots' | 'grid' | 'none';
  density: 'compact' | 'comfortable' | 'spacious'; accent: NodeColor; connectionLabels: boolean;
}
export type LayoutKind = BoardLayout['kind'];
export type SortKey = BoardLayout['sort'];
export type LayoutOptions = BoardLayout;
export interface LayoutGuide { id: string; kind: 'lane' | 'date' | 'group'; x: number; y: number; width: number; height: number; title: string; subtitle?: string; color?: NodeColor; }
export interface LayoutSuggestion { kind: LayoutKind; score: number; reason: { fa: string; en: string }; }
export const DEFAULT_CANVAS_DESIGN: CanvasDesign = { nodeStyle: 'neuron', background: 'dots', density: 'comfortable', accent: 'sage', connectionLabels: false };
export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = { kind: 'neural', sort: 'created', direction: 'asc', spacing: 72, language: 'fa' };
type Point = { x: number; y: number };
type Positioned = { node: GraphNode; x: number; y: number };
const limit = (value: number) => Math.round(Math.max(-1e7, Math.min(1e7, Number.isFinite(value) ? value : 0)) * 100) / 100;
const spacing = (options: LayoutOptions) => Math.max(24, Math.min(240, Number.isFinite(options.spacing) ? options.spacing : 72));
const compareIds = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const statusRank = { todo: 0, doing: 1, done: 2 };
function sorted(nodes: GraphNode[], options: LayoutOptions) {
  const sign = options.direction === 'desc' ? -1 : 1;
  return [...nodes].sort((a, b) => {
    let value = 0;
    if (options.sort === 'title') value = a.title.localeCompare(b.title, options.language);
    else if (options.sort === 'kind') value = compareIds(a.kind, b.kind);
    else if (options.sort === 'color') value = compareIds(a.color, b.color);
    else if (options.sort === 'status') value = (a.task ? statusRank[a.task.status] : 3) - (b.task ? statusRank[b.task.status] : 3);
    else value = compareIds(a.createdAt, b.createdAt);
    return value * sign || compareIds(a.id, b.id);
  });
}
function dimensions(nodes: GraphNode[]) { return { width: Math.max(244, ...nodes.map(node => node.width)), height: Math.max(172, ...nodes.map(node => node.height)) }; }
function bounds(items: Positioned[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const item of items) { minX = Math.min(minX, item.x); minY = Math.min(minY, item.y); maxX = Math.max(maxX, item.x + item.node.width); maxY = Math.max(maxY, item.y + item.node.height); }
  return { minX, minY, maxX, maxY };
}
function centered(items: Positioned[]): Positioned[] {
  if (!items.length) return items;
  const area = bounds(items), x = (area.minX + area.maxX) / 2, y = (area.minY + area.maxY) / 2;
  return items.map(item => ({ ...item, x: item.x - x, y: item.y - y }));
}
function grid(nodes: GraphNode[], gap: number, columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)))): Positioned[] {
  const cell = dimensions(nodes);
  return nodes.map((node, index) => ({ node, x: index % columns * (cell.width + gap) + (cell.width - node.width) / 2, y: Math.floor(index / columns) * (cell.height + gap) + (cell.height - node.height) / 2 }));
}
function adjacency(nodes: GraphNode[], edges: GraphEdge[]) {
  const byId = new Map(nodes.map((node, index) => [node.id, index]));
  const outgoing = nodes.map(() => new Set<number>()), neighbors = nodes.map(() => new Set<number>()), incoming = nodes.map(() => 0);
  const add = (sourceId: string, targetId: string) => {
    const a = byId.get(sourceId), b = byId.get(targetId);
    if (a === undefined || b === undefined || a === b || outgoing[a].has(b)) return;
    outgoing[a].add(b); incoming[b]++; neighbors[a].add(b); neighbors[b].add(a);
  };
  for (const edge of edges) add(edge.sourceId, edge.targetId);
  for (const node of nodes) if (node.task?.parentId) add(node.task.parentId, node.id);
  return { outgoing, neighbors, incoming };
}
function components(neighbors: Set<number>[]) {
  const seen = new Set<number>(), result: number[][] = [];
  for (let index = 0; index < neighbors.length; index++) {
    if (seen.has(index)) continue;
    const group = [index]; seen.add(index);
    for (let cursor = 0; cursor < group.length; cursor++) for (const next of [...neighbors[group[cursor]]].sort((a, b) => a - b)) if (!seen.has(next)) { seen.add(next); group.push(next); }
    result.push(group);
  }
  return result;
}
function tree(nodes: GraphNode[], edges: GraphEdge[], gap: number, rtl: boolean): Positioned[] {
  const graph = adjacency(nodes, edges), levels = new Map<number, number[]>(), visited = new Set<number>();
  const roots = nodes.map((_, index) => index).filter(index => graph.incoming[index] === 0);
  for (const root of [...roots, ...nodes.map((_, index) => index)]) {
    if (visited.has(root)) continue;
    const queue = [{ index: root, depth: 0 }]; visited.add(root);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const { index, depth } = queue[cursor];
      const level = levels.get(depth) ?? []; level.push(index); levels.set(depth, level);
      for (const next of [...graph.outgoing[index]].sort((a, b) => a - b)) if (!visited.has(next)) { visited.add(next); queue.push({ index: next, depth: depth + 1 }); }
    }
  }
  const width = dimensions(nodes).width, items: Positioned[] = [];
  for (const [depth, members] of levels) {
    members.sort((a, b) => a - b);
    const total = members.reduce((sum, index) => sum + nodes[index].height, 0) + gap * Math.max(0, members.length - 1);
    let y = -total / 2;
    for (const index of members) { const node = nodes[index]; items.push({ node, x: depth * (width + gap * 2) * (rtl ? -1 : 1), y }); y += node.height + gap; }
  }
  return items;
}
function orbit(nodes: GraphNode[], edges: GraphEdge[], gap: number): Positioned[] {
  if (!nodes.length) return [];
  const graph = adjacency(nodes, edges);
  const ranks = nodes.map((_, index) => index).sort((a, b) => graph.neighbors[b].size - graph.neighbors[a].size || a - b);
  const hub = nodes[ranks[0]], rest = nodes.filter(node => node.id !== hub.id);
  const step = Math.max(...nodes.map(node => Math.hypot(node.width, node.height))) + gap;
  const result: Positioned[] = [{ node: hub, x: -hub.width / 2, y: -hub.height / 2 }];
  let cursor = 0, ring = 1;
  while (cursor < rest.length) {
    const radius = ring * step, count = Math.min(rest.length - cursor, Math.max(4, Math.floor(2 * Math.PI * radius / (step * 1.12))));
    for (let index = 0; index < count; index++) { const node = rest[cursor++], angle = -Math.PI / 2 + index * Math.PI * 2 / count; result.push({ node, x: Math.cos(angle) * radius - node.width / 2, y: Math.sin(angle) * radius - node.height / 2 }); }
    ring++;
  }
  return result;
}
/** Large boards use connected chunks rather than an unbounded all-pairs simulation. */
function clustered(nodes: GraphNode[], edges: GraphEdge[], gap: number): Positioned[] {
  const groups = components(adjacency(nodes, edges).neighbors).flatMap(group => {
    const chunks: number[][] = []; for (let index = 0; index < group.length; index += 64) chunks.push(group.slice(index, index + 64)); return chunks;
  });
  const tiles = groups.map(group => grid(group.map(index => nodes[index]), gap));
  const areas = tiles.map(items => bounds(items));
  const width = Math.max(...areas.map(area => area.maxX - area.minX)) + gap * 3, height = Math.max(...areas.map(area => area.maxY - area.minY)) + gap * 3;
  const columns = Math.max(1, Math.ceil(Math.sqrt(tiles.length)));
  return tiles.flatMap((items, index) => items.map(item => ({ ...item, x: item.x + index % columns * width, y: item.y + Math.floor(index / columns) * height })));
}
function overlaps(a: Positioned, b: Positioned, gap: number) { return a.x < b.x + b.node.width + gap && a.x + a.node.width + gap > b.x && a.y < b.y + b.node.height + gap && a.y + a.node.height + gap > b.y; }
function neural(nodes: GraphNode[], edges: GraphEdge[], gap: number): Positioned[] {
  if (nodes.length > 250) return clustered(nodes, edges, gap);
  const graph = adjacency(nodes, edges), groups = components(graph.neighbors), cell = dimensions(nodes);
  const componentColumns = Math.max(1, Math.ceil(Math.sqrt(groups.length)));
  const seeds: Point[] = nodes.map(() => ({ x: 0, y: 0 }));
  const positions: Point[] = nodes.map(() => ({ x: 0, y: 0 }));
  const groupStep = Math.max(cell.width, cell.height) * Math.sqrt(Math.max(...groups.map(group => group.length), 1)) + gap * 3;
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex], seed = { x: groupIndex % componentColumns * groupStep, y: Math.floor(groupIndex / componentColumns) * groupStep };
    const placed = centered(grid(group.map(index => nodes[index]), gap));
    group.forEach((index, local) => { seeds[index] = seed; positions[index] = { x: seed.x + placed[local].x + nodes[index].width / 2, y: seed.y + placed[local].y + nodes[index].height / 2 }; });
  }
  const radii = nodes.map(node => Math.hypot(node.width, node.height) / 2);
  const forces = nodes.map(() => ({ x: 0, y: 0 }));
  for (let iteration = 0; iteration < 90; iteration++) {
    for (let index = 0; index < nodes.length; index++) { forces[index].x = (seeds[index].x - positions[index].x) * .012; forces[index].y = (seeds[index].y - positions[index].y) * .012; }
    for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
      let dx = positions[b].x - positions[a].x, dy = positions[b].y - positions[a].y;
      if (dx === 0 && dy === 0) { dx = ((a + b) % 2 ? 1 : -1) * .01; dy = .01; }
      const distance = Math.max(.01, Math.hypot(dx, dy)), desired = radii[a] + radii[b] + gap;
      const force = Math.max(0, desired * 1.4 - distance) * .09 + Math.max(0, desired - distance) * .35;
      const x = dx / distance * force, y = dy / distance * force;
      forces[a].x -= x; forces[a].y -= y; forces[b].x += x; forces[b].y += y;
    }
    for (let a = 0; a < nodes.length; a++) for (const b of graph.outgoing[a]) {
      const dx = positions[b].x - positions[a].x, dy = positions[b].y - positions[a].y, distance = Math.max(1, Math.hypot(dx, dy));
      const force = (distance - radii[a] - radii[b] - gap) * .045;
      const x = dx / distance * force, y = dy / distance * force;
      forces[a].x += x; forces[a].y += y; forces[b].x -= x; forces[b].y -= y;
    }
    const maximum = 16 * (1 - iteration / 110);
    for (let index = 0; index < nodes.length; index++) { const length = Math.hypot(forces[index].x, forces[index].y), factor = length > maximum ? maximum / length : 1; positions[index].x += forces[index].x * factor; positions[index].y += forces[index].y * factor; }
  }
  // Deterministic final packing removes residual overlaps without more simulation.
  const placed: Positioned[] = [];
  nodes.forEach((node, index) => {
    const item = { node, x: positions[index].x - node.width / 2, y: positions[index].y - node.height / 2 };
    for (let pass = 0; pass <= placed.length; pass++) { const collisions = placed.filter(other => overlaps(item, other, gap * .35)); if (!collisions.length) break; item.y = Math.max(...collisions.map(other => other.y + other.node.height)) + gap * .35; }
    placed.push(item);
  });
  return placed;
}
function nodeDate(node: GraphNode) {
  const value = node.scheduledAt ?? node.createdAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'undated';
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : 'undated';
}
function dateGroups(nodes: GraphNode[], direction: LayoutOptions['direction']) {
  const groups = new Map<string, GraphNode[]>();
  for (const node of nodes) { const key = nodeDate(node), group = groups.get(key) ?? []; group.push(node); groups.set(key, group); }
  return [...groups.entries()].sort(([a], [b]) => a === 'undated' ? 1 : b === 'undated' ? -1 : compareIds(a, b) * (direction === 'desc' ? -1 : 1));
}
function timeline(nodes: GraphNode[], options: LayoutOptions): Positioned[] {
  const gap = spacing(options), result: Positioned[] = []; let x = 0;
  for (const [, group] of dateGroups(nodes, options.direction)) { const width = dimensions(group).width; let y = 0; for (const node of group) { result.push({ node, x: x + (width - node.width) / 2, y }); y += node.height + gap; } x += width + gap * 2; }
  return result;
}
const lanes = [
  { key: 'todo', fa: 'انجام‌نشده', en: 'To do', color: 'amber' }, { key: 'doing', fa: 'در حال انجام', en: 'Doing', color: 'blue' },
  { key: 'done', fa: 'انجام‌شده', en: 'Done', color: 'sage' }, { key: 'ideas', fa: 'فکرها و منابع', en: 'Ideas & references', color: 'gray' },
] as const;
function kanban(nodes: GraphNode[], options: LayoutOptions): Positioned[] {
  const gap = spacing(options), width = dimensions(nodes).width, step = width + gap * 2;
  const groups = lanes.map(lane => nodes.filter(node => (node.task?.status ?? 'ideas') === lane.key));
  const height = Math.max(172, ...groups.map(group => group.reduce((sum, node) => sum + node.height, 0) + Math.max(0, group.length - 1) * gap));
  return groups.flatMap((group, index) => { let y = -height / 2; const column = options.language === 'fa' ? 3 - index : index; return group.map(node => { const item = { node, x: (column - 1.5) * step - node.width / 2, y }; y += node.height + gap; return item; }); });
}

export function arrangeWorkspace(document: Workspace, boardId: string, options: LayoutOptions): Workspace {
  const board = document.boards.find(item => item.id === boardId);
  if (!board) return document;
  const nodes = sorted(document.nodes.filter(node => node.boardId === boardId), options);
  const edges = document.edges.filter(edge => edge.boardId === boardId), gap = spacing(options);
  const layout: BoardLayout = { kind: options.kind, sort: options.sort, direction: options.direction, spacing: gap, language: options.language,
    ...(options.kind === 'kanban' ? { columnStep: dimensions(nodes).width + gap * 2 } : {}),
  };
  const sameLayout = board.layout && (Object.keys(layout) as (keyof BoardLayout)[]).every(key => board.layout![key] === layout[key]) && board.layout.columnStep === layout.columnStep;
  const nextBoards = sameLayout ? document.boards : document.boards.map(item => item.id === boardId ? { ...item, layout } : item);
  if (!nodes.length) return sameLayout ? document : { ...document, boards: nextBoards };
  let items: Positioned[];
  if (options.kind === 'tree') items = tree(nodes, edges, gap, options.language === 'fa');
  else if (options.kind === 'orbit') items = orbit(nodes, edges, gap);
  else if (options.kind === 'grid') items = grid(nodes, gap);
  else if (options.kind === 'timeline') items = timeline(nodes, options);
  else if (options.kind === 'kanban') items = kanban(nodes, options);
  else items = neural(nodes, edges, gap);
  if (options.kind !== 'kanban') items = centered(items);
  const positions = new Map(items.map(item => [item.node.id, { x: limit(item.x), y: limit(item.y) }]));
  let changed = !sameLayout;
  const nextNodes = document.nodes.map(node => { const at = positions.get(node.id); if (!at || (at.x === node.x && at.y === node.y)) return node; changed = true; return { ...node, ...at }; });
  const nextEdges = document.edges.map(edge => { if (edge.boardId !== boardId || !edge.bend) return edge; changed = true; const next = { ...edge }; delete next.bend; return next; });
  return changed ? { ...document, boards: nextBoards, nodes: nextNodes, edges: nextEdges } : document;
}

export function layoutGuides(document: Workspace, boardId: string, options: LayoutOptions, displayLanguage: Language = options.language): LayoutGuide[] {
  const nodes = document.nodes.filter(node => node.boardId === boardId), gap = spacing(options);
  if (!nodes.length) return [];
  if (options.kind === 'timeline') {
    const formatter = new Intl.DateTimeFormat(displayLanguage === 'fa' ? 'fa-IR' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    return dateGroups(nodes, options.direction).map(([key, group]) => {
      const area = bounds(group.map(node => ({ node, x: node.x, y: node.y })));
      const title = key === 'undated' ? displayLanguage === 'fa' ? 'بدون تاریخ' : 'Undated' : formatter.format(new Date(`${key}T12:00:00Z`));
      return { id: `date-${key}`, kind: 'date', x: area.minX - 24, y: area.minY - 62, width: area.maxX - area.minX + 48, height: area.maxY - area.minY + 90, title, subtitle: key === 'undated' ? undefined : key, color: 'blue' };
    });
  }
  if (options.kind === 'kanban') {
    const step = options.columnStep ?? dimensions(nodes).width + gap * 2, width = Math.max(32, step - gap * 2), area = bounds(nodes.map(node => ({ node, x: node.x, y: node.y })));
    return lanes.map((lane, index) => { const column = options.language === 'fa' ? 3 - index : index; return { id: `lane-${lane.key}`, kind: 'lane', x: (column - 1.5) * step - width / 2 - 24, y: area.minY - 62, width: width + 48, height: Math.max(260, area.maxY - area.minY + 90), title: displayLanguage === 'fa' ? lane.fa : lane.en, color: lane.color }; });
  }
  return [];
}

export function suggestLayouts(nodes: GraphNode[], edges: GraphEdge[]): LayoutSuggestion[] {
  const count = nodes.length || 1, ids = new Set(nodes.map(node => node.id));
  const links = edges.filter(edge => ids.has(edge.sourceId) && ids.has(edge.targetId));
  const tasks = nodes.filter(node => node.task).length, scheduled = nodes.filter(node => node.scheduledAt).length;
  const media = nodes.filter(node => node.asset || ['image', 'video', 'pdf', 'file', 'audio'].includes(node.kind)).length;
  const outgoing = new Map<string, number>(); for (const edge of links) outgoing.set(edge.sourceId, (outgoing.get(edge.sourceId) ?? 0) + 1);
  const hub = Math.max(0, ...outgoing.values());
  return [
    { kind: 'neural' as const, score: 50 + Math.min(35, links.length / count * 25), reason: { fa: 'برای دیدن خوشه‌ها و ارتباط میان فکرها', en: 'See connected clusters and relationships between thoughts' } },
    { kind: 'tree' as const, score: 30 + Math.min(50, hub * 9) + (tasks ? 8 : 0), reason: { fa: 'برای شاخه‌ها، سلسله‌مراتب و مسیرهای چندمرحله‌ای', en: 'Follow branches, hierarchies, and multi-step paths' } },
    { kind: 'orbit' as const, score: 25 + Math.min(48, hub * 8), reason: { fa: 'برای یک فکر مرکزی و ایده‌های پیرامون آن', en: 'Place a central thought among its surrounding ideas' } },
    { kind: 'grid' as const, score: 25 + media / count * 65, reason: { fa: 'برای مرور منظم تصاویر، فایل‌ها و منابع', en: 'Browse images, files, and references in a regular grid' } },
    { kind: 'timeline' as const, score: 15 + scheduled / count * 85, reason: { fa: scheduled ? 'تاریخ‌های برنامه‌ریزی‌شده را به ترتیب نشان می‌دهد' : 'فکرها را بر اساس تاریخ ایجاد گروه‌بندی می‌کند', en: scheduled ? 'Put scheduled work into dated groups' : 'Group thoughts by their creation date' } },
    { kind: 'kanban' as const, score: 10 + tasks / count * 90, reason: { fa: 'برای دیدن وضعیت تسک‌ها و کارهای باقی‌مانده', en: 'See task status and the work still remaining' } },
  ].sort((a, b) => b.score - a.score || compareIds(a.kind, b.kind));
}
