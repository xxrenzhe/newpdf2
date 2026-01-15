import { BaseElement } from './BaseElement';
import { hexToRgb } from '../../misc';

class EllipseElement extends BaseElement {
    init() {
        this.dataType = 'ellipse';
        let attrs = {
            width: 50,
            height: 50,
            opacity: 1,
            background: '#000000',
            rotate: undefined,
            borderWidth: undefined,
            borderColor: undefined,
            borderDashArray: undefined, //number[]
        };
        this.attrs = Object.assign(attrs, this.attrs);

        this.elEllipse = document.createElement('div');
        this.elEllipse.style.width = '100%';
        this.elEllipse.style.height = '100%';
        this.setStyle();
    }

    setStyle() {
        this.el.style.width = this.attrs.width + 'px';
        this.el.style.height = this.attrs.height + 'px';
        this.elEllipse.style.background = this.attrs.background;
        this.elEllipse.style.opacity = this.attrs.opacity;
        if (this.attrs.borderWidth) {
            this.elEllipse.style.borderWidth = this.attrs.borderWidth + 'px';
            this.elEllipse.style.borderStyle = 'solid';
        }
        if (this.attrs.borderColor) {
            this.elEllipse.style.borderColor = this.attrs.borderColor;
        }
        this.elEllipse.style.borderRadius = '50%';
    }

    childElement() {
        this.setStyle();
        this.options.resizableOptions = {
            showBorder: true,
            minWidth: null,
            minHeight: null
        };
        return this.elEllipse;
    }

    async insertToPDF() {
        let x = this.getX();
        let y = this.getY();
        let _width = this.attrs.width / 2 / this.pageScale;
        let _height = this.attrs.height / 2 / this.pageScale;
        let options = {
            x: x + _width,
            y: this.page.height - (y + _height),
            xScale: _width, //半径
            yScale: _height, //半径
            color: this.attrs.background ? this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.background).map(v => (v / 255))) : undefined,
            opacity: this.attrs.opacity,
            borderOpacity: this.attrs.opacity,
            borderWidth: this.attrs.borderWidth,
            borderDashArray: this.attrs.borderDashArray,
            borderColor: this.attrs.borderColor ? this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.borderColor).map(v => (v / 255))) : undefined
        };
        if (this.attrs.rotate) {
            options.rotate = this.degrees(this.attrs.rotate);
        }
        this.page.pageProxy.drawEllipse(options);
        return true;
    }
}

export { EllipseElement };