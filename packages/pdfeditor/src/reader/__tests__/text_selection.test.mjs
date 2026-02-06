import test from 'node:test';
import assert from 'node:assert/strict';
import { collectTextIndicesInRect } from '../text_selection.js';

const makeDiv = ({ idx, rect, connected = true }) => {
    return {
        isConnected: connected,
        getBoundingClientRect: () => rect,
        getAttribute: (name) => (name === 'data-idx' ? String(idx) : null)
    };
};

test('collectTextIndicesInRect returns unique intersecting indices', () => {
    const rect = { x: 5, y: 5, width: 20, height: 10 };
    const containerRect = { left: 100, top: 50 };
    const textDivs = [
        makeDiv({
            idx: 3,
            rect: { left: 110, top: 55, width: 5, height: 5 }
        }),
        makeDiv({
            idx: 3,
            rect: { left: 115, top: 55, width: 5, height: 5 }
        }),
        makeDiv({
            idx: 4,
            rect: { left: 200, top: 200, width: 5, height: 5 }
        })
    ];

    const indices = collectTextIndicesInRect({ rect, textDivs, containerRect });
    assert.deepEqual(indices.sort((a, b) => a - b), [3]);
});

test('collectTextIndicesInRect ignores disconnected nodes', () => {
    const rect = { x: 0, y: 0, width: 10, height: 10 };
    const containerRect = { left: 0, top: 0 };
    const textDivs = [
        makeDiv({
            idx: 1,
            rect: { left: 1, top: 1, width: 2, height: 2 },
            connected: false
        })
    ];

    const indices = collectTextIndicesInRect({ rect, textDivs, containerRect });
    assert.deepEqual(indices, []);
});

test('collectTextIndicesInRect supports cached non-DOM text rects', () => {
    const rect = { x: 8, y: 8, width: 20, height: 10 };
    const textDivs = [
        {
            dataIdx: 9,
            rect: { left: 10, top: 10, width: 5, height: 5 }
        },
        {
            dataIdx: 10,
            rect: { left: 40, top: 40, width: 5, height: 5 }
        }
    ];

    const indices = collectTextIndicesInRect({
        rect,
        textDivs,
        containerRect: { left: 0, top: 0 },
        getRect: (item) => item.rect
    });

    assert.deepEqual(indices, [9]);
});
