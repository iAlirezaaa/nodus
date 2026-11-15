import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import { searchResultPreview } from '../lib/search-result-preview.ts';
import type { GraphNode } from '../lib/types.ts';

const node = (id: string, title: string, text = '', boardId = 'root', filename = '', url = ''): GraphNode =>
  ({ id, title, text, boardId, url, annotations: [], asset: filename ? { name: filename } : null }) as GraphNode;

test('unquoted pasted whitespace ranks exact title before prefix and split fields', () => {
  const nodes = [
    node('split', 'Camera', 'Lens'),
    node('prefix', 'Camera Lens in Motion'),
    node('exact', 'Camera Lens'),
    node('note', 'Draft', 'Camera\nLens'),
  ];
  for (const query of ['camera   lens', 'camera\t\nlens', 'camera\u00A0lens']) {
    const page = searchThoughts(nodes, query);
    assert.deepEqual(page.visible.map(n => n.id), ['exact', 'prefix', 'note', 'split'], query);
    assert.equal(page.total, 4);
    assert.deepEqual(searchResultPreview(nodes[2], query), {kind: 'title', text: ''});
    assert.equal(searchResultPreview(nodes[3], query)?.kind, 'note');
  }
});

test('nested project path and attachment name match across whitespace variants', () => {
  const paths = new Map([['inside', 'Root / طبقه    دوم'], ['root', 'Root']]);
  const deep = node('deep', 'نورپردازی', '', 'inside');
  const attachment = node('asset', 'File reference', '', 'root', 'Production\nPlan.pdf');
  assert.deepEqual(searchThoughts([deep, attachment], 'طبقه دوم', 70, 0, paths).visible.map(n => n.id), ['deep']);
  assert.deepEqual(searchResultPreview(deep, 'طبقه\tدوم', paths.get('inside')), {kind: 'project', text: ''});
  assert.deepEqual(searchThoughts([deep, attachment], 'production   plan').visible.map(n => n.id), ['asset']);
  assert.equal(searchResultPreview(attachment, 'production   plan')?.kind, 'file');
});

test('balanced phrase still cannot join separate fields despite whitespace folding', () => {
  const nodes = [node('split', 'Camera', 'Lens'), node('note', 'Draft', 'Camera\nLens')];
  assert.deepEqual(searchThoughts(nodes, '"camera   lens"').visible.map(n => n.id), ['note']);
  assert.equal(searchResultPreview(nodes[0], '"camera   lens"')?.kind === 'multiple', false);
});

test('70/70/11 pagination and stored strings stay unchanged', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => node(String(i), 'نور\t  بوم'));
  const before = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'نور بوم', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
  assert.equal(JSON.stringify(nodes), before);
});

test('URL-only explanation keeps credentials and signed query private', () => {
  const link = node('link', 'Reference', '', 'root', '', 'https://example.com/camera%20lens?access_token=PRIVATE_VALUE#draft');
  const found = searchThoughts([link], 'camera   lens');
  assert.equal(found.total, 1);
  const preview = searchResultPreview(link, 'camera   lens');
  assert.deepEqual(preview, {kind: 'link', text: 'example.com'});
  assert.ok(!preview?.text.includes('PRIVATE_VALUE'));
});
