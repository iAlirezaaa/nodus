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


test('decoded URL search previews remain host-only for Persian and percent-encoded terms', () => {
  const n = node('', [], '', 'https://example.com/%D9%86%D9%88%D8%AF?access_token=PRIVATE#personal');
  const before = JSON.stringify(n);
  assert.deepEqual(searchResultPreview(n, 'نود'), { kind: 'link', text: 'example.com' });
  assert.deepEqual(searchResultPreview(n, 'PRIVATE'), { kind: 'link', text: 'example.com' });
  assert.equal(JSON.stringify(n), before);
});

test('quoted URL phrases show a safe link explanation after path decoding or query + decoding', () => {
  assert.deepEqual(
    searchResultPreview(node('', [], '', 'https://example.com/story%20board'), '"story board"'),
    { kind: 'link', text: 'example.com' },
  );
  assert.deepEqual(
    searchResultPreview(node('', [], '', 'https://example.com/?q=blue+hour#secret'), '"blue hour"'),
    { kind: 'link', text: 'example.com' },
  );
  assert.equal(searchResultPreview(node('', [], '', 'https://example.com/blue+hour'), '"blue hour"'), null);
});

test('malformed URL escape falls back safely without hiding raw URL hits', () => {
  assert.deepEqual(searchResultPreview(node('', [], '', 'https://example.com/%GG/foo'), 'foo'), {
    kind: 'link', text: 'example.com',
  });
});

test('a malformed URL escape cannot hide a valid encoded result explanation', () => {
  for (const url of [
    'https://example.com/%GG/%D9%86%D9%88%D8%AF?token=SECRET',
    'https://example.com/%FF%D9%86%D9%88%D8%AF#PRIVATE',
  ]) {
    const n = node('', [], '', url);
    const original = JSON.stringify(n);
    assert.deepEqual(searchResultPreview(n, 'نود'), { kind: 'link', text: 'example.com' });
    assert.equal(JSON.stringify(n), original);
  }
});


test('preview favors a matching note over a lower-ranked comment', () => {
  const n = node('Lighting revision in the current shot', [{ quote: 'shot', body: 'Lighting review from last week' }]);
  const before = JSON.stringify(n);
  assert.deepEqual(searchResultPreview(n, 'lighting'), { kind: 'note', text: 'Lighting revision in the current shot' });
  assert.equal(JSON.stringify(n), before);
});
test('preview favors matching attachment filename over comment text', () => {
  const n = node('An unrelated note', [{ quote: 'frame', body: 'Storyboard review' }], 'Storyboard.pdf');
  assert.deepEqual(searchResultPreview(n, 'storyboard'), { kind: 'file', text: 'Storyboard.pdf' });
});
test('preview favors a matching saved link over a comment without exposing its token', () => {
  const n = node('', [{ quote: 'frame', body: 'Lighting review' }], '', 'https://example.com/lighting?access_token=PRIVATE');
  const before = JSON.stringify(n);
  assert.deepEqual(searchResultPreview(n, 'lighting'), { kind: 'link', text: 'example.com' });
  assert.deepEqual(searchResultPreview(n, 'PRIVATE'), { kind: 'link', text: 'example.com' });
  assert.equal(JSON.stringify(n), before);
});
test('annotation-only hits retain their source explanation after priority alignment', () => {
  const comment = node('Other work', [{ quote: 'frame 12', body: 'Lighting approved' }]);
  assert.deepEqual(searchResultPreview(comment, 'lighting'), { kind: 'comment', text: 'Lighting approved' });
  const quote = node('', [{ quote: 'camera storyboard', body: 'Reviewed' }]);
  assert.deepEqual(searchResultPreview(quote, 'storyboard'), { kind: 'quote', text: 'camera storyboard' });
});


