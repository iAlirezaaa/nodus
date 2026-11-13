import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts, SEARCH_PAGE_SIZE } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

function thought(id: string, title: string, text = '', name = '', url = ''): GraphNode {
  return { id, boardId: 'root', title, text, asset: name ? { name } : null, url } as GraphNode;
}

test('comma-separated English terms find different fields regardless of spacing', () => {
  const nodes = [thought('one', 'Forest', 'Soft lighting'), thought('two', 'Forest', 'Unrelated')];
  assert.deepEqual(searchThoughts(nodes, 'forest,lighting').visible.map(n => n.id), ['one']);
  assert.deepEqual(searchThoughts(nodes, 'forest, lighting').visible.map(n => n.id), ['one']);
});

test('Persian comma and semicolon separate keywords across title and notes', () => {
  const nodes = [thought('one', 'جنگل', 'نور سینمایی'), thought('two', 'جنگل', 'بدون روشنایی')];
  assert.deepEqual(searchThoughts(nodes, 'جنگل، نور').visible.map(n => n.id), ['one']);
  assert.deepEqual(searchThoughts(nodes, 'جنگل؛نور').visible.map(n => n.id), ['one']);
});

test('punctuation terms span filename and saved link while original data remains unchanged', () => {
  const nodes = [thought('one', 'Link', '', 'Camera.MOV', 'https://example.com/project')];
  const before = structuredClone(nodes);
  assert.deepEqual(searchThoughts(nodes, 'camera;example.com').visible.map(n => n.id), ['one']);
  assert.deepEqual(nodes, before);
});

test('literal punctuation title match outranks unordered token matches', () => {
  const nodes = [thought('fallback', 'Forest', 'Lighting'), thought('exact', 'Forest,Lighting')];
  assert.deepEqual(searchThoughts(nodes, 'forest,lighting').visible.map(n => n.id), ['exact', 'fallback']);
});

test('comma keyword pagination reports all results and mounts only a bounded page', () => {
  const nodes = [...Array.from({ length: 75 }, (_, i) => thought(String(i), 'Forest', 'Lighting')), thought('miss', 'Forest', 'Rain')];
  const first = searchThoughts(nodes, 'forest, lighting');
  const second = searchThoughts(nodes, 'forest, lighting', SEARCH_PAGE_SIZE, 70);
  assert.equal(first.total, 75);
  assert.equal(first.visible.length, 70);
  assert.equal(second.total, 75);
  assert.equal(second.offset, 70);
  assert.deepEqual(second.visible.map(n => n.id), ['70', '71', '72', '73', '74']);
});
