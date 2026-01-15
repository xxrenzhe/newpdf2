import { embedImage } from '../../misc';
import { TextElement } from './TextElement';

class TextCanvasElement extends TextElement {
    init() {
        super.init();
        this.dataType = 'textCanvas';
    }

    async insertToPDF() {
        let lineTop = 4;
        let fontScale = (this.pageScale < 2 ? 2 : this.pageScale) + this.scale;
        let fontSize = this.attrs.size * fontScale;
        let lines = this.attrs.text.split(/[\n\f\r\u000B]/);
        let thickness = this.attrs.underline ? fontSize / 14 : 0;
        let lineHeight = (this.attrs.lineHeight ? this.attrs.lineHeight : fontSize) + lineTop;
        lineHeight *= fontScale;
        
        let rect = this.elChild.getBoundingClientRect();
        let padding = 0;
        let offsetX = padding / 2;
        let canvas = document.createElement('canvas');
        lineHeight = (lineHeight + thickness);
    
        let _width = rect.width / this.scale * fontScale + padding;
        let _height = lines.length * lineHeight + padding;
        canvas.width = _width - 6;
        canvas.height = _height;
        
        let ctx = canvas.getContext('2d');
        if (this.attrs.background) {
            ctx.fillStyle = this.attrs.background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    
        let fontStyle = [];
        if (this.attrs.italic) {
            fontStyle.push('italic');
        }
        if (this.attrs.bold) {
            fontStyle.push('bold');
        }
        fontStyle.push(fontSize + 'px');
        fontStyle.push(this.attrs.fontFamily);
        ctx.font = fontStyle.join(' ');

        ctx.fillStyle = this.attrs.color;
        for (let i = 0; i < lines.length; i++) {
            let measureText = ctx.measureText(lines[i]);
            let offsetY = lineHeight * (i+1) - thickness + (padding / 2 - thickness);
            ctx.fillText(lines[i], offsetX, offsetY - (this.attrs.underline ? 10 : 15), canvas.width);
    
            if (this.attrs.underline) {
                let lineY = offsetY;
                let textWidth = measureText.width;
                ctx.beginPath();
                ctx.moveTo(offsetX, lineY);
                ctx.lineWidth = thickness;
                ctx.lineTo(textWidth + offsetX, lineY);
                ctx.strokeStyle = ctx.fillStyle;
                ctx.stroke();
            }
        }
    
        let _embedImage = await embedImage(this.page.pdfDocument.documentProxy, 'image/png', canvas.toDataURL('image/png', 1));
        let width = _embedImage.width / fontScale;
        let height = _embedImage.height / fontScale;
        let x = this.getX();
        let y = this.page.height - (this.getY() + height);

        let options = {
            x: x,
            y: y,
            width: width,
            height: height,
            opacity: this.attrs.opacity
        };
        
        if (this.attrs.rotate) {
            options.rotate = this.degrees(this.attrs.rotate);
        }
        this.page.pageProxy.drawImage(_embedImage, options);
        return true;
    }
}

export { TextCanvasElement };