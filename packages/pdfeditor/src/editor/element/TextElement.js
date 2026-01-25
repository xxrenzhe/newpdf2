import { embedImage, hexToRgb, trimSpace } from '../../misc';
import { Events, PDFEvent } from '../../event';
import { Font } from '../../font';
import { BaseElement } from './BaseElement';

class TextElement extends BaseElement {
    init() {
        this.dataType = 'text';
        const defaultFont = Font.getDefaultFont();
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
            fontFamily: defaultFont.fontFamily,
            fontFile: defaultFont.fontFile,
            showName: defaultFont.showName,
            displayFontFamily: null,
            textMode: 'paragraph',
            boxWidth: null,
            boxHeight: null,
            lineOffsets: null,
            lineHeightMeasured: false,
            textIndent: null,
            textPaddingLeft: null
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
        const nextText = typeof this.attrs.text === 'string' ? this.attrs.text : '';
        if (this.elText.textContent !== nextText) {
            this.elText.textContent = nextText;
        }
        this.elText.style.color = this.attrs.color;
        this.elText.style.fontSize = this.attrs.size + 'px';
        this.elText.style.fontWeight = this.attrs.bold ? 'bold' : 'normal';
        this.elText.style.fontStyle = this.attrs.italic ? 'italic' : 'normal';
        this.elText.style.background = this.attrs.background;
        const displayFontFamily = this.attrs.displayFontFamily;
        if (displayFontFamily && displayFontFamily !== this.attrs.fontFamily) {
            this.elText.style.fontFamily = `${displayFontFamily}, ${this.attrs.fontFamily}`;
        } else {
            this.elText.style.fontFamily = this.attrs.fontFamily;
        }
        if (this.attrs.textMode === 'paragraph') {
            this.elText.style.whiteSpace = 'pre-wrap';
            this.elText.style.wordBreak = 'break-word';
            this.elText.style.wordWrap = 'break-word';
        } else {
            this.elText.style.whiteSpace = 'pre';
            this.elText.style.wordBreak = 'normal';
            this.elText.style.wordWrap = 'normal';
        }
        this.elText.style.lineHeight = this.attrs.lineHeight + 'px';
        this.elText.style.opacity = this.attrs.opacity;
        const hasBoxWidth = typeof this.attrs.boxWidth === 'number' && Number.isFinite(this.attrs.boxWidth);
        const hasBoxHeight = typeof this.attrs.boxHeight === 'number' && Number.isFinite(this.attrs.boxHeight);
        if (hasBoxWidth) {
            this.el.style.width = (this.attrs.boxWidth * this.pageScale) + 'px';
            this.elText.style.width = '100%';
        }
        if (hasBoxHeight) {
            this.el.style.height = (this.attrs.boxHeight * this.pageScale) + 'px';
            this.elText.style.height = '100%';
        }
        if (hasBoxWidth || hasBoxHeight) {
            this.elText.style.boxSizing = 'border-box';
        }
        if (typeof this.attrs.textIndent === 'number' && Number.isFinite(this.attrs.textIndent)) {
            this.elText.style.textIndent = (this.attrs.textIndent * this.pageScale) + 'px';
        }
        if (typeof this.attrs.textPaddingLeft === 'number' && Number.isFinite(this.attrs.textPaddingLeft)) {
            this.elText.style.paddingLeft = (this.attrs.textPaddingLeft * this.pageScale) + 'px';
        }
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
        if (typeof this.attrs.textIndent === 'number' && Number.isFinite(this.attrs.textIndent)) {
            this.elText.style.textIndent = (this.attrs.textIndent * this.pageScale) + 'px';
        }
        if (typeof this.attrs.textPaddingLeft === 'number' && Number.isFinite(this.attrs.textPaddingLeft)) {
            this.elText.style.paddingLeft = (this.attrs.textPaddingLeft * this.pageScale) + 'px';
        }
    }

