import test from 'node:test';
import assert from 'node:assert/strict';
import {
    collectClearTextItems,
    markClearTextIndices,
    normalizeClearTextIndices,
    restoreClearTextIndices
} from '../clear_text_state.js';

test('normalizeClearTextIndices de-duplicates and drops invalid entries', () => {
    const normalized = normalizeClearTextIndices([0, '0', 1, 'abc', -1, 2, 2]);
    assert.deepEqual(normalized, [0, 1, 2]);
});

test('markClearTextIndices de-duplicates indices before counting', () => {
    const clearTextIndexCounts = Object.create(null);
    const textContentItems = [{ id: 'a' }, { id: 'b' }];

    const accepted = markClearTextIndices({
        indices: [0, '0', 1, 99, -1],
        textContentItems,
        clearTextIndexCounts
    });

    assert.deepEqual(accepted, [0, 1]);
    assert.deepEqual({ ...clearTextIndexCounts }, { 0: 1, 1: 1 });
});

test('collectClearTextItems rebuilds from indices after text items refresh', () => {
    const clearTextIndexCounts = { 0: 1, 1: 2 };

    const rebuilt = collectClearTextItems({
        clearTextIndexCounts,
        textContentItems: [{ id: 'new-a' }, { id: 'new-b' }],
        fallbackItems: [{ id: 'old-a' }, { id: 'old-b' }]
    });

    assert.deepEqual(rebuilt.map((item) => item.id), ['new-a', 'new-b']);
});

test('restoreClearTextIndices handles duplicate restore indices safely', () => {
    const clearTextIndexCounts = { 0: 1, 1: 2 };

    const restored = restoreClearTextIndices({
        indices: ['0', 0, 1],
        clearTextIndexCounts
    });

    assert.deepEqual(restored, [0]);
    assert.deepEqual(clearTextIndexCounts, { 1: 1 });
});
