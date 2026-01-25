import { ToolbarItemBase } from '../ToolbarItemBase';
import rangy from 'rangy';
import 'rangy/lib/rangy-classapplier';
import 'rangy/lib/rangy-highlighter';
import { Events, PDFEvent } from '../../../event';
import { createId } from '../../../misc';

const HIGHLIGHT_CLASS = 'text_underline';
const REMOVED_CLASS = '__removed';
const TAG_NAME = 'underline';

const getSelectionRect = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return null;
    }
    const range = selection.getRangeAt(0);
    const rectangles = Array.from(range.getClientRects());
    if (rectangles.length > 0) {
        let left = rectangles[0].left;
        let top = rectangles[0].top;
        let right = rectangles[0].right;
        let bottom = rectangles[0].bottom;
        rectangles.slice(1).forEach(rect => {
            left = Math.min(left, rect.left);
            top = Math.min(top, rect.top);
            right = Math.max(right, rect.right);
            bottom = Math.max(bottom, rect.bottom);
        });
        const width = right - left;
        const height = bottom - top;
        if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
            return { left, top, width, height };
        }
    }
    const rect = range.getBoundingClientRect();
    if (rect && (rect.width || rect.height)) {
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }
    const nodes = [selection.anchorNode, selection.focusNode]
        .map(node => {
            if (!node) return null;
            if (node.nodeType === Node.TEXT_NODE) return node.parentElement;
            if (node.nodeType === Node.ELEMENT_NODE) return node;
            return null;
        })
        .filter(Boolean);
    if (!nodes.length) {
        return null;
    }
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    nodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        if (!rect.width && !rect.height) {
            return;
        }
        left = Math.min(left, rect.left);
        top = Math.min(top, rect.top);
        right = Math.max(right, rect.right);
        bottom = Math.max(bottom, rect.bottom);
    });
    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
        return null;
    }
    const width = right - left;
    const height = bottom - top;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
    }
    return { left, top, width, height };
};

const getRectFromChildren = (element) => {
    if (!element) {
        return null;
    }
    const children = Array.from(element.querySelectorAll('span, [role="presentation"]'));
    if (!children.length) {
        return null;
    }
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    children.forEach(child => {
        const rect = child.getBoundingClientRect();
        if (!rect.width && !rect.height) {
            return;
        }
        left = Math.min(left, rect.left);
        top = Math.min(top, rect.top);
        right = Math.max(right, rect.right);
        bottom = Math.max(bottom, rect.bottom);
    });
    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
        return null;
    }
    const width = right - left;
    const height = bottom - top;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
    }
    return { left, top, width, height };
};

class Underline extends ToolbarItemBase {
    init() {
        this.name = 'underline';
        this.pendingSelectionRect = null;
        let attrs = {
            background: '#ff0000',
            opacity: 1
        };
        if (Underline.attrs) {
            attrs = Object.assign(attrs, Underline.attrs);
        }
        this.setAttrs(attrs);

        rangy.init();
        this.highlighter = rangy.createHighlighter();

        this.applier = rangy.createClassApplier(HIGHLIGHT_CLASS, {
            ignoreWhiteSpace: true,
            elementTagName: TAG_NAME,
            useExistingElements: true,
            onElementCreate: (el, that) => {
                const page = this.reader.pdfDocument.getPageActive();
                el.setAttribute('data-pageid', page.id);
                setTimeout(() => {
                    const rect = el.getBoundingClientRect();
                    const mainRect = page.elWrapper.getBoundingClientRect();
                    let fallback = this.pendingSelectionRect;
                    let left = rect.left;
                    let top = rect.top;
                    let width = rect.width;
                    let height = rect.height;
                    if ((!width || !height) && fallback) {
                        left = fallback.left;
                        top = fallback.top;
                        width = fallback.width;
                        height = fallback.height;
                    }
                    if ((!width || !height) && !fallback) {
                        fallback = getRectFromChildren(el);
                        if (fallback) {
                            left = fallback.left;
                            top = fallback.top;
                            width = fallback.width;
                            height = fallback.height;
                        }
                    }
                    left -= mainRect.left;
                    top -= mainRect.top;

                    el.setAttribute('data-x', left);
                    el.setAttribute('data-y', top);
                    el.setAttribute('data-w', width);
                    el.setAttribute('data-h', height);

                    const scale = page.scale || 1;
                    const markupId = createId('tm_');
                    const thicknessPx = 2;
                    page.addTextMarkup({
                        id: markupId,
                        type: 'underline',
                        x: left / scale,
                        y: top / scale,
                        width: width / scale,
                        height: height / scale,
                        thickness: thicknessPx / scale,
                        offset: (height - thicknessPx) / scale,
                        background: this.attrs.background,
                        opacity: this.attrs.opacity
                    });
                    el.setAttribute('data-markup-id', markupId);
                    page.setTextMarkupVisible(markupId, true);
                    el.classList.add(REMOVED_CLASS);
                    el.style.display = 'none';
                    this.pendingSelectionRect = null;

                    PDFEvent.dispatch(Events.HISTORY_PUSH, {
                        undo: () => {
                            page.setTextMarkupVisible(markupId, false);
                        },
                        redo: () => {
                            page.setTextMarkupVisible(markupId, true);
                        }
                    });


                    // const pageId = el.getAttribute('data-pageid');
                    // const pagea = this.editor.pdfDocument.getPageForId(pageId);
                    // let thickness = rect.height * 0.1;
                    // pagea.elements.add('rect', {
                    //     width: rect.width,
                    //     height: thickness,
                    //     opacity: this.attrs.opacity,
                    //     background: this.attrs.background
                    // }, {
                    //     pos: {
                    //         x: rect.x,
                    //         y: rect.y + rect.height - thickness
                    //     }
                    // });
                }, 200);
            }
        });

        this.highlighter.addClassApplier(this.applier);
        this.reader.mainBox.addEventListener('mouseup', e => {
            if (this.status) {
                this.pendingSelectionRect = getSelectionRect();
                this.highlighter.highlightSelection(HIGHLIGHT_CLASS);
                rangy.getSelection().removeAllRanges();
            }
        });

        PDFEvent.on(Events.SAVE_BEFORE, () => {
            const pages = this.reader.pdfDocument?.pages || [];
            pages.forEach(readerPage => {
                if (!readerPage || typeof readerPage.getTextMarkups !== 'function') {
                    return;
                }
                const markups = readerPage.getTextMarkups().filter(item => item.type === 'underline' && !item.hidden);
                if (!markups.length) {
                    return;
                }
                const page = this.editor.pdfDocument.getPageForId(readerPage.id);
                if (!page) {
                    return;
                }
                const scale = readerPage.scale || 1;
                markups.forEach(markup => {
                    const thickness = (markup.thickness || 0) * scale;
                    const offset = (markup.offset || 0) * scale;
                    page.elements.add('rect', {
                        width: (markup.width || 0) * scale,
                        height: thickness,
                        opacity: markup.opacity,
                        background: markup.background
                    }, {
                        pos: {
                            x: (markup.x || 0) * scale,
                            y: (markup.y || 0) * scale + offset
                        }
                    });
                });
            });
        });
    }
}

export default Underline;
