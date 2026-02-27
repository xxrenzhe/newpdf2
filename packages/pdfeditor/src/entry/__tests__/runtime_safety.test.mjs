import test from 'node:test';
import assert from 'node:assert/strict';
import {
    TOUCH_GESTURE_LOCK_CLASS,
    getErrorMessage,
    normalizeToolName,
    shouldLockTouchGestures
} from '../runtime_safety.js';

test('normalizeToolName keeps current names and maps redact alias', () => {
    assert.equal(normalizeToolName('line'), 'line');
    assert.equal(normalizeToolName('radact'), 'radact');
    assert.equal(normalizeToolName('redact'), 'radact');
});

test('shouldLockTouchGestures enables lock for drawing tools only', () => {
    assert.equal(TOUCH_GESTURE_LOCK_CLASS, 'pdf-touch-gesture-lock');
    assert.equal(shouldLockTouchGestures('line'), true);
    assert.equal(shouldLockTouchGestures('draw'), true);
    assert.equal(shouldLockTouchGestures('eraser'), true);
    assert.equal(shouldLockTouchGestures('redact'), false);
    assert.equal(shouldLockTouchGestures('text'), false);
});

test('getErrorMessage extracts useful runtime error text', () => {
    assert.equal(getErrorMessage('  something failed  '), 'something failed');
    assert.equal(getErrorMessage({ message: ' bad state ' }), 'bad state');
    assert.equal(getErrorMessage({ code: 500, type: 'upstream' }), '{"code":500,"type":"upstream"}');
    assert.equal(getErrorMessage({}), null);
    assert.equal(getErrorMessage(null), null);
});
