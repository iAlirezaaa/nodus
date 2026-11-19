import type { Language, Workspace } from '../lib/types';

export type SaveState = 'saved' | 'saving' | 'pending' | 'offline' | 'conflict';
export interface WorkspaceSnapshot {
  document: Workspace | null;
  loading: boolean;
  error: string | null;
  saveState: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  hasRecovery: boolean;
  draftWarning: string | null;
  updatedAt: string | null;
}
interface Draft {
  version: 1;
  userId: string;
  baseRevision: number;
  document: Workspace;
  savedAt: number;
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
interface ServerWorkspace {
  document: Workspace | null;
  revision: number;
  updatedAt: string | null;
  userId: string;
}
interface StoreOptions {
  makeWorkspace: () => Workspace;
  language?: Language;
  fetcher?: typeof fetch;
  storage?: StorageLike | null;
  debounceMs?: number;
}

export const initialWorkspaceSnapshot: WorkspaceSnapshot = {
  document: null, loading: true, error: null, saveState: 'saved',
  canUndo: false, canRedo: false, hasRecovery: false, draftWarning: null, updatedAt: null,
};

function isWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== 'object') return false;
  const data = value as Workspace;
  return data.version === 1 && typeof data.homeBoardId === 'string'
    && Array.isArray(data.boards) && Array.isArray(data.nodes) && Array.isArray(data.edges)
    && data.boards.some(board => board && board.id === data.homeBoardId);
}

function sameDocument(a: Workspace | null, b: Workspace | null) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Copy graph IDs, while retaining the signed-in user's existing uploaded assets. */
export function copyWorkspaceAsRoots(current: Workspace, recovered: Workspace, language: Language): Workspace {
  const boards = new Map(recovered.boards.map(board => [board.id, crypto.randomUUID()]));
  const nodes = new Map(recovered.nodes.map(node => [node.id, crypto.randomUUID()]));
  const suffix = language === 'fa' ? ' · بازیابی‌شده' : ' · Recovered';
  return {
    ...current,
    boards: [...current.boards, ...recovered.boards.map(board => ({
      ...board, id: boards.get(board.id)!,
      title: board.parentNodeId ? board.title : board.title.slice(0,500-suffix.length) + suffix,
      parentNodeId: board.parentNodeId ? nodes.get(board.parentNodeId)! : null,
      ...(board.zones ? { zones: board.zones.map(zone => ({
        ...zone, id: crypto.randomUUID(), nodeIds: zone.nodeIds.map(id => nodes.get(id)!).filter(Boolean),
      })) } : {}),
    }))],
    nodes: [...current.nodes, ...recovered.nodes.map(node => ({
      ...node, id: nodes.get(node.id)!, boardId: boards.get(node.boardId)!,
      childBoardId: node.childBoardId ? boards.get(node.childBoardId)! : null,
      ...(node.task ? { task: { ...node.task, parentId: node.task.parentId ? nodes.get(node.task.parentId)! : null } } : {}),
      ...(node.annotations ? { annotations: node.annotations.map(annotation => ({ ...annotation, id: crypto.randomUUID() })) } : {}),
    }))],
    edges: [...current.edges, ...recovered.edges.map(edge => ({
      ...edge, id: crypto.randomUUID(), boardId: boards.get(edge.boardId)!,
      sourceId: nodes.get(edge.sourceId)!, targetId: nodes.get(edge.targetId)!,
    }))],
  };
}

/** A single serialized save queue shared by every view of the workspace. */
export class WorkspaceStore {
  private snapshot: WorkspaceSnapshot = { ...initialWorkspaceSnapshot };
  private listeners = new Set<() => void>();
  private options: StoreOptions;
  private revision = 0;
  private userId = '';
  private serial = 0;
  private acknowledgedSerial = 0;
  private blocked = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private saving: Promise<void> | null = null;
  private loadGeneration = 0;
  private past: Workspace[] = [];
  private future: Workspace[] = [];
  private recovery: Draft | null = null;
  private protectedPending = false;
  private clearRecoveryAfterSaveSerial: number | null = null;
  // The store's update contract is immutable. Keep only the most recent encoded
  // document, rather than retaining one large JSON string per undo history entry.
  private encodedDocument: { document: Workspace; json: string } | null = null;
  private draftWrites = new Map<string, { document: Workspace; revision: number; json: string }>();

