import test from 'node:test';
import assert from 'node:assert/strict';
import { History } from '../history.js';
import { Events, PDFEvent } from '../../event.js';

test('History binds create/remove undo to the event page instead of active page', () => {
    const previousDocument = globalThis.document;
    globalThis.document = {
        querySelector: () => null,
        querySelectorAll: () => []
    };

    try {
        const targetElements = {
            items: {},
            activeId: null,
            setActive: () => {}
        };
        const activeElements = {
            items: {},
            activeId: null,
            setActive: () => {}
        };

        const element = {
            id: 'el-1',
            options: { historySource: 'user' },
            page: {
                readerPage: {
                    elWrapper: {
                        appendChild: () => {}
                    }
                }
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

        const history = new History({
            pdfDocument: {
                getPageActive: () => ({ elements: activeElements })
            }
        });

        PDFEvent.dispatch(Events.ELEMENT_CREATE, {
            page: { elements: targetElements },
            element
        });

        assert.equal(history.getOpList().length, 1);
        history.undo();
        assert.equal(activeElements.items[element.id], undefined);
        assert.equal(targetElements.items[element.id], undefined);

        history.redo();
        assert.equal(targetElements.items[element.id], element);
        assert.equal(activeElements.items[element.id], undefined);
    } finally {
        globalThis.document = previousDocument;
    }
});
