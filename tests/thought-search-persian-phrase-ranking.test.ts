import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

const thought = (id: string, title: string, text = ''): GraphNode =>
  ({ id, title, text, boardId: 'root', asset: null, url: null }) as GraphNode;

test('equivalent exact Persian title outranks an earlier prefix and a notes hit', () => {
  const nodes = [
    thought('note', 'Other', 'کتاب‌های من'),
    thought('prefix', 'کتاب‌های من (تکمیلی)'),
    thought('exact', 'کتابهای من'),
  ];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, '«کتاب های من»').visible.map(n => n.id), ['exact', 'prefix', 'note']);
  assert.equal(JSON.stringify(nodes), before);
});

test('exact spaced, joined and ZWNJ variants tie by source order before prefixed results', () => {
  const nodes = [
    thought('prefix', 'کتاب‌های من (تکمیلی)'),
    thought('joined', 'کتابهای من'),
    thought('spaced', 'کتاب های من'),
    thought('zwnj', 'کتاب‌های من'),
    thought('contains', 'یادداشت کتاب‌های من و دیگران'),
  ];
  const ids = searchThoughts(nodes, '«کتاب های من»').visible.map(n => n.id);
  assert.deepEqual(ids, ['joined', 'spaced', 'zwnj', 'prefix', 'contains']);
});

test('Latin quoted matching and single-field Persian phrase boundaries remain strict', () => {
  const nodes = [
    thought('fields', 'کتاب', 'های من'),
    thought('reverse', 'film du coeur'),
    thought('latin', 'Cœur du film'),
    thought('punctuation', 'کتاب-های من'),
  ];
  assert.deepEqual(searchThoughts(nodes, '«کتاب های من»').visible, []);
  assert.deepEqual(searchThoughts(nodes, '"coeur du film"').visible.map(n => n.id), ['latin']);
  assert.deepEqual(searchThoughts(nodes, '"film du coeur"').visible.map(n => n.id), ['reverse']);
});

test('151 mixed exact and prefix hits paginate in relevance order without duplicates', () => {
  const nodes = Array.from({ length: 151 }, (_, i) =>
    thought(String(i), i < 76 ? 'کتاب‌های من (ادامه)' : 'کتابهای من'));
  const before = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, '«کتاب های من»', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  const expected = [...nodes.slice(76), ...nodes.slice(0, 76)].map(n => n.id);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), expected);
  assert.equal(JSON.stringify(nodes), before);
});

test('unquoted lookup retains its existing exact/prefix/contains sorting', () => {
  const nodes = [
    thought('contains', 'شروع یک برنامه مهم'),
    thought('prefix', 'برنامه ۲'),
    thought('exact', 'برنامه'),
  ];
  assert.deepEqual(searchThoughts(nodes, 'برنامه').visible.map(n => n.id), ['exact', 'prefix', 'contains']);
});
