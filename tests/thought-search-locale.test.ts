import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoardPaths, SEARCH_PAGE_SIZE, searchThoughts } from '../lib/thought-search.ts';
import type { GraphNode, Workspace } from '../lib/types.ts';

const node = (id: string, title: string, text = '', boardId = 'root', filename?: string, childBoardId: string | null = null): GraphNode =>
  ({ id, title, text, boardId, asset: filename ? { name: filename } : null, childBoardId }) as GraphNode;
const board = (id: string, title: string, parentNodeId: string | null = null): Workspace['boards'][number] =>
  ({ id, title, parentNodeId, description: '', createdAt: '2026-11-13T00:00:00Z' }) as Workspace['boards'][number];

// Simulates a browser that uses Turkish casing as its default locale.
// The search implementation must not inherit that default for graph text.
function inTurkishLocale(callback: () => void): void {
  const original = String.prototype.toLocaleLowerCase;
  String.prototype.toLocaleLowerCase = function (...args: Parameters<typeof original>) {
    return original.call(this, ...(args.length ? args : ['tr-TR']));
  };
  try { callback(); } finally { String.prototype.toLocaleLowerCase = original; }
}

test('title lookup uses locale-independent case folding, including I and dotted İ', () => {
  inTurkishLocale(() => {
    const nodes = [node('english', 'IDEA BOARD'), node('dot', 'İstanbul'), node('ascii', 'Istanbul'), node('other', 'unrelated')];
    assert.deepEqual(searchThoughts(nodes, 'idea').visible.map(n => n.id), ['english']);
    assert.deepEqual(searchThoughts(nodes, 'istanbul').visible.map(n => n.id), ['dot', 'ascii']);
  });
});

test('note text and attached filenames keep same matching and priority under Turkish casing', () => {
  inTurkishLocale(() => {
    const nodes = [node('note', 'Other', 'LIGHTING NOTES'), node('file', 'Other', '', 'root', 'FINAL-IMAGE.PDF')];
    assert.deepEqual(searchThoughts(nodes, 'lighting').visible.map(n => n.id), ['note']);
    assert.deepEqual(searchThoughts(nodes, 'final image').visible.map(n => n.id), ['file']);
  });
});

test('root-to-nested-board path searching is independent of locale and source is unchanged', () => {
  inTurkishLocale(() => {
    const doc = { nodes: [node('parent', 'Holder', '', 'root', undefined, 'child'), node('leaf', 'Sketch', '', 'child')], boards: [board('root', 'FILM'), board('child', 'INTERIOR', 'parent')] };
    const before = JSON.stringify(doc);
    const paths = buildBoardPaths(doc, 'Untitled');
    assert.equal(paths.get('child'), 'FILM / INTERIOR');
    assert.deepEqual(searchThoughts(doc.nodes, 'film interior', 70, 0, paths).visible.map(n => n.id), ['leaf']);
    assert.equal(JSON.stringify(doc), before);
  });
});

test('151 results keep deterministic 70/70/11 paging under Turkish case rules', () => {
  inTurkishLocale(() => {
    const nodes = Array.from({ length: 151 }, (_, i) => node(String(i), 'IDEA ' + i));
    const pages = [0, 70, 140].map(start => searchThoughts(nodes, 'idea', SEARCH_PAGE_SIZE, start));
    assert.deepEqual(pages.map(p => [p.total, p.offset, p.visible.length]), [[151,0,70],[151,70,70],[151,140,11]]);
    assert.deepEqual(pages.flatMap(p => p.visible.map(n => n.id)), nodes.map(n => n.id));
  });
});

test('Persian digits, Arabic spellings and Latin accents still match in non-English locale', () => {
  inTurkishLocale(() => {
    const nodes = [node('fa','کتاب‌های ۱۲۳'),node('accent','Résumé'),node('punct','F::oo')];
    assert.deepEqual(searchThoughts(nodes,'كتابهاي 123').visible.map(n => n.id), ['fa']);
    assert.deepEqual(searchThoughts(nodes,'resume').visible.map(n => n.id), ['accent']);
    assert.equal(searchThoughts(nodes,'foo').total, 0);
  });
});