    edit(attrs) {
        const nextAttrs = Object.assign({}, attrs);
        const hasFontFamily = Object.prototype.hasOwnProperty.call(attrs, 'fontFamily');
        const hasFontFile = Object.prototype.hasOwnProperty.call(attrs, 'fontFile');
        if ((hasFontFamily || hasFontFile)
            && !Object.prototype.hasOwnProperty.call(attrs, 'displayFontFamily')) {
            nextAttrs.displayFontFamily = null;
        }
        super.edit(nextAttrs);
    }

    childElement() {
        this.setStyle();
        this.elText.addEventListener('input', () => {
            this.attrs.text = this.elText.innerText;
        });

        this.elText.addEventListener('focus', () => {
            this._historyTextSnapshot = {
                text: this.attrs.text ?? '',
                hidden: Boolean(this.attrs.hidden)
            };
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
            const historySnapshot = this._historyTextSnapshot;
            this._historyTextSnapshot = null;

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

            if (!historySnapshot) {
                return;
            }
            const beforeText = typeof historySnapshot.text === 'string' ? historySnapshot.text : '';
            const afterText = typeof this.attrs.text === 'string' ? this.attrs.text : '';
            const beforeHidden = Boolean(historySnapshot.hidden);
            const afterHidden = Boolean(this.attrs.hidden);
            if (beforeText === afterText && beforeHidden === afterHidden) {
                return;
            }

            const beforeAttrs = Object.assign({}, this.attrs, {
                text: beforeText,
                hidden: beforeHidden
            });
            const afterAttrs = Object.assign({}, this.attrs, {
                text: afterText,
                hidden: afterHidden
            });
            const element = this;
            const applyAttrs = (attrs) => {
                element.applyAttrs(attrs);
                if (element.elHistory) {
                    const elHistoryText = element.elHistory.querySelector('.history-item-text');
                    if (elHistoryText) {
                        elHistoryText.textContent = element.attrs.text ?? '';
                    }
                }
            };

            PDFEvent.dispatch(Events.HISTORY_PUSH, {
                undo: () => applyAttrs(beforeAttrs),
                redo: () => applyAttrs(afterAttrs)
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
        const hasExplicitLineHeight = typeof this.attrs.lineHeight === 'number' && Number.isFinite(this.attrs.lineHeight);
        const baseLineHeight = hasExplicitLineHeight ? this.attrs.lineHeight : (fontSize - 2);
        const useMeasuredLineHeight = Boolean(this.attrs.lineHeightMeasured && hasExplicitLineHeight);
        let lineHeight = useMeasuredLineHeight ? baseLineHeight : (baseLineHeight + lineTop);
        //let lineHeight = options.font.heightAtSize(fontSize);

        const textRgb = hexToRgb(this.attrs.color) || [0, 0, 0];
        const preferredFontFile = this.attrs.fontFile;
        const angleRad = this.attrs.rotate ? (this.attrs.rotate * Math.PI) / 180 : 0;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        // When editing existing PDF text, we store a "cover box" that can fully hide
        // the original glyphs even if the new text becomes shorter/empty.
        const coverRects = Array.isArray(this.attrs.coverRects)
            ? this.attrs.coverRects.filter(rect => rect
                && Number.isFinite(rect.left)
                && Number.isFinite(rect.top)
                && Number.isFinite(rect.width)
                && Number.isFinite(rect.height))
            : null;
        const hasCoverRects = Boolean(coverRects && coverRects.length);
        const hasCoverBox = hasCoverRects || Boolean(
            this.attrs.coverOriginal
            && typeof this.attrs.coverWidth === 'number'
            && Number.isFinite(this.attrs.coverWidth)
            && this.attrs.coverWidth > 0
            && typeof this.attrs.coverHeight === 'number'
            && Number.isFinite(this.attrs.coverHeight)
            && this.attrs.coverHeight > 0
        );

        if (this.attrs.background && hasCoverRects) {
            const bgRgb = hexToRgb(this.attrs.background) || [255, 255, 255];
            coverRects.forEach(rect => {
                const coverTopY = rect.top;
                const coverY = this.page.height - (coverTopY + rect.height);
                this.page.pageProxy.drawRectangle({
                    x: rect.left,
                    y: coverY,
                    width: rect.width,
                    height: rect.height,
                    color: this.editor.PDFLib.componentsToColor(bgRgb.map(v => (v / 255))),
                    opacity: this.attrs.opacity
                });
            });
        } else if (this.attrs.background && hasCoverBox) {
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

        const forceRasterize = Boolean(this.attrs.rasterizeOnExport);
        if (missingFont || forceRasterize) {
            await this._insertTextAsImage();
            return;
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
        const lineOffsets = Array.isArray(this.attrs.lineOffsets) ? this.attrs.lineOffsets : null;
        const hasLineOffsets = Boolean(lineOffsets && lineOffsets.length === lineRuns.length);
        for (let i = 0; i < lineRunsWithFonts.length; i++) {
            const runs = lineRunsWithFonts[i];
            const lineOffset = hasLineOffsets ? lineOffsets[i] : 0;
            const offsetX = cos * lineOffset;
            const offsetY = sin * lineOffset;
            const lineX = x + sin * lineHeight * i + offsetX;
            const lineY = y - cos * lineHeight * i + offsetY;
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
                const lineOffset = hasLineOffsets ? lineOffsets[i] : 0;
                this.page.pageProxy.drawLine({
                    start: { x: x + lineOffset, y: lineY },
                    end: { x: x + lineOffset + (lineWidths[i] || 0), y: lineY },
                    thickness: thickness,
                    // color: options.color,
                    color: this.editor.PDFLib.componentsToColor(hexToRgb('#ff0000').map(v => (v / 255))),
                    opacity: options.opacity
                });
            }
        }
    }

    async _insertTextAsImage(options = {}) {
        const includeBackground = options.includeBackground !== false;
        const opacity = typeof options.opacity === 'number' ? options.opacity : this.attrs.opacity;
        const lines = String(this.attrs.text || '').split(/[\n\f\r\u000B]/);
        if (!this.elChild) return false;
        const rect = this.elChild.getBoundingClientRect();
        const lineTop = 2.5;
        const fontScale = (this.pageScale < 2 ? 2 : this.pageScale) + this.scale;
        const fontSize = this.attrs.size * fontScale;
        const thickness = this.attrs.lineStyle ? fontSize / 14 : 0;
        let lineHeight = (this.attrs.lineHeight ? this.attrs.lineHeight : fontSize) + lineTop;
        lineHeight *= fontScale;

        const padding = 0;
        const offsetX = padding / 2;
        const canvas = document.createElement('canvas');
        const width = rect.width / this.scale * fontScale + padding;
        const height = lines.length * (lineHeight + thickness) + padding;
        canvas.width = Math.max(1, width - 6);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (includeBackground && this.attrs.background) {
            ctx.fillStyle = this.attrs.background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const fontStyle = [];
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
            const measureText = ctx.measureText(lines[i]);
            const offsetY = lineHeight * (i + 1) - thickness + (padding / 2 - thickness);
            ctx.fillText(lines[i], offsetX, offsetY - (this.attrs.lineStyle === 'underline' ? 10 : 15), canvas.width);

            if (this.attrs.lineStyle) {
                let lineY = offsetY;
                if (this.attrs.lineStyle === 'strike') {
                    lineY = offsetY - (lineHeight / 2 - thickness - lineTop);
                }
                ctx.beginPath();
                ctx.moveTo(offsetX, lineY);
                ctx.lineWidth = thickness;
                ctx.lineTo(measureText.width + offsetX, lineY);
                ctx.strokeStyle = '#ff0000';
                ctx.stroke();
            }
        }

        const embedded = await embedImage(this.page.pdfDocument.documentProxy, 'image/png', canvas.toDataURL('image/png', 1));
        if (!embedded) return false;

        const widthPdf = embedded.width / fontScale;
        const heightPdf = embedded.height / fontScale;
        const x = this.getX();
        const y = this.page.height - (this.getY() + heightPdf);
        const imageOptions = {
            x,
            y,
            width: widthPdf,
            height: heightPdf,
            opacity: opacity
        };
        if (this.attrs.rotate) {
            imageOptions.rotate = this.degrees(this.attrs.rotate);
        }
        this.page.pageProxy.drawImage(embedded, imageOptions);
        return true;
    }
}

export { TextElement };