  constructor(options: StoreOptions) { this.options = options; }
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => initialWorkspaceSnapshot;
  getUserId = () => this.userId;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  setLanguage(language: Language) { this.options.language = language; }
  private publish(patch: Partial<WorkspaceSnapshot>) {
    const next = { ...this.snapshot, ...patch, canUndo: this.past.length > 0, canRedo: this.future.length > 0 };
    if ((Object.keys(next) as (keyof WorkspaceSnapshot)[]).every(key => Object.is(next[key], this.snapshot[key]))) return;
    this.snapshot = next;
    this.listeners.forEach(listener => listener());
  }
  private encodeDocument(document: Workspace) {
    if (this.encodedDocument?.document === document) return this.encodedDocument.json;
    const json = JSON.stringify(document);
    this.encodedDocument = { document, json };
    return json;
  }
  private get fetcher() { return this.options.fetcher ?? globalThis.fetch.bind(globalThis); }
  private get storage(): StorageLike | null {
    if (this.options.storage !== undefined) return this.options.storage;
    try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
  }
  private key(recovery = false) { return `nodus:workspace:${recovery ? 'recovery' : 'draft'}:${this.userId}`; }
  private readDraft(recovery = false): Draft | null {
    try {
      const raw = this.storage?.getItem(this.key(recovery));
      if (!raw) return null;
      const draft = JSON.parse(raw) as Draft;
      return draft.version === 1 && draft.userId === this.userId && Number.isInteger(draft.baseRevision)
        && draft.baseRevision >= 0 && isWorkspace(draft.document) ? draft : null;
    } catch { return null; }
  }
  private removeDraft(recovery = false) {
    const key = this.key(recovery);
    this.draftWrites.delete(key);
    try { this.storage?.removeItem(key); } catch { /* Cloud acknowledgement remains authoritative. */ }
  }
  private writeDraft(draft: Draft, recovery = false) {
    try {
      const storage = this.storage;
      if (!storage) throw new Error('Browser storage is unavailable.');
      const key = this.key(recovery);
      const written = this.draftWrites.get(key);
      // Visibility, unload, suspend and failed requests often flush the same
      // draft. Verify the actual stored bytes before skipping: another tab can
      // replace or remove an account's shared localStorage entry.
      if (written?.document === draft.document && written.revision === draft.baseRevision
        && storage.getItem(key) === written.json) return true;
      const json = `{"version":1,"userId":${JSON.stringify(draft.userId)},"baseRevision":${JSON.stringify(draft.baseRevision)},"document":${this.encodeDocument(draft.document)},"savedAt":${JSON.stringify(draft.savedAt)}}`;
      storage.setItem(key, json);
      this.draftWrites.set(key, { document: draft.document, revision: draft.baseRevision, json });
      return true;
    } catch {
      this.publish({ draftWarning: 'Browser recovery storage is unavailable or full. Keep this page open until changes are saved to the server.' });
      return false;
    }
  }
  private makeDraft(document = this.snapshot.document): Draft | null {
    if (!document || !this.userId) return null;
    return { version: 1, userId: this.userId, baseRevision: this.revision, document, savedAt: Date.now() };
  }
  private keepRecovery(draft: Draft) {
    this.recovery = draft;
    this.protectedPending = !this.writeDraft(draft, true);
    this.publish({ hasRecovery: true });
  }
  persistDraft = () => {
    if (!this.hasPendingChanges() || this.protectedPending) return;
    const draft = this.makeDraft();
    if (draft) this.writeDraft(draft);
  };
  hasPendingChanges = () => this.serial !== this.acknowledgedSerial;
  private cancelTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  private schedule() {
    this.cancelTimer();
    if (this.blocked || !this.hasPendingChanges() || this.snapshot.loading) return;
    this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, this.options.debounceMs ?? 650);
  }
  private async errorMessage(response: Response) {
    try {
      const data = await response.json() as { error?: string | { message?: string }; message?: string };
      if (typeof data.message === 'string') return data.message;
      if (typeof data.error === 'string') return data.error;
      return data.error?.message ?? `Request failed (${response.status}).`;
    } catch { return `Request failed (${response.status}).`; }
  }
  private async getRemote(): Promise<ServerWorkspace> {
    const response = await this.fetcher('/api/workspace', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error(await this.errorMessage(response));
    const result = await response.json() as ServerWorkspace;
    if (typeof result.userId !== 'string' || !result.userId || !Number.isInteger(result.revision)
      || result.revision < 0 || (result.document !== null && !isWorkspace(result.document))) {
      throw new Error('The server returned an invalid workspace. Your local draft has been preserved.');
    }
    return result;
  }

  load = async () => {
    const generation = ++this.loadGeneration;
    this.cancelTimer();
    this.persistDraft();
    this.publish({ loading: true, error: null });
    // A reload never races a preceding write against its own GET.
    if (this.saving) await this.saving;
    if (generation !== this.loadGeneration) return;
    try {
      const remote = await this.getRemote();
      if (generation !== this.loadGeneration) return;
      const previousUser = this.userId;
      this.userId = remote.userId;
      if (previousUser !== this.userId) {
        this.draftWrites.clear();
        this.encodedDocument = null;
      }
      this.revision = remote.revision;
      this.blocked = false;
      this.past = [];
      this.future = [];
      this.serial = 0;
      this.acknowledgedSerial = 0;
      this.clearRecoveryAfterSaveSerial = null;
      this.protectedPending = false;
      this.recovery = this.readDraft(true);
      const pending = this.readDraft();
      if (pending && !sameDocument(pending.document, remote.document)) this.keepRecovery(pending);
      else if (pending) this.removeDraft();
      if (this.recovery && sameDocument(this.recovery.document, remote.document)) {
        this.recovery = null;
        this.removeDraft(true);
      }
      // There is no cloud data to overwrite when an account has never saved a workspace.
      const document = remote.document ?? this.recovery?.document ?? this.options.makeWorkspace();
      const needsInitialSave = remote.document === null;
      if (needsInitialSave) {
        this.serial = 1;
        if (this.recovery) this.clearRecoveryAfterSaveSerial = 1;
      }
      this.publish({ document, loading: false, error: null,
        saveState: needsInitialSave ? 'pending' : 'saved',
        hasRecovery: !needsInitialSave && !!this.recovery,
        updatedAt: remote.updatedAt,
        ...(previousUser && previousUser !== this.userId ? { draftWarning: null } : {}),
      });
      if (needsInitialSave) { this.persistDraft(); this.schedule(); }
    } catch (error) {
      if (generation !== this.loadGeneration) return;
      this.blocked = true;
      this.publish({ loading: false, saveState: 'offline', error: error instanceof Error ? error.message : 'Unable to load your workspace.' });
    }
  };
  reload = () => this.load();

  update = (updater: (document: Workspace) => Workspace) => {
    const previous = this.snapshot.document;
    if (!previous || this.snapshot.loading) return;
    const next = updater(previous);
    if (next === previous) return;
    this.past.push(previous);
    if (this.past.length > 60) this.past.shift();
    this.future = [];
    this.applyDocument(next);
  };
  private applyDocument(document: Workspace) {
    this.serial += 1;
    this.publish({ document, saveState: this.blocked ? this.snapshot.saveState : this.saving ? 'saving' : 'pending',
      error: this.blocked ? this.snapshot.error : null });
    this.persistDraft();
    this.schedule();
  }
  undo = () => {
    if (this.snapshot.loading || !this.snapshot.document) return;
    const previous = this.past.pop();
    if (!previous) return;
    this.future.push(this.snapshot.document);
    this.applyDocument(previous);
  };
  redo = () => {
    if (this.snapshot.loading || !this.snapshot.document) return;
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.snapshot.document);
    this.applyDocument(next);
  };

  flush = async (): Promise<void> => {
    this.cancelTimer();
    if (this.saving) return this.saving;
    if (this.blocked || this.snapshot.loading || !this.userId || !this.snapshot.document || !this.hasPendingChanges()) return;
    // Schedule in a microtask so `saving` is set before any synchronous subscriber can re-enter.
    const operation = Promise.resolve().then(() => this.saveLoop());
    this.saving = operation;
    await operation;
    if (this.saving === operation) this.saving = null;
  };
  private async saveLoop() {
    while (!this.blocked && this.hasPendingChanges() && this.snapshot.document) {
      const sentSerial = this.serial;
      const document = this.snapshot.document;
      this.publish({ saveState: 'saving', error: null });
      try {
        const response = await this.fetcher('/api/workspace', {
          method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Nodus-User-Id': this.userId },
          body: `{"document":${this.encodeDocument(document)},"revision":${this.revision}}`,
        });
        if (!response.ok) {
          this.blocked = true;
          const message = await this.errorMessage(response);
          this.publish({ saveState: response.status === 409 ? 'conflict' : 'offline', error: message });
          this.persistDraft();
          return;
        }
        const acknowledgement = await response.json() as { revision: number; updatedAt: string };
        if (!Number.isInteger(acknowledgement.revision) || acknowledgement.revision <= this.revision) {
          throw new Error('The save could not be confirmed. Your local draft has been preserved.');
        }
        this.revision = acknowledgement.revision;
        this.acknowledgedSerial = sentSerial;
        if (this.clearRecoveryAfterSaveSerial !== null && sentSerial >= this.clearRecoveryAfterSaveSerial) {
          this.recovery = null;
          this.clearRecoveryAfterSaveSerial = null;
          this.protectedPending = false;
          this.removeDraft(true);
        }
        if (!this.hasPendingChanges()) {
          if (!this.protectedPending) this.removeDraft();
          this.publish({ saveState: 'saved', error: null, updatedAt: acknowledgement.updatedAt,
            hasRecovery: !!this.recovery });
        } else {
          this.persistDraft();
          this.publish({ saveState: 'saving', updatedAt: acknowledgement.updatedAt });
        }
      } catch (error) {
        this.blocked = true;
        this.publish({ saveState: 'offline', error: error instanceof Error ? error.message : 'Unable to save. Your changes remain in this page.' });
        this.persistDraft();
        return;
      }
    }
  }

  retry = async () => {
    if (!this.snapshot.document || !this.userId) return this.load();
    if (this.snapshot.saveState === 'conflict') return;
    this.blocked = false;
    this.publish({ error: null, saveState: this.hasPendingChanges() ? 'pending' : 'saved' });
    await this.flush();
  };

  recoverDraft = async () => {
    const recovery = this.recovery;
    if (!recovery || !this.snapshot.document) return;
    if (recovery.baseRevision !== this.revision || this.hasPendingChanges()) {
      await this.restoreAsCopy(recovery.document);
      return;
    }
    this.blocked = false;
    this.clearRecoveryAfterSaveSerial = this.serial + 1;
    this.update(() => recovery.document);
    await this.flush();
  };
  resolveConflict = async () => {
    const document = this.snapshot.document;
    if (document) await this.restoreAsCopy(document);
  };
  private async restoreAsCopy(document: Workspace) {
    this.cancelTimer();
    this.persistDraft();
    this.publish({ loading: true, error: null });
    if (this.saving) await this.saving;
    try {
      const remote = await this.getRemote();
      if (remote.userId !== this.userId) throw new Error('The signed-in account changed. Reload before restoring your draft.');
      const combined = remote.document
        ? copyWorkspaceAsRoots(remote.document, document, this.options.language ?? 'fa')
        : document;
      this.revision = remote.revision;
      this.blocked = false;
      this.past = remote.document ? [remote.document] : [];
      this.future = [];
      this.serial += 1;
      this.acknowledgedSerial = this.serial - 1;
      this.clearRecoveryAfterSaveSerial = this.serial;
      this.publish({ document: combined, loading: false, saveState: 'pending', error: null });
      this.persistDraft();
      await this.flush();
    } catch (error) {
      this.blocked = true;
      this.publish({ loading: false, saveState: 'conflict', error: error instanceof Error ? error.message : 'Unable to restore the draft. It has been preserved.' });
    }
  }
  discardDraft = () => {
    this.recovery = null;
    this.clearRecoveryAfterSaveSerial = null;
    this.removeDraft(true);
    if (this.protectedPending) this.removeDraft();
    this.protectedPending = false;
    this.publish({ hasRecovery: false });
    this.persistDraft();
  };
  exportDraft = (): Workspace | null => this.snapshot.document;
  getRecoveryDocument = (): Workspace | null => this.recovery?.document ?? null;
  suspend = () => {
    this.cancelTimer();
    this.persistDraft();
  };
}
