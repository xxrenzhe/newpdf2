import test from 'node:test';
import assert from 'node:assert/strict';
import { History } from '../history.js';
import { Events, PDFEvent } from '../../event.js';
import {
    markOriginTextStateApplied,
    ORIGIN_TEXT_REMOVE_STRATEGY
} from '../origin_text_state.js';

test('History redo preserves cleared origin text when converted text is removed', () => {
    const previousDocument = globalThis.document;
    globalThis.document = {
        querySelector: () => null,
        querySelectorAll: () => []
    };

    try {
        const calls = [];
        const elements = {
            items: {},
            activeId: null,
            setActive(id) {
                this.activeId = id;
            }
        };

        const readerPage = {
            pageNum: 1,
            elWrapper: {
                appendChild: () => {}
            },
            markClearTextsByIndices: (indices) => calls.push(['mark', indices]),
            restoreClearTexts: (indices) => calls.push(['restore', indices]),
            lockConvertedTextPart: (partIdx) => calls.push(['lock', partIdx]),
            releaseConvertedTextPart: (partIdx) => calls.push(['release', partIdx])
        };

        const element = {
            id: 'origin-el-1',
            attrs: {
                originTextIndices: [3],
                originTextPartIdx: 'part-3',
                originPageNum: 1
            },
            options: {
                historySource: 'user'
            },
            page: {
                readerPage
            },
            el: {
                style: {
                    left: '0px',
                    top: '0px',
                    width: '10px',
                    height: '10px'
                }
            },
            zoom: () => {},
            remove: () => {},
            setActualRect: () => {},
            updateAttrSize: () => {},
            setStyle: () => {}
        };

        markOriginTextStateApplied(element, true);

        const history = new History({
            pdfDocument: {
                getPageActive: () => ({ elements })
            }
        });

        PDFEvent.dispatch(Events.ELEMENT_REMOVE, {
            page: { elements },
            element,
            originStateStrategy: ORIGIN_TEXT_REMOVE_STRATEGY.PRESERVE
        });

        assert.equal(history.getOpList().length, 1);

        history.undo();
        assert.equal(elements.items[element.id], element);
        assert.deepEqual(calls, []);

        history.redo();
        assert.equal(elements.items[element.id], undefined);
        assert.deepEqual(calls, []);
    } finally {
        globalThis.document = previousDocument;
    }
});

test('History redo restores origin text when removal keeps default restore strategy', () => {
    const previousDocument = globalThis.document;
    globalThis.document = {
        querySelector: () => null,
        querySelectorAll: () => []
    };

    try {
        const calls = [];
        const elements = {
            items: {},
            activeId: null,
            setActive(id) {
                this.activeId = id;
            }
        };

        const readerPage = {
            pageNum: 1,
            elWrapper: {
                appendChild: () => {}
            },
            markClearTextsByIndices: (indices) => calls.push(['mark', indices]),
            restoreClearTexts: (indices) => calls.push(['restore', indices]),
            lockConvertedTextPart: (partIdx) => calls.push(['lock', partIdx]),
            releaseConvertedTextPart: (partIdx) => calls.push(['release', partIdx])
        };

        const element = {
            id: 'origin-el-2',
            attrs: {
                originTextIndices: [4],
                originTextPartIdx: 'part-4',
                originPageNum: 1
            },
            options: {
                historySource: 'user'
            },
            page: {
                readerPage
            },
            el: {
                style: {
                    left: '0px',
                    top: '0px',
                    width: '10px',
                    height: '10px'
                }
            },
            zoom: () => {},
            remove: () => {},
            setActualRect: () => {},
            updateAttrSize: () => {},
            setStyle: () => {}
        };

        markOriginTextStateApplied(element, true);

        const history = new History({
            pdfDocument: {
                getPageActive: () => ({ elements })
            }
        });

        PDFEvent.dispatch(Events.ELEMENT_REMOVE, {
            page: { elements },
            element
        });

        history.undo();
        history.redo();

        assert.deepEqual(calls, [
            ['restore', [4]],
            ['release', 'part-4']
        ]);
    } finally {
        globalThis.document = previousDocument;
    }
});
