import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveGraphShortcut, type GraphShortcutScope, type ShortcutEvent } from '../lib/keyboard.ts';

const graph = { scope: 'canvas' as const, hasNode: true, hasParent: true };

test('text, native controls, and an unfocused body never mutate a selected graph', () => {
  const keys: ShortcutEvent[] = [
    { key: 'Enter' }, { key: 'Tab' }, { key: 'Delete' }, { key: 'Backspace' }, { key: ' ' },
    { key: 'Escape' }, { key: 'n' }, { key: 't' }, { key: 'f' }, { key: 'ArrowDown' },
    { key: 'z', ctrlKey: true }, { key: 'z', metaKey: true }, { key: 'y', ctrlKey: true },
    { key: 'k', ctrlKey: true }, { key: 'Enter', metaKey: true }, { key: 'a', ctrlKey: true }, { key: 'a', metaKey: true },
  ];
  for (const scope of ['text', 'control', 'outside'] satisfies GraphShortcutScope[]) {
    for (const event of keys) assert.equal(resolveGraphShortcut(event, { ...graph, scope }), null, `${scope}: ${JSON.stringify(event)}`);
  }
});

test('Enter and Tab have one unambiguous graph action for focused canvas and nodes', () => {
  for (const scope of ['canvas', 'node'] satisfies GraphShortcutScope[]) {
    assert.equal(resolveGraphShortcut({ key: 'Enter' }, { ...graph, scope }), 'sibling');
    assert.equal(resolveGraphShortcut({ key: 'Tab' }, { ...graph, scope }), 'child');
    assert.equal(resolveGraphShortcut({ key: 'Enter', shiftKey: true }, { ...graph, scope }), 'details');
    assert.equal(resolveGraphShortcut({ key: 'Enter', ctrlKey: true }, { ...graph, scope }), 'project');
    assert.equal(resolveGraphShortcut({ key: 'Tab', shiftKey: true }, { ...graph, scope }), 'parent');
  }
  assert.equal(resolveGraphShortcut({ key: 'Tab' }, { scope: 'canvas' }), null);
  assert.equal(resolveGraphShortcut({ key: 'Tab', shiftKey: true }, { ...graph, hasParent: false }), null);
  assert.equal(resolveGraphShortcut({ key: 'Enter', shiftKey: true }, { scope: 'canvas' }), null);
});

test('letter shortcuts stay the same on a focused node and never replace its title', () => {
  const keys = { n: 'new-thought', t: 'new-task', f: 'fit', h: 'hand', v: 'select' };
  for (const [key, action] of Object.entries(keys)) {
    assert.equal(resolveGraphShortcut({ key }, graph), action);
    assert.equal(resolveGraphShortcut({ key }, { ...graph, scope: 'node' }), action);
  }
  for (const key of ['x', 'a', 'ن', 'ف']) assert.equal(resolveGraphShortcut({ key }, { ...graph, scope: 'node' }), null);
  assert.equal(resolveGraphShortcut({ key: 'F2' }, { ...graph, scope: 'node' }), 'edit');
});

test('handled events, IME composition, modal layers, and ambiguous modifiers are ignored', () => {
  for (const guard of [{ defaultPrevented: true }, { isComposing: true }, { keyCode: 229 }, { altKey: true }, { ctrlKey: true, metaKey: true }, { ctrlKey: true, shiftKey: true }]) {
    assert.equal(resolveGraphShortcut({ key: 'Enter', ...guard }, graph), null);
  }
  assert.equal(resolveGraphShortcut({ key: 'Enter' }, { ...graph, blocked: true }), null);
  assert.equal(resolveGraphShortcut({ key: 'n', shiftKey: true }, graph), null);
  assert.equal(resolveGraphShortcut({ key: 'Delete', shiftKey: true }, graph), null);
});

test('held mutation and history keys cannot create a chain or delete multiple thoughts', () => {
  for (const event of [{ key: 'Enter' }, { key: 'Tab' }, { key: 'Delete' }, { key: 'Backspace' }, { key: 'n' }, { key: 't' }, { key: 'z', ctrlKey: true }, { key: 'a', ctrlKey: true }, { key: 'a', metaKey: true }]) {
    assert.equal(resolveGraphShortcut({ ...event, repeat: true }, graph), 'ignore');
  }
  assert.equal(resolveGraphShortcut({ key: 'ArrowRight', repeat: true }, graph), 'right');
  assert.equal(resolveGraphShortcut({ key: ' ', repeat: true }, graph), 'pan');
});

test('Space activates a focused thought but pans only the focused empty canvas', () => {
  assert.equal(resolveGraphShortcut({ key: ' ' }, { scope: 'canvas' }), 'pan');
  assert.equal(resolveGraphShortcut({ key: ' ' }, { scope: 'node', hasNode: true }), 'details');
  assert.equal(resolveGraphShortcut({ key: ' ' }, { scope: 'control' }), null);
});

test('edge focus keeps native connection activation and cannot create thoughts', () => {
  const edge = { scope: 'edge' as const, hasEdge: true };
  for (const key of ['Enter', 'Tab', ' ', 'n', 't', 'ArrowRight']) assert.equal(resolveGraphShortcut({ key }, edge), null);
  assert.equal(resolveGraphShortcut({ key: 'Delete' }, edge), 'delete');
  assert.equal(resolveGraphShortcut({ key: 'Escape' }, edge), 'clear');
  assert.equal(resolveGraphShortcut({ key: 'z', metaKey: true }, edge), 'undo');
});

test('undo and redo preserve standard platform modifier combinations on graph focus', () => {
  for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
    assert.equal(resolveGraphShortcut({ key: 'z', ...modifier }, graph), 'undo');
    assert.equal(resolveGraphShortcut({ key: 'Z', shiftKey: true, ...modifier }, graph), 'redo');
    assert.equal(resolveGraphShortcut({ key: 'y', ...modifier }, graph), 'redo');
    assert.equal(resolveGraphShortcut({ key: 'k', ...modifier }, graph), 'search');
  }
});

test('select-all belongs only to an unblocked focused graph and preserves editor/platform combinations', () => {
  for (const scope of ['canvas', 'node', 'edge'] satisfies GraphShortcutScope[]) {
    for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
      assert.equal(resolveGraphShortcut({ key: 'a', ...modifier }, { scope }), 'select-all');
      assert.equal(resolveGraphShortcut({ key: 'A', ...modifier }, { scope }), 'select-all');
      assert.equal(resolveGraphShortcut({ key: 'a', ...modifier, repeat: true }, { scope }), 'ignore');
      for (const guard of [{ shiftKey: true }, { altKey: true }, { isComposing: true }, { keyCode: 229 }, { defaultPrevented: true }]) {
        assert.equal(resolveGraphShortcut({ key: 'a', ...modifier, ...guard }, { scope }), null);
      }
      assert.equal(resolveGraphShortcut({ key: 'a', ...modifier }, { scope, blocked: true }), null);
    }
  }
  assert.equal(resolveGraphShortcut({ key: 'a' }, { scope: 'canvas' }), null);
  assert.equal(resolveGraphShortcut({ key: 'a', ctrlKey: true, metaKey: true }, { scope: 'canvas' }), null);
});
