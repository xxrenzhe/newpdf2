import { BaseElement } from './BaseElement';
import { hexToRgb } from '../../misc';

class CheckboxElement extends BaseElement {
    init() {
        this.dataType = 'checkbox';
        let attrs = {
            width: null,
            height: null,
            textColor: undefined,
            backgroundColor: undefined,
            borderColor: undefined,
            borderWidth: 1,
            checkbox: null
        };
        this.attrs = Object.assign(attrs, this.attrs);
        // let viewport = this.page.readerPage.pageProxy.getViewport({ scale: this.page.readerPage.scale });
        let viewport = this.page.readerPage.elWrapper.getBoundingClientRect();
        let scaleWidth = (viewport.width * 0.35);
        if (this.attrs.width === null) {
            this.attrs.width = parseInt((this.attrs.checkbox.width > scaleWidth ? scaleWidth : this.attrs.checkbox.width));
        }
        if (this.attrs.height === null) {
            this.attrs.height = (parseInt(this.attrs.checkbox.width) != this.attrs.width ? parseInt(this.attrs.checkbox.height * (this.attrs.width / this.attrs.checkbox.width)) : this.attrs.checkbox.height);
        }
        this.setStyle();
    }

    setStyle() {
        this.el.style.width = this.attrs.width + 'px';
        this.el.style.height = this.attrs.height + 'px';
    }

    childElement() {
        this.options.resizableOptions = {
            position: ['ner', 'ser', 'swr', 'nwr'],
            isRatio: true,
            showBorder: true,
            minWidth: null,
            minHeight: null
        };
        return this.attrs.checkbox;
    }

    async insertToPDF() {
        let x = this.getX();
        let y = this.getY();
        let _width = this.attrs.width / this.pageScale;
        let _height = this.attrs.height / this.pageScale;
        let pos = { x, y };
        let options = {
            x: pos.x,
            y: this.page.height - (pos.y + _height),
            width: _width,
            height: _height,
            borderWidth: this.attrs.borderWidth
        };
        if (this.attrs.textColor) {
            options.textColor = this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.textColor).map(v => (v / 255)));
        }
        if (this.attrs.backgroundColor) {
            options.backgroundColor = this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.backgroundColor).map(v => (v / 255)));
        }
        if (this.attrs.borderColor) {
            options.borderColor = this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.borderColor).map(v => (v / 255)));
        }

        const form = this.page.pdfDocument.documentProxy.getForm();
        const checkBox = form.createCheckBox('forms.checkbox.' + this.id);
        checkBox.addToPage(this.page.pageProxy, options);
        if (this.attrs.checkbox.checked) {
            checkBox.check();
        }
        return true;
    }
}

export { CheckboxElement };