import test from 'node:test';
import assert from 'node:assert/strict';
import { getTextRotation, isVerticalTextRun, shouldBreakTextRun } from '../text_layout.js';

test('getTextRotation returns normalized degree', () => {
    const textItem = {
        transform: [0, 1, -1, 0, 20, 30]
    };
    assert.equal(getTextRotation(textItem), 90);
});

test('isVerticalTextRun detects rotated vertical text', () => {
    const verticalItem = {
        transform: [0, 1, -1, 0, 10, 10]
    };
    const horizontalItem = {
        transform: [1, 0, 0, 1, 10, 10]
    };
    assert.equal(isVerticalTextRun(verticalItem), true);
    assert.equal(isVerticalTextRun(horizontalItem), false);
});

test('shouldBreakTextRun keeps nearby vertical glyphs in same run', () => {
    const current = {
        transform: [0, 1, -1, 0, 100, 400],
        width: 12,
        height: 0,
        color: '#000'
    };
    const next = {
        transform: [0, 1, -1, 0, 101, 389],
        width: 12,
        height: 0,
        color: '#000'
    };
    assert.equal(shouldBreakTextRun(current, next), false);
});

test('shouldBreakTextRun keeps nearby vertical glyphs with minor width drift', () => {
    const current = {
        transform: [0, 1, -1, 0, 100, 400],
        width: 12,
        height: 0,
        color: '#000'
    };
    const next = {
        transform: [0, 1, -1, 0, 100.8, 389],
        width: 10.9,
        height: 0,
        color: '#000'
    };
    assert.equal(shouldBreakTextRun(current, next), false);
});

test('shouldBreakTextRun breaks when vertical run crosses columns', () => {
    const current = {
        transform: [0, 1, -1, 0, 100, 400],
        width: 12,
        height: 0,
        color: '#000'
    };
    const next = {
        transform: [0, 1, -1, 0, 140, 390],
        width: 12,
        height: 0,
        color: '#000'
    };
    assert.equal(shouldBreakTextRun(current, next), true);
});

test('shouldBreakTextRun ignores tiny horizontal height drift', () => {
    const current = {
        transform: [1, 0, 0, 1, 100, 400],
        width: 8,
        height: 12,
        color: '#000'
    };
    const next = {
        transform: [1, 0, 0, 1, 112, 401],
        width: 8,
        height: 12.4,
        color: '#000'
    };
    assert.equal(shouldBreakTextRun(current, next), false);
});

test('shouldBreakTextRun keeps zero-height spacer before normal glyph in same run', () => {
    const current = {
        transform: [1, 0, 0, 1, 108, 400],
        width: 3,
        height: 0,
        color: '#000'
    };
    const next = {
        transform: [1, 0, 0, 1, 112, 400],
        width: 8,
        height: 12,
        color: '#000'
    };
    assert.equal(shouldBreakTextRun(current, next), false);
});

test('shouldBreakTextRun breaks when zero-height spacer is wide gap', () => {
    const current = {
        transform: [1, 0, 0, 1, 108, 400],
        width: 30,
        height: 0,
        color: '#000'
    };
    const next = {
        transform: [1, 0, 0, 1, 112, 400],
        width: 8,
        height: 12,
        color: '#000'
    };
    assert.equal(shouldBreakTextRun(current, next), true);
});

test('shouldBreakTextRun breaks horizontal glyphs on cross-line jump', () => {
    const current = {
        transform: [1, 0, 0, 1, 100, 400],
        width: 8,
        height: 12,
        color: '#000'
    };
    const next = {
        transform: [1, 0, 0, 1, 112, 430],
        width: 8,
        height: 12,
        color: '#000'
    };
    assert.equal(shouldBreakTextRun(current, next), true);
});

test('shouldBreakTextRun breaks on strong rotation drift', () => {
    const current = {
        transform: [1, 0, 0, 1, 100, 400],
        width: 8,
        height: 12,
        color: '#000'
    };
    const next = {
        transform: [0.8, 0.6, -0.6, 0.8, 112, 400],
        width: 8,
        height: 12,
        color: '#000'
    };
    assert.equal(shouldBreakTextRun(current, next), true);
});
