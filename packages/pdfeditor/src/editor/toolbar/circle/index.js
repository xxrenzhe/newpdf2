import Rect from '../rect';
import DrawCircle from '../../../components/draw/circle';
import { Events, PDFEvent } from '../../../event';

class Circle extends Rect {
    init() {
        this.name = 'circle';
        let attrs = {
            background: '#000000',
            opacity: 1,
            borderWidth: undefined,
            borderColor: undefined
        };
        if (Circle.attrs) {
            attrs = Object.assign(attrs, Circle.attrs);
        }
        this.setAttrs(attrs);
        //最小绘制
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = Circle.actions;
    }

    createDrawHandle(readerPage) {
        const page = this.editor.pdfDocument.getPage(readerPage.pageNum);
        return new DrawCircle({
            container: readerPage.elDrawLayer,
            scrollElement: this.reader.parentElement,
            background: this.attrs.background,
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

export default Circle;