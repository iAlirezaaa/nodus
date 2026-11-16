import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

function thought(id: string, title: string, text = '', boardId = 'root', name = '', url = ''): GraphNode {
  return { id, boardId, title, text, asset: name ? { name } : null, url } as GraphNode;
}

test('straight quotes require one contiguous phrase, not reordered keywords', () => {
  const nodes = [thought('split', 'Forest', 'Lighting'), thought('exact', 'Forest Lighting'), thought('reversed', 'Lighting Forest'), thought('note', 'Draft', 'Forest Lighting reference')];
  assert.deepEqual(searchThoughts(nodes, '"forest lighting"').visible.map(n => n.id), ['exact', 'note']);
  assert.deepEqual(searchThoughts(nodes, 'forest lighting').visible.map(n => n.id), ['exact', 'note', 'split', 'reversed']);
});

test('smart English quotation marks and Persian guillemets work with normalizations', () => {
  const nodes = [thought('fa', 'جنگل نور'), thought('split', 'جنگل', 'نور'), thought('en', 'Café Lumière')];
  assert.deepEqual(searchThoughts(nodes, '«جنگل نور»').visible.map(n => n.id), ['fa']);
  assert.deepEqual(searchThoughts(nodes, '“cafe lumiere”').visible.map(n => n.id), ['en']);
});

test('quoted phrases can match a full nested location but not unrelated fields', () => {
  const nodes = [thought('path', 'Camera', '', 'inner'), thought('mixed', 'Studio', 'Motion', 'other')];
  const paths = new Map([['inner', 'Root / Studio / Motion'], ['other', 'Root']]);
  assert.deepEqual(searchThoughts(nodes, '"Studio / Motion"', 70, 0, paths).visible.map(n=>n.id), ['path']);
  assert.deepEqual(searchThoughts(nodes, 'Studio Motion', 70, 0, paths).visible.map(n=>n.id), ['path', 'mixed']);
});

test('quoted phrases match filename, notes and URLs independently', () => {
  const nodes = [thought('file', 'File', '', 'root', 'Forest Lighting.MOV'), thought('note', 'Notes', 'Forest Lighting'), thought('link', 'Reference', '', 'root', '', 'https://example.org/research/forest-lighting'), thought('mixed','Forest','','root','lighting.MOV')];
  assert.deepEqual(searchThoughts(nodes, '"forest lighting"').visible.map(n=>n.id), ['file', 'note']);
  assert.deepEqual(searchThoughts(nodes, '"forest-lighting"').visible.map(n=>n.id), ['link']);
});

test('balanced quotes preserve capped page totals, stable order and original data', () => {
  const nodes = Array.from({length: 75},(_,i)=>thought(String(i),`Forest Lighting ${i}`));
  nodes.push(thought('split','Forest','Lighting'));
  const before = structuredClone(nodes);
  const first = searchThoughts(nodes,'"forest lighting"');
  const last = searchThoughts(nodes,'"forest lighting"',SEARCH_PAGE_SIZE,70);
  assert.deepEqual([first.total,first.offset,first.visible.length,last.total,last.offset,last.visible.length],[75,0,70,75,70,5]);
  assert.deepEqual([...first.visible,...last.visible].map(n=>n.id),nodes.slice(0,75).map(n=>n.id));
  assert.deepEqual(nodes,before);
});

test('unbalanced quotes are literal; explicit empty quotes do not browse private thoughts', () => {
  const nodes = [thought('literal','"Forest Lighting'),thought('plain','Forest Lighting')];
  assert.deepEqual(searchThoughts(nodes,'"forest lighting').visible.map(n=>n.id),['literal']);
  for (const query of ['""', '“”', '«»']) {
    assert.deepEqual(searchThoughts(nodes,query),{visible:[],total:0,offset:0});
  }
  assert.deepEqual(searchThoughts(nodes,' ').visible.map(n=>n.id),['literal','plain']);
});

test('copied low-double quotes find Russian nested locations without combining fields', () => {
  const nodes = [thought('path', 'Scene', '', 'child'), thought('split', 'Ёрема', 'сцена'), thought('exact', 'Ёрема сцена')];
  const paths = new Map([['child', 'Root / Проект Ёрема сцена']]);
  const oldNodes = structuredClone(nodes);
  assert.deepEqual(searchThoughts(nodes, '„Ерема сцена“', 70, 0, paths).visible.map(n => n.id), ['exact', 'path']);
  assert.deepEqual(searchThoughts(nodes, '„Ерема сцена”', 70, 0, paths).visible.map(n => n.id), ['exact', 'path']);
  assert.deepEqual(searchThoughts(nodes, '„Ерема кадр“', 70, 0, paths).visible.map(n => n.id), []);
  assert.deepEqual(nodes, oldNodes);
});

test('low-double quoted search retains complete counts and deep pages', () => {
  const nodes = Array.from({ length: 151 }, (_, index) => thought(String(index), 'Ёрема сцена ' + index));
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, '„Ерема сцена“', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(page => [page.total, page.offset, page.visible.length]), [[151, 0, 70], [151, 70, 70], [151, 140, 11]]);
  assert.deepEqual(pages.flatMap(page => page.visible.map(item => item.id)), nodes.map(item => item.id));
});
