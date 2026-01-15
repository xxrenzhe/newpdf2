import Rect from '../rect';
import DrawEllipse from '../../../components/draw/ellipse';
import { Events, PDFEvent } from '../../../event';

class Ellipse extends Rect {
    init() {
        this.name = 'ellipse';
        let attrs = {
            background: '#000000',
            opacity: 1,
            rotate: undefined,
            borderWidth: undefined,
            borderColor: undefined
        };
        if (Ellipse.attrs) {
            attrs = Object.assign(attrs, Ellipse.attrs);
        }
        this.setAttrs(attrs);
        //最小绘制
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = Ellipse.actions;
    }

    createDrawHandle(readerPage) {
        const page = this.editor.pdfDocument.getPage(readerPage.pageNum);
        return new DrawEllipse({
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

                PDFEvent.dispatch(Events.ELEMENT_BLUR, {
                    page,
                    element
                });
            }
        });
    }
}

export default Ellipse;