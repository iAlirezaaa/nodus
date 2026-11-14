import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts, SEARCH_PAGE_SIZE } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

function link(id: string, url: string, title = 'Resource', text = ''): GraphNode {
  return { id, boardId: 'root', kind: 'link', title, text, url, asset: null } as GraphNode;
}

test('quoted English phrase finds + encoded spaces in a saved query value', () => {
  assert.deepEqual(searchThoughts([link('query', 'https://example.com/find?q=shot+list')], '"shot list"').visible.map(n => n.id), ['query']);
});

test('Persian phrase finds form plus and percent-encoded query characters together', () => {
  const item = link('fa', 'https://example.com/search?q=%DA%A9%D8%AA%D8%A7%D8%A8+%D9%81%D8%A7%D8%B1%D8%B3%DB%8C');
  assert.deepEqual(searchThoughts([item], '«کتاب فارسی»').visible.map(n => n.id), ['fa']);
});

test('literal + in a URL path or fragment is not interpreted as a space', () => {
  const nodes = [link('path', 'https://example.com/shot+list'), link('fragment', 'https://example.com/doc#shot+list')];
  assert.equal(searchThoughts(nodes, '"shot list"').total, 0);
  assert.deepEqual(searchThoughts(nodes, 'shot+list').visible.map(n => n.id), ['path', 'fragment']);
});

test('malformed percent encoding falls back without throwing or hiding literal query content', () => {
  const item = link('bad', 'https://example.com/search?q=shot+list%E0%A4%A');
  assert.equal(searchThoughts([item], '"shot list"').total, 0);
  assert.equal(searchThoughts([item], '%E0').total, 1);
});

test('saved URL remains unchanged and ranks after title and note', () => {
  const item = link('url', 'https://example.com/search?q=shot+list');
  const nodes = [item, link('note', '', 'Reference', 'shot list'), link('title', '', 'shot list')];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, '"shot list"').visible.map(n => n.id), ['title', 'note', 'url']);
  assert.equal(JSON.stringify(nodes), before);
});

test('query plus encoding counts 151 hits with stable bounded pages', () => {
  const nodes = Array.from({ length: 151 }, (_, index) => link(String(index), 'https://example.com/search?q=shot+list'));
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, '"shot list"', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
});
