import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuotedSearchPhrase } from '../lib/search-phrase.ts';

test('plain Persian guillemet phrase', () => {
  assert.equal(parseQuotedSearchPhrase('  «سلام دنیا»  '), 'سلام دنیا');
});
test('Persian phrase survives copied LRM and RLM outside punctuation', () => {
  assert.equal(parseQuotedSearchPhrase('\u200F«سلام دنیا»\u200E'), 'سلام دنیا');
});
test('direction isolates and surrounding whitespace do not break quotation', () => {
  assert.equal(parseQuotedSearchPhrase('\u2067  «فصل اول» \u2069'), 'فصل اول');
});
test('Arabic letter mark and PDF word-joiner outside straight quotes', () => {
  assert.equal(parseQuotedSearchPhrase('\u061C\u2060"Story Board"\u200B'), 'Story Board');
});
test('curly English quotation and directional PDF embedding', () => {
  assert.equal(parseQuotedSearchPhrase('\u202B “the red fox” \u202C'), 'the red fox');
});
test('inside quoted text keeps its original zero-width and bidi characters', () => {
  assert.equal(parseQuotedSearchPhrase('\u200F«کتاب\u200Cها\u200F»\u200E'), 'کتاب\u200Cها\u200F');
});
test('ZWJ emoji inside a phrase is never stripped', () => {
  assert.equal(parseQuotedSearchPhrase('\u200E"👩‍💻 working"\u200F'), '👩‍💻 working');
});
test('unbalanced quotation never requests exact phrase search', () => {
  assert.equal(parseQuotedSearchPhrase('\u200F«سلام دنیا\u200E'), null);
});
test('embedded quote is not interpreted as a boundary', () => {
  assert.equal(parseQuotedSearchPhrase('a «سلام دنیا» b'), null);
});
test('blank and formatting-only input are not quoted', () => {
  assert.equal(parseQuotedSearchPhrase('  \u200F\u200E\u2067  '), null);
});
test('empty balanced phrases stay empty rather than browsing all nodes', () => {
  assert.equal(parseQuotedSearchPhrase('\u200F«»\u200E'), '');
});
test('do not erase internal punctuation, case or separate words', () => {
  assert.equal(parseQuotedSearchPhrase('\u200F"A, B!"\u200E'), 'A, B!');
});
