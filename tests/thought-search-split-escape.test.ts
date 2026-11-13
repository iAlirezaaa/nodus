import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

const link = (url: string): GraphNode =>
  ({ id: 'link', boardId: 'root', title: 'Link', text: '', url, asset: null } as GraphNode);

test('contiguous malformed UTF-8 escapes do not hide valid Persian characters', () => {
  const node = link('https://x.io/?q=%D8%B3%FF%D8%A7');
  for (const query of ['س', 'ا']) {
    assert.deepEqual(searchThoughts([node], query).visible.map(item => item.id), ['link']);
  }
  assert.equal(node.url, 'https://x.io/?q=%D8%B3%FF%D8%A7');
});

test('ASCII escapes on either side of bad bytes remain searchable', () => {
  const node = link('https://x.io/?q=%41%FF%42');
  assert.equal(searchThoughts([node], 'A').total, 1);
  assert.equal(searchThoughts([node], 'B').total, 1);
});

test('truncated UTF-8 does not swallow subsequent valid encoded ASCII', () => {
  const node = link('https://x.io/?q=%E2%82%41');
  assert.equal(searchThoughts([node], 'A').total, 1);
  assert.equal(node.url?.endsWith('%E2%82%41'), true);
});

test('valid emoji after and before malformed bytes remain indexed without changing originals', () => {
  const node = link('https://x.io/?q=%F0%9F%92%A1%FF%D8%A7');
  assert.equal(searchThoughts([node], '💡').total, 1);
  assert.equal(searchThoughts([node], 'ا').total, 1);
  assert.equal(node.url, 'https://x.io/?q=%F0%9F%92%A1%FF%D8%A7');
});

test('fully valid and separate percent runs keep existing behavior and normal paging', () => {
  const nodes = Array.from({ length: 73 }, (_, i) => ({
    ...link('https://x.io/?q=%D8%B3%D8%A7'),
    id: String(i),
  }));
  const first = searchThoughts(nodes, 'سا');
  const next = searchThoughts(nodes, 'سا', 70, 70);
  assert.deepEqual([first.total, first.visible.length, next.visible.length, next.offset], [73, 70, 3, 70]);
  assert.equal(searchThoughts([link('https://x.io/?q=%FF')], 'سا').total, 0);
});
