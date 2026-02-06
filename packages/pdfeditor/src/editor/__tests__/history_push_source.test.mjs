import test from 'node:test';
import assert from 'node:assert/strict';
import { History, OPERATE } from '../history.js';
import { HISTORY_SOURCE } from '../history_policy.js';

const createHistory = () => {
    const previousDocument = globalThis.document;
    globalThis.document = {
        querySelector: () => null,
        querySelectorAll: () => []
    };

    const history = new History({
        pdfDocument: {
            getPageActive: () => ({
                elements: {
                    items: {},
                    activeId: null,
                    setActive: () => {}
                }
            })
        }
    });

    return {
        history,
        restore: () => {
            globalThis.document = previousDocument;
        }
    };
};

test('History.push only tracks user source operations', () => {
    const { history, restore } = createHistory();

    try {
        const userUndo = () => {};
        const userRedo = () => {};

        const systemAccepted = history.push(OPERATE.CUSTOM, userUndo, userRedo, HISTORY_SOURCE.SYSTEM);
        assert.equal(systemAccepted, false);
        assert.equal(history.getOpList().length, 0);

        const userAccepted = history.push(OPERATE.CUSTOM, userUndo, userRedo, HISTORY_SOURCE.USER);
        assert.equal(userAccepted, true);
        assert.equal(history.getOpList().length, 1);
    } finally {
        restore();
    }
});
