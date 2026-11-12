'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createWorkspace } from '@/lib/graph';
import type { Language } from '@/lib/types';
import { WorkspaceStore } from './workspace-store';

export type { SaveState, WorkspaceSnapshot } from './workspace-store';

export function useWorkspace(language: Language = 'fa') {
  const [store] = useState(() => new WorkspaceStore({ makeWorkspace: () => createWorkspace(language), language }));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => { store.setLanguage(language); }, [store, language]);
  useEffect(() => {
    void store.load();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      store.persistDraft();
      if (store.hasPendingChanges()) { event.preventDefault(); event.returnValue = ''; }
    };
    const online = () => { void store.retry(); };
    const visibility = () => {
      if (document.visibilityState === 'hidden') { store.persistDraft(); void store.flush(); }
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
    ...state,
    update: store.update, undo: store.undo, redo: store.redo,
    flush: store.flush, retry: store.retry, reload: store.reload,
    recoverDraft: store.recoverDraft, discardDraft: store.discardDraft,
    resolveConflict: store.resolveConflict, exportDraft: store.exportDraft,
    getRecoveryDocument: store.getRecoveryDocument,
    getUserId: store.getUserId,
  }), [state, store]);
}