test('direct filename is explained before a directly matching note (engine tier 4 before 5)', () => {
  const n = node('Storyboard planning in notes', [], 'Storyboard-reference.pdf');
  const before = JSON.stringify(n);
  assert.deepEqual(searchResultPreview(n, 'storyboard'), { kind: 'file', text: 'Storyboard-reference.pdf' });
  assert.equal(JSON.stringify(n), before);
});
test('a direct URL hit outranks separated unordered words in a note', () => {
  const n = node('lighting was revised after a lengthy camera review', [
    { quote: 'draft', body: 'review lighting eventually' },
  ], '', 'https://example.com/lighting-review?access_token=SECRET_PRIVATE#draft');
  const original = JSON.stringify(n);
  assert.deepEqual(searchResultPreview(n, 'lighting review'), { kind: 'link', text: 'example.com' });
  assert.ok(!searchResultPreview(n, 'lighting review')?.text.includes('SECRET_PRIVATE'));
  assert.equal(JSON.stringify(n), original);
});
test('unordered note terms remain a relevant explanation without a stronger direct hit', () => {
  const n = node('Review the color pass before final lighting', [{ quote: 'lighting', body: 'review' }]);
  assert.equal(searchResultPreview(n, 'lighting review')?.kind, 'note');
});
test('strong direct note beats an unordered filename fallback', () => {
  const n = node('camera layout approved', [], 'camera_checklist_for_layout.pdf');
  assert.equal(searchResultPreview(n, 'camera layout')?.kind, 'note');
});


test('very long combining sequence before matching note still produces a readable bounded result snippet', () => {
  const text = 'a' + '\u0301'.repeat(180) + 'target suffix';
  const result = searchResultPreview(node(text), 'target');
  assert.equal(result?.kind, 'note');
  assert.ok(result?.text.includes('target'), result?.text);
  assert.ok((result?.text.length ?? 0) <= 98);
  assert.equal(text, 'a' + '\u0301'.repeat(180) + 'target suffix');
});


test('URL-only unordered words have a safe link explanation, not an empty preview', () => {
  const link = node('', [], '', 'https://example.com/media/blue-hour?tag=storyboard');
  assert.deepEqual(searchResultPreview(link, 'storyboard blue'), { kind: 'link', text: 'example.com' });
  assert.equal(searchResultPreview(link, 'missing blue'), null);
});

test('unordered URL search never echoes credentials, query tokens, or fragments', () => {
  const url = 'https://user:pw@example.com/files/blue?access_token=SECRET_PRIVATE#draft';
  const link = node('', [], '', url);
  assert.deepEqual(searchResultPreview(link, 'blue secret_private'), { kind: 'link', text: 'example.com' });
  assert.equal(link.url, url);
});

test('unordered encoded Persian URL hit receives a safe decoded-match explanation', () => {
  const link = node('', [], '', 'https://example.com/%D9%86%D9%88%D8%AF?tag=project');
  assert.deepEqual(searchResultPreview(link, 'project نود'), { kind: 'link', text: 'example.com' });
});

test('a direct note retains priority over unordered URL words', () => {
  const link = node('blue secret_private discussion', [], '', 'https://example.com/a/blue?token=secret_private');
  assert.equal(searchResultPreview(link, 'blue secret_private')?.kind, 'note');
});

