import type { Language, Workspace } from '../lib/types';
import {
  applyWorkspaceOperations, diffWorkspace, equalJSON, invertOperations,
  type OperationConflict, type RoomMember, type RoomPatchResult, type RoomSnapshot,
  type RoomUnchanged, type SharedRoom, type WorkspaceOperation,
} from '../lib/collaboration';
import { validateWorkspace } from '../lib/server/validation';
import { copyWorkspaceAsRoots, initialWorkspaceSnapshot, type WorkspaceSnapshot } from './workspace-store';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Block = 'offline' | 'conflict' | 'access' | 'account' | null;
interface SharedDraft {
  version: 1;
  userId: string;
  roomId: string;
  baseRevision: number;
  baseDocument: Workspace;
  document: Workspace;
  savedAt: number;
}
interface Outbox {
  operationId: string;
  revision: number;
  operations: WorkspaceOperation[];
  document: Workspace;
}
interface SharedWorkspaceOptions {
  roomId: string;
  language?: Language;
  fetcher?: typeof fetch;
  storage?: StorageLike | null;
  debounceMs?: number;
  /** Zero disables automatic polling for deterministic tests. */
  pollMs?: number;
}
export interface SharedWorkspaceSnapshot extends WorkspaceSnapshot {
  room: SharedRoom | null;
  members: RoomMember[];
  readOnly: boolean;
  conflicts: OperationConflict[];
}
const initialSharedSnapshot: SharedWorkspaceSnapshot = {
  ...initialWorkspaceSnapshot, room: null, members: [], readOnly: false, conflicts: [],
};
const isWorkspace = (value: unknown): value is Workspace => {
  if (!value || typeof value !== 'object') return false;
  const document = value as Workspace;
  return document.version === 1 && typeof document.homeBoardId === 'string'
    && Array.isArray(document.nodes) && Array.isArray(document.edges) && Array.isArray(document.boards)
    && document.boards.some(board => board.id === document.homeBoardId);
};
const messageOf = (value: unknown, fallback: string) => {
  if (!value || typeof value !== 'object') return fallback;
  const data = value as { message?: unknown; error?: unknown };
  return typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : fallback;
};

/**
 * A room keeps a canonical server base and only sends this session's guarded
 * field changes. Remote polls never enter local undo history. An overlapping
 * peer edit stops the queue and leaves the complete local draft recoverable.
 */
export class SharedWorkspaceStore {
  private snapshot: SharedWorkspaceSnapshot = { ...initialSharedSnapshot };
  private listeners = new Set<() => void>();
  private options: SharedWorkspaceOptions;
  private userId = '';
  private revision = 0;
  private base: Workspace | null = null;
  private pending: WorkspaceOperation[] = [];
  private outbox: Outbox | null = null;
  private deferredRemote: RoomPatchResult | null = null;
  private past: WorkspaceOperation[][] = [];
  private future: WorkspaceOperation[][] = [];
  private recovery: SharedDraft | null = null;
  private recovering = false;
  private block: Block = null;
  private active = true;
  private visible = true;
  private remotePaused = false;
  private generation = 0;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private saving: Promise<void> | null = null;
  private polling: Promise<void> | null = null;
  private controller = new AbortController();
  private idlePolls = 0;
  private writtenDraft = '';

