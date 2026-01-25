import { hexToRgb } from '../../misc';
import { Font } from '../../font';
import { TextElement } from './TextElement';

class TextBoxElement extends TextElement {
    init() {
        this.dataType = 'textbox';
        const defaultFont = Font.getDefaultFont();
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
            fontFamily: defaultFont.fontFamily,
            fontFile: defaultFont.fontFile,
            showName: defaultFont.showName,
            textMode: 'paragraph'
        };
        this.attrs = Object.assign(attrs, this.attrs);
        const safeFont = Font.resolveSafeFont({
            fontFamily: this.attrs.fontFamily,
            fontFile: this.attrs.fontFile,
            fontName: this.attrs.fontName,
            text: this.attrs.text
        });
        this.attrs.fontFamily = safeFont.fontFamily;
        this.attrs.fontFile = safeFont.fontFile;
        if (!this.attrs.showName) {
            this.attrs.showName = safeFont.showName;
        }
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
        this.elText.style.fontWeight = this.attrs.bold ? 'bold' : 'normal';
        this.elText.style.fontStyle = this.attrs.italic ? 'italic' : 'normal';
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
        const preferredFontFile = this.attrs.fontFile;
        const angleRad = this.attrs.rotate ? (this.attrs.rotate * Math.PI) / 180 : 0;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        const lineRuns = lines.map(line => Font.splitTextByFont(line, preferredFontFile));
        const lineRunsWithFonts = [];
        const lineWidths = [];
        let missingFont = false;
        for (const runs of lineRuns) {
            let width = 0;
            const resolvedRuns = [];
            for (const run of runs) {
                const font = await this.pdfDocument.getFont(this.page.id, run.text, run.fontFile);
                if (!font) {
                    missingFont = true;
                } else {
                    width += font.widthOfTextAtSize(run.text, fontSize);
                }
                resolvedRuns.push({ ...run, font });
            }
            lineRunsWithFonts.push(resolvedRuns);
            lineWidths.push(width);
        }

        let options = {
            x: x,
            y: y,
            size: fontSize,
            color: this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.color).map(v => (v / 255))),
            opacity: this.attrs.textOpacity,
            lineHeight: lineHeight,
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

        const forceRasterize = Boolean(this.attrs.rasterizeOnExport);
        if (missingFont || forceRasterize) {
            await this._insertTextAsImage({ includeBackground: false, opacity: this.attrs.textOpacity });
            return;
        }

        for (let i = 0; i < lineRunsWithFonts.length; i++) {
            const runs = lineRunsWithFonts[i];
            const lineX = x + sin * lineHeight * i;
            const lineY = y - cos * lineHeight * i;
            let cursorX = lineX;
            let cursorY = lineY;

            for (const run of runs) {
                const font = run.font;
                if (!font) continue;
                this.page.pageProxy.drawText(run.text, {
                    ...options,
                    x: cursorX,
                    y: cursorY,
                    font
                });
                const advance = font.widthOfTextAtSize(run.text, fontSize);
                cursorX += cos * advance;
                cursorY += sin * advance;
            }
        }
        
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
                    end: { x: x + (lineWidths[i] || 0), y: lineY },
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
        elTemp.style.fontWeight = this.attrs.bold ? 'bold' : 'normal';
        elTemp.style.fontStyle = this.attrs.italic ? 'italic' : 'normal';
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
