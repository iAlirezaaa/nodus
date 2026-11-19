import type { Workspace } from './types';

export type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue };
export type ValueState = { exists: false } | { exists: true; value: JSONValue };
export type OperationTarget = 'node' | 'edge' | 'board' | 'workspace';
export interface WorkspaceOperation { target: OperationTarget; id?: string; path: string[]; before: ValueState; after: ValueState; }
export interface OperationConflict { index: number; target: OperationTarget; id?: string; path: string[]; reason: string; }
export interface RoomSummary { id: string; title: string; role: 'owner' | 'editor'; updatedAt: string; }
export type SharedRoom = RoomSummary;
export interface RoomMember { email: string; role: 'owner' | 'editor'; }
export interface RoomSnapshot { document: Workspace; revision: number; updatedAt: string; userId: string; room: RoomSummary; members: RoomMember[]; }
export interface RoomUnchanged { unchanged: true; revision: number; updatedAt: string; userId: string; room: RoomSummary; members: RoomMember[]; }
export interface RoomListResponse { rooms: RoomSummary[]; userId: string; email: string; }
export interface RoomPatchPayload { revision: number; operations: WorkspaceOperation[]; operationId: string; }
export interface RoomPatchResult { document: Workspace; revision: number; updatedAt: string; userId: string; operationId: string; }
export interface PresencePeer { sessionId: string; userId: string; name: string; color: string; boardId: string; x: number | null; y: number | null; selectedNodeId: string | null; updatedAt: string; }
export interface PresencePayload { sessionId: string; boardId: string; x: number | null; y: number | null; selectedNodeId: string | null; name?: string; }

const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const fields: Record<Exclude<OperationTarget, 'workspace'>, Set<string>> = {
  board: new Set(['title', 'description', 'parentNodeId', 'createdAt', 'layout', 'zones']),
  node: new Set(['boardId', 'kind', 'title', 'text', 'x', 'y', 'width', 'height', 'color', 'asset', 'url', 'childBoardId', 'createdAt', 'task', 'appearance', 'presentation', 'annotations', 'scheduledAt']),
  edge: new Set(['boardId', 'sourceId', 'targetId', 'label', 'route', 'stroke', 'color', 'width', 'animated', 'bend']),
};
const nested: Record<string, Set<string>> = {
  'node.task': new Set(['status', 'parentId']),
  'node.asset': new Set(['id', 'name', 'mime', 'size', 'url']),
  'edge.bend': new Set(['x', 'y']),
};
const collection = { node: 'nodes', edge: 'edges', board: 'boards' } as const;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

/** JSON equality is independent of object property insertion order. */
export function equalJSON(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, index) => equalJSON(value, b[index]));
  if (!object(a) || !object(b)) return false;
  const aKeys = Object.keys(a).filter(key => a[key] !== undefined), bKeys = Object.keys(b).filter(key => b[key] !== undefined);
  return aKeys.length === bKeys.length && aKeys.every(key => own(b, key) && equalJSON(a[key], b[key]));
}

function jsonValue(value: unknown, depth = 0): JSONValue {
  if (depth > 20) throw new Error('Operation values are nested too deeply.');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(item => jsonValue(item, depth + 1));
  if (!object(value)) throw new Error('Operations must contain finite JSON values.');
  const copy: Record<string, JSONValue> = {};
  for (const key of Object.keys(value)) {
    if (forbidden.has(key)) throw new Error('Operation values contain an unsafe property.');
    if (value[key] !== undefined) copy[key] = jsonValue(value[key], depth + 1);
  }
  return copy;
}

const state = (value: unknown): ValueState => value === undefined ? { exists: false } : { exists: true, value: jsonValue(value) };
const sameState = (a: ValueState, b: ValueState) => a.exists === b.exists && (!a.exists || (b.exists && equalJSON(a.value, b.value)));

function validPath(target: OperationTarget, path: string[]) {
  if (target === 'workspace') return path.length === 1 && path[0] === 'homeBoardId';
  if (!path.length) return true;
  if (!fields[target].has(path[0])) return false;
  return path.length === 1 || (path.length === 2 && !!nested[`${target}.${path[0]}`]?.has(path[1]));
}

export function validateOperations(input: unknown): WorkspaceOperation[] {
  if (!Array.isArray(input) || input.length > 30000) throw new Error('A commit supports up to 30,000 field operations.');
  const seen = new Map<string, string[][]>();
  return input.map(value => {
    if (!object(value) || !['node', 'edge', 'board', 'workspace'].includes(String(value.target))) throw new Error('Operation target is invalid.');
    const target = value.target as OperationTarget;
    if (target !== 'workspace' && (typeof value.id !== 'string' || !ID.test(value.id))) throw new Error('Operation identifier is invalid.');
    if (target === 'workspace' && value.id !== undefined) throw new Error('Workspace operations do not have entity identifiers.');
    if (!Array.isArray(value.path) || value.path.some(part => typeof part !== 'string' || forbidden.has(part)) || !validPath(target, value.path as string[])) throw new Error('Operation property path is invalid.');
    const readState = (item: unknown): ValueState => {
      if (!object(item) || typeof item.exists !== 'boolean') throw new Error('Operation guard is invalid.');
      if (!item.exists) { if (own(item, 'value')) throw new Error('An absent guard cannot contain a value.'); return { exists: false }; }
      if (!own(item, 'value')) throw new Error('Operation guard value is missing.');
      return { exists: true, value: jsonValue(item.value) };
    };
    const before = readState(value.before), after = readState(value.after);
    const path = [...value.path] as string[];
    if (!path.length) {
      if (before.exists === after.exists) throw new Error('Whole-entity operations may only create or remove an entity.');
      const entity = after.exists ? after.value : before.exists ? before.value : null;
      if (!object(entity) || entity.id !== value.id) throw new Error('Whole-entity operation identifier does not match.');
    }
    const key = `${target}:${value.id ?? ''}`;
    const paths = seen.get(key) ?? [];
    if (paths.some(previous => previous.slice(0, Math.min(previous.length, path.length)).every((part, index) => part === path[index]))) throw new Error('Operations cannot modify overlapping property paths.');
    paths.push(path); seen.set(key, paths);
    return { target, ...(target === 'workspace' ? {} : { id: value.id as string }), path, before, after };
  });
}

