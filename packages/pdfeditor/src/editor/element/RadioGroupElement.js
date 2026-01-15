import { BaseElement } from './BaseElement';
import { hexToRgb } from '../../misc';

class RadioGroupElement extends BaseElement {
    init() {
        this.dataType = 'radioGroup';
        let attrs = {
            width: null,
            height: null,
            textColor: undefined,
            backgroundColor: undefined,
            borderColor: undefined,
            borderWidth: 1,
            radio: null
        };
        this.attrs = Object.assign(attrs, this.attrs);
        // let viewport = this.page.readerPage.pageProxy.getViewport({ scale: this.page.readerPage.scale });
        let viewport = this.page.readerPage.elWrapper.getBoundingClientRect();
        let scaleWidth = (viewport.width * 0.35);
        if (this.attrs.width === null) {
            this.attrs.width = parseInt((this.attrs.radio.width > scaleWidth ? scaleWidth : this.attrs.radio.width));
        }
        if (this.attrs.height === null) {
            this.attrs.height = (parseInt(this.attrs.radio.width) != this.attrs.width ? parseInt(this.attrs.radio.height * (this.attrs.width / this.attrs.radio.width)) : this.attrs.radio.height);
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
        return this.attrs.radio;
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
        const radioGroup = form.createRadioGroup('forms.radiogroup.' + this.id);
        radioGroup.addOptionToPage('first', this.page.pageProxy, options);
        if (this.attrs.radio.checked) {
            radioGroup.select('first');
        }
        // options.x += _width + 5;
        // radioGroup.addOptionToPage('aaa', this.page.pageProxy, options);
        return true;
    }
}

export { RadioGroupElement };