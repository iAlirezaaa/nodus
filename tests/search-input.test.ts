import test from 'node:test';
import assert from 'node:assert/strict';
import { firstSearchResultForEnter, shouldActivateSearchResult, visibleSearchResultsForQuery } from '../lib/search-input.ts';

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

for (const [name, modifiers] of [
  ['Ctrl', { ctrlKey: true }],
  ['Alt', { altKey: true }],
  ['Meta', { metaKey: true }],
  ['Shift', { shiftKey: true }],
] as const) {
  test(name + '+Enter must not activate a search result', () => {
    assert.equal(shouldActivateSearchResult('Enter', false, 13, modifiers), false);
  });
}

test('pending deferred search never exposes results from a previous query to pointer activation', () => {
  const stale = [{id: 'old-project'}, {id: 'old-thought'}];
  const hidden = visibleSearchResultsForQuery('پروژهٔ جدید', 'پروژهٔ قدیم', stale);
  assert.deepEqual(hidden, []);
  assert.notEqual(hidden, stale);
  assert.equal(stale.length, 2, 'source results remain unchanged');
});

test('settled search keeps current page identity and ordering, including empty results', () => {
  const page = [{id: 'current-first'}, {id: 'current-last'}];
  assert.equal(visibleSearchResultsForQuery('نور', 'نور', page), page);
  const empty: {id: string}[] = [];
  assert.equal(visibleSearchResultsForQuery('', '', empty), empty);
});
