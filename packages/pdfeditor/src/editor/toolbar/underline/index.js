import { ToolbarItemBase } from '../ToolbarItemBase';
import rangy from 'rangy';
import 'rangy/lib/rangy-classapplier';
import 'rangy/lib/rangy-highlighter';
import { Events, PDFEvent } from '../../../event';
import { createId } from '../../../misc';

const HIGHLIGHT_CLASS = 'text_underline';
const REMOVED_CLASS = '__removed';
const TAG_NAME = 'underline';

class Underline extends ToolbarItemBase {
    init() {
        this.name = 'underline';
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
                    rect.x -= mainRect.x;
                    rect.y -= mainRect.y;

                    el.setAttribute('data-x', rect.x);
                    el.setAttribute('data-y', rect.y);
                    el.setAttribute('data-w', rect.width);
                    el.setAttribute('data-h', rect.height);

                    const scale = page.scale || 1;
                    const markupId = createId('tm_');
                    const thicknessPx = 2;
                    page.addTextMarkup({
                        id: markupId,
                        type: 'underline',
                        x: rect.x / scale,
                        y: rect.y / scale,
                        width: rect.width / scale,
                        height: rect.height / scale,
                        thickness: thicknessPx / scale,
                        offset: (rect.height - thicknessPx) / scale,
                        background: this.attrs.background,
                        opacity: this.attrs.opacity
                    });
                    el.setAttribute('data-markup-id', markupId);
                    el.classList.add(REMOVED_CLASS);
                    el.style.display = 'none';

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
