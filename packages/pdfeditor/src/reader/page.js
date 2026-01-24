import { Events, PDFEvent } from '../event';
import { Font } from '../font';
import { PDFLinkService } from 'pdfjs-dist-v2/lib/web/pdf_link_service';
import { PDFPageBase } from './page_base';
import { getPixelColor, trimSpace } from '../misc';
import { Locale } from '../locale';

const textContentOptions = {
    // Keep items separate so text highlights don't span large whitespace gaps.
    disableCombineTextItems: true,
    includeMarkedContent: false
};
const INSERT_PAGE_CLASS= 'insert_page_box';
const INSERT_PAGE_BTN_CLASS= 'insert_page_btn';
const REMOVE_BTN = 'remove_page';

export class PDFPage extends PDFPageBase {
    textParts = [];
    clearTexts = [];
    //要隐藏的元素
    hideOriginElements = [];
    isConvertWidget = [];
    elInsertPage = null;

    init() {
        super.init();
        this.elInsertPage = document.createElement('div');
        this.elInsertPage.addEventListener('click', () => {
            PDFEvent.dispatch(Events.PAGE_ADD, {
                pageNum: this.pageNum + 1
            });
        });
        this.elInsertPage.classList.add(INSERT_PAGE_BTN_CLASS);
        this.elInsertPage.textContent = Locale.get('insert_page');
        let elBox = document.createElement('div');
        elBox.classList.add(INSERT_PAGE_CLASS);
        let elBg = document.createElement('div');
        elBg.classList.add('insert_page_bg');
        elBox.appendChild(elBg);
        elBox.appendChild(this.elInsertPage);
        this.elContainer.appendChild(elBox);


        let elRemoveBtn = document.createElement('img');
        elRemoveBtn.src = ASSETS_URL + 'img/deletepage.svg';
        elRemoveBtn.classList.add(REMOVE_BTN);
        elRemoveBtn.addEventListener('click', e => {
            e.stopPropagation();
            PDFEvent.dispatch(Events.PAGE_REMOVE, {
                pageNum: this.pageNum
            });
        });
        //防止出发添加文本
        elRemoveBtn.addEventListener('mousedown', e => {
            e.stopPropagation();
        });
        this.elWrapper.appendChild(elRemoveBtn);
    }

