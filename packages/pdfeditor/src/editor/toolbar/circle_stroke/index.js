import RectStroke from '../rect_stroke';
import DrawCircle from '../../../components/draw/circle';
import { Events, PDFEvent } from '../../../event';

class CircleStroke extends RectStroke {
    init() {
        this.name = 'circle_stroke';
        let attrs = {
            opacity: 1,
            borderWidth: 2,
            borderColor: '#ff0000'
        };
        if (CircleStroke.attrs) {
            attrs = Object.assign(attrs, CircleStroke.attrs);
        }
        this.setAttrs(attrs);
        //最小绘制
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = CircleStroke.actions;
    }

    createDrawHandle(readerPage) {
        const page = this.editor.pdfDocument.getPage(readerPage.pageNum);
        return new DrawCircle({
            container: readerPage.elDrawLayer,
            scrollElement: this.reader.parentElement,
            borderWidth: this.attrs.borderWidth + 'px',
            borderColor: this.attrs.borderColor,
            opacity: this.attrs.opacity,
            onFinished: rect => {
                if (rect.width < this.minWidth && rect.height < this.minHeight) {
                    return;
                }
                const element = page.elements.add('ellipse', {
                    width: rect.width,
                    height: rect.height,
                    opacity: this.attrs.opacity,
                    background: this.attrs.background,
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

                PDFEvent.dispatch(Events.ELEMENT_BLUR, {
                    page,
                    element
                });
            }
        });
    }
}

export default CircleStroke;