import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPageOffsetFromInput } from '../lib/search-pagination.ts';

test('jump to a deep 70-result page with exact zero-based offset', () => {
  assert.equal(searchPageOffsetFromInput('1', 5011, 70), 0);
  assert.equal(searchPageOffsetFromInput('2', 5011, 70), 70);
  assert.equal(searchPageOffsetFromInput('۴۳', 5011, 70), 2940);
  assert.equal(searchPageOffsetFromInput('٧٢', 5011, 70), 4970);
  assert.equal(searchPageOffsetFromInput('72', 5011, 70), 4970);
});

test('clamp after result count changes and preserve the final partial page', () => {
  assert.equal(searchPageOffsetFromInput('99', 141, 70), 140);
  assert.equal(searchPageOffsetFromInput('99999999999999999999999999', 71, 70), 70);
  assert.equal(searchPageOffsetFromInput('0', 141, 70), 0);
  assert.equal(searchPageOffsetFromInput('۰۰۰۲', 71, 70), 70);
  assert.equal(searchPageOffsetFromInput('1', 1, 70), 0);
});

test('incomplete, noninteger or nonnumeric page input does not navigate', () => {
  for (const value of ['', '   ', '1.5', '-1', '۱e۳', '1/2', 'one', '۲ الف', '+3']) {
    assert.equal(searchPageOffsetFromInput(value, 500, 70), null, value);
  }
  assert.equal(searchPageOffsetFromInput('  ٣  ', 500, 70), 140);
});

test('no matches and impossible pagination limits never produce a page', () => {
  assert.equal(searchPageOffsetFromInput('1', 0, 70), null);
  assert.equal(searchPageOffsetFromInput('1', 10, 0), null);
  assert.equal(searchPageOffsetFromInput('1', Infinity, 70), null);
  assert.equal(searchPageOffsetFromInput('1', 90, NaN), null);
});