  constructor(options: SharedWorkspaceOptions) { this.options = options; }
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => initialSharedSnapshot;
  getUserId = () => this.userId;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  setLanguage(language: Language) { this.options.language = language; }
  private L(fa: string, en: string) { return this.options.language === 'en' ? en : fa; }
  private publish(patch: Partial<SharedWorkspaceSnapshot>) {
    const next = { ...this.snapshot, ...patch, canUndo: this.past.length > 0, canRedo: this.future.length > 0 };
    if ((Object.keys(next) as (keyof SharedWorkspaceSnapshot)[]).every(key => Object.is(next[key], this.snapshot[key]))) return;
    this.snapshot = next;
    this.listeners.forEach(listener => listener());
  }
  private get fetcher() { return this.options.fetcher ?? globalThis.fetch.bind(globalThis); }
  private get storage(): StorageLike | null {
    if (this.options.storage !== undefined) return this.options.storage;
    // Per-tab recovery prevents two editors signed into the same account from
    // overwriting one another's unsent drafts in localStorage.
    try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; }
  }
  private key(recovery = false) {
    return `nodus:shared:${recovery ? 'recovery' : 'draft'}:${encodeURIComponent(this.userId)}:${encodeURIComponent(this.options.roomId)}`;
  }
  private readDraft(recovery = false): SharedDraft | null {
    try {
      const raw = this.storage?.getItem(this.key(recovery));
      if (!raw) return null;
      const draft = JSON.parse(raw) as SharedDraft;
      const valid = draft.version === 1 && draft.userId === this.userId && draft.roomId === this.options.roomId
        && Number.isSafeInteger(draft.baseRevision) && draft.baseRevision >= 0
        && isWorkspace(draft.baseDocument) && isWorkspace(draft.document);
      if (!valid) return null;
      validateWorkspace(draft.baseDocument); validateWorkspace(draft.document);
      return draft;
    } catch { return null; }
  }
  private writeDraft(draft: SharedDraft, recovery = false) {
    try {
      if (!this.storage) throw new Error('No browser storage');
      const serialized = JSON.stringify(draft);
      const key = this.key(recovery);
      if (serialized !== this.writtenDraft || this.storage.getItem(key) !== serialized) this.storage.setItem(key, serialized);
      this.writtenDraft = serialized;
      return true;
    } catch {
      this.publish({ draftWarning: this.L('ذخیرهٔ پیش‌نویس روی این دستگاه ممکن نیست. تا ذخیره‌شدن تغییرات، این صفحه را باز نگه دار.', 'Device recovery storage is unavailable. Keep this page open until your changes are saved.') });
      return false;
    }
  }
  private removeDraft(recovery = false) {
    try { this.storage?.removeItem(this.key(recovery)); } catch { /* Acknowledged server data remains authoritative. */ }
    this.writtenDraft = '';
  }
  private makeDraft(document = this.snapshot.document): SharedDraft | null {
    return document && this.base && this.userId ? { version: 1, userId: this.userId, roomId: this.options.roomId,
      baseRevision: this.revision, baseDocument: this.base, document, savedAt: Date.now() } : null;
  }
  persistDraft = () => {
    if (!this.hasPendingChanges()) return;
    const draft = this.makeDraft();
    if (draft) this.writeDraft(draft);
  };
  hasPendingChanges = () => this.pending.length > 0 || this.outbox !== null;
  private cancelSave() { if (this.saveTimer) clearTimeout(this.saveTimer); this.saveTimer = null; }
  private cancelPoll() { if (this.pollTimer) clearTimeout(this.pollTimer); this.pollTimer = null; }
  private scheduleSave() {
    this.cancelSave();
    if (!this.active || this.block || !this.hasPendingChanges() || this.snapshot.loading || this.snapshot.readOnly) return;
    this.saveTimer = setTimeout(() => { this.saveTimer = null; void this.flush(); }, this.options.debounceMs ?? 400);
  }
  private schedulePoll() {
    this.cancelPoll();
    if (!this.active || !this.visible || this.remotePaused || this.snapshot.loading || !this.base
      || this.block === 'access' || this.block === 'account' || this.options.pollMs === 0) return;
    const interval = this.options.pollMs ?? 1000;
    const delay = this.block === 'offline' ? Math.max(interval, 4000) : Math.min(interval * (1 + Math.floor(this.idlePolls / 5)), interval * 3);
    this.pollTimer = setTimeout(() => { this.pollTimer = null; void this.poll(); }, delay);
  }
  setVisible = (visible: boolean) => {
    this.visible = visible;
    if (!visible) this.cancelPoll();
    else if (this.active && !this.snapshot.loading) { this.idlePolls = 0; void this.poll(); }
  };
  setRemotePaused = (paused: boolean) => {
    if (this.remotePaused === paused) return;
    this.remotePaused = paused;
    if (paused) this.cancelPoll();
    else if (this.active && !this.snapshot.loading) {
      this.idlePolls = 0;
      if (!this.saving && !this.outbox) this.applyDeferredRemote();
      void this.poll();
    }
  };
  private applyDeferredRemote() {
    const remote = this.deferredRemote;
    if (!remote || this.remotePaused || this.block || !this.base) return;
    if (remote.revision < this.revision) { this.deferredRemote = null; return; }
    const rebased = this.applySafely(remote.document, this.pending);
    if (rebased.conflicts.length) { this.conflict(rebased.conflicts); return; }
    this.deferredRemote = null; this.base = remote.document; this.revision = remote.revision;
    this.pending = diffWorkspace(remote.document, rebased.document);
    this.publish({ document: rebased.document, updatedAt: remote.updatedAt, saveState: this.hasPendingChanges() ? 'pending' : 'saved' });
    if (this.hasPendingChanges()) { this.persistDraft(); this.scheduleSave(); }
  }
  private isCurrent(generation: number) { return this.active && generation === this.generation; }
  private accessError(message: string, account = false) {
    this.block = account ? 'account' : 'access';
    this.cancelPoll(); this.cancelSave(); this.persistDraft();
    this.publish({ loading: false, readOnly: true, saveState: 'offline', error: message });
  }
  private assertIdentity(userId: unknown): userId is string {
    if (typeof userId !== 'string' || !userId) throw new Error('The room response did not include an account identity.');
    if (this.userId && userId !== this.userId) {
      this.accessError(this.L('حساب واردشده تغییر کرده است. پیش‌نویس حساب قبلی محفوظ است؛ فضا را دوباره بارگذاری کن.', 'The signed-in account changed. The previous account’s draft is preserved; reload the workspace.'), true);
      return false;
    }
    return true;
  }
  private checkRemote(data: RoomSnapshot | RoomUnchanged | RoomPatchResult) {
    if (!Number.isSafeInteger(data.revision) || data.revision < 0 || typeof data.userId !== 'string' || !data.userId
      || (!('unchanged' in data) && !isWorkspace(data.document))) throw new Error('The server returned an invalid shared workspace. Your draft is preserved.');
  }
  private async requestRemote(since?: number): Promise<RoomSnapshot | RoomUnchanged> {
    const response = await this.fetcher(`/api/rooms/${encodeURIComponent(this.options.roomId)}${since === undefined ? '' : `?since=${since}`}`, {
      credentials: 'same-origin', cache: 'no-store', signal: this.controller.signal,
    });
    const data = await response.json() as (RoomSnapshot | RoomUnchanged) & { error?: string; message?: string };
    if (!response.ok) {
      const error = new Error(messageOf(data, `Unable to open this shared room (${response.status}).`)) as Error & { status: number; code?: string };
      error.status = response.status; error.code = data?.error; throw error;
    }
    this.checkRemote(data);
    return data;
  }
  private applySafely(document: Workspace, operations: WorkspaceOperation[]) {
    try {
      const result = applyWorkspaceOperations(document, operations);
      if (!result.conflicts.length && result.document !== document) validateWorkspace(result.document);
      return result;
    } catch (error) {
      return { document, conflicts: [{ index: -1, target: 'workspace' as const, path: [], reason: error instanceof Error ? error.message : 'The merged graph is invalid.' }] };
    }
  }
  private conflict(conflicts: OperationConflict[], message?: string) {
    this.block = 'conflict'; this.cancelSave();
    this.publish({ saveState: 'conflict', conflicts, error: message ?? this.L(
      'همان بخش در یک جلسهٔ دیگر تغییر کرده است. پیش‌نویس تو حفظ شده؛ می‌توانی هر دو نسخه را نگه داری یا نسخهٔ سرور را باز کنی.',
      'The same content changed in another session. Your draft is preserved. Keep both versions, or load the server version.',
    ) });
    this.persistDraft();
  }

  load = async () => {
    this.persistDraft(); this.cancelSave(); this.cancelPoll();
    const generation = ++this.generation;
    this.active = true;
    this.publish({ loading: true, error: null });
    if (this.saving) await this.saving;
    if (!this.isCurrent(generation)) return;
    this.controller.abort(); this.controller = new AbortController(); this.polling = null;
    try {
      const remote = await this.requestRemote();
      if (!this.isCurrent(generation) || 'unchanged' in remote) return;
      this.userId = remote.userId; this.revision = remote.revision; this.base = remote.document;
      this.pending = []; this.outbox = null; this.deferredRemote = null; this.past = []; this.future = [];
      this.block = null; this.recovering = false; this.writtenDraft = ''; this.idlePolls = 0;
      this.recovery = this.readDraft(true);
      const draft = this.readDraft();
      if (draft) {
        const replay = this.applySafely(remote.document, diffWorkspace(draft.baseDocument, draft.document));
        if (!replay.conflicts.length && equalJSON(replay.document, remote.document)) this.removeDraft();
        else { this.recovery = draft; if (this.writeDraft(draft, true)) this.removeDraft(); }
      }
      if (this.recovery && equalJSON(this.recovery.document, remote.document)) { this.recovery = null; this.removeDraft(true); }
      this.publish({ document: remote.document, loading: false, readOnly: false, saveState: 'saved', error: null,
        room: remote.room, members: remote.members, updatedAt: remote.updatedAt, conflicts: [], hasRecovery: !!this.recovery });
      this.schedulePoll();
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403 || status === 404) this.accessError(error instanceof Error ? error.message : 'This room is unavailable.');
      else { this.block = 'offline'; this.publish({ loading: false, saveState: 'offline', error: error instanceof Error ? error.message : 'Unable to open this shared room.' }); this.schedulePoll(); }
    }
  };
  reload = () => this.load();

  /** Public for deterministic sync tests; the browser normally uses its timer. */
  poll = async () => {
    this.cancelPoll();
    if (!this.active || !this.visible || this.remotePaused || this.snapshot.loading || this.saving || this.outbox
      || !this.base || this.block === 'access' || this.block === 'account') { this.schedulePoll(); return; }
    if (this.polling) return this.polling;
    const generation = this.generation;
    const operation = Promise.resolve().then(async () => {
      try {
        const remote = await this.requestRemote(this.block === 'conflict' ? undefined : this.revision);
        if (!this.isCurrent(generation) || this.remotePaused || this.saving) return;
        if (!this.assertIdentity(remote.userId)) return;
        this.publish({ room: remote.room, members: remote.members });
        if ('unchanged' in remote) {
          this.idlePolls += 1;
          if (this.block === 'offline') { this.block = null; this.publish({ saveState: this.hasPendingChanges() ? 'pending' : 'saved', error: null }); this.applyDeferredRemote(); this.scheduleSave(); }
          return;
        }
        if (remote.revision < this.revision || this.block === 'conflict') return;
        this.idlePolls = remote.revision === this.revision ? this.idlePolls + 1 : 0;
        const rebased = this.applySafely(remote.document, this.pending);
        if (rebased.conflicts.length) { this.conflict(rebased.conflicts); return; }
        this.base = remote.document; this.revision = remote.revision; this.deferredRemote = null;
        this.pending = diffWorkspace(remote.document, rebased.document); this.block = null;
        this.publish({ document: rebased.document, saveState: this.hasPendingChanges() ? 'pending' : 'saved', error: null, conflicts: [], updatedAt: remote.updatedAt });
        if (this.hasPendingChanges()) { this.persistDraft(); this.scheduleSave(); } else this.removeDraft();
      } catch (error) {
        if (!this.isCurrent(generation)) return;
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403 || status === 404) this.accessError(error instanceof Error ? error.message : 'Access to this room is unavailable.');
        else if (this.block !== 'conflict') { this.block = 'offline'; this.publish({ saveState: 'offline', error: error instanceof Error ? error.message : 'Room synchronization was interrupted.' }); this.persistDraft(); }
      }
    });
    this.polling = operation;
    await operation;
    if (this.polling === operation) this.polling = null;
    this.schedulePoll();
  };

  update = (updater: (document: Workspace) => Workspace) => {
    const previous = this.snapshot.document;
    if (!this.active || !previous || !this.base || this.snapshot.loading || this.snapshot.readOnly) return;
    const next = updater(previous);
    const operations = diffWorkspace(previous, next);
    if (!operations.length) return;
    this.past.push(operations); if (this.past.length > 60) this.past.shift(); this.future = [];
    this.applyLocal(next);
  };
  private applyLocal(document: Workspace) {
    this.pending = diffWorkspace(this.base!, document);
    this.publish({ document, saveState: this.block ? this.snapshot.saveState : this.saving ? 'saving' : this.hasPendingChanges() ? 'pending' : 'saved',
      error: this.block ? this.snapshot.error : null });
    if (this.hasPendingChanges()) this.persistDraft(); else this.removeDraft();
    this.scheduleSave();
  }
  private history(direction: 'undo' | 'redo') {
    if (!this.active || !this.snapshot.document || this.snapshot.loading || this.snapshot.readOnly) return;
    const source = direction === 'undo' ? this.past : this.future;
    const entry = source[source.length - 1]; if (!entry) return;
    const operations = direction === 'undo' ? invertOperations(entry) : entry;
    const result = this.applySafely(this.snapshot.document, operations);
    if (result.conflicts.length) {
      this.publish({ error: this.L('این تغییر بعداً توسط شخص دیگری ویرایش شده است؛ بازگردانی، تغییر او را پاک نمی‌کند.', 'Another session has changed this content. Undo cannot replace that person’s changes.') });
      return;
    }
    source.pop(); (direction === 'undo' ? this.future : this.past).push(entry);
    this.applyLocal(result.document);
  }
  undo = () => this.history('undo');
  redo = () => this.history('redo');

  flush = async (): Promise<void> => {
    this.cancelSave();
    if (this.saving) return this.saving;
    if (this.polling) await this.polling;
    if (this.saving) return this.saving;
    if (!this.active || this.block || this.snapshot.loading || this.snapshot.readOnly || !this.userId || !this.base || !this.hasPendingChanges()) return;
    const generation = this.generation;
    const operation = Promise.resolve().then(() => this.saveLoop(generation));
    this.saving = operation;
    await operation;
    if (this.saving === operation) this.saving = null;
    if (this.isCurrent(generation) && !this.outbox) this.applyDeferredRemote();
    this.schedulePoll();
  };
  private async saveLoop(generation: number) {
    while (this.isCurrent(generation) && !this.block && this.hasPendingChanges() && this.snapshot.document) {
      const batch: Outbox = this.outbox ?? { operationId: crypto.randomUUID(), revision: this.revision, operations: this.pending, document: this.snapshot.document };
      this.outbox = batch; this.persistDraft();
      this.publish({ saveState: 'saving', error: null });
      try {
        const response = await this.fetcher(`/api/rooms/${encodeURIComponent(this.options.roomId)}`, {
          method: 'PATCH', credentials: 'same-origin', signal: this.controller.signal,
          headers: { 'Content-Type': 'application/json', 'X-Nodus-User-Id': this.userId },
          body: JSON.stringify({ revision: batch.revision, operations: batch.operations, operationId: batch.operationId }),
        });
        const data = await response.json() as RoomPatchResult & { error?: string; message?: string; conflicts?: OperationConflict[] };
        if (!this.isCurrent(generation)) return;
        if (!response.ok) {
          const message = messageOf(data, `The room could not be saved (${response.status}).`);
          if (response.status < 500) this.outbox = null;
          if (response.status === 401 || response.status === 403 || response.status === 404) { this.accessError(message, data?.error === 'account_changed'); return; }
          if (response.status === 409) { if (data?.userId && !this.assertIdentity(data.userId)) return; this.conflict(Array.isArray(data.conflicts) ? data.conflicts : [], message); return; }
          this.block = 'offline'; this.publish({ saveState: 'offline', error: message }); this.persistDraft(); return;
        }
        this.checkRemote(data);
        if (!this.assertIdentity(data.userId)) return;
        if (data.operationId !== batch.operationId || data.revision < batch.revision) throw new Error('The shared save could not be confirmed. Your draft is preserved.');
        const additional = diffWorkspace(batch.document, this.snapshot.document);
        this.outbox = null; this.revision = data.revision;
        if (this.remotePaused) {
          // Inline editors keep text outside the graph until they commit. Freeze
          // untouched peer fields even across PATCH acknowledgements, otherwise
          // the next title could use a peer's newer value as its expected guard.
          this.deferredRemote = data;
          this.base = batch.document; this.pending = additional;
          if (!this.pending.length && this.recovering) { this.recovering = false; this.recovery = null; this.removeDraft(true); }
          this.publish({ saveState: this.pending.length ? 'saving' : 'saved', error: null, conflicts: [], updatedAt: data.updatedAt, hasRecovery: !!this.recovery });
          if (this.pending.length) this.persistDraft(); else this.removeDraft();
          continue;
        }
        this.deferredRemote = null;
        const rebased = this.applySafely(data.document, additional);
        if (rebased.conflicts.length) {
          // The first batch is acknowledged; only edits made while it was in
          // flight remain pending against their original expected values.
          this.base = batch.document; this.pending = additional;
          this.conflict(rebased.conflicts); return;
        }
        this.base = data.document; this.pending = diffWorkspace(data.document, rebased.document);
        if (!this.pending.length && this.recovering) { this.recovering = false; this.recovery = null; this.removeDraft(true); }
        this.publish({ document: rebased.document, saveState: this.pending.length ? 'saving' : 'saved',
          error: null, conflicts: [], updatedAt: data.updatedAt, hasRecovery: !!this.recovery });
        if (this.pending.length) this.persistDraft(); else this.removeDraft();
      } catch (error) {
        if (!this.isCurrent(generation)) return;
        // Keep operationId for a transport failure: the server may have already
        // committed it, so retries must be idempotent.
        this.block = 'offline'; this.publish({ saveState: 'offline', error: error instanceof Error ? error.message : 'Shared save interrupted. Your draft is preserved.' });
        this.persistDraft(); return;
      }
    }
  }
  retry = async () => {
    if (this.block === 'conflict' || this.block === 'access' || this.block === 'account') return;
    if (!this.base || !this.userId) return this.load();
    this.block = null; this.publish({ error: null, saveState: this.hasPendingChanges() ? 'pending' : 'saved' });
    await this.flush();
    if (!this.block) await this.poll();
  };
  recoverDraft = async () => {
    const recovery = this.recovery;
    if (!recovery || !this.snapshot.document || this.snapshot.readOnly) return;
    if (this.hasPendingChanges()) return this.restoreAsCopy(recovery.document);
    const result = this.applySafely(this.snapshot.document, diffWorkspace(recovery.baseDocument, recovery.document));
    if (result.conflicts.length) return this.restoreAsCopy(recovery.document);
    this.block = null; this.recovering = true;
    this.update(() => result.document);
    if (!this.hasPendingChanges()) { this.recovery = null; this.recovering = false; this.removeDraft(true); this.publish({ hasRecovery: false }); }
    await this.flush();
  };
  resolveConflict = async () => {
    if (this.snapshot.document && !this.snapshot.readOnly) await this.restoreAsCopy(this.snapshot.document);
  };
  private async restoreAsCopy(document: Workspace) {
    this.persistDraft(); this.cancelSave(); this.cancelPoll();
    if (this.saving) await this.saving;
    const generation = this.generation;
    this.publish({ loading: true });
    try {
      const remote = await this.requestRemote();
      if (!this.isCurrent(generation) || 'unchanged' in remote || !this.assertIdentity(remote.userId)) return;
      const combined = copyWorkspaceAsRoots(remote.document, document, this.options.language ?? 'fa');
      validateWorkspace(combined);
      this.base = remote.document; this.revision = remote.revision; this.outbox = null; this.deferredRemote = null; this.block = null; this.recovering = true;
      this.pending = diffWorkspace(remote.document, combined); this.past = [this.pending]; this.future = [];
      this.publish({ document: combined, loading: false, readOnly: false, error: null, conflicts: [], saveState: 'pending', room: remote.room, members: remote.members });
      this.persistDraft(); await this.flush();
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      this.block = 'conflict'; this.publish({ loading: false, saveState: 'conflict', error: error instanceof Error ? error.message : 'The local version could not be restored. Your draft is preserved.' });
    }
    this.schedulePoll();
  }
  discardDraft = () => { this.recovery = null; this.recovering = false; this.removeDraft(true); this.publish({ hasRecovery: false }); };
  exportDraft = () => this.snapshot.document;
  getRecoveryDocument = () => this.recovery?.document ?? null;
  suspend = () => {
    this.persistDraft(); this.active = false; this.generation += 1; this.controller.abort(); this.cancelSave(); this.cancelPoll();
  };
}
