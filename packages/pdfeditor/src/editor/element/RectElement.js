import { BaseElement } from './BaseElement';
import { hexToRgb } from '../../misc';

class RectElement extends BaseElement {
    init() {
        this.dataType = 'rect';
        let attrs = {
            width: 50,
            height: 50,
            opacity: 1,
            background: '#000000',
            rotate: undefined,
            borderOpacity: undefined,
            borderWidth: undefined,
            borderColor: undefined,
            borderDashArray: undefined //number[]
        };
        this.attrs = Object.assign(attrs, this.attrs);

        this.elRect = document.createElement('div');
        this.elRect.style.width = '100%';
        this.elRect.style.height = '100%';
        // this.setStyle();
    }

    setStyle() {
        this.el.style.width = this.attrs.width + 'px';
        this.el.style.height = this.attrs.height + 'px';
        this.elRect.style.background = this.attrs.background;
        this.elRect.style.opacity = this.attrs.opacity;
        if (this.attrs.borderWidth) {
            this.el.style.borderWidth = this.attrs.borderWidth + 'px';
            this.el.style.borderStyle = 'solid';
        }
        
        if (this.attrs.borderColor) {
            let borderColor = hexToRgb(this.attrs.borderColor);
            borderColor.push(this.attrs.opacity);
            this.el.style.borderColor = 'rgba('+ borderColor.join(',') +')';
        }
    }

    childElement() {
        this.setStyle();
        return this.elRect;
    }

    async insertToPDF() {
        let x = this.getX();
        let y = this.getY();
        let _width = this.attrs.width / this.pageScale;
        let _height = this.attrs.height / this.pageScale;
        let options = {
            x: x,
            y: this.page.height - (y + _height),
            width: _width,
            height: _height,
            color: this.attrs.background ? this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.background).map(v => (v / 255))) : undefined,
            opacity: this.attrs.opacity,
            borderOpacity: this.attrs.borderOpacity !== undefined ? this.options.borderOpacity : this.attrs.opacity,
            borderWidth: this.attrs.borderWidth,
            borderDashArray: this.attrs.borderDashArray,
            borderColor: this.attrs.borderColor ? this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.borderColor).map(v => (v / 255))) : undefined
        };
        if (this.attrs.rotate) {
            options.rotate = this.degrees(this.attrs.rotate);
        }
        this.page.pageProxy.drawRectangle(options);
        return true;
    }
}

export { RectElement };