import { BaseElement } from './BaseElement';
import { hexToRgb } from '../../misc';

class SvgPathElement extends BaseElement {
    init() {
        this.dataType = 'svgPath';
        let attrs = {
            width: 50,
            height: 50,
            viewboxX: 0,
            viewboxY: 0,
            viewboxW: 0,
            viewboxH: 0,
            path: '',
            opacity: 1,
            borderOpacity: 1,
            color: '#000000',
            rotate: undefined,
            borderWidth: undefined,
            borderLineCap: 'round',
            borderColor: undefined,
            borderDashArray: undefined
        };
        this.attrs = Object.assign(attrs, this.attrs);

        this.elSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.elSvg.setAttribute('version', '1.1');
        this.elPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.elSvg.appendChild(this.elPath);
    }

    setStyle() {
        this.el.style.width = this.attrs.width + 'px';
        this.el.style.height = this.attrs.height + 'px';
        this.elSvg.style.width = '100%';
        this.elSvg.style.height = '100%';

        this.elSvg.setAttribute('preserveAspectRatio', 'none');
        this.elSvg.setAttribute('viewBox', this.attrs.viewboxX + ' ' + this.attrs.viewboxY + ' ' + this.attrs.viewboxW + ' ' + this.attrs.viewboxH);
        this.elSvg.setAttribute('width', this.attrs.width + 'px');
        this.elSvg.setAttribute('height', this.attrs.height + 'px');
        this.elPath.setAttribute('stroke', this.attrs.color);
        this.elPath.setAttribute('stroke-width', this.attrs.borderWidth);
        this.elPath.setAttribute('stroke-linecap', this.attrs.borderLineCap);
        this.elPath.setAttribute('stroke-opacity', this.attrs.opacity);
        this.elPath.setAttribute('d', this.attrs.path);
    }

    childElement() {
        this.setStyle();
        this.options.resizableOptions = {
            position: ['ner', 'ser', 'swr', 'nwr'],
            isRatio: true,
            showBorder: true,
            minWidth: null,
            minHeight: null
        };
        return this.elSvg;
    }

    async insertToPDF() {
        let x = this.getX();
        let y = this.getY();
        let scale = this.attrs.width / this.attrs.viewboxH / this.pageScale;
        let options = {
            x: x,
            y: this.page.height - y,
            color: this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.color).map(v => (v / 255))),
            opacity: this.attrs.opacity,
            borderOpacity: this.attrs.borderOpacity,
            borderWidth: this.attrs.borderWidth,
            borderDashArray: this.attrs.borderDashArray,
            path: this.attrs.path,
            scale: scale
        };
        if (this.attrs.borderColor) {
            options.borderColor = this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.borderColor).map(v => (v / 255)));
        }
        if (this.attrs.rotate) {
            options.rotate = this.degrees(this.attrs.rotate);
        }
        this.page.pageProxy.drawSvgPath(options.path, options);
        return true;
    }
}

export { SvgPathElement };