import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

function thought(id: string, title: string, text = '', assetName?: string, boardId = 'root'): GraphNode {
  return { id, boardId, title, text, asset: assetName ? { name: assetName } : null } as GraphNode;
}

test('all eight search tiers preserve relevance before insertion order', () => {
  const paths = new Map([['root', 'Studio'], ['nested', 'Studio / forest lighting']]);
  const nodes = [
    thought('notes', 'Other', 'forest lighting notes'),
    thought('unordered', 'Lighting in the forest'),
    thought('path', 'Other', '', undefined, 'nested'),
    thought('asset', 'Other', '', 'forest lighting.PDF'),
    thought('cross-field', 'Forest', 'Lighting'),
    thought('contains', 'The forest lighting exercise'),
    thought('prefix', 'forest lighting basics'),
    thought('exact', 'forest lighting'),
  ];
  const before = JSON.stringify(nodes);
  const result = searchThoughts(nodes, 'forest lighting', SEARCH_PAGE_SIZE, 0, paths);
  assert.equal(result.total, 8);
  assert.deepEqual(result.visible.map(node => node.id),
    ['exact', 'prefix', 'contains', 'path', 'asset', 'notes', 'cross-field', 'unordered']);
  assert.equal(JSON.stringify(nodes), before);
});

test('151 note matches plus an exact title retain stable 70-item pages', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'Other', 'Finding a note'));
  nodes.push(thought('exact', 'finding'));
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'finding', 70, offset));
  assert.deepEqual(pages.map(page => page.visible.length), [70, 70, 12]);
  assert.ok(pages.every(page => page.total === 152));
  assert.deepEqual(pages.flatMap(page => page.visible.map(node => node.id)),
    ['exact', ...Array.from({ length: 151 }, (_, i) => String(i))]);
});

test('mixed Persian spacing, Latin accents and deep path reuse never mutate inputs', () => {
  const paths = new Map([['nested', 'استودیو / کتاب های / Café']]);
  const node = thought('n', 'پروژه های زندگی', 'Résumé from the forest', 'Storyboard.PDF', 'nested');
  const frozen = JSON.stringify(node);
  assert.equal(searchThoughts([node], 'کتاب‌های resume', 70, 0, paths).total, 1);
  assert.equal(searchThoughts([node], 'cafe', 70, 0, paths).total, 1);
  assert.equal(searchThoughts([node], 'storyboardpdf', 70, 0, paths).total, 1);
  assert.equal(searchThoughts([node], 'missing', 70, 0, paths).total, 0);
  assert.equal(JSON.stringify(node), frozen);
  assert.equal(paths.get('nested'), 'استودیو / کتاب های / Café');
});


test('bounded ranking preserves exact mixed-tier totals and every page beyond 70', () => {
  // Deliberately insert low-ranked notes first to catch accidental truncation
  // before high-ranked matches are counted, including a nonzero page offset.
  const notes = Array.from({ length: 260 }, (_, i) => thought('note-' + i, 'Other', 'magic notes ' + i));
  const titles = Array.from({ length: 144 }, (_, i) => thought('prefix-' + i, 'magic starts ' + i));
  const files = Array.from({ length: 98 }, (_, i) => thought('file-' + i, 'Other', '', 'magic-file-' + i + '.pdf'));
  const exact = Array.from({ length: 126 }, (_, i) => thought('exact-' + i, 'magic'));
  const nodes = [...notes, ...titles, ...files, ...exact];
  const original = JSON.stringify(nodes);
  const expected = [...exact, ...titles, ...files, ...notes].map(node => node.id);
  const pageSize = SEARCH_PAGE_SIZE;
  const actual: string[] = [];
  for (let offset = 0; offset < expected.length; offset += pageSize) {
    const page = searchThoughts(nodes, 'magic', pageSize, offset);
    assert.equal(page.total, expected.length);
    assert.equal(page.offset, offset);
    assert.ok(page.visible.length <= pageSize);
    actual.push(...page.visible.map(node => node.id));
  }
  assert.deepEqual(actual, expected, 'every result stays reachable in the original relevance order');
  const stale = searchThoughts(nodes, 'magic', pageSize, 1_000_000);
  assert.equal(stale.total, expected.length);
  assert.equal(stale.offset, Math.floor((expected.length - 1) / pageSize) * pageSize);
  assert.deepEqual(stale.visible.map(node => node.id), expected.slice(stale.offset));
  const browse = searchThoughts(nodes, '', pageSize, pageSize);
  assert.equal(browse.total, nodes.length);
  assert.deepEqual(browse.visible.map(node => node.id), nodes.slice(pageSize, pageSize * 2).map(node => node.id));
  assert.deepEqual(searchThoughts(nodes, 'magic', 0, 200), { visible: [], total: expected.length, offset: 0 });
  assert.equal(JSON.stringify(nodes), original, 'search must not mutate or persist any graph data');
});
