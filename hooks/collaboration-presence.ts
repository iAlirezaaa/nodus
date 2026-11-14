import type { PresencePeer } from '../lib/collaboration';

export interface PresenceSnapshot {
  peers: PresencePeer[];
  status: 'idle' | 'connecting' | 'connected' | 'error';
  error: string | null;
  profileLabel: string;
}
export const emptyPresenceSnapshot: PresenceSnapshot = { peers: [], status: 'idle', error: null, profileLabel: '' };
interface PresenceOptions {
  roomId: string;
  userId: string;
  fetcher?: typeof fetch;
  now?: () => number;
  sessionId?: string;
  movingMs?: number;
  pollMs?: number;
  heartbeatMs?: number;
}
type WorldPoint = { x: number; y: number } | null;

/** Cursors are ephemeral server presence, separate from saved graph revisions. */
export class CollaborationPresence {
  private options: PresenceOptions;
  readonly sessionId: string;
  private snapshot: PresenceSnapshot = emptyPresenceSnapshot;
  private listeners = new Set<() => void>();
  private boardId: string | null = null;
  private selectedNodeId: string | null = null;
  private pointer: WorldPoint = null;
  private active = false;
  private visible = true;
  private fatal = false;
  private generation = 0;
  private changeSerial = 0;
  private sentSerial = -1;
  private lastSentAt = -Infinity;
  private requestSerial = 0;
  private appliedRequest = 0;
  private sendTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private posting: Promise<void> | null = null;
  private polling: Promise<void> | null = null;
  private controller = new AbortController();

