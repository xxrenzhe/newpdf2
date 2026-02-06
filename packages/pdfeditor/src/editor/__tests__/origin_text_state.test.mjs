import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOriginTextState, isSystemOriginTextElement } from '../origin_text_state.js';

const createElement = ({ attrs = {}, page = {} } = {}) => ({
    attrs,
    page,
    options: {}
});

test('applyOriginTextState(clear) resolves target page and normalizes origin indices', () => {
    const calls = [];
    const targetPage = {
        pageNum: 2,
        markClearTextsByIndices: (indices) => calls.push(['mark', indices]),
        lockConvertedTextPart: (partIdx) => calls.push(['lock', partIdx])
    };

    const element = createElement({
        attrs: {
            originTextIndices: [1, '2', '2', -1, 'not-a-number'],
            originTextPartIdx: 7,
            originPageNum: '2'
        },
        page: {
            pageNum: 1,
            readerPage: { pageNum: 1 },
            reader: {
                pdfDocument: {
                    pages: [{ pageNum: 1 }, targetPage]
                }
            }
        }
    });

    const applied = applyOriginTextState(element, true);

    assert.equal(applied, true);
    assert.deepEqual(calls, [
        ['mark', [1, 2]],
        ['lock', '7']
    ]);
});

test('applyOriginTextState(restore) falls back to explicit reader page', () => {
    const calls = [];
    const fallbackReaderPage = {
        pageNum: 3,
        restoreClearTexts: (indices) => calls.push(['restore', indices]),
        releaseConvertedTextPart: (partIdx) => calls.push(['release', partIdx])
    };

    const element = createElement({
        attrs: {
            originTextIndices: ['9'],
            originTextPartIdx: 'part-9'
        },
        page: {
            pageNum: 3,
            reader: {
                pdfDocument: {
                    pages: [{ pageNum: 1 }]
                }
            }
        }
    });

    const applied = applyOriginTextState(element, false, fallbackReaderPage);

    assert.equal(applied, true);
    assert.deepEqual(calls, [
        ['restore', [9]],
        ['release', 'part-9']
    ]);
});

test('applyOriginTextState returns false when element has no origin references', () => {
    const element = createElement({
        attrs: {},
        page: {
            pageNum: 1,
            readerPage: {
                pageNum: 1,
                markClearTextsByIndices: () => {
                    throw new Error('should not be called');
                }
            }
        }
    });

    assert.equal(applyOriginTextState(element, true), false);
    assert.equal(applyOriginTextState(element, false), false);
});

test('isSystemOriginTextElement identifies system-created text elements', () => {
    assert.equal(isSystemOriginTextElement({ options: { oriText: 'A' } }), true);
    assert.equal(isSystemOriginTextElement({ options: { oriText: '' } }), false);
    assert.equal(isSystemOriginTextElement({}), false);
    assert.equal(isSystemOriginTextElement(null), false);
});
