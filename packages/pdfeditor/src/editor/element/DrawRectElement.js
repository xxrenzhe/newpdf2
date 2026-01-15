import { BaseElement } from './BaseElement';
import DrawRect from '../../components/draw/rect';
/**
 * @deprecated
 */
class DrawRectElement extends BaseElement {
    init() {
        this.dataType = 'drawRect';
        let attrs = {
            background: '#000000',
            opacity: 1
        };
        this.attrs = Object.assign(attrs, this.attrs);
        this.el.style.width = this.attrs.width + 'px';
        this.el.style.height = this.attrs.height + 'px';
        this.drawHandle = null;
    }

    childElement() {
        this.drawHandle = new DrawRect({
            container: this.page.readerPage.elDrawLayer,
            scrollElement: this.page.reader.mainBox,
            background: this.attrs.background,
            opacity: this.attrs.opacity,
            onFinished: rect => {
                this.page.elements.add(
                    'rect', {
                        width: rect.width,
                        height: rect.height,
                        opacity: this.attrs.opacity,
                        background: this.attrs.background
                    }, {
                        pos: { 
                            x: rect.x,
                            y: rect.y
                        }
                    }
                );
            }
        });
        return null;
    }
}

export { DrawRectElement };