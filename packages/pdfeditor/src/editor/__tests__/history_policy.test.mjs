import test from 'node:test';
import assert from 'node:assert/strict';
import {
    HISTORY_SOURCE,
    normalizeHistorySource,
    resolveHistorySource,
    shouldTrackHistorySource,
    shouldTrackElementHistory
} from '../history_policy.js';

test('normalizeHistorySource defaults to user', () => {
    assert.equal(normalizeHistorySource(undefined), HISTORY_SOURCE.USER);
    assert.equal(normalizeHistorySource(''), HISTORY_SOURCE.USER);
    assert.equal(normalizeHistorySource('anything'), HISTORY_SOURCE.USER);
    assert.equal(normalizeHistorySource(HISTORY_SOURCE.USER), HISTORY_SOURCE.USER);
    assert.equal(normalizeHistorySource(HISTORY_SOURCE.SYSTEM), HISTORY_SOURCE.SYSTEM);
});

test('resolveHistorySource uses explicit historySource when present', () => {
    assert.equal(resolveHistorySource({ options: { historySource: HISTORY_SOURCE.USER } }), HISTORY_SOURCE.USER);
    assert.equal(resolveHistorySource({ options: { historySource: HISTORY_SOURCE.SYSTEM } }), HISTORY_SOURCE.SYSTEM);
});

test('resolveHistorySource explicit value overrides oriText fallback', () => {
    assert.equal(
        resolveHistorySource({ options: { historySource: HISTORY_SOURCE.USER, oriText: 'ORIGIN_TEXT' } }),
        HISTORY_SOURCE.USER
    );
    assert.equal(
        resolveHistorySource({ options: { historySource: HISTORY_SOURCE.SYSTEM, oriText: '' } }),
        HISTORY_SOURCE.SYSTEM
    );
});

test('resolveHistorySource falls back to oriText marker when source unset', () => {
    const systemElement = { options: { oriText: 'ORIGIN_TEXT' } };
    const userElement = { options: { oriText: '' } };

    assert.equal(resolveHistorySource(systemElement), HISTORY_SOURCE.SYSTEM);
    assert.equal(resolveHistorySource(userElement), HISTORY_SOURCE.USER);
});

test('shouldTrackHistorySource/shouldTrackElementHistory skip system actions', () => {
    assert.equal(shouldTrackHistorySource(HISTORY_SOURCE.USER), true);
    assert.equal(shouldTrackHistorySource(HISTORY_SOURCE.SYSTEM), false);

    assert.equal(shouldTrackElementHistory({ options: { historySource: HISTORY_SOURCE.SYSTEM } }), false);
    assert.equal(shouldTrackElementHistory({ options: { oriText: 'x' } }), false);
    assert.equal(shouldTrackElementHistory({ options: {} }), true);
});
