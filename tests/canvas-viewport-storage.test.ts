import assert from 'node:assert/strict';
import test from 'node:test';
import { canvasViewportStorageKey } from '../lib/canvas-viewport-storage';

test('viewport persistence is disabled without an authenticated scope', () => {
  assert.equal(canvasViewportStorageKey(), null);
  assert.equal(canvasViewportStorageKey(''), null);
  assert.equal(canvasViewportStorageKey('   '), null);
});

test('the same board ID never collides across accounts or rooms', () => {
  const board = 'copy-with-shared-id';
  const scopes = [
    `alice:personal:${board}`,
    `bob:personal:${board}`,
    `alice:room-one:${board}`,
    `alice:room-two:${board}`,
    'alice:room-one:another-board',
  ];
  const keys = scopes.map(canvasViewportStorageKey);
  assert.equal(new Set(keys).size, scopes.length);
  assert(keys.every(key => key?.startsWith('nodus:view:v2:')));
  assert(keys.every(key => !key?.startsWith('nodus:view:copy-with-shared-id')));
});

test('URI-encoding retains identity boundaries and non-Latin board names', () => {
  const normal = canvasViewportStorageKey('user:personal:پروژهٔ طراحی');
  assert.equal(normal && decodeURIComponent(normal.slice('nodus:view:v2:'.length)),
    'user:personal:پروژهٔ طراحی');
  assert.notEqual(canvasViewportStorageKey('a:b:c'), canvasViewportStorageKey('a%3Ab:c'));
  assert.equal(canvasViewportStorageKey('alice:personal:board'), canvasViewportStorageKey('alice:personal:board'));
});
