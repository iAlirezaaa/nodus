/** Synthetic server for isolated development UI tests; never a production route. */
import { applyWorkspaceOperations, equalJSON, validateOperations, type PresencePeer, type RoomMember, type WorkspaceOperation } from '../../lib/collaboration';
import { createWorkspace } from '../../lib/graph';
import { validateWorkspace } from '../../lib/server/validation';
import type { Workspace } from '../../lib/types';

export type FixtureActor = 'owner' | 'editor';
export const fixtureProfiles = {
  owner: { userId: 'fixture-collab-owner', email: 'owner@fixture.test', name: 'همکار آبی', color: '#7b9bd7' },
  editor: { userId: 'fixture-collab-editor', email: 'editor@fixture.test', name: 'همکار سبز', color: '#83b19b' },
} as const;
interface StoredDocument { document: Workspace; revision: number; updatedAt: string; }
interface FixtureRoom extends StoredDocument { id: string; title: string; owner: FixtureActor; members: RoomMember[]; }
export interface SharedFixtureState {
  version: 1;
  personal: Record<FixtureActor, StoredDocument>;
  rooms: FixtureRoom[];
  receipts: Record<string, { operations: WorkspaceOperation[]; revision: number }>;
  writes: number;
}
export interface FixtureRequest { path: string; method: string; headers: Record<string, string>; body?: unknown; }
export interface FixtureReply { status: number; body: unknown; }
const reply = (body: unknown, status = 200): FixtureReply => ({ status, body });
const failure = (error: string, message: string, status: number, details = {}) => reply({ error, message, ...details }, status);

export function seedSharedFixture(): SharedFixtureState {
  const document = createWorkspace('fa');
  document.boards = document.boards.map(board => board.id === document.homeBoardId ? { ...board, title: 'UI test fixture · بوم مشترک', description: 'Synthetic two-session collaboration test. No real account or workspace is used.' } : board);
  const now = new Date().toISOString();
  return { version: 1, personal: {
    owner: { document: createWorkspace('fa'), revision: 1, updatedAt: now },
    editor: { document: createWorkspace('fa'), revision: 1, updatedAt: now },
  }, rooms: [{ id: 'fixture-room', title: 'UI test fixture · بوم مشترک', owner: 'owner', document, revision: 1, updatedAt: now,
    members: [{ email: fixtureProfiles.owner.email, role: 'owner' }, { email: fixtureProfiles.editor.email, role: 'editor' }] }], receipts: {}, writes: 0 };
}

