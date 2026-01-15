import { BaseElement } from './BaseElement';
import { embedImage, getPosCenterPointRotation } from '../../misc';

class ImageElement extends BaseElement {
    init() {
        this.dataType = 'image';
        let attrs = {
            width: null,
            height: null,
            image: null,
            opacity: 1,
            arrayBuffer: null,
            rotate: undefined
        };
        this.attrs = Object.assign(attrs, this.attrs);
        // let viewport = this.page.readerPage.pageProxy.getViewport({ scale: this.page.readerPage.scale });
        let viewport = this.page.readerPage.elWrapper.getBoundingClientRect();
        let scaleWidth = (viewport.width * 0.35);
        if (this.attrs.width === null) {
            this.attrs.width = parseInt((this.attrs.image.width > scaleWidth ? scaleWidth : this.attrs.image.width));
        }
        if (this.attrs.height === null) {
            this.attrs.height = (parseInt(this.attrs.image.width) != this.attrs.width ? parseInt(this.attrs.image.height * (this.attrs.width / this.attrs.image.width)) : this.attrs.image.height);
        }
        this.setStyle();
    }

    setStyle() {
        this.el.style.width = this.attrs.width + 'px';
        this.el.style.height = this.attrs.height + 'px';
        this.attrs.image.style.opacity = this.attrs.opacity;
    }

    childElement() {
        this.options.resizableOptions = {
            showBorder: true,
            minWidth: null,
            minHeight: null
        };
        return this.attrs.image;
    }

    async insertToPDF() {
        let x = this.getX();
        let y = this.getY();
        let _width = this.attrs.width / this.pageScale;
        let _height = this.attrs.height / this.pageScale;
        // const _embedImage = null;
        // if (this.attrs.imageType == 'image/png') {
        //     _embedImage = await this.pdfLibDocument.embedPng(this.attrs.arrayBuffer);
        // } else {
        //     _embedImage = await this.pdfLibDocument.embedJpg(this.attrs.arrayBuffer);
        // }
        const _embedImage = await embedImage(this.page.pdfDocument.documentProxy, this.attrs.imageType, this.attrs.arrayBuffer);
        if (!_embedImage) {
            return false;
        }

        let pos = { x, y };
        if (this.attrs.rotate) {
            pos = getPosCenterPointRotation(x, y, _width, _height, this.attrs.rotate);
        }
        
        let options = {
            x: pos.x,
            // y: this.page.height - (y + _height),
            y: this.page.height - (pos.y + _height),
            width: _width,
            height: _height,
            opacity: this.attrs.opacity
        };
        if (this.attrs.rotate) {
            options.rotate = this.degrees(this.attrs.rotate);
        }

        this.page.pageProxy.drawImage(_embedImage, options);
        return true;
    }
}

export { ImageElement };