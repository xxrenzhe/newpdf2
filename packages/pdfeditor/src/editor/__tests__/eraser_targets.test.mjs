import test from 'node:test';
import assert from 'node:assert/strict';
import {
    collectIntersectingElements,
    getElementViewportRect,
    rectsIntersect
} from '../toolbar/eraser/targets.js';

test('rectsIntersect detects overlap but excludes edge-touching boxes', () => {
    assert.equal(rectsIntersect(
        { left: 0, top: 0, width: 10, height: 10 },
        { left: 5, top: 5, width: 10, height: 10 }
    ), true);

    assert.equal(rectsIntersect(
        { left: 0, top: 0, width: 10, height: 10 },
        { left: 10, top: 10, width: 10, height: 10 }
    ), false);
});

test('getElementViewportRect reads current rendered style first', () => {
    const rect = getElementViewportRect({
        el: {
            style: {
                left: '12px',
                top: '18px',
                width: '40px',
                height: '22px'
            }
        },
        actualRect: {
            x: 1,
            y: 1,
            width: 1,
            height: 1
        },
        scale: 99
    });

    assert.deepEqual(rect, {
        left: 12,
        top: 18,
        right: 52,
        bottom: 40,
        width: 40,
        height: 22
    });
});

test('collectIntersectingElements skips erase masks and keeps overlapping editor elements', () => {
    const matches = collectIntersectingElements({
        rect: {
            x: 10,
            y: 10,
            width: 40,
            height: 20
        },
        items: {
            keep: {
                id: 'keep',
                dataType: 'rect',
                el: {
                    style: {
                        left: '20px',
                        top: '12px',
                        width: '18px',
                        height: '16px'
                    }
                }
            },
            mask: {
                id: 'mask',
                dataType: 'eraseMask',
                el: {
                    style: {
                        left: '15px',
                        top: '15px',
                        width: '20px',
                        height: '10px'
                    }
                }
            },
            miss: {
                id: 'miss',
                dataType: 'image',
                el: {
                    style: {
                        left: '100px',
                        top: '100px',
                        width: '20px',
                        height: '20px'
                    }
                }
            }
        }
    });

    assert.deepEqual(matches.map((element) => element.id), ['keep']);
});
