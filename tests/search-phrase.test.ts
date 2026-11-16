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

test('single straight quotes delimit a copied English phrase', () => {
  assert.equal(parseQuotedSearchPhrase("'Forest Lighting'"), 'Forest Lighting');
});
test('single curly quotes delimit a copied Persian phrase with bidi marks', () => {
  assert.equal(parseQuotedSearchPhrase('\u2067‘فصل اول’\u2069'), 'فصل اول');
});
test('apostrophes inside the phrase stay intact', () => {
  assert.equal(parseQuotedSearchPhrase("'don't stop'"), "don't stop");
  assert.equal(parseQuotedSearchPhrase('‘I’m ready’'), 'I’m ready');
});
test('an unbalanced or mismatched single quote stays literal', () => {
  assert.equal(parseQuotedSearchPhrase("'Forest Lighting"), null);
  assert.equal(parseQuotedSearchPhrase('‘Forest Lighting\''), null);
  assert.equal(parseQuotedSearchPhrase("don't"), null);
});
test('single empty quotes remain a zero-match explicit phrase', () => {
  assert.equal(parseQuotedSearchPhrase("''"), '');
  assert.equal(parseQuotedSearchPhrase('‘’'), '');
});

test('copied boundary ZWNJ does not turn Persian guillemets into unordered keywords', () => {
  assert.equal(parseQuotedSearchPhrase('\u200C«سلام دنیا»'), 'سلام دنیا');
  assert.equal(parseQuotedSearchPhrase('«سلام دنیا»\u200C'), 'سلام دنیا');
  assert.equal(parseQuotedSearchPhrase('\u200D\u200F«سلام دنیا»\u200C'), 'سلام دنیا');
});
test('copied boundary joiner is ignored only outside English quotes', () => {
  assert.equal(parseQuotedSearchPhrase('\u200D"Forest Lighting"\u200C'), 'Forest Lighting');
  assert.equal(parseQuotedSearchPhrase('\u200C‘فصل اول’\u200D'), 'فصل اول');
});
test('an empty Persian quote wrapped in zero-width marks remains an explicit empty phrase', () => {
  assert.equal(parseQuotedSearchPhrase('\u200C«»\u200C'), '');
  assert.equal(parseQuotedSearchPhrase('\u200D""\u200D'), '');
});
test('joiners inside quotation remain verbatim while outside marks are removed', () => {
  assert.equal(parseQuotedSearchPhrase('\u200D«کتاب\u200Cها»\u200C'), 'کتاب\u200Cها');
  assert.equal(parseQuotedSearchPhrase('\u200C"👩‍💻 working"\u200D'), '👩‍💻 working');
});
test('an unbalanced ZWNJ-wrapped quote is still not an exact phrase', () => {
  assert.equal(parseQuotedSearchPhrase('\u200C«سلام دنیا\u200D'), null);
  assert.equal(parseQuotedSearchPhrase('\u200C«سلام دنیا» ادامه'), null);
});

test('PDF soft hyphen outside straight double quotes preserves exact phrase', () => {
  assert.equal(parseQuotedSearchPhrase('\u00AD"Director notes"\u00AD'), 'Director notes');
});
test('Persian guillemet with copied soft hyphen and direction isolate', () => {
  assert.equal(parseQuotedSearchPhrase('\u2067\u00AD«پروژه نور»\u00AD\u2069'), 'پروژه نور');
});
test('inside quoted soft hyphen is retained for comparison normalization', () => {
  assert.equal(parseQuotedSearchPhrase('\u00AD"co\u00ADoperate 👩‍💻"\u00AD'), 'co\u00ADoperate 👩‍💻');
});
test('invalid quote stays literal, and unmatched trailing text stays non-phrase', () => {
  assert.equal(parseQuotedSearchPhrase('\u00AD«سلام دنیا\u00AD'), null);
  assert.equal(parseQuotedSearchPhrase('«سلام دنیا»\u00AD ادامه'), null);
});
