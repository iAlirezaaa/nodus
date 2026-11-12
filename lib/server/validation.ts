import type { AssetMeta, Board, GraphEdge, GraphNode, Workspace } from '../types';
import { assertNodeFeatureMetadata } from '../node-features.ts';
import { ApiError } from './errors';

export const MAX_WORKSPACE_BYTES = 5 * 1024 * 1024;
const KINDS = new Set(['note', 'image', 'video', 'audio', 'pdf', 'file', 'link', 'project']);
const COLORS = new Set(['sage', 'blue', 'amber', 'rose', 'violet', 'gray']);
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;

function fail(message: string): never { throw new ApiError(400, 'invalid_document', message); }
function record(value: unknown, at: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${at} must be an object.`);
  return value as Record<string, unknown>;
}
function str(value: unknown, at: string, maximum: number, allowEmpty = true): asserts value is string {
  if (typeof value !== 'string' || value.length > maximum || (!allowEmpty && !value.trim())) fail(`${at} is invalid or too long.`);
}
function id(value: unknown, at: string): asserts value is string {
  if (typeof value !== 'string' || !ID.test(value)) fail(`${at} is not a valid identifier.`);
}
function nullableId(value: unknown, at: string): void { if (value !== null) id(value, at); }
function number(value: unknown, at: string, minimum: number, maximum: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) fail(`${at} is outside the supported range.`);
}
function date(value: unknown, at: string): void {
  str(value, at, 40, false);
  if (!Number.isFinite(Date.parse(value))) fail(`${at} must be a valid date.`);
}
function uniqueIds<T extends { id: string }>(items: T[], at: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id)) fail(`${at} contains duplicate identifiers.`);
    map.set(item.id, item);
  }
  return map;
}
export function isSafeWebUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

function validateAsset(value: unknown): void {
  if (value === null) return;
  const a = record(value, 'asset');
  id(a.id, 'asset.id');
  str(a.name, 'asset.name', 512, false);
  str(a.mime, 'asset.mime', 128, false);
  number(a.size, 'asset.size', 1, 25 * 1024 * 1024);
  if (!Number.isInteger(a.size)) fail('asset.size must be an integer.');
  if (a.url !== `/api/assets/${a.id}`) fail('asset.url must reference the attached file.');
}

export function validateWorkspace(input: unknown): Workspace {
  const doc = record(input, 'workspace');
  if (doc.version !== 1) fail('This workspace format is not supported.');
  id(doc.homeBoardId, 'homeBoardId');
  if (!Array.isArray(doc.boards) || doc.boards.length < 1 || doc.boards.length > 2000) fail('A workspace must contain between 1 and 2000 boards.');
  if (!Array.isArray(doc.nodes) || doc.nodes.length > 5000) fail('A workspace supports up to 5000 nodes.');
  if (!Array.isArray(doc.edges) || doc.edges.length > 20000) fail('A workspace supports up to 20000 connections.');

  for (const value of doc.boards) {
    const board = record(value, 'board');
    id(board.id, 'board.id'); str(board.title, 'board.title', 500);
    str(board.description, 'board.description', 5000);
    nullableId(board.parentNodeId, 'board.parentNodeId'); date(board.createdAt, 'board.createdAt');
    if (board.layout !== undefined) {
      const layout = record(board.layout, 'board.layout');
      if (!['neural','tree','orbit','grid','timeline','kanban'].includes(layout.kind as string)) fail('board.layout.kind is not supported.');
      if (!['created','title','kind','color','status'].includes(layout.sort as string)) fail('board.layout.sort is not supported.');
      if (!['asc','desc'].includes(layout.direction as string)) fail('board.layout.direction is not supported.');
      if (!['fa','en'].includes(layout.language as string)) fail('board.layout.language is not supported.');
      number(layout.spacing, 'board.layout.spacing', 24, 240);
      if (layout.columnStep !== undefined) number(layout.columnStep, 'board.layout.columnStep', 32, 10000);
    }
  }
  for (const value of doc.nodes) {
    const node = record(value, 'node');
    id(node.id, 'node.id'); id(node.boardId, 'node.boardId');
    if (!KINDS.has(node.kind as string)) fail('node.kind is not supported.');
    if (!COLORS.has(node.color as string)) fail('node.color is not supported.');
    str(node.title, 'node.title', 500); str(node.text, 'node.text', 100000);
    number(node.x, 'node.x', -1e7, 1e7); number(node.y, 'node.y', -1e7, 1e7);
    number(node.width, 'node.width', 32, 4096); number(node.height, 'node.height', 32, 4096);
    nullableId(node.childBoardId, 'node.childBoardId'); date(node.createdAt, 'node.createdAt');
    str(node.url, 'node.url', 8192);
    if (!isSafeWebUrl(node.url)) fail('Links must use http or https and cannot contain credentials.');
    validateAsset(node.asset);
    try { assertNodeFeatureMetadata(node as unknown as GraphNode); }
    catch (error) { fail(error instanceof Error ? error.message : 'Node feature metadata is invalid.'); }
  }
  for (const value of doc.edges) {
    const edge = record(value, 'connection');
    id(edge.id, 'connection.id'); id(edge.boardId, 'connection.boardId');
    id(edge.sourceId, 'connection.sourceId'); id(edge.targetId, 'connection.targetId');
    str(edge.label, 'connection.label', 500);
    if (edge.route !== undefined && !['curve', 'straight', 'elbow'].includes(edge.route as string)) fail('The connection route is not supported.');
    if (edge.stroke !== undefined && !['solid', 'dashed', 'dotted'].includes(edge.stroke as string)) fail('The connection stroke is not supported.');
    if (edge.color !== undefined && !COLORS.has(edge.color as string)) fail('The connection color is not supported.');
    if (edge.width !== undefined) number(edge.width, 'connection.width', 1, 5);
    if (edge.animated !== undefined && typeof edge.animated !== 'boolean') fail('connection.animated must be a boolean.');
    if (edge.bend !== undefined) {
      const bend = record(edge.bend, 'connection.bend');
      number(bend.x, 'connection.bend.x', -1e7, 1e7); number(bend.y, 'connection.bend.y', -1e7, 1e7);
    }
  }

  const boards = uniqueIds(doc.boards as Board[], 'Boards');
  const nodes = uniqueIds(doc.nodes as GraphNode[], 'Nodes');
  uniqueIds(doc.edges as GraphEdge[], 'Connections');
  const home = boards.get(doc.homeBoardId);
  if (!home || home.parentNodeId !== null) fail('The home board must exist at the workspace root.');
  const childOwners = new Map<string, string>();
  for (const node of nodes.values()) {
    if (!boards.has(node.boardId)) fail('Every node must belong to an existing board.');
    if (node.task?.parentId) {
      const parent = nodes.get(node.task.parentId);
      if (!parent?.task || parent.id === node.id || parent.boardId !== node.boardId) fail('A task parent must be another task on the same board.');
    }
    if (node.childBoardId) {
      const child = boards.get(node.childBoardId);
      if (!child || child.parentNodeId !== node.id) fail('Nested projects must reference their containing node.');
      if (childOwners.has(child.id)) fail('A nested project cannot have two containing nodes.');
      childOwners.set(child.id, node.id);
    }
  }
  // Task ancestry is a separate forest; ordinary graph cycles remain valid.
  const taskState = new Map<string, 1 | 2>();
  for (const node of nodes.values()) {
    if (!node.task || taskState.get(node.id) === 2) continue;
    const path: string[] = [];
    let current: GraphNode | undefined = node;
    while (current?.task && taskState.get(current.id) !== 2) {
      if (taskState.get(current.id) === 1) fail('Task parents cannot form a cycle.');
      taskState.set(current.id, 1); path.push(current.id);
      current = current.task.parentId ? nodes.get(current.task.parentId) : undefined;
    }
    for (const id of path) taskState.set(id, 2);
  }
  for (const board of boards.values()) {
    if (board.parentNodeId !== null) {
      const parent = nodes.get(board.parentNodeId);
      if (!parent || parent.childBoardId !== board.id) fail('A project must be linked from its containing node.');
    }
    const seen = new Set<string>();
    let current: Board | undefined = board;
    while (current) {
      if (seen.has(current.id)) fail('Projects cannot contain themselves, directly or indirectly.');
      seen.add(current.id);
      current = current.parentNodeId ? boards.get(nodes.get(current.parentNodeId)!.boardId) : undefined;
    }
  }
  const pairs = new Set<string>();
  for (const edge of doc.edges as GraphEdge[]) {
    const source = nodes.get(edge.sourceId), target = nodes.get(edge.targetId);
    if (!source || !target || source.boardId !== edge.boardId || target.boardId !== edge.boardId) fail('Connections must join existing nodes on the same board.');
    if (source.id === target.id) fail('A node cannot connect to itself.');
    const pair = `${edge.sourceId}:${edge.targetId}`;
    if (pairs.has(pair)) fail('Duplicate connections are not supported.');
    pairs.add(pair);
  }
  return input as Workspace;
}

export function validateSavePayload(input: unknown): { document: Workspace; revision: number } {
  const value = record(input, 'request');
  if (typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 0) fail('A non-negative workspace revision is required.');
  return { document: validateWorkspace(value.document), revision: value.revision };
}

export function referencedAssets(document: Workspace): AssetMeta[] {
  return document.nodes.flatMap(node => node.asset ? [node.asset] : []);
}
