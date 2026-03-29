import test from 'node:test';
import assert from 'node:assert/strict';

const createClassList = () => {
    const classes = new Set();
    return {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        toggle: (name, force) => {
            if (force === undefined) {
                if (classes.has(name)) {
                    classes.delete(name);
                    return false;
                }
                classes.add(name);
                return true;
            }
            if (force) {
                classes.add(name);
                return true;
            }
            classes.delete(name);
            return false;
        },
        contains: (name) => classes.has(name)
    };
};

const createElement = () => ({
    classList: createClassList(),
    appendChild: () => {},
    addEventListener: () => {}
});

test('DeletePages toggles isolated page-management mode and restores previous view mode on blur', async () => {
    const previousDocument = globalThis.document;
    const previousLangCode = globalThis.LANG_CODE;
    const previousLangMessages = globalThis.LANG_MESSAGES;
    globalThis.document = {
        createElement
    };
    globalThis.LANG_CODE = 'en';
    globalThis.LANG_MESSAGES = {};

    try {
        const [{ default: DeletePages, DELETE_PAGES_MODE_CLASS }, { VIEW_MODE }] = await Promise.all([
            import('../toolbar/delete_pages/index.js'),
            import('../../defines.js')
        ]);

        const mainBox = createElement();
        const calls = [];
        const reader = {
            viewMode: VIEW_MODE.FIT_WIDTH,
            mainBox,
            setViewMode: (nextMode) => {
                calls.push(nextMode);
                reader.viewMode = nextMode;
            }
        };

        const tool = new DeletePages({
            editor: {
                reader
            },
            setActive: () => {}
        });

        tool.onActive(true);
        assert.equal(mainBox.classList.contains(DELETE_PAGES_MODE_CLASS), true);
        assert.equal(reader.viewMode, VIEW_MODE.VIEW_2PAGE);
        assert.deepEqual(calls, [VIEW_MODE.VIEW_2PAGE]);

        tool.onActive(false);
        assert.equal(mainBox.classList.contains(DELETE_PAGES_MODE_CLASS), false);
        assert.equal(reader.viewMode, VIEW_MODE.FIT_WIDTH);
        assert.deepEqual(calls, [VIEW_MODE.VIEW_2PAGE, VIEW_MODE.FIT_WIDTH]);
    } finally {
        globalThis.document = previousDocument;
        globalThis.LANG_CODE = previousLangCode;
        globalThis.LANG_MESSAGES = previousLangMessages;
    }
});
