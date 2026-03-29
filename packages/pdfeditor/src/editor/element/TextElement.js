import { hexToRgb, trimSpace } from '../../misc';
import { Events, PDFEvent } from '../../event';
import { ORIGIN_TEXT_REMOVE_STRATEGY } from '../origin_text_state';
import { HISTORY_SOURCE } from '../history_policy';
import { BaseElement } from './BaseElement';

const ZERO_WIDTH_CHAR_PATTERN = /[\u200B-\u200D\uFEFF]/g;

const normalizeEditableText = (value) => {
    if (typeof value !== 'string') {
        return '';
    }
    return value.replace(ZERO_WIDTH_CHAR_PATTERN, '');
};

class TextElement extends BaseElement {
    init() {
        this.dataType = 'text';
        let attrs = {
            size: 20,
            color: '#000000',
            text: '',
            lineHeight: null,
            opacity: 1,
            lineStyle: null,    //underline, strike
            background: null,
            letterSpacing: null,
            wordSpacing: null,
            bold: false,
            italic: false,
            rotate: undefined,
            fontFamily: 'NotoSansCJKsc',
            fontFile: 'NotoSansCJKsc-Regular.otf'
        };
        this.attrs = Object.assign(attrs, this.attrs);
        this.options.draggableOptions.isCancelDefaultEvent = false;
        this.options.draggableOptions.disabled = false;
        if (!this.attrs.lineHeight) {
            this.attrs.lineHeight = this.attrs.size;
        }
        this.options.resizable = false;
    
        //套用Resizable对象定义的鼠标移入移出的边框css
        this.el.classList.add('__resizable', '__resizable-border');
        
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
        const nextText = this.attrs.text ?? '';
        if (this.elText.textContent !== nextText) {
            this.elText.textContent = nextText;
        }
        this.elText.style.color = this.attrs.color;
        this.elText.style.fontSize = this.attrs.size + 'px';
        this.elText.style.fontWeight = this.attrs.bold ? 'bold' : '';
        this.elText.style.fontStyle = this.attrs.italic ? 'italic' : '';
        this.elText.style.background = this.attrs.background;
        this.elText.style.fontFamily = this.attrs.fontFamily;
        this.elText.style.lineHeight = this.attrs.lineHeight + 'px';
        this.elText.style.opacity = this.attrs.opacity;
        this.elText.style.letterSpacing = this.attrs.letterSpacing != null ? this.attrs.letterSpacing + 'px' : '';
        this.elText.style.wordSpacing = this.attrs.wordSpacing != null ? this.attrs.wordSpacing + 'px' : '';
        if (this.attrs.rotate) {
            this.elText.style.transform = 'rotate('+ this.attrs.rotate +'deg)';
        }
        switch (this.attrs.lineStyle) {
            case 'underline':
                this.elText.style.textDecoration = 'underline ' + (this.attrs.color || '');
                break;
            case 'strike':
                this.elText.style.textDecoration = 'line-through ' + (this.attrs.color || '');
                break;
        }
        if (this.elText.isConnected) {
            this.syncSizeToContent();
        }
    }

    // setActualRect() {
    //     super.setActualRect();
    //     this.attrs.size /= this.scale;
    //     this.attrs.lineHeight /= this.scale;
    // }

    zoom(scale) {
        super.zoom(scale);
        this.elText.style.fontSize = this.attrs.size * this.pageScale + 'px';
        this.elText.style.lineHeight = this.attrs.lineHeight * this.pageScale + 'px';
        this.elText.style.letterSpacing = this.attrs.letterSpacing != null ? this.attrs.letterSpacing * this.pageScale + 'px' : '';
        this.elText.style.wordSpacing = this.attrs.wordSpacing != null ? this.attrs.wordSpacing * this.pageScale + 'px' : '';
    }

