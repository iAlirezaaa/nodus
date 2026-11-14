/** Keyboard commands belong to the focused surface, never to a stale selection. */
export type GraphShortcutScope = 'canvas' | 'node' | 'edge' | 'text' | 'control' | 'outside';
export interface ShortcutEvent {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  keyCode?: number;
  defaultPrevented?: boolean;
}
export type GraphShortcut = 'ignore' | 'search' | 'undo' | 'redo' | 'sibling' | 'child' | 'parent'
  | 'details' | 'project' | 'edit' | 'clear' | 'delete' | 'new-thought' | 'new-task' | 'fit'
  | 'hand' | 'select' | 'select-all' | 'pan' | 'left' | 'right' | 'up' | 'down';

const editingSelector = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"]';
export function isEditableTarget(target: EventTarget | null): boolean {
  return typeof Element !== 'undefined' && target instanceof Element && !!target.closest(editingSelector);
}

export function graphShortcutScope(target: EventTarget | null): GraphShortcutScope {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return 'outside';
  if (isEditableTarget(target)) return 'text';
  if (target.closest('[inert],[role="dialog"],[role="menu"]')) return 'control';
  // Nested buttons, labels, sliders, and toolbars are not the graph surface.
  if (target.matches('[data-node]')) return 'node';
  if (target.matches('[data-edge]')) return 'edge';
  if (target.matches('[data-canvas]')) return 'canvas';
  return target.closest('button,a,summary,[role="button"],[role="slider"],[role="spinbutton"]') ? 'control' : 'outside';
}

export function resolveGraphShortcut(event: ShortcutEvent, context: {
  scope: GraphShortcutScope;
  hasNode?: boolean;
  hasEdge?: boolean;
  hasParent?: boolean;
  blocked?: boolean;
}): GraphShortcut | null {
  const { scope, hasNode = false, hasEdge = false, hasParent = false, blocked = false } = context;
  if (blocked || event.defaultPrevented || event.isComposing || event.keyCode === 229
    || !['canvas', 'node', 'edge'].includes(scope) || event.altKey || event.ctrlKey && event.metaKey) return null;
  const modified = !!(event.ctrlKey || event.metaKey), shift = !!event.shiftKey;
  const letter = event.key.toLowerCase();
  let action: GraphShortcut | null = null;
  if (modified) {
    if (letter === 'z') action = shift ? 'redo' : 'undo';
    else if (!shift && letter === 'y') action = 'redo';
    else if (!shift && letter === 'k') action = 'search';
    else if (!shift && letter === 'a') action = 'select-all';
    else if (!shift && event.key === 'Enter' && hasNode) action = 'project';
    else if (!shift && event.key === 'Delete' && (hasNode || hasEdge)) action = 'delete';
  } else if (event.key === 'Escape' && !shift) action = 'clear';
  else if ((event.key === 'Delete' || event.key === 'Backspace') && !shift && (hasNode || hasEdge)) action = 'delete';
  else if (scope !== 'edge') {
    if (event.key === 'Enter') action = shift ? hasNode ? 'details' : null : 'sibling';
    else if (event.key === 'Tab' && hasNode) action = shift ? hasParent ? 'parent' : null : 'child';
    else if (event.key === 'F2' && hasNode && !shift) action = 'edit';
    else if (!shift && event.key === ' ') action = scope === 'node' ? 'details' : 'pan';
    else if (!shift) action = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' } as const)[event.key as 'ArrowLeft']
      ?? ({ n: 'new-thought', t: 'new-task', f: 'fit', h: 'hand', v: 'select' } as const)[letter as 'n'] ?? null;
  }
  // Holding a key may navigate or pan, but must not create/delete/history-step repeatedly.
  if (event.repeat && action && !['left', 'right', 'up', 'down', 'pan'].includes(action)) return 'ignore';
  return action;
}
