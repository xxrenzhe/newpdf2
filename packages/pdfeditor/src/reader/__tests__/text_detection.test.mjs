import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyOrientation, shouldBreakLine } from '../text_detection.mjs';

test('classifyOrientation: vertical vs horizontal', () => {
  assert.equal(classifyOrientation({ isVertical: true, rotationDeg: 0 }), 'vertical');
  assert.equal(classifyOrientation({ isVertical: false, rotationDeg: 0 }), 'horizontal');
  assert.equal(classifyOrientation({ isVertical: false, rotationDeg: 90 }), 'rotated');
});

test('shouldBreakLine: orientation mismatch forces break', () => {
  const current = { x: 10, y: 100, width: 20, height: 10, color: '#000', isVertical: false, rotationDeg: 0 };
  const next = { x: 12, y: 100, width: 20, height: 10, color: '#000', isVertical: true, rotationDeg: 90 };
  const result = shouldBreakLine({ current, next, hasEOL: false, lineHasLeader: false });
  assert.equal(result.shouldBreak, true);
  assert.equal(result.reason, 'orientation');
});