    /**
     * 
     * @returns {Promise<canvas>}
     */
    async renderHTML() {
        const canvas = await this.renderCanvas();
        if (!this.elTextLayer) {
            this.elTextLayer = document.createElement('div');
            this.elTextLayer.classList.add('textLayer');
            this.elWrapper.appendChild(this.elTextLayer);
            this.elTextLayer.addEventListener('click', (e) => {
                const target = e?.target;
                if (!(target instanceof Element)) return;
                const elDiv = target.closest('[data-id]');
                if (!elDiv) return;
                if (!this.elTextLayer || !this.elTextLayer.contains(elDiv)) return;
                this.convertWidget(elDiv);
            });
        }
        this.elTextLayer.style.width = canvas.style.width;
        this.elTextLayer.style.height = canvas.style.height;
        
        const viewport = this.pageProxy.getViewport({ scale: this.scale / this.outputScale });
        this.getTextContent().then(async textContent => {
            const readableStream = this.pageProxy.streamTextContent(textContentOptions);
            // const x = transform[4];
            // const y = transform[5];
            //首先按 Y desc , X asc 对文本进行排序
            // this.textContentItems.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
            const styles = textContent.styles;
            this.textDivs = [];
            let textContentItemsStr = [];
            let taskTextLayer = this.reader.pdfjsLib.renderTextLayer({
                textContent: textContent,
                textContentStream: readableStream,
                container: this.elTextLayer,
                viewport: viewport,
                textDivs: this.textDivs,
                textContentItemsStr: textContentItemsStr,
                enhanceTextSelection: false
            });

            // await Font.fetchFallbackFont();
            // //生成字体子集
            // Object.keys(this.textContentStyles).forEach(fontName => {
            //     let id = this.id ? this.id : fontName;
            //     Font.subset(id, this.pageProxy.commonObjs, fontName);
            // });

            taskTextLayer.promise.then(() => {
                this.hideOriginElements.forEach(data => {
                    let textDiv = this.textDivs[data.idx];
                    textDiv.style.userSelect = data.userSelect;
                    textDiv.classList.remove(data.className);
                    textDiv.style.padding = data.padding;
                    textDiv.style.backgroundColor = data.backgroundColor;
                });

                this.textParts = [];
                let text = '';
                let textWidth = 0;
                let elements = [];
                let n = 0;
                let prevTextItem = null;
                // console.log(this.textContentItems);
                
                for (let i = 0; i < this.textContentItems.length; i++) {
                    let textItem = this.textContentItems[i];
                    text += textItem.str;
                    textWidth += this.textDivs[i].getBoundingClientRect().width;

                    let elDiv = this.textDivs[i];
                    if (this.hideOriginElements.findIndex(data => data.idx == i) === -1) {
                        elDiv.classList.add('text-border');
                    }
                    let offsetX = 2;
                    let styleLeft  = (parseInt(elDiv.style.left) * this.outputScale) + offsetX + 'px';
                    let styleTop = (parseInt(elDiv.style.top) * this.outputScale) + 'px';
                    let styleFontSize = (parseInt(elDiv.style.fontSize) * this.outputScale) + 'px';
                    elDiv.style.left = styleLeft;
                    elDiv.style.top = styleTop;
                    elDiv.style.fontSize = styleFontSize;
                    elDiv.style.fontFamily = textItem.fontName;

                    elDiv.setAttribute('data-p', this.pageNum);
                    elDiv.setAttribute('data-id', this.pageNum + '_' + n + '_' + elements.length);
                    elDiv.setAttribute('data-parts', n);
                    elDiv.setAttribute('data-l', elements.length);
                    elDiv.setAttribute('data-idx', i);
                    elDiv.setAttribute('data-loadedname', textItem.fontName);
                    elDiv.setAttribute('data-fontsize', styleFontSize);
                    let style = styles[textItem.fontName];
                    elDiv.setAttribute('data-fallbackname', style.fontFamily);
                    elDiv.setAttribute('data-ascent', style.ascent || 0);
                    elDiv.setAttribute('data-descent', style.descent || 0);
                    if (textItem.color) {
                        elDiv.setAttribute('data-fontcolor', textItem.color);
                    }
                    if (this.pageProxy.commonObjs.has(textItem.fontName)) {
                        let objs = this.pageProxy.commonObjs.get(textItem.fontName);
                        elDiv.setAttribute('data-fontname', objs.name);
                    }
                    elements.push(elDiv);

                    if ((i+1) == this.textContentItems.length) {
                        this.textParts[n] = {
                            text: text,
                            elements: elements,
                            width: textWidth
                        };
                        this.#filterDiv(n);
                        break;
                    }

                    if (!prevTextItem && textItem.height > 0) {
                        prevTextItem = textItem;
                    }

                    if (textItem.hasEOL || (prevTextItem && this.#isBreak(prevTextItem, i+1))) {
                        prevTextItem = null;
                        this.textParts[n] = {
                            text: trimSpace(text),
                            elements: elements,
                            width: textWidth
                        };
                        this.#filterDiv(n);
                        text = '';
                        textWidth = 0;
                        elements = [];
                        n++;
                    }
                }
                this.#groupTextPartsIntoParagraphs();
            });
        });

        if (!this.elAnnotationLayer) {
            this.elAnnotationLayer = document.createElement('div');
            this.elAnnotationLayer.classList.add('annotationLayer');
            this.elWrapper.appendChild(this.elAnnotationLayer);
        }
        
        // let params = {
        //     annotations: this.annotations,
        //     viewport: viewport.clone({ dontFlip: true }),
        //     div: this.elAnnotationLayer,
        //     page: this.pageProxy,
        //     renderForms: true,
        //     annotationStorage: this.pdfDocument.documentProxy.annotationStorage,
        //     linkService: new PDFLinkService()
        // };
        // if (!this.annotations) {
        //     this.pageProxy.getAnnotations().then(annotations => {
        //         this.annotations = annotations;
        //         params.annotations = annotations;
        //         pdfjsLib.AnnotationLayer.render(params);
        //     });
        // } else {
        //     pdfjsLib.AnnotationLayer.update(params);
        // }
        return canvas;
    }

    async convertWidget(elDiv) {
        let idx = elDiv.getAttribute('data-parts');
        if (this.isConvertWidget.indexOf(idx) > -1) {
            return;
        }

        let id = this.pageNum + '_' + idx + '_' + elDiv.getAttribute('data-l');
        const textPart = this.textParts[idx];
        const baseElement = this.#getTextPartElement(textPart, elDiv);
        if (!textPart || !baseElement) {
            return;
        }
        // PDF.js already selects the correct font face (regular/bold/italic) for the text layer.
        // Applying CSS bold/italic on top of that causes "synthetic" styling and can make text
        // appear thicker than the original PDF.
        const bold = false;
        const italic = false;

        // Keep the historical width tweak for italic PDF fonts so the cover box doesn't clip.
        const rawFontName = baseElement.getAttribute('data-fontname');
        const fontName = typeof rawFontName === 'string' ? rawFontName.toLowerCase() : '';
        const isItalicFont = fontName.includes('oblique') || fontName.includes('italic');
        if (isItalicFont) {
            this.#applyItalicWidthPadding(textPart);
        }
        const bounds = this.#getTextPartBounds(textPart, baseElement, isItalicFont);
        if (!bounds) {
            return;
        }
        let x = bounds.left;
        let y = bounds.top;

        let fontSize = parseFloat(baseElement.getAttribute('data-fontsize'));
        let color = baseElement.getAttribute('data-fontcolor');
        let bgColor = baseElement.getAttribute('data-bgcolor') || getPixelColor(this.content.getContext('2d'), bounds.left * this.outputScale, bounds.top * this.outputScale);
        let fontFamily = baseElement.getAttribute('data-loadedname') || 'Helvetica';
        const coverWidth = bounds.width;
        const coverHeight = bounds.height;
        const lineHeightPx = (typeof textPart.lineHeight === 'number' && Number.isFinite(textPart.lineHeight)) ? textPart.lineHeight : null;
        const lineHeight = lineHeightPx ? lineHeightPx / this.scale : null;

        // Store a stable "cover box" in PDF units for export-time redaction.
        // This avoids relying on edited text metrics (which shrink when deleting text),
        // and ensures we can still cover the original glyphs when the user clears text.
        const contentRect = this.content.getBoundingClientRect();
        const pdfWidth = this.pageProxy?.view?.[2] || 0;
        const pdfHeight = this.pageProxy?.view?.[3] || 0;
        const pxToPdfX = contentRect.width ? pdfWidth / contentRect.width : 0;
        const pxToPdfY = contentRect.height ? pdfHeight / contentRect.height : 0;
        const coverPaddingX = 2;
        const coverPaddingY = 2;
        const coverOffsetX = pxToPdfX ? -coverPaddingX * pxToPdfX : 0;
        const coverOffsetY = pxToPdfY ? -coverPaddingY * pxToPdfY : 0;
        const coverWidthPdf = pxToPdfX ? (coverWidth + coverPaddingX * 2) * pxToPdfX : 0;
        const coverHeightPdf = pxToPdfY ? (coverHeight + coverPaddingY * 2) * pxToPdfY : 0;

        // textPart.elements.forEach(async (element, i) => {
        //     if (fontSize == 0) {
        //         fontSize = parseFloat(element.getAttribute('data-fontsize'));
        //     }
        //     if (!color && element.getAttribute('data-fontcolor')) {
        //         color = element.getAttribute('data-fontcolor');
        //     }
        // });

        PDFEvent.dispatch(Events.CONVERT_TO_ELEMENT, {
            elDiv,
            type: 'text',
            attrs: {
                id: id,
                // size: fontSize / this.scale / this.outputScale,
                size: fontSize / this.scale,
                color: color,
                text: textPart.text,
                lineHeight: lineHeight,
                lineHeightMeasured: Boolean(lineHeight),
                fontFamily: fontFamily,
                fontFile: fontFamily,
                fontName: baseElement.getAttribute('data-fontname'),
                opacity: 1,
                underline: null,
                // Cover the original glyphs when exporting without relying on PDF.js worker patches.
                background: bgColor,
                backgroundWidth: coverWidth,
                coverOriginal: true,
                coverOffsetX: coverOffsetX,
                coverOffsetY: coverOffsetY,
                coverWidth: coverWidthPdf,
                coverHeight: coverHeightPdf,
                bold: bold,
                italic: italic,
                rotate: null
            },
            options: {
                pos: {
                    x, y
                }
            },
            pageNum: this.pageNum
        }, () => {
            this.isConvertWidget.push(idx);
            baseElement.style.cursor = 'default';
            textPart.elements.forEach(async (element, i) => {
                element.classList.remove('text-border');
                element.classList.add('text-hide');
                element.style.backgroundColor = bgColor;
                element.style.userSelect = 'none';
                element.style.padding = '3px 0 3px 0';
                const elementTop = this.#parsePx(element.style.top);
                const elementLeft = this.#parsePx(element.style.left);
                element.style.top = (elementTop - 2) + 'px';
                element.style.left = (elementLeft - 2) + 'px';
    
                let textItemIdx = element.getAttribute('data-idx');
                if (this.hideOriginElements.findIndex(data => data.idx == textItemIdx) === -1) {
                    this.hideOriginElements.push({
                        idx: textItemIdx,
                        padding: element.style.padding,
                        backgroundColor: bgColor,
                        userSelect: element.style.userSelect
                    });
                }
                this.clearTexts.push(this.textContentItems[parseInt(element.getAttribute('data-idx'))]);
            });
        });
        return true;
    }

    #filterDiv(n) {
        const textParts = this.textParts[n];
        let firstElement = null;
        textParts.elements.forEach((el, i) => {
            let isEmptyStr = trimSpace(el.textContent) == '';
            if (!firstElement) {
                if (!isEmptyStr) {
                    firstElement = el;
                    firstElement.style.transform = 'none';
                    firstElement.style.left = el.style.left;
                    firstElement.style.top = el.style.top;
                } else {
                    el.remove();
                }
            } else {
                firstElement.textContent += el.textContent;
                el.remove();
            }
        });
        if (firstElement) {
            firstElement.style.width = (textParts.width * this.outputScale) + 'px';
        }
    }

