import { hexToRgb } from '../../misc';
import { TextElement } from './TextElement';

class TextBoxElement extends TextElement {
    init() {
        this.dataType = 'textbox';
        let attrs = {
            width: 50,
            height: 50,
            opacity: 1,
            background: '#000000',
            rotate: undefined,
            borderWidth: undefined,
            borderColor: undefined,
            borderDashArray: undefined, //number[]

            size: 20,
            color: '#000000',
            text: '',
            lineHeight: null,
            textOpacity: 1,
            underline: false,
            bold: false,
            italic: false,
            fontFamily: null,
            fontFile: 'NotoSansCJKsc-Regular.otf'
        };
        this.attrs = Object.assign(attrs, this.attrs);
        this.options.draggableOptions.isCancelDefaultEvent = false;
        this.options.draggableOptions.disabled = false;
        if (!this.attrs.lineHeight) {
            this.attrs.lineHeight = this.attrs.size;
        }
        this.options.resizable = true;
        this.options.resizableOptions.showBorder = false;
        this.options.resizableOptions.onMove = () => {
            this.#autoHeight();
        }
    
        this.el.addEventListener('paste', (e) => {
            let data = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
            let regex = /<(?!(\/\s*)?(a|b|i|em|s|strong|u)[>,\s])([^>])*>/g;
            data = data.replace(regex, '');
            document.execCommand('insertHTML', false, data);
            e.preventDefault();
        });
        this.elText = document.createElement('div');
    }

    setStyle() {
        if (!this.elText.textContent) {
            this.elText.textContent = this.attrs.text;
        }
        this.elText.style.color = this.attrs.color;
        this.elText.style.fontSize = this.attrs.size + 'px';
        this.elText.style.fontWeight = this.attrs.bold ? 'bold' : '';
        this.elText.style.fontStyle = this.attrs.italic ? 'italic' : '';
        this.elText.style.fontFamily = this.attrs.fontFamily;
        this.elText.style.lineHeight = this.attrs.lineHeight + 'px';
        this.elText.style.opacity = this.attrs.textOpacity;
        switch (this.attrs.lineStyle) {
            case 'underline':
                this.elText.style.textDecoration = 'underline #ff0000';
                break;
            case 'strike':
                this.elText.style.textDecoration = 'line-through #ff0000';
                break;
        }


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
        this.elRect = document.createElement('div');
        this.elRect.style.width = '100%';
        this.elRect.style.height = '100%';
        this.elRect.style.position = 'absolute';
        this.elRect.style.top = '0px';
        this.elRect.style.left = '0px';
        this.elRect.style.zIndex = -1;
        this.el.appendChild(this.elRect);

        this.elText = super.childElement();
        setTimeout(() => {
            this.#autoHeight();
        }, 10);

        this.elText.addEventListener('input', () => {
            this.#autoHeight();
            this.dragElement.plugins.resizable.options.minWidth = this.#getWidthChar();
        });
        return this.elText;
    }

    async insertToPDF() {
        this.#splitTexts();
        
        let lineTop = 2.5;
        let fontSize = this.attrs.size;
        let lines = this.attrs.text.split(/[\n\f\r\u000B]/);
        let thickness = this.attrs.lineStyle ? fontSize / 14 : 0;
        let x = this.getX();
        let y = this.page.height - (this.getY() + fontSize - 2);
        let lineHeight = (this.attrs.lineHeight ? this.attrs.lineHeight : (fontSize - 2)) + lineTop;

        let options = {
            x: x,
            y: y,
            size: fontSize,
            color: this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.color).map(v => (v / 255))),
            opacity: this.attrs.opacity,
            lineHeight: lineHeight,
            font: await this.pdfDocument.getFont(this.page.id, this.attrs.text, this.attrs.fontFile),
            rotate: this.attrs.rotate ? this.degrees(this.attrs.rotate) : undefined
        };

        if (this.attrs.background) {
            let _x = this.getX();
            let _y = this.getY();
            let _width = this.attrs.width / this.pageScale;
            let _height = this.attrs.height / this.pageScale + (lines.length * 3);
            let _options = {
                x: _x,
                y: this.page.height - (_y + _height),
                width: _width,
                height: _height,
                color: this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.background).map(v => (v / 255))),
                opacity: this.attrs.opacity,
                borderOpacity: this.attrs.opacity,
                borderWidth: this.attrs.borderWidth,
                borderDashArray: this.attrs.borderDashArray,
                rotate: options.rotate
            };
            if (this.attrs.borderColor) {
                _options.borderColor = this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.borderColor).map(v => (v / 255)));
            }
            this.page.pageProxy.drawRectangle(_options);
        }

        options.opacity = this.attrs.textOpacity;
        this.page.pageProxy.drawText(this.attrs.text, options);
        
        if (this.attrs.lineStyle) {
            let lineY = 0;
            for (let i = 0; i < lines.length; i++) {
                if (this.attrs.lineStyle == 'underline') {
                    lineY = options.y - options.lineHeight * i - thickness;
                } else if (this.attrs.lineStyle == 'strike') {
                    lineY = options.y - options.lineHeight * i - thickness + (options.lineHeight / 2 - thickness - lineTop);
                }
                this.page.pageProxy.drawLine({
                    start: { x: x, y: lineY },
                    end: { x: x + options.font.widthOfTextAtSize(lines[i], fontSize), y: lineY },
                    thickness: thickness,
                    // color: options.color,
                    color: this.editor.PDFLib.componentsToColor(hexToRgb('#ff0000').map(v => (v / 255))),
                    opacity: options.opacity
                });
            }
        }
    }

    /**
     * 单个字符的宽度
     * @returns 
     */
    #getWidthChar() {
        const elTemp = document.createElement('span');
        elTemp.style.opacity = 0;
        elTemp.style.fontSize = this.attrs.size * this.scale + 'px';
        elTemp.style.fontWeight = this.attrs.bold ? 'bold' : '';
        elTemp.style.fontStyle = this.attrs.italic ? 'italic' : '';
        elTemp.style.fontFamily = this.attrs.fontFamily;
        elTemp.textContent = this.attrs.text[0];
        document.body.appendChild(elTemp);
        const widthChar = elTemp.offsetWidth;
        elTemp.remove();
        return widthChar;
    }

    #splitTexts() {
        const elWidth = this.el.offsetWidth;
        const widthChar = this.#getWidthChar();
        const lineChars = Math.floor(elWidth / widthChar);
        const lines = this.attrs.text.length <= lineChars ? 1 : Math.ceil(this.attrs.text.length / lineChars);
        if (lines > 1) {
            let chars = [];
            for (let i = 0; i < lines; i++) {
                let start = i * lineChars;
                let end = start + lineChars;
                let text = this.attrs.text.substring(start, end);
                text = text.replace(/[\n\f\r\u000B]/g, '');
                chars.push(text);
            }
            this.attrs.text = chars.join('\n');
        }
    }

    #autoHeight() {
        const elHeight = this.el.offsetHeight;
        const elTextHeight = this.elText.offsetHeight;
        const _height = elTextHeight - elHeight;
        const height = (elHeight + _height);
        if (_height > 0) {
            this.el.style.height = height + 'px';
            this.attrs.height = height;
        }
        this.dragElement.plugins.resizable.options.minHeight = height;
    }
}

export { TextBoxElement };