import test from 'node:test';
import assert from 'node:assert/strict';
import { searchKeywords } from '../lib/search-keywords.ts';

test('individually quoted keywords from mixed editors become searchable', () => {
  assert.deepEqual(searchKeywords("'forest' 'lighting'"), ['forest', 'lighting']);
  assert.deepEqual(searchKeywords("‘forest' 'lighting’"), ['forest', 'lighting']);
  assert.deepEqual(searchKeywords('“forest” “lighting”'), ['forest', 'lighting']);
  assert.deepEqual(searchKeywords('«فصل»، «دوم»'), ['فصل', 'دوم']);
  assert.deepEqual(searchKeywords('‘فصل’ ‘دوم’'), ['فصل', 'دوم']);
});

test('apostrophes within words are not removed', () => {
  assert.deepEqual(searchKeywords("don't l'atelier I’m"), ["don't", "l'atelier", 'I’m']);
  assert.deepEqual(searchKeywords("'don't' 'l'atelier'"), ["don't", "l'atelier"]);
});

test('ordinary queries, copied separators and literal direct terms remain unchanged', () => {
  assert.deepEqual(searchKeywords('forest, lighting؛ نور'), ['forest', 'lighting', 'نور']);
  assert.deepEqual(searchKeywords('forest lighting'), ['forest', 'lighting']);
  assert.deepEqual(searchKeywords(''), []);
  assert.deepEqual(searchKeywords('  ، ؛ ,  '), []);
});

test('151 outcomes still form honest 70/70/11 pages via ordered keyword membership', () => {
  const nodes = Array.from({ length: 151 }, (_, id) => ({ id, title: 'forest camera lighting scene ' + id }));
  const snapshot = JSON.stringify(nodes);
  const prior = "‘forest' 'lighting’".split(/[\s,;،؛]+/u).filter(Boolean);
  assert.equal(nodes.filter(n => prior.every(k => n.title.includes(k))).length, 0,
    'old tokenizer misses valid terms because quote punctuation is part of tokens');
  const next = searchKeywords("‘forest' 'lighting’");
  const matched = nodes.filter(n => next.every(k => n.title.includes(k)));
  assert.equal(matched.length, 151);
  assert.deepEqual([0, 70, 140].map(offset => matched.slice(offset, offset + 70).length), [70, 70, 11]);
  assert.equal(JSON.stringify(nodes), snapshot);
});
