import Rect from '../rect';
import DrawRect from '../../../components/draw/rect';
import { Events, PDFEvent } from '../../../event';
import { getPixelColor } from '../../../misc';
import { EraseMaskElement } from '../../element/EraseMaskElement';
import { HISTORY_SOURCE } from '../../history_policy';
import { ORIGIN_TEXT_REMOVE_STRATEGY, syncOriginTextState } from '../../origin_text_state';
import { collectIntersectingElements } from './targets.js';

const sampleMaskBackground = (readerPage, rect) => {
    const context = readerPage?.content?.getContext?.('2d');
    if (!context) {
        return '#ffffff';
    }

    const samplePoints = [
        { x: rect.x + 2, y: rect.y + 2 },
        { x: rect.x + Math.max(2, rect.width - 2), y: rect.y + 2 },
        { x: rect.x + 2, y: rect.y + Math.max(2, rect.height - 2) },
        { x: rect.x + Math.max(2, rect.width - 2), y: rect.y + Math.max(2, rect.height - 2) },
        { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    ];

    for (const point of samplePoints) {
        try {
            return getPixelColor(context, point.x * readerPage.outputScale, point.y * readerPage.outputScale);
        } catch (error) {
            // ignore sampling failures near canvas edge
        }
    }

    return '#ffffff';
};

const withSystemHistory = (element, callback) => {
    if (!element) {
        return callback();
    }

    const options = element.options || {};
    const previous = options.historySource;
    element.options = options;
    element.options.historySource = HISTORY_SOURCE.SYSTEM;
    try {
        return callback();
    } finally {
        if (previous === undefined) {
            delete element.options.historySource;
        } else {
            element.options.historySource = previous;
        }
    }
};

const mountElementSilently = (elements, element) => {
    if (!element || elements.items[element.id]) {
        return element;
    }

    elements.items[element.id] = element;
    element.render();
    element.zoom(element.scale);
    return element;
};

const restoreElementSilently = (elements, element) => {
    if (!element || elements.items[element.id]) {
        return element;
    }

    elements.items[element.id] = element;
    element.page.readerPage.elElementLayer.appendChild(element.el);
    element.zoom(element.scale);
    syncOriginTextState(element, true, element?.page?.readerPage || null);
    return element;
};

const removeElementSilently = (elements, element, options = {}) => {
    if (!element || !elements.items[element.id]) {
        return false;
    }

    const originStateStrategy = options?.originStateStrategy || ORIGIN_TEXT_REMOVE_STRATEGY.PRESERVE;
    if (originStateStrategy === ORIGIN_TEXT_REMOVE_STRATEGY.RESTORE) {
        syncOriginTextState(element, false, element?.page?.readerPage || null);
    }
    element.remove();
    delete elements.items[element.id];
    if (elements.activeId === element.id) {
        elements.activeId = null;
    }
    return true;
};

class Eraser extends Rect {
    init() {
        this.name = 'eraser';
        let attrs = {
            background: '#ffffff',
            opacity: 1,
            rotate: undefined,
            borderWidth: undefined,
            borderColor: undefined
        };
        if (Eraser.attrs) {
            attrs = Object.assign(attrs, Eraser.attrs);
        }
        this.setAttrs(attrs);
        //最小绘制
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = Eraser.actions;
    }

    createDrawHandle(readerPage) {
        const page = this.editor.pdfDocument.getPage(readerPage.pageNum);
        return new DrawRect({
            container: readerPage.elDrawLayer,
            scrollElement: this.reader.parentElement,
            background: this.attrs.background,
            opacity: this.attrs.opacity,
            onFinished: rect => {
                if (rect.width < this.minWidth && rect.height < this.minHeight) {
                    return;
                }
                const removedElements = collectIntersectingElements({
                    items: page.elements.items,
                    rect
                });
                removedElements.forEach((element) => {
                    withSystemHistory(element, () => {
                        page.elements.remove(element.id, {
                            originStateStrategy: ORIGIN_TEXT_REMOVE_STRATEGY.PRESERVE
                        });
                    });
                });

                let originTextIndices = [];
                if (typeof readerPage.markClearTextsInRect === 'function') {
                    originTextIndices = readerPage.markClearTextsInRect(rect) || [];
                }

                let maskElement = null;
                if (Array.isArray(originTextIndices) && originTextIndices.length > 0) {
                    maskElement = new EraseMaskElement(page, {
                        width: rect.width,
                        height: rect.height,
                        opacity: this.attrs.opacity,
                        background: sampleMaskBackground(readerPage, rect),
                        rotate: this.attrs.rotate,
                        borderWidth: undefined,
                        borderColor: undefined,
                        originTextIndices,
                        originPageNum: readerPage.pageNum
                    }, {
                        pos: {
                            x: rect.x,
                            y: rect.y
                        },
                        setActions: that => {
                            this.setActions(that);
                        },
                        historySource: HISTORY_SOURCE.USER
                    });
                    mountElementSilently(page.elements, maskElement);
                }

                if (removedElements.length < 1 && !maskElement) {
                    return;
                }

                PDFEvent.dispatch(Events.HISTORY_PUSH, {
                    undo: () => {
                        if (maskElement) {
                            removeElementSilently(page.elements, maskElement, {
                                originStateStrategy: ORIGIN_TEXT_REMOVE_STRATEGY.RESTORE
                            });
                        }
                        removedElements.forEach((element) => {
                            restoreElementSilently(page.elements, element);
                        });
                    },
                    redo: () => {
                        removedElements.forEach((element) => {
                            removeElementSilently(page.elements, element, {
                                originStateStrategy: ORIGIN_TEXT_REMOVE_STRATEGY.PRESERVE
                            });
                        });
                        if (maskElement) {
                            restoreElementSilently(page.elements, maskElement);
                        }
                    },
                    source: HISTORY_SOURCE.USER
                });

                if (maskElement) {
                    PDFEvent.dispatch(Events.ELEMENT_BLUR, {
                        page,
                        element: maskElement
                    });
                }
            }
        });
    }
}

export default Eraser;
