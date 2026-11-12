'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { CollaborationPresence, emptyPresenceSnapshot } from './collaboration-presence';

const subscribeEmpty = (_listener: () => void) => () => {};
const getEmpty = () => emptyPresenceSnapshot;
const ignorePointer = (_point: { x: number; y: number } | null) => {};

export function useCollaborationPresence(roomId: string | null, userId: string | null, boardId: string | null, selectedNodeId: string | null) {
  const presence = useMemo(() => roomId && userId ? new CollaborationPresence({ roomId, userId }) : null, [roomId, userId]);
  const state = useSyncExternalStore(presence?.subscribe ?? subscribeEmpty, presence?.getSnapshot ?? getEmpty, getEmpty);
  useEffect(() => { presence?.setContext(boardId, selectedNodeId); }, [presence, boardId, selectedNodeId]);
  useEffect(() => {
    if (!presence) return;
    presence.setVisible(document.visibilityState !== 'hidden'); presence.start();
    const visibility = () => presence.setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', visibility);
    return () => { presence.stop(); document.removeEventListener('visibilitychange', visibility); };
  }, [presence]);
  return useMemo(() => ({ ...state, reportPointer: presence?.reportPointer ?? ignorePointer }), [state, presence]);
}
