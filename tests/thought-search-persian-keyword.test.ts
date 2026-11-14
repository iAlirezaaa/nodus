import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';
const item = (id: string, title: string, text = '', boardId = 'root'): GraphNode => ({ id, title, text, boardId, asset: null }) as GraphNode;

test('multi-keyword Persian joined and spaced terms match across title and note', () => {
  const nodes = [item('joined', 'کتاب های زندگی', 'forest'), item('absent', 'کتاب های زندگی', 'lake')];
  const original = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'کتاب‌های forest').visible.map(x => x.id), ['joined']);
  assert.equal(JSON.stringify(nodes), original);
});
test('Persian compound in project path can match a second keyword in title', () => {
  const nodes = [item('a', 'lighting', '', 'inside'), item('b', 'lighting', '', 'elsewhere')];
  const paths = new Map([['inside','پروژه های داخلی']]);
  assert.deepEqual(searchThoughts(nodes, 'پروژه‌های lighting', 70, 0, paths).visible.map(n => n.id), ['a']);
});
test('hyphen-fragmented Latin words are not fabricated across fields', () => {
  const nodes = [item('bad', 'F-oo', 'B-ar'), item('good', 'foo', 'bar')];
  assert.deepEqual(searchThoughts(nodes, 'foo bar').visible.map(n => n.id), ['good']);
});
test('pagination and stable relevance remain accurate for mixed Persian keywords', () => {
  const nodes = Array.from({length: 151}, (_, i) => item(String(i), 'کتاب های', 'forest'));
  nodes.push(item('nonmatch', 'کتاب های', 'river'));
  const before=JSON.stringify(nodes);
  const pages=[0,70,140].map(offset => searchThoughts(nodes, 'کتاب‌های forest', 70, offset));
  assert.deepEqual(pages.map(p=>[p.total,p.offset,p.visible.length]), [[151,0,70],[151,70,70],[151,140,11]]);
  assert.equal(new Set(pages.flatMap(p=>p.visible.map(n=>n.id))).size,151);
  assert.equal(JSON.stringify(nodes),before);
});
test('missing paths and unmatched compound tokens do not invent results', () => {
  const nodes=[item('a','lighting','','inside'),item('b','کتاب های','forest')];
  assert.deepEqual(searchThoughts(nodes,'پروژه‌های lighting').visible,[]);
  assert.deepEqual(searchThoughts(nodes,'کتاب‌های missing').visible,[]);
  assert.deepEqual(searchThoughts(nodes,'کتاب‌های forest').visible.map(n=>n.id),['b']);
});
