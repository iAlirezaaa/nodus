import type { Board, GraphNode, NodeKind, Viewport, Workspace } from './types';

const DEFAULT_WIDTH = 244;
const DEFAULT_HEIGHT = 172;
const GAP = 52;

/** Stable identifiers for nodes, connections, boards, and assets. */
export function uid(): string {
  return globalThis.crypto.randomUUID();
}

function positive(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function coordinate(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function makeNode(
  boardId: string,
  kind: NodeKind,
  x: number,
  y: number,
  overrides: Partial<GraphNode> = {},
): GraphNode {
  return {
    id: uid(),
    title: kind === 'project' ? 'Untitled project' : 'Untitled idea',
    text: '',
    color: 'sage',
    asset: null,
    url: '',
    childBoardId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
    boardId,
    kind,
    x: coordinate(x),
    y: coordinate(y),
    width: positive(overrides.width, DEFAULT_WIDTH),
    height: positive(overrides.height, DEFAULT_HEIGHT),
  };
}

/** The starter board is a usable, editable guide, with no pretend uploaded files. */
export function createWorkspace(lang: 'fa' | 'en' = 'fa'): Workspace {
  const fa = lang === 'fa';
  const now = new Date().toISOString();
  const homeId = uid();
  const insideId = uid();
  const root = makeNode(homeId, 'note', 0, 18, {
    title: fa ? 'بذر یک ایده' : 'The seed of an idea',
    text: fa
      ? 'هر فکر می‌تواند شروع یک دنیای تازه باشد. روی این نقطه بزن و ایدهٔ خودت را بنویس.'
      : 'A small thought can become a whole new world. Open this node and make it your own.',
    width: 270,
    height: 192,
    color: 'sage',
    createdAt: now,
  });
  const writing = makeNode(homeId, 'note', -362, -190, {
    title: fa ? 'فکرها را بنویس' : 'Catch a thought',
    text: fa
      ? 'یک جمله، یک سؤال یا یک یادداشت طولانی. روی هر نقطه بزن تا محتوایش را بخوانی و ویرایش کنی.'
      : 'A sentence, a question, or a longer note. Open any node to read and edit its contents.',
    color: 'amber',
    createdAt: now,
  });
  const media = makeNode(homeId, 'note', -410, 65, {
    title: fa ? 'عکس، ویدیو، هر فایل' : 'Bring your references',
    text: fa
      ? 'فایل‌ها را روی بوم بینداز یا بارگذاری کن. عکس، ویدیو، صدا و PDF کنار فکرهایت می‌مانند.'
      : 'Drop files onto the canvas or upload them. Images, video, audio, and PDFs belong beside your ideas.',
    color: 'rose',
    createdAt: now,
  });
  const branches = makeNode(homeId, 'note', -348, 320, {
    title: fa ? 'یک فکر، شاخه‌های بسیار' : 'One thought, many branches',
    text: fa
      ? 'از هر نقطه شاخه بساز. برای ساخت چند شاخه با هم، عنوان هر ایده را در یک خط جدا بنویس.'
      : 'Grow branches from any node. To add several at once, write one idea title on each line.',
    color: 'blue',
    createdAt: now,
  });
  const project = makeNode(homeId, 'project', 384, -190, {
    title: fa ? 'یک پروژه در یک نقطه' : 'A project inside a node',
    text: fa
      ? 'این پروژه را باز کن. یک بوم دیگر با فکرهای خودش داخل آن منتظر توست.'
      : 'Open this project. Another canvas with its own connected ideas is waiting inside.',
    color: 'violet',
    childBoardId: insideId,
    createdAt: now,
  });
  const connect = makeNode(homeId, 'note', 430, 65, {
    title: fa ? 'ارتباط‌ها را پیدا کن' : 'Find the connections',
    text: fa
      ? 'نقطه‌ها را به هم وصل کن. یک ایده می‌تواند هم‌زمان به چند فکر دیگر مربوط باشد.'
      : 'Connect nodes to each other. One idea can belong to several lines of thought at the same time.',
    color: 'sage',
    createdAt: now,
  });
  const explore = makeNode(homeId, 'note', 366, 320, {
    title: fa ? 'از دور، از نزدیک' : 'See the bigger picture',
    text: fa
      ? 'بوم را بکش و زوم کن. از دور رابطه‌ها را ببین؛ از نزدیک وارد جزئیات شو.'
      : 'Pan and zoom to explore. Pull back to see relationships; move closer to discover the details.',
    color: 'gray',
    createdAt: now,
  });
  const childRoot = makeNode(insideId, 'note', 0, 28, {
    title: fa ? 'به لایهٔ بعدی خوش آمدی' : 'Welcome to the next layer',
    text: fa
      ? 'این یک پروژهٔ مستقل داخل بوم اصلی است. یادداشت‌ها و فایل‌های خودت را همین‌جا جمع کن.'
      : 'This is a separate project within your main canvas. Collect its notes and files right here.',
    color: 'violet',
    createdAt: now,
  });
  const childDepth = makeNode(insideId, 'note', 376, -108, {
    title: fa ? 'باز هم عمیق‌تر شو' : 'Go another layer deeper',
    text: fa
      ? 'هر نقطهٔ اینجا هم می‌تواند پروژه شود. محتوای قبلی آن حفظ می‌شود و بوم تازه‌ای به آن اضافه می‌شود.'
      : 'Any node here can become a project too. Its existing content stays, and a new canvas opens inside it.',
    color: 'sage',
    createdAt: now,
  });
  const childBack = makeNode(insideId, 'note', 376, 174, {
    title: fa ? 'راه برگشت همیشه پیداست' : 'Keep your way back',
    text: fa
      ? 'از مسیر بالای صفحه به بوم مادر برگرد. پروژه‌ها در جای خود می‌مانند؛ فقط زاویهٔ نگاهت عوض می‌شود.'
      : 'Use the breadcrumb trail to return to the parent canvas. Your projects stay in place as your view changes.',
    color: 'amber',
    createdAt: now,
  });
  const boards: Board[] = [
    { id: homeId, title: fa ? 'فضای فکر من' : 'My thinking space', description: fa ? 'جایی برای پیوند دادن فکرها' : 'A place to connect your thoughts', parentNodeId: null, createdAt: now },
    { id: insideId, title: project.title, description: project.text, parentNodeId: project.id, createdAt: now },
  ];
  let doc: Workspace = {
    version: 1,
    homeBoardId: homeId,
    boards,
    nodes: [root, writing, media, branches, project, connect, explore, childRoot, childDepth, childBack],
    edges: [],
  };
  for (const node of [writing, media, branches, project, connect, explore]) doc = addEdge(doc, root.id, node.id);
  doc = addEdge(doc, childRoot.id, childDepth.id);
  doc = addEdge(doc, childRoot.id, childBack.id);
  return doc;
}

export function addNode(doc: Workspace, node: GraphNode): Workspace {
  if (!doc.boards.some(board => board.id === node.boardId) || doc.nodes.some(existing => existing.id === node.id)) return doc;
  return { ...doc, nodes: [...doc.nodes, node] };
}

/** Ordinary graph cycles are valid; containment is represented separately. */
export function addEdge(doc: Workspace, sourceId: string, targetId: string, label = ''): Workspace {
  if (sourceId === targetId) return doc;
  const source = doc.nodes.find(node => node.id === sourceId);
  const target = doc.nodes.find(node => node.id === targetId);
  if (!source || !target || source.boardId !== target.boardId) return doc;
  if (doc.edges.some(edge => edge.sourceId === sourceId && edge.targetId === targetId)) return doc;
  return {
    ...doc,
    edges: [...doc.edges, { id: uid(), boardId: source.boardId, sourceId, targetId, label }],
  };
}

/** Remove a node and its contained projects, never the ideas merely linked to it. */
export function deleteNode(doc: Workspace, nodeId: string): Workspace {
  if (!doc.nodes.some(node => node.id === nodeId)) return doc;
  const removedNodes = new Set<string>([nodeId]);
  const removedBoards = new Set<string>();
  const queue = [nodeId];
  const byId = new Map(doc.nodes.map(node => [node.id, node]));
  const boardNodes = new Map<string, GraphNode[]>();
  const ownedBoards = new Map<string, Board[]>();
  for (const node of doc.nodes) {
    const group = boardNodes.get(node.boardId) ?? [];
    group.push(node);
    boardNodes.set(node.boardId, group);
  }
  for (const board of doc.boards) {
    if (!board.parentNodeId) continue;
    const group = ownedBoards.get(board.parentNodeId) ?? [];
    group.push(board);
    ownedBoards.set(board.parentNodeId, group);
  }
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    const node = byId.get(id);
    const children = [...(ownedBoards.get(id) ?? [])];
    if (node?.childBoardId) {
      const child = doc.boards.find(board => board.id === node.childBoardId);
      if (child && !children.some(board => board.id === child.id)) children.push(child);
    }
    for (const board of children) {
      // A malformed reference must never remove the workspace's home board.
      if (board.id === doc.homeBoardId || removedBoards.has(board.id)) continue;
      removedBoards.add(board.id);
      for (const contained of boardNodes.get(board.id) ?? []) {
        if (removedNodes.has(contained.id)) continue;
        removedNodes.add(contained.id);
        queue.push(contained.id);
      }
    }
  }
  return {
    ...doc,
    boards: doc.boards.filter(board => !removedBoards.has(board.id)),
    nodes: doc.nodes
      .filter(node => !removedNodes.has(node.id) && !removedBoards.has(node.boardId))
      .map(node => {
        let next = node.childBoardId && removedBoards.has(node.childBoardId) ? { ...node, childBoardId: null } : node;
        if (next.task?.parentId && removedNodes.has(next.task.parentId)) next = { ...next, task: { ...next.task, parentId: null } };
        return next;
      }),
    edges: doc.edges.filter(edge => !removedBoards.has(edge.boardId) && !removedNodes.has(edge.sourceId) && !removedNodes.has(edge.targetId)),
  };
}

/** Add a project inside any node without replacing its original content. */
export function ensureChildBoard(doc: Workspace, nodeId: string): { document: Workspace; boardId: string } {
  const node = doc.nodes.find(item => item.id === nodeId);
  if (!node) throw new Error('Cannot open a project for a node that does not exist.');
  const existing = doc.boards.find(board => board.parentNodeId === node.id && board.id !== doc.homeBoardId);
  if (existing) {
    return {
      document: node.childBoardId === existing.id ? doc : { ...doc, nodes: doc.nodes.map(item => item.id === nodeId ? { ...item, childBoardId: existing.id } : item) },
      boardId: existing.id,
    };
  }
  const board: Board = {
    id: uid(),
    title: node.title,
    description: node.text.slice(0, 5000),
    parentNodeId: node.id,
    createdAt: new Date().toISOString(),
  };
  return {
    document: {
      ...doc,
      boards: [...doc.boards, board],
      nodes: doc.nodes.map(item => item.id === nodeId ? { ...item, childBoardId: board.id } : item),
    },
    boardId: board.id,
  };
}

function intersects(a: GraphNode, b: GraphNode, gap = 0): boolean {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

/** Grid rings keep dense branching legible and never overlap existing cards. */
function* openPositions(parent: GraphNode, width: number, height: number): Generator<{ x: number; y: number }> {
  const stepX = Math.max(parent.width, width) + GAP + 20;
  const stepY = Math.max(parent.height, height) + GAP;
  const centerX = parent.x + parent.width / 2;
  const centerY = parent.y + parent.height / 2;
  for (let ring = 1; ; ring++) {
    const cells: { column: number; row: number }[] = [];
    for (let row = -ring; row <= ring; row++) {
      for (let column = -ring; column <= ring; column++) {
        if (Math.max(Math.abs(column), Math.abs(row)) === ring) cells.push({ column, row });
      }
    }
    // Start to the right and spiral clockwise, preserving a predictable order.
    cells.sort((a, b) => {
      const angleA = (Math.atan2(a.row, a.column) + Math.PI * 2) % (Math.PI * 2);
      const angleB = (Math.atan2(b.row, b.column) + Math.PI * 2) % (Math.PI * 2);
      return angleA - angleB;
    });
    for (const cell of cells) yield { x: centerX + cell.column * stepX - width / 2, y: centerY + cell.row * stepY - height / 2 };
  }
}

export function addBranches(doc: Workspace, nodeId: string, titles: string[]): Workspace {
  const parent = doc.nodes.find(node => node.id === nodeId);
  const labels = titles.map(title => title.trim()).filter(Boolean);
  if (!parent || labels.length === 0) return doc;
  const occupied = doc.nodes.filter(node => node.boardId === parent.boardId);
  const positions = openPositions(parent, DEFAULT_WIDTH, DEFAULT_HEIGHT);
  const additions: GraphNode[] = [];
  for (const title of labels) {
    const node = makeNode(parent.boardId, 'note', 0, 0, { title: title.slice(0, 500), text: title.length > 500 ? title : '', color: parent.color,
      ...(parent.task ? { task: { status: 'todo', parentId: parent.id } as GraphNode['task'] } : {}),
    });
    while (true) {
      const point = positions.next().value;
      if (!point) throw new Error('Unable to place the new branch.');
      node.x = point.x;
      node.y = point.y;
      if (!occupied.some(other => intersects(node, other, 24))) break;
    }
    additions.push(node);
    occupied.push(node);
  }
  return {
    ...doc,
    nodes: [...doc.nodes, ...additions],
    edges: [...doc.edges, ...additions.map(node => ({ id: uid(), boardId: parent.boardId, sourceId: parent.id, targetId: node.id, label: '' }))],
  };
}

/** A bidirectional tree layout, using a spanning tree when the graph has cycles. */
export function arrangeBoard(doc: Workspace, boardId: string): Workspace {
  const nodes = doc.nodes.filter(node => node.boardId === boardId);
  if (nodes.length === 0) return doc;
  const byId = new Map(nodes.map(node => [node.id, node]));
  const outgoing = new Map(nodes.map(node => [node.id, [] as string[]]));
  const incoming = new Map(nodes.map(node => [node.id, [] as string[]]));
  for (const edge of doc.edges) {
    if (edge.boardId !== boardId || !byId.has(edge.sourceId) || !byId.has(edge.targetId)) continue;
    outgoing.get(edge.sourceId)!.push(edge.targetId);
    incoming.get(edge.targetId)!.push(edge.sourceId);
  }
  const candidates = [...nodes].sort((a, b) => {
    const aRoot = incoming.get(a.id)!.length === 0 ? 0 : 1;
    const bRoot = incoming.get(b.id)!.length === 0 ? 0 : 1;
    return aRoot - bRoot;
  });
  const visited = new Set<string>();
  const children = new Map(nodes.map(node => [node.id, [] as string[]]));
  const components: { root: string; order: string[] }[] = [];
  for (const candidate of candidates) {
    if (visited.has(candidate.id)) continue;
    const order = [candidate.id];
    visited.add(candidate.id);
    for (let index = 0; index < order.length; index++) {
      const id = order[index];
      for (const neighbor of [...outgoing.get(id)!, ...incoming.get(id)!]) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        children.get(id)!.push(neighbor);
        order.push(neighbor);
      }
    }
    components.push({ root: candidate.id, order });
  }
  const maxWidth = Math.max(...nodes.map(node => node.width));
  const stepX = maxWidth + 112;
  const stepY = 52;
  const heights = new Map<string, number>();
  const groupHeight = (ids: string[]) => ids.reduce((total, id) => total + heights.get(id)!, 0) + Math.max(0, ids.length - 1) * stepY;
  const blocks: { positions: Map<string, { x: number; y: number }>; minX: number; minY: number; width: number; height: number }[] = [];
  for (const component of components) {
    for (let index = component.order.length - 1; index >= 0; index--) {
      const id = component.order[index];
      heights.set(id, Math.max(byId.get(id)!.height, groupHeight(children.get(id)!)));
    }
    const left: string[] = [];
    const right: string[] = [];
    for (const id of children.get(component.root)!) {
      (groupHeight(right) <= groupHeight(left) ? right : left).push(id);
    }
    const root = byId.get(component.root)!;
    const rootHeight = Math.max(root.height, groupHeight(left), groupHeight(right));
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(root.id, { x: 0, y: (rootHeight - root.height) / 2 });
    const stack: { id: string; side: number; depth: number; top: number }[] = [];
    const enqueue = (ids: string[], side: number, depth: number, centerY: number) => {
      let top = centerY - groupHeight(ids) / 2;
      for (const id of ids) {
        stack.push({ id, side, depth, top });
        top += heights.get(id)! + stepY;
      }
    };
    enqueue(left, -1, 1, rootHeight / 2);
    enqueue(right, 1, 1, rootHeight / 2);
    while (stack.length) {
      const item = stack.pop()!;
      const node = byId.get(item.id)!;
      const centerY = item.top + heights.get(item.id)! / 2;
      positions.set(item.id, { x: root.width / 2 + item.side * item.depth * stepX - node.width / 2, y: centerY - node.height / 2 });
      enqueue(children.get(item.id)!, item.side, item.depth + 1, centerY);
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [id, point] of positions) {
      const node = byId.get(id)!;
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x + node.width);
      maxY = Math.max(maxY, point.y + node.height);
    }
    blocks.push({ positions, minX, minY, width: maxX - minX, height: maxY - minY });
  }
  const totalArea = blocks.reduce((total, block) => total + (block.width + 120) * (block.height + 120), 0);
  const targetWidth = Math.max(1200, Math.sqrt(totalArea) * 1.4);
  const placed = new Map<string, { x: number; y: number }>();
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  for (const block of blocks) {
    if (cursorX > 0 && cursorX + block.width > targetWidth) {
      cursorX = 0;
      cursorY += rowHeight + 140;
      rowHeight = 0;
    }
    for (const [id, point] of block.positions) placed.set(id, { x: point.x - block.minX + cursorX, y: point.y - block.minY + cursorY });
    cursorX += block.width + 140;
    rowHeight = Math.max(rowHeight, block.height);
  }
  return { ...doc, nodes: doc.nodes.map(node => placed.has(node.id) ? { ...node, ...placed.get(node.id)! } : node) };
}

