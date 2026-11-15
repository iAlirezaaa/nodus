import test from 'node:test';
import assert from 'node:assert/strict';
import { activateSearchResult } from '../lib/search-input.ts';

const target = Object.freeze({ id: 'thought-fa', boardId: 'nested-fa', title: 'پلان جدید' });

test('declined navigation preserves the dialog and previous selection', () => {
  const calls: string[] = [];
  const allowed = activateSearchResult(target,
    item => { calls.push('navigate:' + item.boardId); return false; },
    () => calls.push('select'),
    () => calls.push('close'),
    () => calls.push('reveal'));
  assert.equal(allowed, false);
  assert.deepEqual(calls, ['navigate:nested-fa']);
});

test('successful nested-board navigation selects, closes and reveals in order', () => {
  const calls: string[] = [];
  const allowed = activateSearchResult(target,
    item => { calls.push('navigate:' + item.boardId); return true; },
    item => calls.push('select:' + item.id),
    () => calls.push('close'),
    item => calls.push('reveal:' + item.id));
  assert.equal(allowed, true);
  assert.deepEqual(calls, ['navigate:nested-fa', 'select:thought-fa', 'close', 'reveal:thought-fa']);
});

test('a thrown draft-commit failure does not consume result selection', () => {
  const calls: string[] = [];
  assert.throws(() => activateSearchResult(target,
    () => { calls.push('navigate'); throw new Error('cannot finish title'); },
    () => calls.push('select'), () => calls.push('close'), () => calls.push('reveal')),
  /cannot finish title/);
  assert.deepEqual(calls, ['navigate']);
});

test('works with same-board navigation without replacing target identity', () => {
  const selected: unknown[] = [];
  const result = activateSearchResult(target, value => value.boardId === 'nested-fa',
    value => selected.push(value), () => {}, () => {});
  assert.equal(result, true);
  assert.strictEqual(selected[0], target);
});
