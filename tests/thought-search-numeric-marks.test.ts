import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode } from '../lib/types.ts';

function thought(id: string, title: string, options: {
  boardId?: string; text?: string; assetName?: string; url?: string;
} = {}): GraphNode {
  return {
    id, title, boardId: options.boardId ?? 'root',
    text: options.text ?? '', url: options.url ?? '',
    asset: options.assetName ? { name: options.assetName } : null,
  } as GraphNode;
}

test('Arabic decimal mark and ASCII period match in both query directions', () => {
  const a = thought('a', 'شات ۱۲٫۵');
  const b = thought('b', 'Shot 12.5');
  assert.deepEqual(searchThoughts([a], '12.5').visible.map(n => n.id), ['a']);
  assert.deepEqual(searchThoughts([b], '۱۲٫۵').visible.map(n => n.id), ['b']);
  assert.equal(a.title, 'شات ۱۲٫۵');
});

test('Arabic grouping separator and ASCII comma match filenames and notes', () => {
  const a = thought('a', 'Reference', { assetName: 'Texture_۱٬۲۵۰.png' });
  const b = thought('b', 'Draft', { text: 'Budget: 1,250' });
  assert.deepEqual(searchThoughts([a], '1,250').visible.map(n => n.id), ['a']);
  assert.deepEqual(searchThoughts([b], '۱٬۲۵۰').visible.map(n => n.id), ['b']);
});

test('Arabic percent sign matches ASCII percentage, including a project location', () => {
  const a = thought('a', 'Progress ۵۰٪');
  const b = thought('b', 'Untitled', { boardId: 'chart' });
  const paths = new Map([['chart', 'Campaign / Progress 50%']]);
  assert.deepEqual(searchThoughts([a], '50%').visible.map(n => n.id), ['a']);
  assert.deepEqual(searchThoughts([b], '۵۰٪', SEARCH_PAGE_SIZE, 0, paths).visible.map(n => n.id), ['b']);
  assert.equal(paths.get('chart'), 'Campaign / Progress 50%');
});

test('a quoted mixed-script number stays a single-field phrase', () => {
  const match = thought('match', 'Ideas', { text: 'بررسی شماره ۱۲٫۵٪ نهایی' });
  const split = thought('split', 'شماره 12.5%', { text: 'نهایی' });
  assert.deepEqual(searchThoughts([match, split], '«شماره 12.5% نهایی»').visible.map(n => n.id), ['match']);
});

test('quoted numeric punctuation remains distinct: decimal is not a grouping separator', () => {
  assert.equal(searchThoughts([thought('a', '1,500')], '«۱٫۵۰۰»').total, 0);
  assert.equal(searchThoughts([thought('b', '1.500')], '«۱٬۵۰۰»').total, 0);
});

test('151 numeric results retain exact count and 70/70/11 bounded paging', () => {
  const nodes = Array.from({ length: 151 }, (_, i) => thought(String(i), 'Frame ۳٫۱۴ / ' + i));
  const pages = [0, 70, 140].map(offset => searchThoughts(nodes, '3.14', SEARCH_PAGE_SIZE, offset));
  assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [
    [151, 0, 70], [151, 70, 70], [151, 140, 11],
  ]);
  assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
  assert.equal(nodes[0].title, 'Frame ۳٫۱۴ / 0');
});
