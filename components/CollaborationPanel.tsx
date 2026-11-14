'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, Copy, FolderOpen, LoaderCircle, Plus, RefreshCw, ShieldCheck, Trash2, UserPlus, Users, UserRound } from 'lucide-react';
import type { RoomListResponse, RoomMember, SharedRoom } from '@/lib/collaboration';
import type { Language, Workspace } from '@/lib/types';
import Modal from './Modal';
import './collaboration.css';

export interface CollaborationPanelProps {
  roomId: string | null;
  room: SharedRoom | null;
  members?: RoomMember[];
  currentDocument: Workspace;
  language: Language;
  userId: string | null;
  onSwitchRoom: (id: string | null) => void | Promise<void>;
  onClose: () => void;
  onNotice?: (message: string) => void;
}

export default function CollaborationPanel({ roomId, room, members = [], currentDocument, language, userId, onSwitchRoom, onClose, onNotice }: CollaborationPanelProps) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const id = useId();
  const [rooms, setRooms] = useState<SharedRoom[]>([]);
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState(() => (currentDocument.boards.find(board => board.id === currentDocument.homeBoardId)?.title ?? '').slice(0, 200));
  const [profile, setProfile] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [memberResult, setMemberResult] = useState<{ roomId: string; members: RoomMember[] } | null>(null);
  const alive = useRef(false);
  const currentIdentity = useRef(userId); currentIdentity.current = userId;
  const controller = useRef<AbortController | null>(null);
  const displayedMembers = memberResult?.roomId === roomId ? memberResult.members : members;
  const activeRoom = room ?? rooms.find(item => item.id === roomId) ?? null;
  const link = roomId && typeof window !== 'undefined' ? `${window.location.origin}/?room=${encodeURIComponent(roomId)}` : '';

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal: controller.current?.signal, ...init,
      headers: { ...(init?.method ? { 'Content-Type': 'application/json', 'X-Nodus-User-Id': userId ?? '' } : {}), ...init?.headers } });
    const data = await response.json() as Partial<RoomListResponse> & { room?: SharedRoom; members?: RoomMember[]; message?: string; error?: string };
    if (userId !== currentIdentity.current) throw new Error('The signed-in account changed. Reload before managing shared rooms.');
    if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : `Request failed (${response.status}).`);
    if (data.userId && userId && data.userId !== userId) throw new Error('The signed-in account changed. Reload before managing shared rooms.');
    return data;
  }, [userId]);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request('/api/rooms') as RoomListResponse;
      if (!Array.isArray(data.rooms)) throw new Error('The server returned an invalid room list.');
      if (alive.current) { setRooms(data.rooms); setProfile(data.email ?? ''); setError(null); }
    } catch (cause) { if (alive.current && !(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (alive.current) setLoading(false); }
  }, [request]);

  useEffect(() => {
    alive.current = true; controller.current = new AbortController();
    void refresh();
    return () => { alive.current = false; controller.current?.abort(); };
  }, [refresh]);
  useEffect(() => { setMemberResult(null); }, [members, roomId]);

  async function act(key: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(key); setError(null);
    try { await action(); }
    catch (cause) { if (alive.current && !(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (alive.current) setBusy(null); }
  }
  const createRoom = () => act('create', async () => {
    if (roomId || !userId) return;
    const name = title.trim();
    if (!name) throw new Error(L('برای فضای مشترک یک نام بنویس.', 'Give the shared room a name.'));
    const data = await request('/api/rooms', { method: 'POST', body: JSON.stringify({ title: name, document: currentDocument }) });
    const createdRoom = data.room;
    if (!createdRoom?.id) throw new Error('The shared room could not be confirmed.');
    if (!alive.current) return;
    setRooms(previous => [createdRoom, ...previous.filter(item => item.id !== createdRoom.id)]);
    onNotice?.(L('نسخهٔ مشترک ساخته شد. حالا می‌توانی دسترسی اعضا را اضافه کنی.', 'Shared copy created. You can now add members.'));
    await onSwitchRoom(createdRoom.id);
  });
  const changeMember = (memberEmail: string, remove = false) => act(remove ? memberEmail : 'invite', async () => {
    if (!roomId || activeRoom?.role !== 'owner' || !userId) return;
    const data = await request(`/api/rooms/${encodeURIComponent(roomId)}/members`, { method: remove ? 'DELETE' : 'POST', body: JSON.stringify({ email: memberEmail.trim() }) });
    if (!alive.current) return;
    if (Array.isArray(data.members)) setMemberResult({ roomId, members: data.members });
    else {
      const current = await request(`/api/rooms/${encodeURIComponent(roomId)}`);
      if (alive.current && Array.isArray(current.members)) setMemberResult({ roomId, members: current.members });
    }
    if (!remove) setEmail('');
    onNotice?.(remove ? L('دسترسی این عضو برداشته شد.', 'Member access removed.') : L('دسترسی اضافه شد. لینک فضا را برای او کپی کن.', 'Access added. Copy the room link to share with them.'));
  });
  const copyLink = () => act('copy', async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); }
    catch { throw new Error(L('کپی خودکار در دسترس نیست؛ لینک زیر را انتخاب و کپی کن.', 'Automatic copy is unavailable; select and copy the link below.')); }
  });

  return <Modal title={L('فضاهای مشترک', 'Shared rooms')} onClose={onClose} wide>
    <div className="collaboration-panel" dir={language === 'fa' ? 'rtl' : 'ltr'}>
      <div className="collab-intro"><span className="collab-emblem"><Users size={22} /></span><div><strong>{L('فکرها را با هم گسترش بدهید', 'Grow ideas together')}</strong><p>{L('تغییرات هر عضو و نشانگر او روی همین بوم همگام می‌شوند.', 'Members’ changes and cursors synchronize on the same canvas.')}</p></div></div>
      {error && <div className="collab-error" role="alert" dir="auto">{error}</div>}
      <div className="collab-columns">
        <section className="collab-rooms" aria-labelledby={`${id}-rooms`}>
          <div className="collab-section-heading"><h3 id={`${id}-rooms`}>{L('فضاهای تو', 'Your rooms')}</h3><button className="icon-button" type="button" onClick={() => void refresh()} disabled={loading || !!busy} aria-label={L('تازه‌سازی فهرست', 'Refresh rooms')}><RefreshCw size={14} className={loading ? 'spin' : ''} /></button></div>
          <button className={`collab-room ${roomId === null ? 'is-active' : ''}`} onClick={() => void act('personal', async () => { await onSwitchRoom(null); })} disabled={!!busy} type="button"><UserRound size={18} /><span><strong>{L('فضای شخصی', 'Personal workspace')}</strong><small>{L('فقط برای حساب تو', 'Only your account')}</small></span>{roomId === null && <Check size={15} />}</button>
          {loading && !rooms.length && <p className="collab-muted"><LoaderCircle size={14} className="spin" />{L('در حال دریافت فضاها…', 'Loading rooms…')}</p>}
          {!loading && !rooms.length && <p className="collab-muted">{L('هنوز فضای مشترکی نداری.', 'You have no shared rooms yet.')}</p>}
          <ul className="collab-room-list">{rooms.map(item => <li key={item.id}><button className={`collab-room ${item.id === roomId ? 'is-active' : ''}`} type="button" disabled={!!busy} onClick={() => void act(item.id, async () => { await onSwitchRoom(item.id); })}><FolderOpen size={18} /><span><strong dir="auto">{item.title}</strong><small>{item.role === 'owner' ? L('مالک فضا', 'Room owner') : L('عضو با دسترسی ویرایش', 'Editor')}</small></span>{item.id === roomId && <Check size={15} />}</button></li>)}</ul>
          {profile && <p className="collab-account" dir="ltr">{profile}</p>}
        </section>
        <section className="collab-details">
          {!roomId ? <>
            <div className="collab-section-heading"><h3>{L('یک نسخهٔ مشترک بساز', 'Create a shared copy')}</h3><Plus size={16} /></div>
            <p className="collab-muted">{L('از بوم بازشده و بوم‌های داخلی آن یک نسخهٔ مستقل ساخته می‌شود. فضای شخصی تو سر جای خودش می‌ماند.', 'Create an independent copy of the current board and its nested boards. Your personal workspace stays available.')}</p>
            <form onSubmit={event => { event.preventDefault(); void createRoom(); }} className="collab-form">
              <label htmlFor={`${id}-title`}>{L('نام فضای مشترک', 'Shared room name')}</label>
              <input id={`${id}-title`} className="text-input" value={title} maxLength={200} onChange={event => setTitle(event.target.value)} dir="auto" required disabled={!!busy} />
              <button className="primary-button" type="submit" disabled={!!busy || !userId || !title.trim()}>{busy === 'create' ? <LoaderCircle size={15} className="spin" /> : <Plus size={15} />}{L('ساخت نسخهٔ مشترک', 'Create shared copy')}</button>
            </form>
          </> : <>
            <div className="collab-section-heading"><h3 dir="auto">{activeRoom?.title ?? L('فضای مشترک', 'Shared room')}</h3>{activeRoom?.role === 'owner' && <span className="collab-owner"><ShieldCheck size={13} />{L('مالک', 'Owner')}</span>}</div>
            <label className="collab-link-label" htmlFor={`${id}-link`}>{L('لینک ورود اعضا', 'Member link')}</label>
            <div className="collab-link"><input id={`${id}-link`} className="text-input" value={link} readOnly dir="ltr" onFocus={event => event.currentTarget.select()} /><button className="secondary-button" type="button" disabled={!!busy} onClick={() => void copyLink()} aria-label={L('کپی لینک فضا', 'Copy room link')}>{copied ? <Check size={15} /> : <Copy size={15} />}</button></div>
            <p className="collab-access-note">{L('لینک به‌تنهایی دسترسی نمی‌دهد. عضو باید با ایمیل اضافه‌شده وارد شود و به خود سایت هم دسترسی داشته باشد. ایمیلی خودکار فرستاده نمی‌شود.', 'The link alone does not grant access. Members must sign in with an added email and also have access to this site. No invitation email is sent automatically.')}</p>
            <h4 className="collab-members-heading">{L('اعضا', 'Members')} <span>{displayedMembers.length}</span></h4>
            <ul className="collab-members">{displayedMembers.map(member => <li key={member.email}><span className="collab-member-avatar" aria-hidden="true">{member.email.slice(0, 1).toUpperCase()}</span><span className="collab-member-info"><strong dir="ltr">{member.email}</strong><small>{member.role === 'owner' ? L('مالک', 'Owner') : L('ویرایشگر', 'Editor')}</small></span>{activeRoom?.role === 'owner' && member.role !== 'owner' && <button type="button" className="icon-button collab-remove" onClick={() => void changeMember(member.email, true)} disabled={!!busy} aria-label={`${L('برداشتن دسترسی', 'Remove access')}: ${member.email}`}><Trash2 size={14} /></button>}</li>)}</ul>
            {activeRoom?.role === 'owner' ? <form className="collab-form collab-invite" onSubmit={event => { event.preventDefault(); void changeMember(email); }}>
              <label htmlFor={`${id}-email`}>{L('ایمیل عضو جدید', 'New member email')}</label><div><input id={`${id}-email`} type="email" className="text-input" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" maxLength={254} required dir="ltr" autoComplete="email" disabled={!!busy} /><button className="primary-button" type="submit" disabled={!!busy || !email.trim()}>{busy === 'invite' ? <LoaderCircle size={14} className="spin" /> : <UserPlus size={14} />}{L('افزودن', 'Add')}</button></div>
            </form> : <p className="collab-muted">{L('مدیریت دسترسی اعضا با مالک این فضاست.', 'The room owner manages member access.')}</p>}
          </>}
        </section>
      </div>
    </div>
  </Modal>;
}
