import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifyOrientation,
  shouldBreakLine,
  shouldSplitByGapWithGuardrails,
  splitCoverRectsByLines
} from '../text_detection.mjs';

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

test('shouldBreakLine: large vertical offset triggers break when confident', () => {
  const current = { x: 10, y: 100, width: 20, height: 10, color: '#000', isVertical: false, rotationDeg: 0 };
  const next = { x: 12, y: 115, width: 20, height: 10, color: '#000', isVertical: false, rotationDeg: 0 };
  const result = shouldBreakLine({ current, next, hasEOL: false, lineHasLeader: false });
  assert.equal(result.shouldBreak, true);
  assert.equal(result.reason, 'y-gap');
});

test('guardrails: tiny gap does not split', () => {
  const result = shouldSplitByGapWithGuardrails({
    maxGap: 8,
    lineWidth: 400,
    baseFontSize: 12,
    segmentCharCounts: [20, 20],
    segmentWidths: [180, 190]
  });
  assert.equal(result, false);
});

test('splitCoverRectsByLines: splits when horizontal line crosses', () => {
  const rects = [{ left: 10, top: 10, right: 200, bottom: 40, width: 190, height: 30 }];
  const lineMap = { horizontal: [{ y: 25, x1: 0, x2: 300 }] };
  const next = splitCoverRectsByLines(rects, lineMap);
  assert.equal(next.length, 2);
  assert.equal(next[0].bottom, 25);
  assert.equal(next[1].top, 25);
});
