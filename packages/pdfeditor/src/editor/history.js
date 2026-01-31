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

function captureElementAnchor(element) {
    const el = element?.el;
    if (!el || !el.parentElement) return null;
    const prev = el.previousElementSibling;
    const next = el.nextElementSibling;
    return {
        prevId: prev ? prev.id : null,
        nextId: next ? next.id : null
    };
}

function getElementLayer(element) {
    return element?.page?.readerPage?.elElementLayer || element?.page?.readerPage?.elWrapper || null;
}

const Operator = {
    create: (element, elements) => {
        elements.items[element.id] = element;
        const layer = getElementLayer(element);
        if (layer) {
            const anchor = element.__historyAnchor;
            let inserted = false;
            if (anchor?.nextId) {
                const nextEl = layer.querySelector('#' + anchor.nextId);
                if (nextEl) {
                    layer.insertBefore(element.el, nextEl);
                    inserted = true;
                }
            }
            if (!inserted && anchor?.prevId) {
                const prevEl = layer.querySelector('#' + anchor.prevId);
                if (prevEl && prevEl.parentElement === layer) {
                    if (prevEl.nextSibling) {
                        layer.insertBefore(element.el, prevEl.nextSibling);
                    } else {
                        layer.appendChild(element.el);
                    }
                    inserted = true;
                }
            }
            if (!inserted) {
                layer.appendChild(element.el);
            }
        }
        element.el.classList.toggle('__pdf_el_hidden', Boolean(element.attrs?.hidden));
        element.zoom(element.scale);
    },
    remove: (element, elements) => {
        element.__historyAnchor = captureElementAnchor(element);
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
        if (typeof element.applyAttrs === 'function') {
            element.applyAttrs(attrs);
            return;
        }
        element.attrs = attrs;
        element.setStyle(attrs);
        element.el.classList.toggle('__pdf_el_hidden', Boolean(element.attrs?.hidden));
        element.zoom(element.scale);
    }
}

function updateReaderPageNumber(page) {
    if (!page?.elContainer) return;
    page.elContainer.setAttribute('data-page', page.pageNum);
    if (page.elThumbs) {
        page.elThumbs.setAttribute('data-page', page.pageNum);
        const elNumber = page.elThumbs.querySelector('.__pdf_page_number');
        if (elNumber) {
            elNumber.textContent = page.pageNum;
        }
    }
}

function insertReaderPageDom(reader, readerPage, insertIndex) {
    if (!reader || !readerPage) return;
    const readerDoc = reader.pdfDocument;
    const nextPage = readerDoc?.pages?.[insertIndex + 1];
    if (reader.mainBox && readerPage.elContainer) {
        if (nextPage?.elContainer?.parentElement === reader.mainBox) {
            reader.mainBox.insertBefore(readerPage.elContainer, nextPage.elContainer);
        } else {
            reader.mainBox.appendChild(readerPage.elContainer);
        }
    }
    if (reader.thumbsBox && readerPage.elThumbs) {
        if (nextPage?.elThumbs?.parentElement === reader.thumbsBox) {
            reader.thumbsBox.insertBefore(readerPage.elThumbs, nextPage.elThumbs);
        } else {
            reader.thumbsBox.appendChild(readerPage.elThumbs);
        }
    }
    reader.mainObserver?.observe(readerPage.elContainer);
    if (readerPage.elThumbs) {
        reader.thumbsObserver?.observe(readerPage.elThumbs);
    }
}

function restorePageSnapshot(editor, snapshot) {
    const doc = editor?.pdfDocument;
    const reader = editor?.reader;
    const readerDoc = reader?.pdfDocument;
    if (!doc || !readerDoc) return;
    if (!snapshot?.editorPage || !snapshot?.readerPage) return;

    const pageNum = snapshot.pageNum;
    const editorPage = snapshot.editorPage;
    const readerPage = snapshot.readerPage;
    const insertIndex = Math.max(0, pageNum - 1);

    if (doc.pages.includes(editorPage)) return;

    doc.pages.forEach(page => {
        if (!page) return;
        if (page.pageNum >= pageNum) {
            page.index++;
            page.pageNum++;
        }
    });
    doc.pages.splice(insertIndex, 0, editorPage);
    editorPage.pageNum = pageNum;
    editorPage.index = insertIndex;

    readerDoc.pages.forEach(page => {
        if (!page) return;
        if (page.pageNum >= pageNum) {
            page.index++;
            page.pageNum++;
            updateReaderPageNumber(page);
        }
    });
    readerDoc.pages.splice(insertIndex, 0, readerPage);
    readerPage.pageNum = pageNum;
    readerPage.index = insertIndex;
    updateReaderPageNumber(readerPage);

    insertReaderPageDom(reader, readerPage, insertIndex);

    if (snapshot.removedFromOriginal && Array.isArray(doc.pageRemoved)) {
        const idx = doc.pageRemoved.lastIndexOf(snapshot.removedIndex);
        if (idx >= 0) {
            doc.pageRemoved.splice(idx, 1);
        }
    }
}


export class History {
    editor = null;
    #opList = [];
    #step = 0;

    constructor(editor) {
        this.editor = editor;
        let elSpan = document.querySelector('#history_slider span');
        const updateHistoryCount = () => {
            if (!elSpan) return;
            elSpan.textContent = document.querySelectorAll('#pdf-main .__pdf_editor_element').length;
        };

        PDFEvent.on(Events.ELEMENT_CREATE, e => {
            const element = e.data.element;
            const elements = this.editor.pdfDocument.getPageActive().elements;
            if (element.options.oriText) {
                return;
            }
            element.__historyAnchor = captureElementAnchor(element);
            this.push(OPERATE.REMOVE, () => {
                Operator.remove(element, elements);
            }, () => {
                Operator.create(element, elements);
            });
            updateHistoryCount();
        });

        PDFEvent.on(Events.ELEMENT_REMOVE, e => {
            const element = e.data.element;
            const elements = this.editor.pdfDocument.getPageActive().elements;
            this.push(OPERATE.CREATE, () => {
                Operator.create(element, elements);
            }, () => {
                Operator.remove(element, elements);
            });
            updateHistoryCount();
        });

        PDFEvent.on(Events.PAGE_ADD, e => {
            const pageNum = Number(e.data?.pageNum);
            if (!Number.isFinite(pageNum)) return;
            this.push(OPERATE.CUSTOM, () => {
                this.editor.pdfDocument.removePage(pageNum);
            }, () => {
                this.editor.pdfDocument.addPage(pageNum);
            });
        });

        PDFEvent.on(Events.PAGE_REMOVE, e => {
            const pageNum = Number(e.data?.pageNum);
            if (!Number.isFinite(pageNum)) return;
            const doc = this.editor?.pdfDocument;
            const readerDoc = this.editor?.reader?.pdfDocument;
            if (!doc || !readerDoc) return;
            const pageIndex = Math.max(0, pageNum - 1);
            const editorPage = doc.pages[pageIndex] || doc.getPage(pageNum);
            const readerPage = readerDoc.pages?.[pageIndex] || readerDoc.getPage(pageNum);
            if (!editorPage || !readerPage) return;

            const snapshot = {
                pageNum,
                removedIndex: pageIndex,
                removedFromOriginal: !editorPage.newPagesize,
                editorPage,
                readerPage
            };

            this.push(OPERATE.CUSTOM, () => {
                restorePageSnapshot(this.editor, snapshot);
            }, () => {
                this.editor.pdfDocument.removePage(pageNum);
            });
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
