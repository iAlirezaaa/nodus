import test from 'node:test';
import assert from 'node:assert/strict';
import { searchThoughts, SEARCH_PAGE_SIZE } from '../lib/thought-search.ts';
import type { GraphNode, NodeAnnotation } from '../lib/types.ts';

const annotation = (quote: string, body: string): NodeAnnotation => ({
  id: 'a', field: 'text', start: 0, end: quote.length, quote, body,
  color: 'blue', resolved: false, createdAt: '2026-11-14T00:00:00Z', updatedAt: '2026-11-14T00:00:00Z',
});
const node = (id: string, title: string, text = '', annotations: NodeAnnotation[] = []): GraphNode =>
  ({ id, boardId: 'root', title, text, asset: null, url: '', annotations }) as GraphNode;

test('unique annotation comment and original quote find their owning thought', () => {
  const nodes = [node('one', 'Untitled', '', [annotation('frame 10', 'Fix camera spacing for scene 14')]), node('two', 'Other')];
  assert.deepEqual(searchThoughts(nodes, 'camera spacing').visible.map(n => n.id), ['one']);
  assert.deepEqual(searchThoughts(nodes, 'frame 10').visible.map(n => n.id), ['one']);
});

test('annotation search uses Persian/Arabic variants but does not rewrite source', () => {
  const nodes = [node('one', 'Review', '', [annotation('قسمت اول', 'إصلاح نورپردازی')])];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'اصلاح').visible.map(n => n.id), ['one']);
  assert.deepEqual(searchThoughts(nodes, 'نورپردازی').visible.map(n => n.id), ['one']);
  assert.equal(JSON.stringify(nodes), before);
});

test('balanced quoted phrase remains local to one annotation field', () => {
  const nodes = [node('yes', 'Reference', '', [annotation('فصل', 'نور نرم و آبی')]),
    node('no', 'Reference', '', [annotation('نور نرم', 'و آبی')]),
    node('split', 'Reference', '', [annotation('نور نرم', ''), annotation('و آبی', '')])];
  assert.deepEqual(searchThoughts(nodes, '«نور نرم و آبی»').visible.map(n => n.id), ['yes']);
});

test('existing title and note relevance outranks annotation-only match', () => {
  const nodes = [node('comment', 'Other', '', [annotation('a', 'lighting pass')]), node('note', 'Other', 'lighting pass'), node('title', 'lighting pass')];
  assert.deepEqual(searchThoughts(nodes, 'lighting pass').visible.map(n => n.id), ['title', 'note', 'comment']);
});

test('151 comment matches maintain exact totals, 70/70/11 pages and stable IDs', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => node(String(i), 'Scene '+i, '', [annotation('frame '+i, 'Needs revised lighting')])) ;
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'revised lighting', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total,p.offset,p.visible.length]), [[151,0,70],[151,70,70],[151,140,11]]);
  assert.deepEqual(pages.flatMap(p=>p.visible.map(n=>n.id)), nodes.map(n=>n.id));
});
