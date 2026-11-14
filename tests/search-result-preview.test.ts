import test from 'node:test';
import assert from 'node:assert/strict';
import { searchResultPreview } from '../lib/search-result-preview.ts';
import type { GraphNode } from '../lib/types.ts';

function node(text = '', annotations: { body: string; quote: string }[] = [], assetName = '', url = '') {
  return { text, annotations, asset: assetName ? { name: assetName } : null, url } as Pick<GraphNode, 'text' | 'annotations' | 'asset' | 'url'>;
}
test('annotation-only match reveals comment rather than unrelated first note', () => {
  const n = node('Unrelated opening note', [{ quote: 'frame 12', body: 'Revise lighting before approval' }]);
  assert.deepEqual(searchResultPreview(n, 'lighting'), {kind:'comment', text:'Revise lighting before approval'});
});
test('annotation selected quote has an explicit source label', () => {
  assert.deepEqual(searchResultPreview(node('', [{ quote: 'camera angle', body: 'reviewed' }]), '"camera angle"'),
    {kind:'quote', text:'camera angle'});
});
test('Persian/Arabic equivalents and reordered comment terms remain discoverable', () => {
  const n = node('Opening', [{quote:'عبارت',body:'إسلام برای کتاب های کودک'}]);
  assert.equal(searchResultPreview(n,'اسلام')?.kind, 'comment');
  assert.equal(searchResultPreview(n,'کودک کتابهای')?.kind, 'comment');
});
test('balanced quoted phrase cannot join separate annotations', () => {
  const n = node('Existing note', [{quote:'lighting',body:'review'}, {quote:'camera',body:'spacing'}]);
  assert.notEqual(searchResultPreview(n,'"lighting camera"')?.kind,'comment');
  assert.notEqual(searchResultPreview(n,'"lighting camera"')?.kind,'quote');
});
test('long notes show the matching term instead of only the first 65 characters', () => {
  const n = node('x'.repeat(180) + ' lighthouse aperture lighting approved ' + 'y'.repeat(60));
  const preview = searchResultPreview(n,'aperture');
  assert.equal(preview?.kind,'note');
  assert.ok(preview?.text.includes('aperture'));
  assert.ok(preview?.text.startsWith('…'));
  assert.ok((preview?.text.length??0) <= 98);
});
test('ordinary title or project-path hit keeps its usual note fallback', () => {
  assert.deepEqual(searchResultPreview(node('A normal note'), 'project path'),
    {kind:'note',text:'A normal note'});
});
test('browsing empty search keeps note and no-content fallback', () => {
  assert.equal(searchResultPreview(node('note'), '')?.text, 'note');
  assert.equal(searchResultPreview(node(), ''), null);
});
test('filename and URL-only matches explain their source without a fake note', () => {
  assert.deepEqual(searchResultPreview(node('',[],'StoryBoard.pdf'), 'pdf'),
    {kind:'file', text:'StoryBoard.pdf'});
  assert.equal(searchResultPreview(node('',[],'','https://example.com/storyboard'), 'storyboard')?.kind,'link');
});
test('phrase matching does not interpret annotations as joined fields', () => {
  const n=node('',[{quote:'layout',body:'lighting'}]);
  assert.equal(searchResultPreview(n,'"layout lighting"'),null);
});
test('derived context never mutates the workspace, annotations or attachment', () => {
  const n=Object.freeze({text:'Primary',annotations:Object.freeze([Object.freeze({quote:'frame',body:'light pass'})]),asset:Object.freeze({name:'Ref.PDF'}),url:'https://test.invalid/'});
  const before=JSON.stringify(n);
  assert.equal(searchResultPreview(n as unknown as Pick<GraphNode,'text'|'annotations'|'asset'|'url'>,'light')?.kind,'comment');
  assert.equal(JSON.stringify(n),before);
});
test('search result link preview never echoes signed URLs or fragments', () => {
  const n = node('', [], '', 'https://example.com/assets?access_token=SECRET_VALUE#private-note');
  assert.deepEqual(searchResultPreview(n, 'SECRET_VALUE'), {kind:'link', text:'example.com'});
  assert.ok(!searchResultPreview(n, 'private-note')?.text.includes('private-note'));
});


test('deep Persian/Arabic and Latin-accented matches appear in the actual note excerpt', () => {
  for (const [query, original] of [
    ['اسلام', 'إسلام'], ['کتابها', 'کتاب‌ها'], ['resume', 'Résumé'],
    ['123', '۱۲۳'],
  ]) {
    const n = node('x'.repeat(180) + ' ' + original + ' پایان');
    const before = JSON.stringify(n);
    const result = searchResultPreview(n, query);
    assert.equal(result?.kind, 'note', query);
    assert.ok(result?.text.includes(original), query + ': ' + result?.text);
    assert.ok(result?.text.startsWith('…'), query);
    assert.equal(JSON.stringify(n), before);
  }
});
test('deep compact aliases and quoted joined Persian words have relevant previews', () => {
  const compact = searchResultPreview(node('x'.repeat(180) + ' Frame-12 approved'), 'frame12');
  assert.ok(compact?.text.includes('Frame-12'));
  const phrase = searchResultPreview(node('x'.repeat(180) + ' کتاب های کودک ثبت شد'), '«کتابهای کودک»');
  assert.ok(phrase?.text.includes('کتاب های کودک'), phrase?.text);
});


test('search preview keeps complete Unicode code points at both snippet boundaries', () => {
  const nearStart = node('x'.repeat(153) + '😀' + 'x'.repeat(25) + 'نقشه');
  const startPreview = searchResultPreview(nearStart, 'نقشه');
  assert.equal(startPreview?.kind, 'note');
  assert.ok(startPreview?.text.includes('😀'), startPreview?.text);
  assert.equal([...(startPreview?.text ?? '')].some(ch => /^[\uD800-\uDFFF]$/u.test(ch)), false);

  const nearEnd = node('x'.repeat(180) + 'target' + 'x'.repeat(63) + '😀' + 'tail');
  const endPreview = searchResultPreview(nearEnd, 'target');
  assert.equal(endPreview?.kind, 'note');
  assert.ok(endPreview?.text.includes('target'));
  assert.equal([...(endPreview?.text ?? '')].some(ch => /^[\uD800-\uDFFF]$/u.test(ch)), false);
});