    #isBreak(textItem, nextIdx) {
        let nextTextItem = this.textContentItems[nextIdx];
        if (nextTextItem.height == 0) {
            // return nextTextItem.width >= 2.5;
            return nextTextItem.width > 8;
        } else {
            return nextTextItem.height != textItem.height || nextTextItem.color != textItem.color;
        }
    }

    #groupTextPartsIntoParagraphs() {
        const lineParts = this.textParts.filter(Boolean);
        if (lineParts.length <= 1) {
            lineParts.forEach((part, index) => {
                this.#getConnectedElements(part).forEach(el => el.setAttribute('data-parts', index));
            });
            return;
        }

        const paragraphs = [];
        let current = null;
        for (const linePart of lineParts) {
            const line = this.#getLineInfo(linePart);
            if (!line) continue;

            if (!current) {
                current = this.#startParagraph(linePart, line);
                continue;
            }

            const join = this.#canJoinParagraph(current, line);
            if (!join) {
                paragraphs.push(this.#finishParagraph(current));
                current = this.#startParagraph(linePart, line);
                continue;
            }

            this.#appendParagraphLine(current, linePart, line, join);
        }
        if (current) {
            paragraphs.push(this.#finishParagraph(current));
        }

        paragraphs.forEach((paragraph, index) => {
            paragraph.elements.forEach(el => el.setAttribute('data-parts', index));
        });
        this.textParts = paragraphs;
    }

    #startParagraph(linePart, line) {
        const elements = this.#getConnectedElements(linePart);
        const elementSet = new Set(elements);
        const right = line.left + line.width;
        const bottom = line.top + line.height;
        return {
            text: linePart.text,
            elements,
            elementSet,
            width: line.width,
            minLeft: line.left,
            maxRight: right,
            top: line.top,
            bottom,
            fontSize: line.fontSize,
            fontName: line.fontName,
            color: line.color,
            alignLeft: line.left,
            lastTop: line.top,
            lineCount: 1,
            gapTotal: 0,
            gapCount: 0
        };
    }

    #appendParagraphLine(current, linePart, line, join) {
        current.text += '\n' + linePart.text;
        const elements = this.#getConnectedElements(linePart);
        elements.forEach(el => {
            if (!current.elementSet.has(el)) {
                current.elementSet.add(el);
                current.elements.push(el);
            }
        });
        current.width = Math.max(current.width, line.width);
        current.minLeft = Math.min(current.minLeft, line.left);
        current.maxRight = Math.max(current.maxRight, line.left + line.width);
        current.top = Math.min(current.top, line.top);
        current.bottom = Math.max(current.bottom, line.top + line.height);
        current.gapTotal += join.gap;
        current.gapCount += 1;
        current.lastTop = line.top;
        current.lineCount += 1;
        if (typeof join.alignLeft === 'number') {
            current.alignLeft = join.alignLeft;
        }
    }

    #finishParagraph(current) {
        const lineHeight = current.gapCount > 0 ? current.gapTotal / current.gapCount : null;
        return {
            text: current.text,
            elements: current.elements,
            width: current.width,
            lineHeight,
            bounds: {
                left: current.minLeft,
                top: current.top,
                right: current.maxRight,
                bottom: current.bottom,
                width: current.maxRight - current.minLeft,
                height: current.bottom - current.top
            }
        };
    }

    #canJoinParagraph(current, line) {
        const gap = line.top - current.lastTop;
        if (!Number.isFinite(gap) || gap <= 0) {
            return null;
        }

        const fontSize = current.fontSize || line.fontSize;
        if (!fontSize) {
            return null;
        }

        const sameFont = current.fontName === line.fontName && Math.abs(current.fontSize - line.fontSize) <= 0.5;
        const sameColor = !current.color || !line.color || current.color === line.color;
        if (!sameFont || !sameColor) {
            return null;
        }

        const avgGap = current.gapCount ? current.gapTotal / current.gapCount : 0;
        const maxGap = Math.max(fontSize * 1.9, avgGap ? avgGap * 1.4 : 0);
        if (gap > maxGap) {
            return null;
        }

        const alignThreshold = fontSize * 0.6;
        const indentThreshold = fontSize * 2.2;
        if (current.lineCount === 1) {
            const leftDiff = Math.abs(line.left - current.alignLeft);
            if (leftDiff <= alignThreshold) {
                return { gap };
            }
            if (leftDiff <= indentThreshold) {
                return { gap, alignLeft: line.left };
            }
            return null;
        }

        const leftDiff = Math.abs(line.left - current.alignLeft);
        if (leftDiff <= alignThreshold) {
            return { gap };
        }
        return null;
    }

    #getLineInfo(textPart) {
        const elements = this.#getConnectedElements(textPart);
        const element = elements[0];
        if (!element) return null;

        const left = this.#parsePx(element.style.left);
        const top = this.#parsePx(element.style.top);
        const rect = element.getBoundingClientRect();
        const width = this.#parsePx(element.style.width) || rect.width;
        const height = this.#parsePx(element.style.height) || rect.height;
        const fontSize = this.#parsePx(element.getAttribute('data-fontsize')) || this.#parsePx(element.style.fontSize);
        return {
            left,
            top,
            width,
            height,
            fontSize,
            fontName: element.getAttribute('data-loadedname') || '',
            color: element.getAttribute('data-fontcolor') || ''
        };
    }

    #getTextPartBounds(textPart, baseElement, forceRefresh = false) {
        if (!textPart) return null;
        if (textPart.bounds && !forceRefresh) return textPart.bounds;
        const elements = this.#getConnectedElements(textPart);
        if (!elements.length && baseElement) {
            elements.push(baseElement);
        }
        if (!elements.length) return null;

        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;
        elements.forEach(el => {
            const box = this.#getElementBox(el);
            if (!box) return;
            left = Math.min(left, box.left);
            top = Math.min(top, box.top);
            right = Math.max(right, box.right);
            bottom = Math.max(bottom, box.bottom);
        });
        if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
            return null;
        }
        const bounds = {
            left,
            top,
            right,
            bottom,
            width: right - left,
            height: bottom - top
        };
        if (textPart) {
            textPart.bounds = bounds;
        }
        return bounds;
    }

    #getElementBox(element) {
        if (!element) return null;
        const left = this.#parsePx(element.style.left);
        const top = this.#parsePx(element.style.top);
        const rect = element.getBoundingClientRect();
        const width = this.#parsePx(element.style.width) || rect.width;
        const height = this.#parsePx(element.style.height) || rect.height;
        return {
            left,
            top,
            right: left + width,
            bottom: top + height
        };
    }

    #getTextPartElement(textPart, fallback) {
        const elements = this.#getConnectedElements(textPart);
        return elements[0] || fallback;
    }

    #getConnectedElements(textPart) {
        if (!textPart || !Array.isArray(textPart.elements)) return [];
        const elements = [];
        const seen = new Set();
        textPart.elements.forEach(el => {
            if (!el || !el.isConnected || seen.has(el)) return;
            seen.add(el);
            elements.push(el);
        });
        return elements;
    }

    #applyItalicWidthPadding(textPart) {
        const elements = this.#getConnectedElements(textPart);
        elements.forEach(el => {
            if (el.getAttribute('data-italic-pad')) return;
            const width = this.#parsePx(el.style.width);
            const rectWidth = el.getBoundingClientRect().width;
            const baseWidth = width || rectWidth;
            if (baseWidth > 0) {
                el.style.width = (baseWidth + 3) + 'px';
                el.setAttribute('data-italic-pad', '1');
            }
        });
    }

    #parsePx(value) {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
    }
};
