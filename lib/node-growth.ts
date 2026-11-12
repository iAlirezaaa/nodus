import type { GraphNode, Workspace } from './types';

/** Derived visual weight. None of these values changes a node's saved rectangle. */
export interface NodeGrowth {
  /** Unique outgoing graph children and explicit task children on the same board. */
  direct: number;
  /** Unique incoming graph parents and an explicit task parent on the same board. */
  incoming: number;
  /** Unique neighbors in either direction; reciprocal and task links count once. */
  connections: number;
  /** Unique reachable children, including direct children; at most 128. */
  descendants: number;
  /** True only when more than 128 unique descendants actually exist. */
  descendantsCapped: boolean;
  /** Nodes inside this node's child board and all its contained boards. */
  nested: number;
  mass: number;
  /** Smooth visual multiplier between 1 and 2.8. */
  scale: number;
}

export const defaultNodeGrowth: NodeGrowth = Object.freeze({
  direct: 0, incoming: 0, connections: 0, descendants: 0, descendantsCapped: false, nested: 0, mass: 0, scale: 1,
});

/** Cards grow more gently than neuron cores so their text remains easy to scan. */
export function cardGrowthScale(growth: NodeGrowth): number {
  return 1 + 0.35 * (growth.scale - 1);
}

/** Shared render/layout rectangle; the persisted node and its center stay intact. */
export function projectCardNode(node: GraphNode, growth: NodeGrowth = defaultNodeGrowth): GraphNode {
  const scale = cardGrowthScale(growth);
  if (scale === 1) return node;
  const width = node.width * scale, height = node.height * scale;
  return { ...node, x: node.x + (node.width - width) / 2, y: node.y + (node.height - height) / 2, width, height };
}

const DESCENDANT_LIMIT = 128;
// Include the source and one extra descendant to distinguish exactly 128 from 129+.
const REACHABILITY_LIMIT = DESCENDANT_LIMIT + 2;

interface CondensedGraph {
  vertices: number[][];
  componentOf: Int32Array;
  children: number[][];
  parents: number[][];
  leafOrder: number[];
}

/** Collapse cycles once, rather than exploring the same dense cycle from every node. */
function condense(adjacency: readonly (readonly number[])[]): CondensedGraph {
  const visited = new Uint8Array(adjacency.length);
  const nextChild = new Uint32Array(adjacency.length);
  const finishOrder: number[] = [];
  const reverse = Array.from({ length: adjacency.length }, () => [] as number[]);
  for (let source = 0; source < adjacency.length; source++) {
    for (const target of adjacency[source]) reverse[target].push(source);
    if (visited[source]) continue;
    const stack = [source];
    visited[source] = 1;
    while (stack.length) {
      const current = stack[stack.length - 1];
      const child = adjacency[current][nextChild[current]++];
      if (child === undefined) {
        finishOrder.push(current);
        stack.pop();
      } else if (!visited[child]) {
        visited[child] = 1;
        stack.push(child);
      }
    }
  }

  const componentOf = new Int32Array(adjacency.length).fill(-1);
  const vertices: number[][] = [];
  for (let index = finishOrder.length - 1; index >= 0; index--) {
    const start = finishOrder[index];
    if (componentOf[start] !== -1) continue;
    const component = vertices.length;
    const members: number[] = [];
    const stack = [start];
    componentOf[start] = component;
    while (stack.length) {
      const current = stack.pop()!;
      members.push(current);
      for (const parent of reverse[current]) {
        if (componentOf[parent] !== -1) continue;
        componentOf[parent] = component;
        stack.push(parent);
      }
    }
    vertices.push(members);
  }

  const childSets = Array.from({ length: vertices.length }, () => new Set<number>());
  for (let source = 0; source < adjacency.length; source++) {
    for (const target of adjacency[source]) {
      if (componentOf[source] !== componentOf[target]) childSets[componentOf[source]].add(componentOf[target]);
    }
  }
  const children = childSets.map(set => [...set]);
  const parents = Array.from({ length: vertices.length }, () => [] as number[]);
  for (let source = 0; source < children.length; source++) {
    for (const target of children[source]) parents[target].push(source);
  }
  const remaining = children.map(list => list.length);
  const leafOrder = remaining.flatMap((count, index) => count === 0 ? [index] : []);
  for (let index = 0; index < leafOrder.length; index++) {
    for (const parent of parents[leafOrder[index]]) {
      remaining[parent]--;
      if (remaining[parent] === 0) leafOrder.push(parent);
    }
  }
  return { vertices, componentOf, children, parents, leafOrder };
}

/** Retain small exact reachability sets; a capped child caps its ancestors directly. */
function cappedReachability(graph: CondensedGraph): number[] {
  const reachable = new Array<Set<number> | undefined>(graph.vertices.length);
  const totals = new Array<number>(graph.vertices.length).fill(0);
  for (const component of graph.leafOrder) {
    let total = graph.vertices[component].length;
    if (total >= REACHABILITY_LIMIT || graph.children[component].some(child => totals[child] >= REACHABILITY_LIMIT)) {
      totals[component] = REACHABILITY_LIMIT;
      continue;
    }
    const seen = new Set([component]);
    children: for (const child of graph.children[component]) {
      // Every child here is below the cap, so its retained set is complete.
      for (const candidate of reachable[child]!) {
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        total += graph.vertices[candidate].length;
        if (total >= REACHABILITY_LIMIT) break children;
      }
    }
    if (total < REACHABILITY_LIMIT) reachable[component] = seen;
    totals[component] = Math.min(total, REACHABILITY_LIMIT);
  }
  return totals;
}