    childElement() {
        this.setStyle();
        let removeScheduled = false;
        const removeCurrentElement = () => {
            if (removeScheduled) {
                return;
            }
            removeScheduled = true;
            window.setTimeout(() => {
                removeScheduled = false;
                if (!this.el || !this.el.isConnected) {
                    return;
                }
                this.options.historySource = HISTORY_SOURCE.SYSTEM;
                PDFEvent.dispatch(Events.HISTORY_REMOVE, {
                    page: this.page,
                    element: this
                });
                this.page.elements.remove(this.id, {
                    originStateStrategy: ORIGIN_TEXT_REMOVE_STRATEGY.PRESERVE
                });
                this.disableDrag = false;
            }, 0);
        };
        const removeIfTextEmpty = () => {
            if (!this.elText || !this.elText.isConnected) {
                return false;
            }
            const currentText = normalizeEditableText(this.elText?.innerText || this.elText?.textContent || this.attrs.text);
            this.attrs.text = currentText;
            if (trimSpace(currentText)) {
                return false;
            }
            removeCurrentElement();
            return true;
        };

        this.elText.addEventListener('input', () => {
            this.attrs.text = normalizeEditableText(this.elText.innerText);
            this.syncSizeToContent();
        });
        this.elText.addEventListener('keyup', event => {
            const key = event?.key;
            if (key !== 'Backspace' && key !== 'Delete') {
                return;
            }
            removeIfTextEmpty();
        });

        this.elText.setAttribute('contenteditable', true);
        //禁用在选中文本时的可拖放事件
        this.elText.setAttribute('draggable', false);
        this.elText.addEventListener('mousedown', e => {
            this.disableDrag = true;
            e.stopPropagation();
        });
        this.elText.addEventListener('mouseup', () => {
            this.disableDrag = false;
        });
        this.elText.addEventListener('focus', () => {
            this.disableDrag = true;
        });
        this.elText.addEventListener('dragstart', e => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // this.el.addEventListener('mouseup', () => {
            // this.disableDrag = true;
            // this.elText.setAttribute('contenteditable', true);
            // this.elText.focus();
        // });

        const handleFocusLoss = () => {
            if (!this.elText || !this.elText.isConnected) {
                return;
            }
            if (removeIfTextEmpty()) {
                return;
            }
            this.disableDrag = false;
            // this.disableDrag = false;
            // this.elText.setAttribute('contenteditable', false);
            
            this.page.elements.activeId = null;
            //重复事件判断，编辑状态下点击console面板，再点击页面会多触发一次blur事件
            if (!this.el.classList.contains('active')) {
                return;
            }
            this.elText.style.cursor = 'pointer';
            requestAnimationFrame(() => {
                if (!this.el || !this.el.isConnected) {
                    return;
                }
                this.el.classList.remove('active');
                PDFEvent.dispatch(Events.ELEMENT_BLUR, {
                    page: this.page,
                    element: this
                });
            });
        };

        this.elText.addEventListener('blur', handleFocusLoss);
        this.elText.addEventListener('focusout', handleFocusLoss);

        setTimeout(() => {
            this.elText.style.cursor = 'auto';
            this.elText.focus();
            this.syncSizeToContent();

            //全选文本
            // let selection = window.getSelection();
            // let range = document.createRange();
            // range.selectNodeContents(this.elText);
            // selection.removeAllRanges();
            // selection.addRange(range);

            //光标至最后
            let selection = window.getSelection();
            selection.selectAllChildren(this.elText);
            selection.collapseToEnd();
        }, 10);
        return this.elText;
    }

    syncSizeToContent() {
        if (!this.el || !this.elText) {
            return;
        }
        const width = Math.ceil(this.elText.scrollWidth || 0);
        const height = Math.ceil(this.elText.scrollHeight || 0);
        const minWidth = Math.ceil((this.attrs.size || 0) * 0.5) || 1;
        const minHeight = Math.ceil(this.attrs.lineHeight || this.attrs.size || 0) || 1;
        const nextWidth = Math.max(width, minWidth);
        const nextHeight = Math.max(height, minHeight);
        if (Number.isFinite(nextWidth) && nextWidth > 0) {
            if (this.dataType !== 'textbox') { this.el.style.width = nextWidth + 'px'; }
        }
        if (Number.isFinite(nextHeight) && nextHeight > 0) {
            this.el.style.height = nextHeight + 'px';
        }
        this.setActualRect();
    }

    async insertToPDF() {
        let lineTop = 2.5;
        let fontSize = this.attrs.size;
        let lines = this.attrs.text.split(/[\n\f\r\u000B]/);
        let thickness = this.attrs.lineStyle ? fontSize / 14 : 0;
        let x = this.getX();
        let y = this.page.height - (this.getY() + fontSize - fontSize * 0.3);
        let lineHeight = (this.attrs.lineHeight ? this.attrs.lineHeight : (fontSize - 2)) + lineTop;

        // Read computed spacing from DOM for pixel-accurate alignment
        let charSpacing = this.attrs.letterSpacing || 0;
        let wordSpacing = this.attrs.wordSpacing || 0;
        if (this.elText && this.elText.isConnected) {
            try {
                const computed = window.getComputedStyle(this.elText);
                const parsedChar = parseFloat(computed.letterSpacing);
                if (Number.isFinite(parsedChar) && parsedChar !== 0) {
                    charSpacing = parsedChar / (this.pageScale || 1);
                }
                const parsedWord = parseFloat(computed.wordSpacing);
                if (Number.isFinite(parsedWord) && parsedWord !== 0) {
                    wordSpacing = parsedWord / (this.pageScale || 1);
                }
            } catch (e) {
                // ignore
            }
        }

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
            let maxWidth = 0;
            lines.forEach(v => {
                let w = options.font.widthOfTextAtSize(v, fontSize);
                if (w > maxWidth) {
                    maxWidth = w;
                }
            });

            this.page.pageProxy.drawRectangle({
                x: x,
                y: y - ((lines.length - 1) * lineHeight) - 3.5,
                width: maxWidth + 2.5,
                height: lines.length * (options.lineHeight + thickness) - 2,
                color: this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.background).map(v => (v / 255))),
                opacity: options.opacity
            });
        }
        const hasSpacing = charSpacing !== 0 || wordSpacing !== 0;
        if (hasSpacing) {
            const ops = [];
            if (charSpacing !== 0) ops.push(this.editor.PDFLib.setCharacterSpacing(charSpacing));
            if (wordSpacing !== 0) ops.push(this.editor.PDFLib.setWordSpacing(wordSpacing));
            this.page.pageProxy.pushOperators(...ops);
        }
        try {
            this.page.pageProxy.drawText(this.attrs.text, options);
        } catch (e) {
            console.warn('[pdfeditor] Font encoding error, using Canvas rasterization fallback for CJK:', e);
            let fontScale = (this.pageScale < 2 ? 2 : this.pageScale) + this.scale;
            let fallFontSize = this.attrs.size * fontScale;
            let linesFallback = this.attrs.text.split(/[\n\f\r\u000B]/);
            let fallLineHeight = (this.attrs.lineHeight ? this.attrs.lineHeight : fallFontSize) + 4;
            fallLineHeight *= fontScale;
            
            let rectFallback = this.elText ? this.elText.getBoundingClientRect() : { width: this.attrs.size * this.attrs.text.length, height: fallLineHeight };
            let canvas = document.createElement('canvas');
            
            let _width = rectFallback.width / this.scale * fontScale;
            let _height = linesFallback.length * fallLineHeight;
            canvas.width = _width + 20;
            canvas.height = _height + 20;
            
            let ctx = canvas.getContext('2d');
            if (this.attrs.background) {
                ctx.fillStyle = this.attrs.background;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        
            let fontStyle = [];
            if (this.attrs.italic) fontStyle.push('italic');
            if (this.attrs.bold) fontStyle.push('bold');
            fontStyle.push(fallFontSize + 'px');
            fontStyle.push(this.attrs.fontFamily || 'sans-serif');
            ctx.font = fontStyle.join(' ');
            ctx.fillStyle = this.attrs.color;
            ctx.textBaseline = 'top';

            for (let i = 0; i < linesFallback.length; i++) {
                ctx.fillText(linesFallback[i], 5, fallLineHeight * i + 5, canvas.width);
            }
        
            let _embedImage = await embedImage(this.page.pdfDocument.documentProxy, 'image/png', canvas.toDataURL('image/png', 1));
            let imgWidth = _embedImage.width / fontScale;
            let imgHeight = _embedImage.height / fontScale;
            let imgOptions = {
                x: x,
                y: this.page.height - (this.getY() + imgHeight),
                width: imgWidth,
                height: imgHeight,
                opacity: this.attrs.opacity
            };
            if (this.attrs.rotate) {
                imgOptions.rotate = this.degrees(this.attrs.rotate);
            }
            this.page.pageProxy.drawImage(_embedImage, imgOptions);
        }
        if (hasSpacing) {
            const resetOps = [];
            if (charSpacing !== 0) resetOps.push(this.editor.PDFLib.setCharacterSpacing(0));
            if (wordSpacing !== 0) resetOps.push(this.editor.PDFLib.setWordSpacing(0));
            this.page.pageProxy.pushOperators(...resetOps);
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
                    end: { x: x + options.font.widthOfTextAtSize(lines[i], fontSize), y: lineY },
                    thickness: thickness,
                    color: options.color,
                    opacity: options.opacity
                });
            }
        }
    }
}

export { TextElement };
