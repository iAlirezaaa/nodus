'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createWorkspace } from '@/lib/graph';
import type { Language } from '@/lib/types';
import { WorkspaceStore } from './workspace-store';
import { SharedWorkspaceStore } from './shared-workspace-store';
import type { RoomMember, SharedRoom, OperationConflict } from '@/lib/collaboration';

export type { SaveState, WorkspaceSnapshot } from './workspace-store';

const personalRoom = { room: null as SharedRoom | null, members: [] as RoomMember[], readOnly: false, conflicts: [] as OperationConflict[] };
const noRemotePause = (_paused: boolean) => {};

export function useWorkspace(language: Language = 'fa', roomId: string | null = null) {
  const [personalStore] = useState(() => new WorkspaceStore({ makeWorkspace: () => createWorkspace(language), language }));
  const store = useMemo(() => roomId ? new SharedWorkspaceStore({ roomId }) : personalStore, [personalStore, roomId]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => { store.setLanguage(language); }, [store, language]);
  useEffect(() => {
    if (store instanceof SharedWorkspaceStore) store.setVisible(document.visibilityState !== 'hidden');
    void store.load();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      store.persistDraft();
      if (store.hasPendingChanges()) { event.preventDefault(); event.returnValue = ''; }
    };
    const online = () => { void store.retry(); };
    const visibility = () => {
      if (document.visibilityState === 'hidden') { store.persistDraft(); void store.flush(); }
      if (store instanceof SharedWorkspaceStore) store.setVisible(document.visibilityState !== 'hidden');
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      store.suspend();
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [store]);

  // Preserve the result identity through parent-only renders (for example a
  // locally edited title). Store action methods themselves are already stable.
  return useMemo(() => ({
    ...personalRoom,
    ...state,
    update: store.update, undo: store.undo, redo: store.redo,
    flush: store.flush, retry: store.retry, reload: store.reload,
    recoverDraft: store.recoverDraft, discardDraft: store.discardDraft,
    resolveConflict: store.resolveConflict, exportDraft: store.exportDraft,
    getRecoveryDocument: store.getRecoveryDocument,
    getUserId: store.getUserId,
    hasPendingChanges: store.hasPendingChanges,
    setRemotePaused: store instanceof SharedWorkspaceStore ? store.setRemotePaused : noRemotePause,
  }), [state, store]);
}