test('title match takes precedence over unrelated matching file or note', () => {
  const n = { ...node('StoryBoard note elsewhere', [], 'StoryBoard.pdf'), title: 'StoryBoard' };
  assert.deepEqual(searchResultPreview(n, 'storyboard'), {kind:'title', text:''});
});
test('project path match outranks file and note, and is never duplicated in the snippet', () => {
  const n = { ...node('Lighting note', [], 'lighting.pdf'), title:'Draft' };
  assert.deepEqual(searchResultPreview(n, 'lighting', 'Studio / Lighting'), {kind:'project', text:''});
});
test('Persian project ancestry source is localized without changing content', () => {
  const n={...node('Private description unrelated to the title'),title:'Draft'};
  const before=JSON.stringify(n);
  assert.deepEqual(searchResultPreview(n, 'کتابها', 'ایده / کتاب‌ها'), {kind:'project',text:''});
  assert.equal(JSON.stringify(n), before);
});
test('title wins even if project path also directly matches', () => {
  assert.deepEqual(searchResultPreview({...node('Other notes'),title:'Lighting'},'lighting','Studio / Lighting'), {kind:'title',text:''});
});
test('file and comment matches retain their labels when title/path differ', () => {
  const n={...node('Other notes',[{quote:'',body:'Review lighting'}],'lighting.pdf'),title:'Draft'};
  assert.equal(searchResultPreview(n,'lighting','Studio / Props')?.kind,'file');
  assert.equal(searchResultPreview(n,'review','Studio / Props')?.kind,'comment');
});

test('multi-field title and note words disclose an honest combined source', () => {
  const n = { ...node('Lighting note'), title: 'Camera' };
  const before = JSON.stringify(n);
  assert.deepEqual(searchResultPreview(n, 'camera lighting'), {kind:'multiple', text:''});
  assert.equal(JSON.stringify(n), before);
});
test('multi-field title and filename words avoid a false attachment excerpt', () => {
  const n = { ...node('', [], 'reference.pdf'), title: 'Camera' };
  assert.deepEqual(searchResultPreview(n, 'camera pdf'), {kind:'multiple',text:''});
});
test('multi-field Persian title and nested path words keep original spelling', () => {
  const n = { ...node('ثبت شد'), title: 'پروژه' };
  assert.deepEqual(searchResultPreview(n, 'کتابها پروژه', 'استودیو / کتاب ها'),
    {kind:'multiple',text:''});
  assert.equal(n.text, 'ثبت شد');
});
test('combined-field URL match never echoes signed URL data', () => {
  const url = 'https://example.com/private?access_token=SECRET_PRIVATE';
  const n = { ...node('unrelated description', [], '', url), title: 'Shot 12' };
  assert.deepEqual(searchResultPreview(n, 'shot secret_private'), {kind:'multiple',text:''});
  assert.equal(n.url, url);
});

test('contiguous title+note result outranks unordered URL keyword explanation (tier 7 before 8)', () => {
  const n = { ...node('hour', [], '', 'https://example.com/blue?tag=hour'), title: 'blue' };
  const before = JSON.stringify(n);
  assert.deepEqual(searchResultPreview(n, 'blue hour'), { kind: 'multiple', text: '' });
  assert.equal(JSON.stringify(n), before);
});

test('contiguous cross-field hit outranks unordered note explanation', () => {
  const n = { ...node('hour blue'), title: 'blue' };
  assert.deepEqual(searchResultPreview(n, 'blue hour'), { kind: 'multiple', text: '' });
  assert.notEqual(searchResultPreview(n, '"blue hour"')?.kind, 'multiple', 'a quoted phrase cannot join fields');
});

test('contiguous cross-field hit outranks unordered filename explanation', () => {
  const n = { ...node('hour', [], 'hour-blue.pdf'), title: 'blue' };
  assert.deepEqual(searchResultPreview(n, 'blue hour'), { kind: 'multiple', text: '' });
});

test('strong direct filename, note and signed URL matches retain their safe source labels', () => {
  const file = { ...node('hour', [], 'blue hour.pdf'), title: 'blue' };
  const note = { ...node('blue hour revised'), title: 'blue' };
  const link = { ...node('hour', [], '', 'https://example.com/blue%20hour?access_token=PRIVATE'), title: 'blue' };
  assert.equal(searchResultPreview(file, 'blue hour')?.kind, 'file');
  assert.equal(searchResultPreview(note, 'blue hour')?.kind, 'note');
  assert.deepEqual(searchResultPreview(link, 'blue hour'), { kind: 'link', text: 'example.com' });
});
