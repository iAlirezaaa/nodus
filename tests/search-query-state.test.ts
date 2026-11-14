import test from 'node:test';
import assert from 'node:assert/strict';
import { hasExplicitSearchQuery } from '../lib/search-query-state.ts';

test('empty whitespace input is not an explicit search', () => {
  for (const input of ['', ' ', '\t\n \r']) assert.equal(hasExplicitSearchQuery(input), false);
});

test('invisible pasted formatting input is still an explicit search', () => {
  for (const input of ['\uFEFF', ' \uFEFF ', '\u200B', '\u2060', '\u200F', '\u061C', '\u2066\u2069'])
    assert.equal(hasExplicitSearchQuery(input), true, JSON.stringify(input));
});

test('ordinary Persian, Latin, quoted and mixed-direction queries remain explicit', () => {
  for (const input of ['سلام', 'hello', '«»', ' «پروژه» ', '\u200Fتست\u200E', '12.5'])
    assert.equal(hasExplicitSearchQuery(input), true, JSON.stringify(input));
});
