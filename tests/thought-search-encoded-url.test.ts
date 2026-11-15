import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

function link(id: string, url: string, title = 'Resource', text = ''): GraphNode {
  return { id, boardId: 'root', kind: 'link', title, text, url, asset: null } as GraphNode;
}
const encoded = 'https://example.com/shot%20list';
const persian = 'https://example.com/%DA%A9%D8%AA%D8%A7%D8%A8%20%D9%81%D8%A7%D8%B1%D8%B3%DB%8C';

test('quoted phrase finds decoded spaces in saved URL path', () => {
  assert.deepEqual(searchThoughts([link('a', encoded)], '"shot list"').visible.map(n => n.id), ['a']);
});
test('Persian quoted phrase finds Unicode percent-encoded URL path', () => {
  assert.deepEqual(searchThoughts([link('a', persian)], '«کتاب فارسی»').visible.map(n => n.id), ['a']);
});
test('literal percent escapes in saved links remain searchable', () => {
  assert.equal(searchThoughts([link('a', encoded)], '%20').total, 1);
});
test('malformed percent encoding never throws or hides raw text', () => {
  assert.equal(searchThoughts([link('a', 'https://example.com/%E0%A4%A')], '%E0').total, 1);
});
test('decoded URL matches follow exact title and note matches', () => {
  const nodes = [link('url', encoded), link('note', '', 'Notes', 'shot list'), link('exact', '', 'shot list')];
  assert.deepEqual(searchThoughts(nodes, 'shot list').visible.map(n => n.id), ['exact', 'note', 'url']);
});
test('cross-field keywords remain supported and source text is unchanged', () => {
  const item = link('a', encoded, 'Resource', 'story');
  const before = JSON.stringify(item);
  assert.equal(searchThoughts([item], 'shot list story').total, 1);
  assert.equal(JSON.stringify(item), before);
});
test('encoded destination phrases retain exact 151-hit totals and bounded stable paging', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => link(String(i), encoded));
  const before = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, '"shot list"', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(page => [page.total, page.offset, page.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(page => page.visible.map(n => n.id)), nodes.map(n => n.id));
  assert.equal(JSON.stringify(nodes), before);
});

test('a malformed query escape does not suppress a quoted phrase or rewrite the saved link', () => {
  const node = link('malformed', 'https://example.com/?q=blue+hour&invalid=%GG');
  const original = JSON.stringify(node);
  assert.deepEqual(searchThoughts([node], '"blue hour"').visible.map(n => n.id), ['malformed']);
  assert.equal(searchThoughts([node], '"blue hour"').total, 1);
  assert.equal(JSON.stringify(node), original);
});
