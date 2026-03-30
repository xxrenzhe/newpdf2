import { ToolbarItemBase } from '../ToolbarItemBase';
import rangy from 'rangy';
import 'rangy/lib/rangy-classapplier';
import 'rangy/lib/rangy-highlighter';
import { Events, PDFEvent } from '../../../event';
import { HISTORY_SOURCE } from '../../history_policy';

const HIGHLIGHT_CLASS = 'text_strike';
const HIGHLIGHT_COMPAT_CLASS = '__pdf_text_markup_strikethrough';
const REMOVED_CLASS = '__removed';
const TAG_NAME = 'strikethrough';

class Strikethrough extends ToolbarItemBase {
    init() {
        this.name = 'strikethrough';
        let attrs = {
            background: '#ff0000',
            opacity: 1
        };
        if (Strikethrough.attrs) {
            attrs = Object.assign(attrs, Strikethrough.attrs);
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
                el.classList.add(HIGHLIGHT_COMPAT_CLASS);
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
                        },
                        source: HISTORY_SOURCE.USER
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
                    //         y: rect.y + rect.height / 2 - thickness / 2
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
                const pageId = el.getAttribute('data-pageid');
                const page = this.editor.pdfDocument.getPageForId(pageId);
                // [KISS Optimization] 动态提取实时物理坐标，彻底免疫缩放级别的变化导致标注偏移
                const domRect = el.getBoundingClientRect();
                const mainRect = page.readerPage.elWrapper.getBoundingClientRect();
                const rect = {
                    x: domRect.x - mainRect.x,
                    y: domRect.y - mainRect.y,
                    width: domRect.width,
                    height: domRect.height
                };
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
                        y: rect.y + rect.height / 2 - thickness / 2
                    }
                });
            });
        });

        // [KISS Optimization] 彻底清除文本标注保存时的图层污染
        PDFEvent.on(Events.SAVE_AFTER, e => {
            this.editor.pdfDocument.pages.forEach(page => {
                let toRemove = [];
                for (let key in page.elements.items) {
                    if (page.elements.items[key].options?.source === 'text_markup_export') {
                        toRemove.push(key);
                    }
                }
                toRemove.forEach(id => page.elements.remove(id));
            });
        });
    }
}

export default Strikethrough;
