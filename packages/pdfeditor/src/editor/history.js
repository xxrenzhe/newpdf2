import { Events, PDFEvent } from '../event';

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
    undo = null;
    redo = null;

    constructor(action, undo, redo) {
        this.action = action;
        this.undo = undo;
        this.redo = redo;
    }
}

const Operator = {
    create: (element, elements) => {
        elements.items[element.id] = element;
        element.page.readerPage.elWrapper.appendChild(element.el);
        element.zoom(element.scale);
        elements.setActive(element.id);
    },
    remove: (element, elements) => {
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
}


export class History {
    editor = null;
    #opList = [];
    #step = 0;

    constructor(editor) {
        this.editor = editor;
        let elSpan = document.querySelector('#history_slider span');

        PDFEvent.on(Events.ELEMENT_CREATE, e => {
            const element = e.data.element;
            const elements = this.editor.pdfDocument.getPageActive().elements;
            if (element.options.oriText) {
                return;
            }
            this.push(OPERATE.REMOVE, () => {
                Operator.remove(element, elements);
            }, () => {
                Operator.create(element, elements);
            });
            elSpan.textContent = document.querySelectorAll('#pdf-main .__pdf_editor_element').length;
        });

        PDFEvent.on(Events.ELEMENT_REMOVE, e => {
            const element = e.data.element;
            const elements = this.editor.pdfDocument.getPageActive().elements;
            this.push(OPERATE.CREATE, () => {
                Operator.create(element, elements);
            }, () => {
                Operator.remove(element, elements);
            });
            elSpan.textContent = document.querySelectorAll('#pdf-main .__pdf_editor_element').length;
        });

        PDFEvent.on(Events.ELEMENT_MOVE_START, e => {
            const element = e.data.element;
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
                });
            }, true);
        });

        PDFEvent.on(Events.ELEMENT_RESIZE_START, e => {
            const element = e.data.element;
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
                });
            }, true);
        });

        PDFEvent.on(Events.ELEMENT_UPDATE_AFTER, e => {
            const element = e.data.element;
            this.push(OPERATE.UPDATE, () => {
                Operator.updateAttrs(element, e.data.oriAttrs);
            }, () => {
                Operator.updateAttrs(element, e.data.attrs);
            });
        });

        PDFEvent.on(Events.HISTORY_PUSH, e => {
            this.push(OPERATE.CUSTOM, () => {
                e.data.undo();
            }, () => {
                e.data.redo();
            });
        });
    }

    getOpList() {
        return this.#opList;
    }

    push(action, undo, redo) {
        this.#opList.splice(this.#step);
        this.#opList.push(new OpObject(action, undo, redo));
        this.#step++;
        this.#dispatchEvent();
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