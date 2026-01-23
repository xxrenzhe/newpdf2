import { hexToRgb, trimSpace } from '../../misc';
import { Events, PDFEvent } from '../../event';
import { Font } from '../../font';
import { BaseElement } from './BaseElement';

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
            bold: false,
            italic: false,
            rotate: undefined,
            fontFamily: 'NotoSansCJKkr',
            fontFile: 'fonts/NotoSansCJKkr-Regular.otf'
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
        if (!this.elText.textContent) {
            this.elText.textContent = this.attrs.text;
        }
        this.elText.style.color = this.attrs.color;
        this.elText.style.fontSize = this.attrs.size + 'px';
        this.elText.style.fontWeight = this.attrs.bold ? 'bold' : 'normal';
        this.elText.style.fontStyle = this.attrs.italic ? 'italic' : 'normal';
        this.elText.style.background = this.attrs.background;
        this.elText.style.fontFamily = this.attrs.fontFamily;
        this.elText.style.lineHeight = this.attrs.lineHeight + 'px';
        this.elText.style.opacity = this.attrs.opacity;
        if (this.attrs.rotate) {
            this.elText.style.transform = 'rotate('+ this.attrs.rotate +'deg)';
        }
        switch (this.attrs.lineStyle) {
            case 'underline':
                this.elText.style.textDecoration = 'underline #ff0000';
                break;
            case 'strike':
                this.elText.style.textDecoration = 'line-through #ff0000';
                break;
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
    }

    childElement() {
        this.setStyle();
        this.elText.addEventListener('input', () => {
            this.attrs.text = this.elText.innerText;
        });

        this.elText.setAttribute('contenteditable', true);
        //禁用在选中文本时的可拖放事件
        this.elText.setAttribute('draggable', false);
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

        this.elText.addEventListener('blur', e => {
            if (!trimSpace(this.attrs.text)) {
                // For newly-created text, an empty value means the element should be removed.
                // For converted existing PDF text, we keep an empty element so export can still
                // draw a background "cover box" to redact the original glyphs.
                if (!this.attrs.coverOriginal) {
                    PDFEvent.dispatch(Events.HISTORY_REMOVE, {
                        page: this.page,
                        element: this
                    });
                    this.page.elements.remove(this.id);
                    return;
                }
                this.elText.textContent = '';
            }
            // this.disableDrag = false;
            // this.elText.setAttribute('contenteditable', false);
            
            this.page.elements.activeId = null;
            //重复事件判断，编辑状态下点击console面板，再点击页面会多触发一次blur事件
            if (!this.el.classList.contains('active')) {
                return;
            }
            this.elText.style.cursor = 'pointer';
            this.el.classList.remove('active');
            PDFEvent.dispatch(Events.ELEMENT_BLUR, {
                page: this.page,
                element: this
            });
        });

        setTimeout(() => {
            this.elText.style.cursor = 'auto';
            this.elText.focus();

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

    async insertToPDF() {
        const rawText = typeof this.attrs.text === 'string' ? this.attrs.text : '';
        const hasText = trimSpace(rawText) !== '';

        let lineTop = 2.5;
        let fontSize = this.attrs.size;
        let lines = rawText.split(/[\n\f\r\u000B]/);
        let thickness = this.attrs.lineStyle ? fontSize / 14 : 0;
        let x = this.getX();
        let y = this.page.height - (this.getY() + fontSize - fontSize * 0.3);
        let lineHeight = (this.attrs.lineHeight ? this.attrs.lineHeight : (fontSize - 2)) + lineTop;
        //let lineHeight = options.font.heightAtSize(fontSize);

        const textRgb = hexToRgb(this.attrs.color) || [0, 0, 0];
        const preferredFontFile = this.attrs.fontFile;
        const angleRad = this.attrs.rotate ? (this.attrs.rotate * Math.PI) / 180 : 0;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        // When editing existing PDF text, we store a "cover box" that can fully hide
        // the original glyphs even if the new text becomes shorter/empty.
        const hasCoverBox = Boolean(
            this.attrs.coverOriginal
            && typeof this.attrs.coverWidth === 'number'
            && Number.isFinite(this.attrs.coverWidth)
            && this.attrs.coverWidth > 0
            && typeof this.attrs.coverHeight === 'number'
            && Number.isFinite(this.attrs.coverHeight)
            && this.attrs.coverHeight > 0
        );

        if (this.attrs.background && hasCoverBox) {
            const bgRgb = hexToRgb(this.attrs.background) || [255, 255, 255];
            const coverOffsetX = (typeof this.attrs.coverOffsetX === 'number' && Number.isFinite(this.attrs.coverOffsetX))
                ? this.attrs.coverOffsetX
                : 0;
            const coverOffsetY = (typeof this.attrs.coverOffsetY === 'number' && Number.isFinite(this.attrs.coverOffsetY))
                ? this.attrs.coverOffsetY
                : 0;
            const coverX = x + coverOffsetX;
            const coverTopY = this.getY() + coverOffsetY;
            const coverY = this.page.height - (coverTopY + this.attrs.coverHeight);

            this.page.pageProxy.drawRectangle({
                x: coverX,
                y: coverY,
                width: this.attrs.coverWidth,
                height: this.attrs.coverHeight,
                color: this.editor.PDFLib.componentsToColor(bgRgb.map(v => (v / 255))),
                opacity: this.attrs.opacity
            });
        }

        // Pure deletion: cover the original area, but don't embed fonts or draw text.
        if (!hasText) {
            if (this.attrs.background && !hasCoverBox) {
                const bgRgb = hexToRgb(this.attrs.background) || [255, 255, 255];
                let maxWidth = 0;

                if (typeof this.attrs.backgroundWidth === 'number' && Number.isFinite(this.attrs.backgroundWidth)) {
                    const rect = this.page.readerPage.content.getBoundingClientRect();
                    if (rect.width) {
                        const scaleX = this.page.width / rect.width;
                        maxWidth = Math.max(maxWidth, this.attrs.backgroundWidth * scaleX);
                    }
                }

                if (maxWidth > 0) {
                    this.page.pageProxy.drawRectangle({
                        x: x,
                        y: y - ((lines.length - 1) * lineHeight) - 3.5,
                        width: maxWidth + 2.5,
                        height: lines.length * (lineHeight + thickness) - 2,
                        color: this.editor.PDFLib.componentsToColor(bgRgb.map(v => (v / 255))),
                        opacity: this.attrs.opacity
                    });
                }
            }
            return;
        }

        const lineRuns = lines.map(line => Font.splitTextByFont(line, preferredFontFile));
        const lineWidths = [];
        for (const runs of lineRuns) {
            let width = 0;
            for (const run of runs) {
                const font = await this.pdfDocument.getFont(this.page.id, run.text, run.fontFile);
                if (!font) continue;
                width += font.widthOfTextAtSize(run.text, fontSize);
            }
            lineWidths.push(width);
        }

        let options = {
            x: x,
            y: y,
            size: fontSize,
            color: this.editor.PDFLib.componentsToColor(textRgb.map(v => (v / 255))),
            opacity: this.attrs.opacity,
            lineHeight: lineHeight,
            rotate: this.attrs.rotate ? this.degrees(this.attrs.rotate) : undefined
        };

        // Fallback: background cover based on text metrics (used for newly-created text).
        if (this.attrs.background && !hasCoverBox) {
            const bgRgb = hexToRgb(this.attrs.background) || [255, 255, 255];
            let maxWidth = Math.max(0, ...lineWidths);

            if (typeof this.attrs.backgroundWidth === 'number' && Number.isFinite(this.attrs.backgroundWidth)) {
                const rect = this.page.readerPage.content.getBoundingClientRect();
                if (rect.width) {
                    const scaleX = this.page.width / rect.width;
                    maxWidth = Math.max(maxWidth, this.attrs.backgroundWidth * scaleX);
                }
            }

            this.page.pageProxy.drawRectangle({
                x: x,
                y: y - ((lines.length - 1) * lineHeight) - 3.5,
                width: maxWidth + 2.5,
                height: lines.length * (options.lineHeight + thickness) - 2,
                color: this.editor.PDFLib.componentsToColor(bgRgb.map(v => (v / 255))),
                opacity: options.opacity
            });
        }
        for (let i = 0; i < lineRuns.length; i++) {
            const runs = lineRuns[i];
            const lineX = x + sin * lineHeight * i;
            const lineY = y - cos * lineHeight * i;
            let cursorX = lineX;
            let cursorY = lineY;

            for (const run of runs) {
                const font = await this.pdfDocument.getFont(this.page.id, run.text, run.fontFile);
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
}

export { TextElement };
