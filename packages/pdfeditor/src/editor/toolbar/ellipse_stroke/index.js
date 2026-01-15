import RectStroke from '../rect_stroke';
import DrawEllipse from '../../../components/draw/ellipse';
import { Events, PDFEvent } from '../../../event';

class EllipseStroke extends RectStroke {
    init() {
        this.name = 'ellipse_stroke';
        let attrs = {
            opacity: 1,
            rotate: undefined,
            borderWidth: 2,
            borderColor: '#ff0000'
        };
        if (EllipseStroke.attrs) {
            attrs = Object.assign(attrs, EllipseStroke.attrs);
        }
        this.setAttrs(attrs);
        //最小绘制
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = EllipseStroke.actions;
    }

    createDrawHandle(readerPage) {
        const page = this.editor.pdfDocument.getPage(readerPage.pageNum);
        return new DrawEllipse({
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

export default EllipseStroke;