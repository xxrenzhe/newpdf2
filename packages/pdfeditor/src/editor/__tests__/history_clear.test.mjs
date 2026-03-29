import test from 'node:test';
import assert from 'node:assert/strict';
import { History } from '../history.js';
import { Events, PDFEvent } from '../../event.js';

test('History.clear resets steps and dispatches history change event', () => {
    const previousDocument = globalThis.document;
    globalThis.document = {
        querySelector: () => null,
        querySelectorAll: () => []
    };

    const changes = [];
    const onHistoryChange = (event) => {
        changes.push(event.data);
    };

    PDFEvent.on(Events.HISTORY_CHANGE, onHistoryChange);

    try {
        const history = new History({
            pdfDocument: {
                getPageActive: () => ({ elements: { items: {}, activeId: null, setActive: () => {} } })
            }
        });

        history.push(1, () => {}, () => {});
        history.clear();

        assert.deepEqual(changes.at(-1), {
            step: 0,
            maxStep: 0
        });
        assert.equal(history.getOpList().length, 0);
    } finally {
        PDFEvent.unbind(Events.HISTORY_CHANGE, onHistoryChange);
        globalThis.document = previousDocument;
    }
});