  constructor(options: PresenceOptions) { this.options = options; this.sessionId = options.sessionId ?? crypto.randomUUID(); }
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => emptyPresenceSnapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private get now() { return this.options.now ?? Date.now; }
  private get fetcher() { return this.options.fetcher ?? globalThis.fetch.bind(globalThis); }
  private publish(patch: Partial<PresenceSnapshot>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(listener => listener()); }
  private clearTimers() { if (this.sendTimer) clearTimeout(this.sendTimer); if (this.pollTimer) clearTimeout(this.pollTimer); this.sendTimer = null; this.pollTimer = null; }
  private canRun() { return this.active && this.visible && !this.fatal && !!this.boardId; }
  private fresh(peers: PresencePeer[]) {
    const now = this.now();
    return peers.filter(peer => peer && typeof peer.sessionId === 'string' && typeof peer.userId === 'string'
      && typeof peer.name === 'string' && typeof peer.boardId === 'string' && /^#[0-9a-f]{6}$/i.test(peer.color)
      && (peer.x === null || Number.isFinite(peer.x)) && (peer.y === null || Number.isFinite(peer.y))
      && Number.isFinite(Date.parse(peer.updatedAt)) && now - Date.parse(peer.updatedAt) < 15_000);
  }
  setContext = (boardId: string | null, selectedNodeId: string | null) => {
    if (boardId === this.boardId && selectedNodeId === this.selectedNodeId) return;
    if (boardId !== this.boardId) this.pointer = null;
    this.boardId = boardId; this.selectedNodeId = selectedNodeId; this.changeSerial += 1;
    this.scheduleSend(); this.schedulePoll();
  };
  reportPointer = (point: WorldPoint) => {
    if (point && (!Number.isFinite(point.x) || !Number.isFinite(point.y))) return;
    const next = point ? { x: Math.max(-1e7, Math.min(1e7, point.x)), y: Math.max(-1e7, Math.min(1e7, point.y)) } : null;
    if (this.pointer?.x === next?.x && this.pointer?.y === next?.y) return;
    this.pointer = next; this.changeSerial += 1; this.scheduleSend();
  };
  setVisible = (visible: boolean) => {
    this.visible = visible;
    if (!visible) this.clearTimers();
    else if (this.active) { this.changeSerial += 1; this.scheduleSend(); this.schedulePoll(); }
  };
  start = () => {
    this.active = true; this.fatal = false; this.generation += 1; this.controller.abort(); this.controller = new AbortController();
    this.publish({ status: 'connecting', error: null });
    this.scheduleSend(); this.schedulePoll();
  };
  stop = () => {
    this.active = false; this.generation += 1; this.controller.abort(); this.clearTimers(); this.posting = null; this.polling = null;
  };
  private scheduleSend() {
    if (this.sendTimer) clearTimeout(this.sendTimer); this.sendTimer = null;
    if (!this.canRun() || this.posting) return;
    const changed = this.changeSerial !== this.sentSerial;
    const interval = this.snapshot.status === 'error' ? 4000 : changed ? (this.options.movingMs ?? 500) : (this.options.heartbeatMs ?? 5000);
    if (!changed && interval === 0) return;
    const delay = Math.max(0, interval - (this.now() - this.lastSentAt));
    this.sendTimer = setTimeout(() => { this.sendTimer = null; void this.send(); }, delay);
  }
  private schedulePoll() {
    if (this.pollTimer) clearTimeout(this.pollTimer); this.pollTimer = null;
    if (!this.canRun() || this.polling || this.options.pollMs === 0) return;
    this.pollTimer = setTimeout(() => { this.pollTimer = null; void this.refresh(); }, this.snapshot.status === 'error' ? 4000 : this.options.pollMs ?? 1100);
  }
  private async request(method: 'GET' | 'POST', generation: number) {
    const serial = ++this.requestSerial;
    const response = await this.fetcher(`/api/rooms/${encodeURIComponent(this.options.roomId)}/presence`, {
      method, credentials: 'same-origin', cache: 'no-store', signal: this.controller.signal,
      ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json', 'X-Nodus-User-Id': this.options.userId }, body: JSON.stringify({
        sessionId: this.sessionId, boardId: this.boardId, x: this.pointer?.x ?? null, y: this.pointer?.y ?? null, selectedNodeId: this.selectedNodeId,
      }) } : {}),
    });
    const data = await response.json() as { peers?: PresencePeer[]; error?: string; message?: string };
    if (!this.active || generation !== this.generation) return;
    if (!response.ok) {
      if ([401, 403, 404].includes(response.status)) { this.fatal = true; this.clearTimers(); this.publish({ peers: [] }); }
      throw new Error(data.message ?? data.error ?? `Presence is unavailable (${response.status}).`);
    }
    if (!Array.isArray(data.peers)) throw new Error('The presence server returned an invalid response.');
    if (serial < this.appliedRequest) return;
    this.appliedRequest = serial;
    const peers = this.fresh(data.peers);
    const own = peers.find(peer => peer.sessionId === this.sessionId && peer.userId === this.options.userId);
    this.publish({ status: 'connected', error: null, peers: peers.filter(peer => peer.sessionId !== this.sessionId), profileLabel: own?.name ?? this.snapshot.profileLabel });
  }
  private failed(error: unknown, generation: number) {
    if (!this.active || generation !== this.generation) return;
    this.publish({ status: 'error', error: error instanceof Error ? error.message : 'Presence is unavailable.', peers: this.fresh(this.snapshot.peers) });
  }
  send = async () => {
    if (this.posting) return this.posting;
    if (!this.canRun()) return;
    if (this.sendTimer) clearTimeout(this.sendTimer); this.sendTimer = null;
    const generation = this.generation, changed = this.changeSerial;
    this.lastSentAt = this.now();
    const operation = Promise.resolve().then(async () => {
      try { await this.request('POST', generation); if (this.active && generation === this.generation) this.sentSerial = changed; }
      catch (error) { this.failed(error, generation); }
    });
    this.posting = operation; await operation;
    if (this.posting === operation) this.posting = null;
    if (generation === this.generation) this.scheduleSend();
  };
  refresh = async () => {
    if (this.polling) return this.polling;
    if (!this.canRun()) return;
    if (this.pollTimer) clearTimeout(this.pollTimer); this.pollTimer = null;
    const generation = this.generation;
    const operation = Promise.resolve().then(async () => {
      try { await this.request('GET', generation); } catch (error) { this.failed(error, generation); }
    });
    this.polling = operation; await operation;
    if (this.polling === operation) this.polling = null;
    if (generation === this.generation) this.schedulePoll();
  };
}
