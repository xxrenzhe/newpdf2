import { BaseElement } from './BaseElement';
import { hexToRgb } from '../../misc';

class CircleElement extends BaseElement {
    init() {
        this.dataType = 'circle';
        let attrs = {
            size: 50,
            opacity: 1,
            background: '#000000',
            borderWidth: undefined,
            borderColor: undefined,
            borderDashArray: undefined, //number[]
        };
        this.attrs = Object.assign(attrs, this.attrs);

        this.elCircle = document.createElement('div');
        this.elCircle.style.width = '100%';
        this.elCircle.style.height = '100%';
        this.setStyle();
    }

    setStyle() {
        this.el.style.width = this.attrs.size + 'px';
        this.el.style.height = this.attrs.size + 'px';
        this.elCircle.style.background = this.attrs.background;
        this.elCircle.style.opacity = this.attrs.opacity;
        if (this.attrs.borderWidth) {
            this.elCircle.style.borderWidth = this.attrs.borderWidth + 'px';
            this.elCircle.style.borderStyle = 'solid';
        }
        if (this.attrs.borderColor) {
            this.elCircle.style.borderColor = this.attrs.borderColor;
        }
        this.elCircle.style.borderRadius = '50%';
    }

    childElement() {
        this.setStyle();
        this.options.resizableOptions = {
            showBorder: true,
            minWidth: null,
            minHeight: null
        };
        return this.elCircle;
    }

    async insertToPDF() {
        let x = this.getX();
        let y = this.getY();
        let size = this.attrs.size / 2 / this.pageScale;
        let options = {
            x: x + size,
            y: this.page.height - (y + size),
            size: size, //半径
            color: this.attrs.background ? this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.background).map(v => (v / 255))) : undefined,
            opacity: this.attrs.opacity,
            borderOpacity: this.attrs.opacity,
            borderWidth: this.attrs.borderWidth,
            borderDashArray: this.attrs.borderDashArray,
            borderColor: this.attrs.borderColor ? this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.borderColor).map(v => (v / 255))) : undefined
        };
        this.page.pageProxy.drawCircle(options);
        return true;
    }
}

export { CircleElement };