/** Diff top-level entities and object fields; annotation and zone arrays remain atomic fields. */
export function diffWorkspace(base: Workspace, next: Workspace): WorkspaceOperation[] {
  if (base === next) return [];
  if (base.version !== 1 || next.version !== 1) throw new Error('Unsupported workspace format.');
  const operations: WorkspaceOperation[] = [];
  if (base.homeBoardId !== next.homeBoardId) operations.push({ target: 'workspace', path: ['homeBoardId'], before: state(base.homeBoardId), after: state(next.homeBoardId) });
  for (const target of ['board', 'node', 'edge'] as const) {
    const before = new Map(base[collection[target]].map(entity => [entity.id, entity as unknown as Record<string, unknown>]));
    const after = new Map(next[collection[target]].map(entity => [entity.id, entity as unknown as Record<string, unknown>]));
    for (const [id, entity] of before) if (!after.has(id)) operations.push({ target, id, path: [], before: state(entity), after: state(undefined) });
    for (const [id, entity] of after) {
      const old = before.get(id);
      if (!old) { operations.push({ target, id, path: [], before: state(undefined), after: state(entity) }); continue; }
      if (old === entity) continue;
      for (const key of fields[target]) {
        if (equalJSON(old[key], entity[key])) continue;
        const nestedFields = nested[`${target}.${key}`];
        if (nestedFields && object(old[key]) && object(entity[key])) {
          const previous = old[key] as Record<string, unknown>, current = entity[key] as Record<string, unknown>;
          for (const part of nestedFields) if (!equalJSON(previous[part], current[part])) operations.push({ target, id, path: [key, part], before: state(previous[part]), after: state(current[part]) });
        } else operations.push({ target, id, path: [key], before: state(old[key]), after: state(entity[key]) });
      }
    }
  }
  return operations;
}

function readPath(entity: Record<string, unknown>, path: string[]): ValueState {
  let current: unknown = entity;
  for (const part of path) { if (!object(current) || !own(current, part)) return { exists: false }; current = current[part]; }
  return state(current);
}

/** Guards only; callers validate the final graph's references before publishing. */
export function applyWorkspaceOperations(document: Workspace, input: WorkspaceOperation[]): { document: Workspace; conflicts: OperationConflict[] } {
  const operations = validateOperations(input);
  if (!operations.length) return { document, conflicts: [] };
  const maps = {
    node: new Map(document.nodes.map(entity => [entity.id, entity as unknown as Record<string, unknown>])),
    edge: new Map(document.edges.map(entity => [entity.id, entity as unknown as Record<string, unknown>])),
    board: new Map(document.boards.map(entity => [entity.id, entity as unknown as Record<string, unknown>])),
  };
  let homeBoardId = document.homeBoardId, changed = false;
  const conflicts: OperationConflict[] = [];
  operations.forEach((operation, index) => {
    const conflict = (reason: string) => conflicts.push({ index, target: operation.target, ...(operation.id ? { id: operation.id } : {}), path: operation.path, reason });
    if (operation.target === 'workspace') {
      const current = state(homeBoardId);
      if (sameState(current, operation.after)) return;
      if (!sameState(current, operation.before)) { conflict('The home board changed in another session.'); return; }
      if (!operation.after.exists || typeof operation.after.value !== 'string') { conflict('The home board cannot be removed.'); return; }
      homeBoardId = operation.after.value; changed = true; return;
    }
    const entities = maps[operation.target], id = operation.id!, entity = entities.get(id);
    if (!operation.path.length) {
      const current = state(entity);
      if (sameState(current, operation.after)) return;
      if (!sameState(current, operation.before)) { conflict('This item was changed, created, or removed by another session.'); return; }
      if (operation.after.exists) entities.set(id, jsonValue(operation.after.value) as Record<string, unknown>); else entities.delete(id);
      changed = true; return;
    }
    if (!entity) { conflict('This item was removed by another session.'); return; }
    const current = readPath(entity, operation.path);
    if (sameState(current, operation.after)) return;
    if (!sameState(current, operation.before)) { conflict('This field was changed by another session.'); return; }
    const replacement = { ...entity };
    let parent = replacement;
    for (const part of operation.path.slice(0, -1)) {
      if (!object(parent[part])) { conflict('The containing field was removed or replaced by another session.'); return; }
      parent[part] = { ...parent[part] as Record<string, unknown> };
      parent = parent[part] as Record<string, unknown>;
    }
    const leaf = operation.path[operation.path.length - 1];
    if (operation.after.exists) parent[leaf] = jsonValue(operation.after.value); else delete parent[leaf];
    entities.set(id, replacement); changed = true;
  });
  if (conflicts.length || !changed) return { document, conflicts };
  return { document: { ...document, homeBoardId, nodes: [...maps.node.values()] as unknown as Workspace['nodes'], edges: [...maps.edge.values()] as unknown as Workspace['edges'], boards: [...maps.board.values()] as unknown as Workspace['boards'] }, conflicts: [] };
}

export function invertOperations(operations: WorkspaceOperation[]): WorkspaceOperation[] {
  return operations.slice().reverse().map(operation => ({ ...operation, path: [...operation.path], before: operation.after, after: operation.before }));
}
