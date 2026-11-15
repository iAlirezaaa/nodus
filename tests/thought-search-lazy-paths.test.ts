import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

function thought(id: string, boardId: string, title = 'Other'): GraphNode {
  return { id, boardId, title, text: '', asset: null } as GraphNode;
}

test('search lazily normalizes only used project locations, even beyond page 70', () => {
  // Empty projects still have paths, but should not slow every keystroke in
  // the workspace search or require enumerating the whole path Map.
  const paths = new Map<string, string>([
    ...Array.from({ length: 3_000 }, (_, i): [string, string] =>
      ['unused-' + i, 'Deep inactive / '.repeat(30) + i]),
    ['active', 'Studio / کتاب‌های زندگی'],
  ]);
  const saved = paths.get('active');
  const originalGet = paths.get.bind(paths);
  let getCalls = 0;
  Object.defineProperty(paths, 'get', {
    value: (id: string) => { getCalls++; return originalGet(id); },
  });
  Object.defineProperty(paths, Symbol.iterator, {
    value: () => { throw new Error('Search must not enumerate every project path'); },
  });
  const nodes = Array.from({ length: 151 }, (_, i) => thought('n-' + i, 'active'));
  const originalNodes = JSON.stringify(nodes);
  const page = searchThoughts(nodes, 'كتابهاي', 70, 140, paths);
  assert.equal(page.total, 151);
  assert.equal(page.offset, 140);
  assert.deepEqual(page.visible.map(node => node.id),
    Array.from({ length: 11 }, (_, i) => 'n-' + (140 + i)));
  assert.equal(getCalls, 1, 'one normalized path per board across both ranking passes');
  assert.equal(paths.get('active'), saved);
  assert.equal(JSON.stringify(nodes), originalNodes, 'search remains read-only');
});

test('missing project paths stay cached without dropping other search matches', () => {
  const paths = new Map<string, string>([['unused', 'Unknown / Old']]);
  const originalGet = paths.get.bind(paths);
  let lookups = 0;
  Object.defineProperty(paths, 'get', {
    value: (id: string) => { lookups++; return originalGet(id); },
  });
  const nodes = Array.from({ length: 151 }, (_, i) => ({
    ...thought('note-' + i, 'no-path'),
    text: 'forest lighting notes',
  }));
  const page = searchThoughts(nodes, 'lighting', 70, 140, paths);
  assert.equal(page.total, 151);
  assert.equal(page.offset, 140);
  assert.equal(page.visible.length, 11);
  assert.equal(lookups, 1, 'one negative lookup per board across rescans');
});

test('title and path relevance remain stable with mixed Persian and Latin', () => {
  const paths = new Map([['nested', 'Studio / کتاب‌های زندگی / Café']]);
  const nodes = [
    thought('path', 'nested', 'Other'),
    thought('title', 'nested', 'cafe'),
    thought('other', 'missing', 'Other'),
  ];
  assert.deepEqual(searchThoughts(nodes, 'cafe', 70, 0, paths).visible.map(n => n.id),
    ['title', 'path']);
  assert.deepEqual(searchThoughts(nodes, 'كتابهاي', 70, 0, paths).visible.map(n => n.id),
    ['path', 'title']);
  assert.equal(searchThoughts(nodes, 'missing', 70, 0, paths).total, 0);
});
