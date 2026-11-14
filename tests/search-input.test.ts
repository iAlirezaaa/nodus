import test from 'node:test';
import assert from 'node:assert/strict';
import { firstSearchResultForEnter, shouldActivateSearchResult, visibleSearchResultsForQuery, searchOffsetCorrection } from '../lib/search-input.ts';

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

test('Enter with an untouched or visually blank Search field never opens an arbitrary thought', () => {
  const firstWorkspaceThought = [{ id: 'not-searched-for' }];
  for (const query of ['', ' \t ', '\uFEFF', '\u3000']) {
    assert.equal(firstSearchResultForEnter(query, query, firstWorkspaceThought, () => {
      throw new Error('blank Search should not scan the workspace on Enter');
    }), undefined, 'blank input ' + JSON.stringify(query) + ' must not navigate');
  }
});

test('clearing a search while deferred results lag never triggers a full-workspace Enter navigation', () => {
  const stale = [{ id: 'stale-other-project' }];
  const calls: string[] = [];
  for (const query of ['', ' ', '\uFEFF']) {
    const result = firstSearchResultForEnter(query, 'previous project', stale, current => {
      calls.push(current);
      return [{ id: 'first-unrelated-thought' }];
    });
    assert.equal(result, undefined, 'cleared input ' + JSON.stringify(query) + ' must not navigate');
  }
  assert.deepEqual(calls, [], 'clearing Search must not trigger a fallback scan on Enter');
  assert.equal(stale[0].id, 'stale-other-project');
});


test('a shrinking result set reconciles the requested page to the actual visible page', () => {
  assert.equal(searchOffsetCorrection(140, 70, false), 70, '151 results on page 3 shrink to 81 on page 2');
  assert.equal(searchOffsetCorrection(140, 0, false), 0, 'all matches removed returns to page 1');
  assert.equal(searchOffsetCorrection(70, 0, false), 0, 'zero-match state must stay on page 1');
});

test('a settled page never changes unless the actual page differs', () => {
  assert.equal(searchOffsetCorrection(0, 0, false), null);
  assert.equal(searchOffsetCorrection(70, 70, false), null);
  assert.equal(searchOffsetCorrection(140, 140, false), null);
});

test('pending IME or ordinary deferred typing does not restore stale page selection', () => {
  assert.equal(searchOffsetCorrection(140, 0, true), null);
  assert.equal(searchOffsetCorrection(70, 0, true), null);
});
