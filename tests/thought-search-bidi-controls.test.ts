import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

function thought(id: string, title: string, text = '', boardId = 'root', filename = '', url = ''): GraphNode {
  return { id, title, text, boardId, asset: filename ? { name: filename } : null, url } as GraphNode;
}

test('direction-only marks in copied Persian titles and queries cannot hide an exact idea', () => {
  const nodes = [thought('fa', 'سلا\u200Fم'), thought('other', 'درود')];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'سلام').visible.map(n => n.id), ['fa']);
  assert.deepEqual(searchThoughts([thought('fa', 'سلام')], '\u200Eسلام').visible.map(n => n.id), ['fa']);
  assert.deepEqual(searchThoughts([thought('fa', 'پرو\u061Cژه')], 'پروژه').visible.map(n => n.id), ['fa']);
  assert.equal(JSON.stringify(nodes), before);
});

test('quoted note phrases ignore directional isolates but remain field-local', () => {
  const nodes = [
    thought('one', 'Draft', 'Forest\u2068 Lighting\u2069'),
    thought('split', 'Forest', 'Lighting'),
    thought('reverse', 'Lighting Forest'),
  ];
  assert.deepEqual(searchThoughts(nodes, '"forest lighting"').visible.map(n => n.id), ['one']);
});

test('directional marks copied into asset filenames remain searchable without changing files', () => {
  const nodes = [thought('file', 'Reference', '', 'root', 'Final\u200F_Frame.png')];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, 'final_frame').visible.map(n => n.id), ['file']);
  assert.equal(JSON.stringify(nodes), before);
});

test('quoted full nested project path ignores text-direction embedding marks', () => {
  const nodes = [thought('a', 'Camera', '', 'inner'), thought('b', 'Camera', '', 'other')];
  const paths = new Map([['inner', 'Studio\u202B / Episode\u202C'], ['other', 'Another project']]);
  const before = JSON.stringify([...paths]);
  assert.deepEqual(searchThoughts(nodes, '"Studio / Episode"', 70, 0, paths).visible.map(n => n.id), ['a']);
  assert.equal(JSON.stringify([...paths]), before);
});

test('saved link URL query matches decoded phrase with embedded RLM without rewriting URL', () => {
  const nodes = [thought('link', 'Reference', '', 'root', '', 'https://example.org/?q=shot\u200F+list')];
  const before = JSON.stringify(nodes);
  assert.deepEqual(searchThoughts(nodes, '"shot list"').visible.map(n => n.id), ['link']);
  assert.equal(JSON.stringify(nodes), before);
});

test('invisible in-word marks still produce honest 70/70/11 totals with stable ranking', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'I\u200Edea ' + i));
  const before = JSON.stringify(nodes);
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, 'idea', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [[151,0,70],[151,70,70],[151,140,11]]);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
  assert.equal(JSON.stringify(nodes), before);
});

test('normal Persian/English text and quoted boundaries keep existing behavior', () => {
  const nodes = [thought('a', 'کتاب‌های ۱۲۳', 'Forest'), thought('b','Forest', 'Lighting'), thought('c','Forest Lighting')];
  assert.deepEqual(searchThoughts(nodes, 'كتابهاي 123').visible.map(n => n.id), ['a']);
  assert.deepEqual(searchThoughts(nodes, '"forest lighting"').visible.map(n => n.id), ['c']);
});
