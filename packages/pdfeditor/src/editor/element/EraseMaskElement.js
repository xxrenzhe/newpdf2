import { hexToRgb } from '../../misc';
import { RectElement } from './RectElement';

class EraseMaskElement extends RectElement {
    init() {
        super.init();
        this.dataType = 'eraseMask';
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
            color: this.attrs.background ? this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.background).map(v => (v / 255))) : this.editor.PDFLib.rgb(1, 1, 1),
            opacity: 1,
            borderWidth: 0
        };
        if (this.attrs.rotate) {
            options.rotate = this.degrees(this.attrs.rotate);
        }
        this.page.pageProxy.drawRectangle(options);
        return true;
    }
}

export { EraseMaskElement };