export class SharedFixtureServer {
  state: SharedFixtureState;
  private presence = new Map<string, PresencePeer>();
  private persist: (state: SharedFixtureState) => void;
  constructor(state = seedSharedFixture(), persist: (state: SharedFixtureState) => void = () => {}) { this.state = state; this.persist = persist; }
  private save(next: SharedFixtureState) { this.persist(next); this.state = next; }
  private roomSummary(room: FixtureRoom, actor: FixtureActor) { return { id: room.id, title: room.title, role: room.owner === actor ? 'owner' : 'editor', updatedAt: room.updatedAt }; }
  private allowed(room: FixtureRoom, actor: FixtureActor) { return room.owner === actor || room.members.some(member => member.email === fixtureProfiles[actor].email); }
  private checkedDocument(value: unknown) {
    const document = validateWorkspace(value);
    if (document.nodes.some(node => node.asset !== null)) throw new Error('Synthetic test rooms cannot reference real attachments.');
    return document;
  }
  handle(actor: FixtureActor, request: FixtureRequest): FixtureReply {
    try { return this.run(actor, request); }
    catch (error) { return failure('invalid_fixture_request', error instanceof Error ? error.message : 'Invalid synthetic request.', 400); }
  }
  private run(actor: FixtureActor, request: FixtureRequest): FixtureReply {
    const identity = fixtureProfiles[actor];
    if (!identity) return failure('fixture_identity', 'Unknown fixture identity.', 401);
    const url = new URL(request.path, 'https://fixture.invalid');
    const path = url.pathname.replace(/\/+$/, '');
    const method = request.method.toUpperCase();
    if (!['GET', 'HEAD'].includes(method) && request.headers['x-nodus-user-id'] !== identity.userId) return failure('account_changed', 'The fixture account changed. Reload before saving.', 401);
    const body = request.body as Record<string, unknown> | undefined;
    const now = new Date().toISOString();
    if (path === '/api/workspace') {
      const personal = this.state.personal[actor];
      if (method === 'GET') return reply({ ...personal, userId: identity.userId });
      if (method !== 'PUT') return failure('method_not_allowed', 'Use GET or PUT.', 405);
      if (body?.revision !== personal.revision) return failure('revision_conflict', 'The personal test workspace changed.', 409, { revision: personal.revision });
      const next = { document: this.checkedDocument(body.document), revision: personal.revision + 1, updatedAt: now };
      this.save({ ...this.state, personal: { ...this.state.personal, [actor]: next }, writes: this.state.writes + 1 });
      return reply({ revision: next.revision, updatedAt: now });
    }
    if (path === '/api/rooms') {
      if (method === 'GET') return reply({ rooms: this.state.rooms.filter(room => this.allowed(room, actor)).map(room => this.roomSummary(room, actor)), userId: identity.userId, email: identity.email });
      if (method !== 'POST') return failure('method_not_allowed', 'Use GET or POST.', 405);
      if (typeof body?.title !== 'string' || !body.title.trim() || body.title.length > 200) throw new Error('A shared room needs a name of at most 200 characters.');
      const room: FixtureRoom = { id: crypto.randomUUID(), title: body.title.trim(), owner: actor, document: this.checkedDocument(body.document), revision: 1, updatedAt: now, members: [{ email: identity.email, role: 'owner' }] };
      this.save({ ...this.state, rooms: [...this.state.rooms, room], writes: this.state.writes + 1 });
      return reply({ room: this.roomSummary(room, actor) }, 201);
    }
    const match = /^\/api\/rooms\/([^/]+)(?:\/(members|presence))?$/.exec(path);
    if (!match) return failure('fixture_api_disabled', 'This isolated test page never calls a real application API.', 501);
    const room = this.state.rooms.find(item => item.id === decodeURIComponent(match[1]));
    if (!room || !this.allowed(room, actor)) return failure('room_not_found', 'This room is unavailable to the synthetic account.', 404);
    const canonical = () => ({ document: room.document, revision: room.revision, updatedAt: room.updatedAt, userId: identity.userId });
    if (match[2] === 'members') {
      if (room.owner !== actor) return failure('owner_required', 'Only the room owner can manage members.', 403);
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email.');
      if (!['POST', 'DELETE'].includes(method)) return failure('method_not_allowed', 'Use POST or DELETE.', 405);
      if (method === 'DELETE' && email === fixtureProfiles[room.owner].email) throw new Error('The owner cannot be removed.');
      const members = method === 'POST' ? room.members.some(member => member.email === email) ? room.members : [...room.members, { email, role: 'editor' as const }] : room.members.filter(member => member.email !== email);
      this.save({ ...this.state, rooms: this.state.rooms.map(item => item.id === room.id ? { ...item, members } : item), writes: this.state.writes + 1 });
      return reply({ members });
    }
    if (match[2] === 'presence') {
      const timestamp = Date.now();
      if (method === 'POST') {
        if (!body || typeof body.sessionId !== 'string' || typeof body.boardId !== 'string' || !room.document.boards.some(board => board.id === body.boardId)) throw new Error('Presence requires a board in this test room.');
        if (!((body.x === null && body.y === null) || (typeof body.x === 'number' && typeof body.y === 'number' && Number.isFinite(body.x) && Number.isFinite(body.y) && Math.abs(body.x) <= 1e7 && Math.abs(body.y) <= 1e7))) throw new Error('Invalid cursor coordinates.');
        this.presence.set(`${room.id}:${identity.userId}:${body.sessionId}`, { sessionId: body.sessionId, userId: identity.userId, name: identity.name, color: identity.color, boardId: body.boardId, x: body.x as number | null, y: body.y as number | null,
          selectedNodeId: typeof body.selectedNodeId === 'string' && room.document.nodes.some(node => node.id === body.selectedNodeId && node.boardId === body.boardId) ? body.selectedNodeId : null, updatedAt: now });
      } else if (method !== 'GET') return failure('method_not_allowed', 'Use GET or POST.', 405);
      const peers: PresencePeer[] = [];
      for (const [key, peer] of this.presence) {
        if (timestamp - Date.parse(peer.updatedAt) >= 15_000) { this.presence.delete(key); continue; }
        const peerActor = (Object.keys(fixtureProfiles) as FixtureActor[]).find(item => fixtureProfiles[item].userId === peer.userId);
        if (key.startsWith(`${room.id}:`) && peerActor && this.allowed(room, peerActor)) peers.push(peer);
      }
      return reply({ peers });
    }
    if (method === 'GET') {
      const common = { revision: room.revision, updatedAt: room.updatedAt, userId: identity.userId, room: this.roomSummary(room, actor), members: room.members };
      return Number(url.searchParams.get('since')) === room.revision ? reply({ unchanged: true, ...common }) : reply({ document: room.document, ...common });
    }
    if (method !== 'PATCH') return failure('method_not_allowed', 'Use GET or PATCH.', 405);
    if (!body || !Number.isSafeInteger(body.revision) || (body.revision as number) < 1 || (body.revision as number) > room.revision || typeof body.operationId !== 'string') throw new Error('Invalid revision or operation identifier.');
    const operations = validateOperations(body.operations);
    const receiptKey = `${room.id}:${identity.userId}:${body.operationId}`;
    const receipt = this.state.receipts[receiptKey];
    if (receipt) {
      if (receipt.revision !== body.revision || !equalJSON(receipt.operations, operations)) return failure('operation_id_reused', 'Operation identifier was reused for different changes.', 409, { ...canonical(), operationId: body.operationId, conflicts: [] });
      return reply({ ...canonical(), operationId: body.operationId });
    }
    const merged = applyWorkspaceOperations(room.document, operations);
    if (merged.conflicts.length) return failure('collaboration_conflict', 'The same field changed in another test session. Your local draft is preserved.', 409, { ...canonical(), operationId: body.operationId, conflicts: merged.conflicts });
    try { this.checkedDocument(merged.document); }
    catch (error) { return failure('collaboration_conflict', error instanceof Error ? error.message : 'Conflicting graph structure.', 409, { ...canonical(), operationId: body.operationId, conflicts: [] }); }
    const next = { ...room, document: merged.document, revision: room.revision + 1, updatedAt: now };
    this.save({ ...this.state, rooms: this.state.rooms.map(item => item.id === room.id ? next : item), receipts: { ...this.state.receipts, [receiptKey]: { operations, revision: body.revision as number } }, writes: this.state.writes + 1 });
    return reply({ document: next.document, revision: next.revision, updatedAt: next.updatedAt, userId: identity.userId, operationId: body.operationId });
  }
}
