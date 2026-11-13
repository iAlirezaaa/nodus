import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts, SEARCH_PAGE_SIZE } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

function link(id: string, url: string, title = 'Resource', text = ''): GraphNode {
  return { id, boardId: 'root', kind: 'link', title, text, url, asset: null } as GraphNode;
}

test('a link is discoverable by its saved destination when title and note omit it', () => {
  const nodes = [link('one','https://vvd.world/features'), link('two','https://example.org/elsewhere')];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'vvd.world').visible.map(node => node.id), ['one']);
  assert.deepEqual(searchThoughts(nodes, 'FEATURES').visible.map(node => node.id), ['one']);
  assert.deepEqual(searchThoughts(nodes, 'irrelevant').visible, []);
  assert.equal(JSON.stringify(nodes), before);
});

test('title and note matches remain ahead of URL-only matches regardless of insertion order', () => {
  const nodes = [link('url', 'https://example.org/render'), link('title', 'https://none.org', 'Render'), link('note','https://none.org','Another','Render details')];
  assert.deepEqual(searchThoughts(nodes, 'render').visible.map(node => node.id), ['title','note','url']);
});

test('multiple keywords can combine saved link address with its title but not another thought', () => {
  const nodes = [link('both', 'https://forest.example/shot', 'Lighting'), link('url-only','https://forest.example/shot'), link('title-only','https://other.example/', 'Lighting')];
  assert.deepEqual(searchThoughts(nodes, 'forest lighting').visible.map(node => node.id), ['both']);
  assert.deepEqual(searchThoughts(nodes, 'forest missing').visible, []);
});

test('151 URL-only matches preserve honest totals and bounded pages with no duplicates', () => {
  const nodes = Array.from({length:151},(_,i)=>link(String(i),`https://example.org/assets/forest/${i}`));
  const pages = [0,70,140].map(offset=>searchThoughts(nodes,'forest',SEARCH_PAGE_SIZE,offset));
  assert.deepEqual(pages.map(p=>[p.total,p.offset,p.visible.length]), [[151,0,70],[151,70,70],[151,140,11]]);
  assert.deepEqual(pages.flatMap(p=>p.visible.map(n=>n.id)),nodes.map(n=>n.id));
});