/** Exact contained-node counts; valid board forests use a linear bottom-up pass. */
function nestedBoardTotals(graph: CondensedGraph, nodeCounts: readonly number[]): number[] {
  const weights = graph.vertices.map(members => members.reduce((count, board) => count + nodeCounts[board], 0));
  const totals = new Array<number>(weights.length).fill(0);
  if (graph.parents.every(parents => parents.length <= 1)) {
    for (const component of graph.leafOrder) {
      totals[component] = weights[component];
      for (const child of graph.children[component]) totals[component] += totals[child];
    }
    return totals;
  }

  // Defensive support for malformed shared subboards: bitsets avoid double counting
  // diamonds. At the supported 2,000 boards this uses roughly 0.5 MB, not recursion.
  const wordCount = Math.ceil(weights.length / 32);
  const reachable = new Array<Uint32Array>(weights.length);
  for (const component of graph.leafOrder) {
    const bits = new Uint32Array(wordCount);
    bits[component >>> 5] |= 1 << (component & 31);
    for (const child of graph.children[component]) {
      const childBits = reachable[child];
      for (let word = 0; word < wordCount; word++) bits[word] |= childBits[word];
    }
    let total = 0;
    for (let word = 0; word < wordCount; word++) {
      let remaining = bits[word];
      while (remaining) {
        const bit = 31 - Math.clz32(remaining & -remaining);
        total += weights[word * 32 + bit];
        remaining &= remaining - 1;
      }
    }
    reachable[component] = bits;
    totals[component] = total;
  }
  return totals;
}

/**
 * Derive growth from connected neighbors and contained work, not text length or saved dimensions.
 * Cycles and diamonds count each node once. Branch reachability is visually capped;
 * contained projects retain an exact count and do not require recursive traversal.
 */
export function buildNodeGrowth(document: Workspace): Map<string, NodeGrowth> {
  const nodes = [...new Map(document.nodes.map(node => [node.id, node])).values()];
  const boards = [...new Map(document.boards.map(board => [board.id, board])).values()];
  const nodeIndices = new Map(nodes.map((node, index) => [node.id, index]));
  const boardIndices = new Map(boards.map((board, index) => [board.id, index]));
  const childSets = nodes.map(() => new Set<number>());
  const parentSets = nodes.map(() => new Set<number>());
  for (const edge of document.edges) {
    const source = nodeIndices.get(edge.sourceId), target = nodeIndices.get(edge.targetId);
    if (source === undefined || target === undefined || source === target) continue;
    if (!boardIndices.has(edge.boardId) || nodes[source].boardId !== edge.boardId || nodes[target].boardId !== edge.boardId) continue;
    childSets[source].add(target);
    parentSets[target].add(source);
  }
  for (let child = 0; child < nodes.length; child++) {
    const parentId = nodes[child].task?.parentId;
    const parent = parentId ? nodeIndices.get(parentId) : undefined;
    if (parent === undefined || parent === child || !nodes[parent].task) continue;
    if (!boardIndices.has(nodes[child].boardId) || nodes[parent].boardId !== nodes[child].boardId) continue;
    childSets[parent].add(child);
    parentSets[child].add(parent);
  }
  const adjacency = childSets.map(set => [...set]);
  const branchGraph = condense(adjacency);
  const branchCounts = cappedReachability(branchGraph);

  const boardChildSets = boards.map(() => new Set<number>());
  const boardNodeCounts = boards.map(() => 0);
  for (const node of nodes) {
    const board = boardIndices.get(node.boardId);
    if (board === undefined) continue;
    boardNodeCounts[board]++;
    const child = node.childBoardId ? boardIndices.get(node.childBoardId) : undefined;
    if (child !== undefined) boardChildSets[board].add(child);
  }
  const boardGraph = condense(boardChildSets.map(set => [...set]));
  const boardTotals = nestedBoardTotals(boardGraph, boardNodeCounts);

  const growth = new Map<string, NodeGrowth>();
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    const direct = adjacency[index].length;
    const incoming = parentSets[index].size;
    let connections = direct;
    for (const parent of parentSets[index]) if (!childSets[index].has(parent)) connections++;
    const reachable = branchCounts[branchGraph.componentOf[index]] - 1;
    const descendants = Math.min(DESCENDANT_LIMIT, reachable);
    const descendantsCapped = reachable > DESCENDANT_LIMIT;
    const childBoard = node.childBoardId ? boardIndices.get(node.childBoardId) : undefined;
    let nested = childBoard === undefined ? 0 : boardTotals[boardGraph.componentOf[childBoard]];
    // An invalid containment cycle may lead back to the source; never count itself.
    const ownBoard = boardIndices.get(node.boardId);
    if (childBoard !== undefined && ownBoard !== undefined && boardGraph.componentOf[childBoard] === boardGraph.componentOf[ownBoard]) nested--;
    // Reserve the full weight for unique neighbors. A reverse edge must not
    // reduce mass by turning an already-counted neighbor into a direct child.
    const mass = connections + 0.35 * Math.max(0, descendants - connections) + 0.5 * nested;
    const scale = Math.max(1, Math.min(2.8, 1 + 1.8 * (1 - Math.exp(-Math.sqrt(mass) / 4))));
    growth.set(node.id, mass === 0 ? defaultNodeGrowth : { direct, incoming, connections, descendants, descendantsCapped, nested, mass, scale });
  }
  return growth;
}
