import test from 'node:test';
import assert from 'node:assert/strict';
import { firstSearchResultForEnter, shouldActivateSearchResult } from '../lib/search-input.ts';

test('Enter activates a result from the search field; Tab and other keys stay native', () => {
  assert.equal(shouldActivateSearchResult('Enter', false, 13), true);
  for (const key of ['Tab', 'Escape', 'ArrowDown', ' ']) {
    assert.equal(shouldActivateSearchResult(key, false, 0), false);
  }
});

test('IME confirmation never navigates, including legacy keyCode 229', () => {
  assert.equal(shouldActivateSearchResult('Enter', true, 13), false);
  assert.equal(shouldActivateSearchResult('Enter', false, 229), false);
  assert.equal(shouldActivateSearchResult('Enter', true, 229), false);
});

test('a settled query selects the first result on the visible page without rescanning', () => {
  const visible = [{id: 'page2-first'}, {id: 'page2-second'}];
  const actual = firstSearchResultForEnter('سلام', 'سلام', visible, () => { throw new Error('unnecessary search'); });
  assert.equal(actual?.id, 'page2-first');
});

test('a pending deferred query uses the latest typed query, never the stale visible result', () => {
  const previous = [{id: 'wrong-previous-result'}];
  const calls: string[] = [];
  const current = firstSearchResultForEnter('کتاب', 'جنگل', previous, query => {
    calls.push(query);
    return query === 'کتاب' ? [{id: 'correct-result'}] : [];
  });
  assert.equal(current?.id, 'correct-result');
  assert.deepEqual(calls, ['کتاب']);
  assert.equal(previous[0].id, 'wrong-previous-result');
});

test('no matching results safely yields no activation', () => {
  assert.equal(firstSearchResultForEnter('none', 'none', [], () => { throw new Error('no scan'); }), undefined);
  assert.equal(firstSearchResultForEnter('none', 'previous', [{id: 'stale'}], () => []), undefined);
});
