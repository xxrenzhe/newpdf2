import { ToolbarItemBase } from '../ToolbarItemBase';
import rangy from 'rangy';
import 'rangy/lib/rangy-classapplier';
import 'rangy/lib/rangy-highlighter';
import { Events, PDFEvent } from '../../../event';

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

                    PDFEvent.dispatch(Events.HISTORY_PUSH, {
                        undo: () => {
                            el.classList.add(REMOVED_CLASS);
                            el.style.display = 'none';
                        },
                        redo: () => {
                            el.classList.remove(REMOVED_CLASS);
                            el.style.display = 'inline';
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

        PDFEvent.on(Events.SAVE_BEFORE, e => {
            this.reader.mainBox.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach(el => {
                if (el.classList.contains(REMOVED_CLASS)) {
                    return;
                }
                const rect = {
                    x: parseFloat(el.getAttribute('data-x')),
                    y: parseFloat(el.getAttribute('data-y')),
                    width: parseFloat(el.getAttribute('data-w')),
                    height: parseFloat(el.getAttribute('data-h'))
                };

                const pageId = el.getAttribute('data-pageid');
                const page = this.editor.pdfDocument.getPageForId(pageId);
                // let thickness = rect.height * 0.1;
                let thickness = 2;
                page.elements.add('rect', {
                    width: rect.width,
                    height: thickness,
                    opacity: this.attrs.opacity,
                    background: this.attrs.background
                }, {
                    pos: {
                        x: rect.x,
                        y: rect.y + rect.height - thickness
                    }
                });
            });
        });
    }
}

export default Underline;