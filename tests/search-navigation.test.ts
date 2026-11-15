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


test('removed search hit cannot navigate, change selection, close or reveal', () => {
  const calls: string[] = [];
  const accepted = activateSearchResult(target,
    () => { calls.push('navigate'); return true; },
    () => calls.push('select'),
    () => calls.push('close'),
    () => calls.push('reveal'),
    item => { calls.push('validate:' + item.id); return false; });
  assert.equal(accepted, false);
  assert.deepEqual(calls, ['validate:thought-fa']);
});

test('same ID on a different board must not activate an old search hit', () => {
  const latest = { boards: [{id:'other-board'}], nodes: [{id:target.id,boardId:'other-board'}] };
  const before = JSON.stringify(latest);
  const calls: string[] = [];
  const accepted = activateSearchResult(target,
    () => { calls.push('navigate'); return true; },
    () => calls.push('select'), () => calls.push('close'), () => calls.push('reveal'),
    item => latest.boards.some(b=>b.id===item.boardId)&&latest.nodes.some(n=>n.id===item.id&&n.boardId===item.boardId));
  assert.equal(accepted, false);
  assert.deepEqual(calls, []);
  assert.equal(JSON.stringify(latest), before, 'validation must be read-only');
});

test('valid current nested-board hit preserves activation order and identity', () => {
  const latest = {boards:[{id:'nested-fa'}],nodes:[{id:'thought-fa',boardId:'nested-fa'}]};
  const calls: string[] = [];
  let selected: unknown = null;
  const accepted = activateSearchResult(target,
    item => { calls.push('navigate:' + item.boardId); return true; },
    item => { selected = item; calls.push('select'); },
    () => calls.push('close'),
    () => calls.push('reveal'),
    item => { calls.push('validate'); return latest.boards.some(b=>b.id===item.boardId) && latest.nodes.some(n=>n.id===item.id&&n.boardId===item.boardId); });
  assert.equal(accepted, true);
  assert.strictEqual(selected, target);
  assert.deepEqual(calls, ['validate','navigate:nested-fa','select','close','reveal']);
});

test('missing containing board blocks an orphaned search result', () => {
  let navigated = false;
  const accepted = activateSearchResult(target,
    () => { navigated=true; return true; },
    () => assert.fail('no selection'), () => assert.fail('no dismissal'), () => assert.fail('no reveal'),
    item => [{id:item.id,boardId:item.boardId}].length > 0 && [].some((board:{id:string}) => board.id===item.boardId));
  assert.equal(accepted, false);
  assert.equal(navigated, false);
});

test('stale search result explains its failure once without navigating or closing', () => {
  const steps: string[] = [];
  const ok = activateSearchResult(target,
    () => { steps.push('navigate'); return true; },
    () => steps.push('select'),
    () => steps.push('close'),
    () => steps.push('reveal'),
    () => { steps.push('validate'); return false; },
    reason => steps.push('blocked:' + reason));
  assert.equal(ok, false);
  assert.deepEqual(steps, ['validate', 'blocked:stale']);
});

test('declined inline-title navigation explains its failure without consuming Search', () => {
  const steps: string[] = [];
  const ok = activateSearchResult(target,
    () => { steps.push('navigate'); return false; },
    () => steps.push('select'),
    () => steps.push('close'),
    () => steps.push('reveal'),
    () => { steps.push('validate'); return true; },
    reason => steps.push('blocked:' + reason));
  assert.equal(ok, false);
  assert.deepEqual(steps, ['validate', 'navigate', 'blocked:navigation']);
});

test('successful activation has no failure notice, preserving navigation order', () => {
  const steps: string[] = [];
  const ok = activateSearchResult(target,
    () => { steps.push('navigate'); return true; },
    () => steps.push('select'),
    () => steps.push('close'),
    () => steps.push('reveal'),
    () => { steps.push('validate'); return true; },
    reason => steps.push('blocked:' + reason));
  assert.equal(ok, true);
  assert.deepEqual(steps, ['validate', 'navigate', 'select', 'close', 'reveal']);
});

test('a thrown navigation error does not pretend to show a handled failure or close Search', () => {
  const steps: string[] = [];
  assert.throws(() => activateSearchResult(target,
    () => { steps.push('navigate'); throw new Error('draft could not save'); },
    () => steps.push('select'),
    () => steps.push('close'),
    () => steps.push('reveal'),
    undefined,
    reason => steps.push('blocked:' + reason)), /draft could not save/);
  assert.deepEqual(steps, ['navigate']);
});