/** Defensive against malformed imported containment, without looping forever. */
export function boardTrail(doc: Workspace, boardId: string): Board[] {
  const trail: Board[] = [];
  const seen = new Set<string>();
  const boards = new Map(doc.boards.map(board => [board.id, board]));
  const nodes = new Map(doc.nodes.map(node => [node.id, node]));
  let board = boards.get(boardId);
  while (board && !seen.has(board.id)) {
    seen.add(board.id);
    trail.push(board);
    const parent = board.parentNodeId ? nodes.get(board.parentNodeId) : undefined;
    board = parent ? boards.get(parent.boardId) : undefined;
  }
  return trail.reverse();
}

export function fitViewport(nodes: GraphNode[], width: number, height: number, padding = 64): Viewport {
  const screenWidth = positive(width, 1);
  const screenHeight = positive(height, 1);
  const inset = Number.isFinite(padding) ? Math.max(0, padding) : 64;
  const valid = nodes.filter(node => Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.width) && Number.isFinite(node.height) && node.width > 0 && node.height > 0);
  if (valid.length === 0) return { x: screenWidth / 2, y: screenHeight / 2, zoom: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of valid) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }
  const zoom = Math.min(1, Math.max(1, screenWidth - inset * 2) / (maxX - minX), Math.max(1, screenHeight - inset * 2) / (maxY - minY));
  return { x: screenWidth / 2 - ((minX + maxX) / 2) * zoom, y: screenHeight / 2 - ((minY + maxY) / 2) * zoom, zoom };
}
