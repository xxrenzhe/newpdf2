import Rect from '../rect';
import DrawRect from '../../../components/draw/rect';
import { Events, PDFEvent } from '../../../event';

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
                const element = page.elements.add('rect', {
                    width: rect.width,
                    height: rect.height,
                    opacity: this.attrs.opacity,
                    background: this.attrs.background,
                    rotate: this.attrs.rotate,
                    borderWidth: this.attrs.borderWidth,
                    borderColor: this.attrs.borderColor
                }, {
                    pos: {
                        x: rect.x,
                        y: rect.y
                    },
                    setActions: that => {
                        this.setActions(that);
                    }
                });
                let originTextIndices = [];
                if (typeof readerPage.markClearTextsInRect === 'function') {
                    originTextIndices = readerPage.markClearTextsInRect(rect) || [];
                }
                if (Array.isArray(originTextIndices) && originTextIndices.length > 0) {
                    element.attrs.originTextIndices = originTextIndices;
                    element.attrs.originPageNum = readerPage.pageNum;
                }
                PDFEvent.dispatch(Events.ELEMENT_BLUR, {
                    page,
                    element
                });
            }
        });
    }
}

export default Eraser;
