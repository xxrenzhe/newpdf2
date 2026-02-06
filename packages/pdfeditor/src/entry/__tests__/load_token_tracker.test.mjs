import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadTokenTracker, toArrayBuffer } from '../load_token_tracker.js';

test('createLoadTokenTracker resolves remembered token and backfills fallback', () => {
  const tracker = createLoadTokenTracker(4);

  tracker.remember(7, 1007);
  assert.equal(tracker.resolve(7, 1), 1007);

  assert.equal(tracker.resolve(8, 2008), 2008);
  assert.equal(tracker.resolve(8, 0), 2008);
});

test('createLoadTokenTracker evicts oldest entries beyond max size', () => {
  const tracker = createLoadTokenTracker(3);

  tracker.remember(1, 11);
  tracker.remember(2, 22);
  tracker.remember(3, 33);
  tracker.remember(4, 44);

  assert.equal(tracker.size(), 3);
  assert.equal(tracker.resolve(2, -1), 22);
  assert.equal(tracker.resolve(4, -1), 44);
  assert.equal(tracker.resolve(1, undefined), undefined);
});

test('toArrayBuffer supports typed-array slices safely', () => {
  const bytes = new Uint8Array([10, 20, 30, 40]);
  const view = new Uint8Array(bytes.buffer, 1, 2);
  const buffer = toArrayBuffer(view);

  assert.ok(buffer instanceof ArrayBuffer);
  assert.deepEqual(Array.from(new Uint8Array(buffer)), [20, 30]);

  view[0] = 99;
  assert.deepEqual(Array.from(new Uint8Array(buffer)), [20, 30]);

  const direct = new ArrayBuffer(2);
  assert.equal(toArrayBuffer(direct), direct);
});
