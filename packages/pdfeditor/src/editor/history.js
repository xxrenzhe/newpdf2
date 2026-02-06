import { Events, PDFEvent } from '../event.js';
import { applyOriginTextState } from './origin_text_state.js';
import {
    HISTORY_SOURCE,
    normalizeHistorySource,
    resolveHistorySource,
    shouldTrackElementHistory,
    shouldTrackHistorySource
} from './history_policy.js';

const OPERATE = {
    CREATE: 1,
    UPDATE: 2,
    REMOVE: 3,
    MOVE: 4,
    RESIZE: 5,
    CUSTOM: 6
};

export { OPERATE };

class OpObject {
    action = 0;
    source = HISTORY_SOURCE.USER;
    undo = null;
    redo = null;

    constructor(action, undo, redo, source = HISTORY_SOURCE.USER) {
        this.action = action;
        this.source = normalizeHistorySource(source);
        this.undo = undo;
        this.redo = redo;
    }
}

const Operator = {
    create: (element, elements) => {
        elements.items[element.id] = element;
        element.page.readerPage.elWrapper.appendChild(element.el);
        element.zoom(element.scale);
        applyOriginTextState(element, true, element?.page?.readerPage || null);
        elements.setActive(element.id);
    },
    remove: (element, elements) => {
        applyOriginTextState(element, false, element?.page?.readerPage || null);
        element.remove();
        delete elements.items[element.id];
        elements.activeId = null;
    },
    updatePosAndSize: (element, rect) => {
        const el = element.el;
        el.style.left = rect.left;
        el.style.top = rect.top;
        el.style.width = rect.width;
        el.style.height = rect.height;
        element.setActualRect();
        element.updateAttrSize();
    },
    updateAttrs: (element, attrs) => {
        element.attrs = attrs;
        element.setStyle(attrs);
        element.zoom(element.scale);
    }
};

export class History {
    editor = null;
    #opList = [];
    #step = 0;

    constructor(editor) {
        this.editor = editor;
        const elSpan = document.querySelector('#history_slider span');
        const updateHistoryCount = () => {
            if (!elSpan) {
                return;
            }
            elSpan.textContent = document.querySelectorAll('#pdf-main .__pdf_editor_element').length;
        };

        PDFEvent.on(Events.ELEMENT_CREATE, e => {
            const element = e.data.element;
            const source = resolveHistorySource(element);
            if (!shouldTrackElementHistory(element)) {
                return;
            }
            const elements = this.editor.pdfDocument.getPageActive().elements;
            this.push(OPERATE.REMOVE, () => {
                Operator.remove(element, elements);
            }, () => {
                Operator.create(element, elements);
            }, source);
            updateHistoryCount();
        });

        PDFEvent.on(Events.ELEMENT_REMOVE, e => {
            const element = e.data.element;
            const source = resolveHistorySource(element);
            if (!shouldTrackElementHistory(element)) {
                return;
            }
            const elements = this.editor.pdfDocument.getPageActive().elements;
            this.push(OPERATE.CREATE, () => {
                Operator.create(element, elements);
            }, () => {
                Operator.remove(element, elements);
            }, source);
            updateHistoryCount();
        });

        PDFEvent.on(Events.ELEMENT_MOVE_START, e => {
            const element = e.data.element;
            const source = resolveHistorySource(element);
            if (!shouldTrackHistorySource(source)) {
                return;
            }

            const el = element.el;
            const rect = {
                top: e.data.that.activeElement.oriTop,
                left: e.data.that.activeElement.oriLeft,
                width: el.style.width,
                height: el.style.height
            };

            PDFEvent.on(Events.ELEMENT_UP, () => {
                const redoRect = {
                    left: el.style.left,
                    top: el.style.top,
                    width: el.style.width,
                    height: el.style.height
                };
                this.push(OPERATE.MOVE, () => {
                    Operator.updatePosAndSize(element, rect);
                }, () => {
                    Operator.updatePosAndSize(element, redoRect);
                }, source);
            }, true);
        });

        PDFEvent.on(Events.ELEMENT_RESIZE_START, e => {
            const element = e.data.element;
            const source = resolveHistorySource(element);
            if (!shouldTrackHistorySource(source)) {
                return;
            }

            const el = element.el;
            const rect = {
                top: e.data.that.activeElement.oriTop,
                left: e.data.that.activeElement.oriLeft,
                width: el.style.width,
                height: el.style.height
            };
            PDFEvent.on(Events.ELEMENT_RESIZE_END, e => {
                const redoRect = {
                    left: el.style.left,
                    top: el.style.top,
                    width: el.style.width,
                    height: el.style.height
                };
                this.push(OPERATE.RESIZE, () => {
                    Operator.updatePosAndSize(element, rect);
                }, () => {
                    Operator.updatePosAndSize(element, redoRect);
                }, source);
            }, true);
        });

        PDFEvent.on(Events.ELEMENT_UPDATE_AFTER, e => {
            const element = e.data.element;
            const source = resolveHistorySource(element);
            if (!shouldTrackHistorySource(source)) {
                return;
            }
            this.push(OPERATE.UPDATE, () => {
                Operator.updateAttrs(element, e.data.oriAttrs);
            }, () => {
                Operator.updateAttrs(element, e.data.attrs);
            }, source);
        });

        PDFEvent.on(Events.HISTORY_PUSH, e => {
            const undo = e?.data?.undo;
            const redo = e?.data?.redo;
            if (typeof undo !== 'function' || typeof redo !== 'function') {
                return;
            }

            const source = normalizeHistorySource(e?.data?.source);
            this.push(OPERATE.CUSTOM, () => {
                undo();
            }, () => {
                redo();
            }, source);
        });
    }

    getOpList() {
        return this.#opList;
    }

    push(action, undo, redo, source = HISTORY_SOURCE.USER) {
        const normalizedSource = normalizeHistorySource(source);
        if (!shouldTrackHistorySource(normalizedSource)) {
            return false;
        }

        this.#opList.splice(this.#step);
        this.#opList.push(new OpObject(action, undo, redo, normalizedSource));
        this.#step++;
        this.#dispatchEvent();
        return true;
    }

    clear() {
        this.#opList = [];
        this.#step = 0;
    }

    /**
     * 撤销
     */
    undo(step) {
        this.#step -= (step || 1);
        if (this.#step < 0) {
            this.#step = 0;
            return;
        }
        this.#opList[this.#step].undo();
        this.#dispatchEvent();
    }

    /**
     * 恢复
     */
    redo(step) {
        this.#step += (step || 0);
        if (this.#step >= this.#opList.length) {
            this.#step = this.#opList.length;
            return;
        }
        this.#opList[this.#step].redo();
        this.#step++;
        this.#dispatchEvent();
    }

    #dispatchEvent() {
        PDFEvent.dispatch(Events.HISTORY_CHANGE, {
            step: this.#step,
            maxStep: this.#opList.length
        });
    }
}
