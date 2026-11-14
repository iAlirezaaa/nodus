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
