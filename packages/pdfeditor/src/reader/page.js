import { Events, PDFEvent } from '../event';
import { Font } from '../font';
import { PDFLinkService } from 'pdfjs-dist-v2/lib/web/pdf_link_service';
import { PDFPageBase } from './page_base';
import { getPixelColor, trimSpace } from '../misc';
import { Locale } from '../locale';

const textContentOptions = {
    // Match old editor behavior so PDF.js marks line endings correctly.
    disableCombineTextItems: false,
    includeMarkedContent: false
};
const INSERT_PAGE_CLASS= 'insert_page_box';
const INSERT_PAGE_BTN_CLASS= 'insert_page_btn';
const REMOVE_BTN = 'remove_page';

export class PDFPage extends PDFPageBase {
    textParts = [];
    textPartsReady = null;
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
                this.#handleTextLayerClick(e);
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

            const textLayerReady = taskTextLayer.promise.then(() => {
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
                let lineHasLeader = false;
                // console.log(this.textContentItems);
                
                for (let i = 0; i < this.textContentItems.length; i++) {
                    let textItem = this.textContentItems[i];
                    text += textItem.str;
                    if (this.#isLeaderText(textItem?.str)) {
                        lineHasLeader = true;
                    }
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
                    if (textItem.color !== undefined && textItem.color !== null) {
                        const colorValue = Array.isArray(textItem.color)
                            ? textItem.color.join(',')
                            : String(textItem.color);
                        elDiv.setAttribute('data-fontcolor', colorValue);
                    }
                    if (this.pageProxy.commonObjs.has(textItem.fontName)) {
                        let objs = this.pageProxy.commonObjs.get(textItem.fontName);
                        elDiv.setAttribute('data-fontname', objs.name);
                    }
                    elements.push(elDiv);
                    elDiv.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.convertWidget(elDiv);
                    });

                    if ((i+1) == this.textContentItems.length) {
                        const itemIndices = Array.from(new Set(elements.map(el => {
                            const idx = Number.parseInt(el.getAttribute('data-idx'), 10);
                            return Number.isFinite(idx) ? idx : null;
                        }).filter(idx => idx !== null)));
                        this.textParts[n] = {
                            text: text,
                            elements: elements,
                            width: textWidth,
                            itemIndices: itemIndices
                        };
                        this.#filterDiv(n);
                        break;
                    }

                    if (!prevTextItem && textItem.height > 0) {
                        prevTextItem = textItem;
                    }

                    if (textItem.hasEOL || (prevTextItem && this.#isBreak(prevTextItem, i+1, lineHasLeader))) {
                        prevTextItem = null;
                        lineHasLeader = false;
                        const itemIndices = Array.from(new Set(elements.map(el => {
                            const idx = Number.parseInt(el.getAttribute('data-idx'), 10);
                            return Number.isFinite(idx) ? idx : null;
                        }).filter(idx => idx !== null)));
                        this.textParts[n] = {
                            text: trimSpace(text),
                            elements: elements,
                            width: textWidth,
                            itemIndices: itemIndices
                        };
                        this.#filterDiv(n);
                        text = '';
                        textWidth = 0;
                        elements = [];
                        n++;
                    }
                }
            });
            this.textPartsReady = textLayerReady;
            textLayerReady.catch(() => {});
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

    async ensureTextParts() {
        if (this.textPartsReady) {
            try {
                await this.textPartsReady;
            } catch (err) {
                // Ignore text layer failures; fallback to whatever is available.
            }
        }
        return this.textParts || [];
    }

    async convertWidget(elDiv) {
        const idx = Number.parseInt(elDiv.getAttribute('data-parts'), 10);
        if (!Number.isFinite(idx)) {
            return;
        }
        const textPart = this.textParts ? this.textParts[idx] : null;
        if (!textPart) {
            return;
        }
        const convertKey = String(idx);
        if (this.isConvertWidget.indexOf(convertKey) > -1) {
            return;
        }

        let id = `${this.pageNum}_${idx}_${elDiv.getAttribute('data-l')}`;
        const baseElement = this.#getTextPartElement(textPart, elDiv);
        if (!baseElement) {
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
        let bounds = this.#getTextPartBounds(textPart, baseElement, isItalicFont);
        if (!bounds) {
            return;
        }
        let x = bounds.left;
        let y = bounds.top;
        const rawTextValue = typeof textPart.text === 'string' ? textPart.text : '';
        let textValue = rawTextValue;

        let fontSize = parseFloat(baseElement.getAttribute('data-fontsize'));
        if (!Number.isFinite(fontSize)) {
            const computed = window.getComputedStyle(baseElement);
            fontSize = parseFloat(computed?.fontSize) || 12;
        }
        let color = this.#normalizeFontColor(baseElement.getAttribute('data-fontcolor'));
        if (!color) {
            const computed = window.getComputedStyle(baseElement);
            color = this.#normalizeFontColor(computed?.color || baseElement.style.color);
        }
        let bgColor = baseElement.getAttribute('data-bgcolor');
        if (!bgColor) {
            bgColor = this.#getBackgroundColorByCanvas(bounds, color);
        }
        if (!bgColor) {
            bgColor = getPixelColor(this.content.getContext('2d'), bounds.left * this.outputScale, bounds.top * this.outputScale);
        }
        if (!color) {
            const inferredColor = this.#inferTextColorByCanvas(bounds, bgColor);
            if (inferredColor) {
                color = inferredColor;
            }
        }
        if (!color) {
            color = '#000000';
        }
        if (bgColor && color) {
            const bgRgb = this.#parseColorToRgba(bgColor);
            const textRgb = this.#parseColorToRgba(color);
            if (bgRgb && textRgb && this.#isNearColor(bgRgb.r, bgRgb.g, bgRgb.b, textRgb, 18)) {
                const fallbackBg = this.#getBackgroundColorByCanvas(bounds, color, true);
                if (fallbackBg) {
                    bgColor = fallbackBg;
                } else {
                    bgColor = '#ffffff';
                }
            }
        }
        const originalFontFamily = baseElement.getAttribute('data-loadedname') || 'Helvetica';
        const originalFontName = baseElement.getAttribute('data-fontname') || originalFontFamily;
        const resolvedFont = Font.resolveSafeFont({
            fontFamily: originalFontFamily,
            fontFile: originalFontFamily,
            fontName: originalFontName,
            text: textValue
        });
        let fontFamily = resolvedFont.fontFamily;
        let coverRectsPx = Array.isArray(textPart.coverRects) ? textPart.coverRects : null;
        const leaderGapWidth = this.#getLeaderGapWidth(coverRectsPx);
        if (this.#shouldInsertLeaderDots(textValue, leaderGapWidth, fontSize)) {
            const leaderDots = this.#buildLeaderDots(leaderGapWidth, baseElement, fontSize);
            const nextTextValue = this.#insertLeaderDots(textValue, leaderDots);
            if (nextTextValue !== textValue) {
                textValue = nextTextValue;
                textPart.text = nextTextValue;
                coverRectsPx = null;
                textPart.coverRects = null;
                textPart.coverElements = null;
            }
        }
        if (!Array.isArray(textPart.coverRects) || textPart.coverRects.length === 0) {
            const refined = this.#refineLineBoundsByCanvas(bounds, bgColor, fontSize);
            if (refined) {
                bounds = refined;
                textPart.bounds = refined;
                textPart.width = refined.width;
            }
        }
        const coverWidth = bounds.width;
        const coverHeight = bounds.height;
        const extraCoverRightPx = Math.max(2, Math.ceil(fontSize * 0.35));
        const boxWidth = Number.isFinite(bounds.width) && this.scale ? bounds.width / this.scale : null;
        const boxHeight = Number.isFinite(bounds.height) && this.scale ? bounds.height / this.scale : null;

        // Store a stable "cover box" in PDF units for export-time redaction.
        // This avoids relying on edited text metrics (which shrink when deleting text),
        // and ensures we can still cover the original glyphs when the user clears text.
        const contentRect = this.content.getBoundingClientRect();
        const pdfWidth = this.pageProxy?.view?.[2] || 0;
        const pdfHeight = this.pageProxy?.view?.[3] || 0;
        const fallbackPdfScale = this.scale ? 1 / this.scale : 0;
        const pxToPdfX = contentRect.width ? pdfWidth / contentRect.width : fallbackPdfScale;
        const pxToPdfY = contentRect.height ? pdfHeight / contentRect.height : fallbackPdfScale;
        const coverPaddingX = 2;
        const coverPaddingY = 2;
        const coverOffsetX = pxToPdfX ? -coverPaddingX * pxToPdfX : 0;
        const coverOffsetY = pxToPdfY ? -coverPaddingY * pxToPdfY : 0;
        const coverWidthPdf = pxToPdfX ? (coverWidth + coverPaddingX * 2 + extraCoverRightPx) * pxToPdfX : 0;
        const coverHeightPdf = pxToPdfY ? (coverHeight + coverPaddingY * 2) * pxToPdfY : 0;
        const hasCoverRects = Boolean(coverRectsPx && coverRectsPx.length > 1);
        const coverRectsPdf = hasCoverRects && pxToPdfX && pxToPdfY
            ? coverRectsPx.map((rect, idx) => {
                if (!rect) return null;
                const padLeft = coverPaddingX;
                const padRight = coverPaddingX + (idx === coverRectsPx.length - 1 ? extraCoverRightPx : 0);
                const padY = coverPaddingY;
                const leftPx = rect.left - padLeft;
                const topPx = rect.top - padY;
                const widthPx = rect.width + padLeft + padRight;
                const heightPx = rect.height + padY * 2;
                if (!Number.isFinite(leftPx) || !Number.isFinite(topPx)
                    || !Number.isFinite(widthPx) || !Number.isFinite(heightPx)) {
                    return null;
                }
                return {
                    left: leftPx * pxToPdfX,
                    top: topPx * pxToPdfY,
                    width: widthPx * pxToPdfX,
                    height: heightPx * pxToPdfY
                };
            }).filter(Boolean)
            : null;
        const coverBackground = hasCoverRects ? bgColor : null;
        const displayBackground = hasCoverRects ? null : bgColor;

        PDFEvent.dispatch(Events.CONVERT_TO_ELEMENT, {
            elDiv,
            type: 'text',
            attrs: {
                id: id,
                // size: fontSize / this.scale / this.outputScale,
                size: fontSize / this.scale,
                color: color,
                text: textValue,
                lineHeight: null,
                lineHeightMeasured: false,
                lineOffsets: null,
                boxWidth: boxWidth,
                boxHeight: boxHeight,
                textIndent: null,
                textPaddingLeft: null,
                textMode: 'line',
                fontFamily: fontFamily,
                fontFile: resolvedFont.fontFile,
                fontName: originalFontName,
                showName: resolvedFont.showName,
                displayFontFamily: originalFontFamily,
                opacity: 1,
                underline: null,
                // Cover the original glyphs when exporting without relying on PDF.js worker patches.
                background: displayBackground,
                coverBackground: coverBackground,
                backgroundWidth: coverWidth,
                coverOriginal: true,
                coverOffsetX: coverOffsetX,
                coverOffsetY: coverOffsetY,
                coverWidth: coverWidthPdf,
                coverHeight: coverHeightPdf,
                coverRects: coverRectsPdf,
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
            this.isConvertWidget.push(convertKey);
            baseElement.style.cursor = 'default';
            const coverBounds = textPart.bounds ? textPart.bounds : null;
            const coverRects = Array.isArray(textPart.coverRects)
                ? textPart.coverRects
                : null;
            const coverElements = Array.isArray(textPart.coverElements)
                ? textPart.coverElements.filter(el => el && el.isConnected)
                : null;
            const useMultiCover = coverRects && coverElements
                && coverRects.length === coverElements.length
                && coverRects.length > 1;

            const applyCover = (element, rect, extraRightPad = 0) => {
                element.classList.remove('text-border');
                element.classList.add('text-hide');
                element.style.backgroundColor = bgColor;
                element.style.userSelect = 'none';
                if (rect) {
                    const padLeft = 2;
                    const padRight = 2 + extraRightPad;
                    const padY = 2;
                    element.style.boxSizing = 'border-box';
                    element.style.padding = '0';
                    element.style.left = (rect.left - padLeft) + 'px';
                    element.style.top = (rect.top - padY) + 'px';
                    element.style.width = (rect.width + padLeft + padRight) + 'px';
                    element.style.height = (rect.height + padY * 2) + 'px';
                } else if (coverBounds) {
                    const coverPadLeft = 2;
                    const coverPadRight = 2 + extraCoverRightPx;
                    const coverPadY = 2;
                    element.style.boxSizing = 'border-box';
                    element.style.padding = '0';
                    element.style.left = (coverBounds.left - coverPadLeft) + 'px';
                    element.style.top = (coverBounds.top - coverPadY) + 'px';
                    element.style.width = (coverBounds.width + coverPadLeft + coverPadRight) + 'px';
                    element.style.height = (coverBounds.height + coverPadY * 2) + 'px';
                } else {
                    element.style.padding = '3px 0 3px 0';
                    const elementTop = this.#parsePx(element.style.top);
                    const elementLeft = this.#parsePx(element.style.left);
                    element.style.top = (elementTop - 2) + 'px';
                    element.style.left = (elementLeft - 2) + 'px';
                }

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
            };

            if (useMultiCover) {
                coverElements.forEach((element, idx) => {
                    const rect = coverRects[idx];
                    const extraRight = idx === coverRects.length - 1 ? extraCoverRightPx : 0;
                    applyCover(element, rect, extraRight);
                });
            } else {
                textPart.elements.forEach(async (element) => {
                    applyCover(element, null, extraCoverRightPx);
                });
            }
        });
        return true;
    }

    #filterDiv(n) {
        const textParts = this.textParts[n];
        if (!textParts || !Array.isArray(textParts.elements)) return;
        const elements = textParts.elements.filter(el => el && el.isConnected);
        if (!elements.length) return;

        const sorted = [...elements].sort((a, b) => {
            const topDiff = this.#parsePx(a.style.top) - this.#parsePx(b.style.top);
            if (Math.abs(topDiff) > 0.5) return topDiff;
            return this.#parsePx(a.style.left) - this.#parsePx(b.style.left);
        });

        const layerRect = this.elTextLayer ? this.elTextLayer.getBoundingClientRect() : null;
        const layerLeft = layerRect ? layerRect.left : 0;
        const layerTop = layerRect ? layerRect.top : 0;
        const baseFontSize = this.#parsePx(sorted[0].getAttribute('data-fontsize')) || this.#parsePx(sorted[0].style.fontSize);
        const spaceThreshold = Math.max(baseFontSize * 0.25, 1);
        let lineText = '';
        let prevRight = null;
        let minLeft = Infinity;
        let maxRight = -Infinity;
        let minTop = Infinity;
        let maxBottom = -Infinity;
        const itemBoxes = [];
        sorted.forEach(el => {
            const text = el.textContent || '';
            const rect = el.getBoundingClientRect();
            let left = rect.left - layerLeft;
            let right = rect.right - layerLeft;
            let top = rect.top - layerTop;
            let bottom = rect.bottom - layerTop;
            if (!Number.isFinite(left) || !Number.isFinite(right)) {
                const styleLeft = this.#parsePx(el.style.left);
                const styleWidth = this.#parsePx(el.style.width) || rect.width;
                left = styleLeft;
                right = styleLeft + styleWidth;
            }
            if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
                const styleTop = this.#parsePx(el.style.top);
                const styleHeight = this.#parsePx(el.style.height) || rect.height;
                top = styleTop;
                bottom = styleTop + styleHeight;
            }
            itemBoxes.push({
                element: el,
                left,
                right,
                top,
                bottom
            });
            const isWhitespace = trimSpace(text) === '';
            if (prevRight !== null && !isWhitespace) {
                const gap = left - prevRight;
                if (gap > spaceThreshold && !lineText.endsWith(' ')) {
                    lineText += ' ';
                }
            }
            if (isWhitespace) {
                if (text && text.length > 0) {
                    lineText += text;
                } else if (!lineText.endsWith(' ')) {
                    lineText += ' ';
                }
            } else {
                lineText += text;
            }
            prevRight = right;
            if (Number.isFinite(left)) minLeft = Math.min(minLeft, left);
            if (Number.isFinite(right)) maxRight = Math.max(maxRight, right);
            if (Number.isFinite(top)) minTop = Math.min(minTop, top);
            if (Number.isFinite(bottom)) maxBottom = Math.max(maxBottom, bottom);
        });

        const mergedText = trimSpace(lineText);
        textParts.text = mergedText;

        const firstElement = sorted[0];
        firstElement.textContent = mergedText;
        firstElement.style.transform = 'none';
        const coverData = this.#buildCoverRects(itemBoxes, baseFontSize, spaceThreshold);
        if (coverData) {
            textParts.coverRects = coverData.rects;
            textParts.coverElements = coverData.elements;
        } else {
            textParts.coverRects = null;
            textParts.coverElements = null;
        }
        if (Number.isFinite(minLeft) && Number.isFinite(maxRight) && Number.isFinite(minTop) && Number.isFinite(maxBottom)) {
            let bounds = {
                left: minLeft,
                top: minTop,
                right: maxRight,
                bottom: maxBottom,
                width: maxRight - minLeft,
                height: maxBottom - minTop
            };
            bounds = this.#applyPdfLineWidth(bounds, sorted, textParts.itemIndices) || bounds;
            const lineWidth = Math.max(0, bounds.right - bounds.left);
            const lineHeight = Math.max(0, bounds.bottom - bounds.top);
            firstElement.style.left = bounds.left + 'px';
            firstElement.style.top = bounds.top + 'px';
            firstElement.style.width = lineWidth + 'px';
            firstElement.style.height = lineHeight + 'px';
            textParts.width = lineWidth;
            textParts.bounds = {
                left: bounds.left,
                top: bounds.top,
                right: bounds.right,
                bottom: bounds.bottom,
                width: lineWidth,
                height: lineHeight
            };
        }

        const keepElements = new Set([firstElement]);
        if (coverData && Array.isArray(coverData.elements)) {
            coverData.elements.forEach(el => keepElements.add(el));
            coverData.elements.forEach(el => {
                if (el === firstElement) return;
                el.textContent = '';
                el.classList.remove('text-border');
                el.classList.add('text-cover-anchor');
                el.style.pointerEvents = 'none';
            });
        }
        sorted.slice(1).forEach(el => {
            if (!keepElements.has(el)) {
                el.remove();
            }
        });
        textParts.elements = Array.from(keepElements);
    }

    #buildCoverRects(itemBoxes, baseFontSize, spaceThreshold) {
        if (!Array.isArray(itemBoxes) || itemBoxes.length < 2) return null;
        const gaps = [];
        for (let i = 1; i < itemBoxes.length; i++) {
            const gap = itemBoxes[i].left - itemBoxes[i - 1].right;
            if (Number.isFinite(gap) && gap > 0) {
                gaps.push(gap);
            }
        }
        if (!gaps.length) return null;
        const sortedGaps = [...gaps].sort((a, b) => a - b);
        const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] || 0;
        const baseThreshold = Math.max(baseFontSize * 1.4, spaceThreshold * 5);
        const leaderGapThreshold = gaps.length > 1
            ? Math.max(baseThreshold, medianGap * 3)
            : baseThreshold;
        let hasLargeGap = false;

        const rects = [];
        const elements = [];
        let clusterStart = 0;
        let clusterLeft = itemBoxes[0].left;
        let clusterRight = itemBoxes[0].right;
        let clusterTop = itemBoxes[0].top;
        let clusterBottom = itemBoxes[0].bottom;

        const pushCluster = (endIndex) => {
            const width = clusterRight - clusterLeft;
            const height = clusterBottom - clusterTop;
            if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
                rects.push({
                    left: clusterLeft,
                    top: clusterTop,
                    right: clusterRight,
                    bottom: clusterBottom,
                    width,
                    height
                });
                elements.push(itemBoxes[clusterStart].element);
            }
            clusterStart = endIndex;
            clusterLeft = itemBoxes[endIndex].left;
            clusterRight = itemBoxes[endIndex].right;
            clusterTop = itemBoxes[endIndex].top;
            clusterBottom = itemBoxes[endIndex].bottom;
        };

        for (let i = 1; i < itemBoxes.length; i++) {
            const gap = itemBoxes[i].left - itemBoxes[i - 1].right;
            if (Number.isFinite(gap) && gap > leaderGapThreshold) {
                hasLargeGap = true;
                pushCluster(i);
                continue;
            }
            clusterLeft = Math.min(clusterLeft, itemBoxes[i].left);
            clusterRight = Math.max(clusterRight, itemBoxes[i].right);
            clusterTop = Math.min(clusterTop, itemBoxes[i].top);
            clusterBottom = Math.max(clusterBottom, itemBoxes[i].bottom);
        }
        pushCluster(itemBoxes.length - 1);

        if (!hasLargeGap || rects.length < 2 || rects.length !== elements.length) {
            return null;
        }
        return { rects, elements };
    }

    #getPdfLineWidth(elements, itemIndices) {
        if (!this.pageProxy || !this.textContentItems) return null;
        const util = this.reader?.pdfjsLib?.Util;
        if (!util || typeof util.transform !== 'function') return null;
        const viewport = this.pageProxy.getViewport({ scale: this.scale });

        let indices = Array.isArray(itemIndices) ? itemIndices : null;
        if (!indices || !indices.length) {
            if (!elements || !elements.length) return null;
            indices = [];
            elements.forEach(element => {
                if (!element) return;
                const idx = Number.parseInt(element.getAttribute('data-idx'), 10);
                if (Number.isFinite(idx)) {
                    indices.push(idx);
                }
            });
        }
        if (!indices.length) return null;
        indices = Array.from(new Set(indices));

        let minLeft = Infinity;
        let maxRight = -Infinity;
        for (const idx of indices) {
            const item = this.textContentItems[idx];
            if (!item || !Array.isArray(item.transform)) continue;

            const tx = util.transform(viewport.transform, item.transform);
            if (!tx || tx.length < 6) continue;
            const style = this.textContentStyles ? this.textContentStyles[item.fontName] : null;
            const isVertical = style?.vertical;
            const itemWidth = (isVertical ? item.height : item.width) * viewport.scale;
            if (!Number.isFinite(itemWidth)) continue;
            const left = tx[4];
            const right = left + itemWidth;
            if (Number.isFinite(left)) minLeft = Math.min(minLeft, left);
            if (Number.isFinite(right)) maxRight = Math.max(maxRight, right);
        }

        if (!Number.isFinite(minLeft) || !Number.isFinite(maxRight)) return null;
        const width = maxRight - minLeft;
        if (!Number.isFinite(width) || width <= 0) return null;
        return { left: minLeft, right: maxRight, width };
    }

    #applyPdfLineWidth(bounds, elements, itemIndices) {
        if (!bounds) return bounds;
        const pdfLine = this.#getPdfLineWidth(elements, itemIndices);
        if (!pdfLine) return bounds;
        const left = Number.isFinite(bounds.left) ? bounds.left : pdfLine.left;
        if (!Number.isFinite(left) || !Number.isFinite(pdfLine.width)) return bounds;
        const pdfRightAligned = left + pdfLine.width;
        if (Number.isFinite(pdfRightAligned)) {
            if (!Number.isFinite(bounds.right) || pdfRightAligned > bounds.right) {
                bounds.right = pdfRightAligned;
            }
            if (!Number.isFinite(bounds.left)) {
                bounds.left = left;
            }
            bounds.width = bounds.right - bounds.left;
        }
        return bounds;
    }

    #getLeaderGapWidth(rects) {
        if (!Array.isArray(rects) || rects.length < 2) return null;
        const sorted = rects.filter(rect => rect
            && Number.isFinite(rect.left)
            && Number.isFinite(rect.right))
            .sort((a, b) => a.left - b.left);
        if (sorted.length < 2) return null;
        let maxGap = 0;
        for (let i = 1; i < sorted.length; i++) {
            const gap = sorted[i].left - sorted[i - 1].right;
            if (Number.isFinite(gap)) {
                maxGap = Math.max(maxGap, gap);
            }
        }
        return maxGap > 0 ? maxGap : null;
    }

    #hasLeaderSequence(text) {
        if (typeof text !== 'string') return false;
        return /[.\u00b7\u2022\u2219\u2024]{3,}/.test(text);
    }

    #shouldInsertLeaderDots(text, gapWidth, fontSize) {
        if (!text || !Number.isFinite(gapWidth) || gapWidth <= 0) return false;
        const trimmed = trimSpace(text);
        if (!trimmed || this.#hasLeaderSequence(trimmed)) return false;
        if (!Number.isFinite(fontSize) || gapWidth < Math.max(fontSize * 2, 12)) {
            return false;
        }
        return /(\d{1,6}|[ivxlcdm]{1,8})$/i.test(trimmed);
    }

    #buildLeaderDots(gapWidth, baseElement, fontSize) {
        if (!Number.isFinite(gapWidth) || gapWidth <= 0) return '....';
        let dotWidth = Number.isFinite(fontSize) ? fontSize * 0.25 : 3;
        const ctx = this.content?.getContext?.('2d');
        if (ctx && baseElement) {
            const computed = window.getComputedStyle(baseElement);
            const fontStyle = computed?.fontStyle || 'normal';
            const fontWeight = computed?.fontWeight || 'normal';
            const fontFamily = computed?.fontFamily || baseElement.style.fontFamily || 'Helvetica';
            const fontSizePx = Number.isFinite(fontSize)
                ? fontSize
                : (parseFloat(computed?.fontSize) || 12);
            ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
            const measured = ctx.measureText('.').width;
            if (Number.isFinite(measured) && measured > 0) {
                dotWidth = measured;
            }
        }
        const count = Math.max(3, Math.min(Math.floor((gapWidth / dotWidth) - 2), 200));
        return '.'.repeat(count);
    }

    #insertLeaderDots(text, leaderDots) {
        if (!leaderDots) return text;
        const trimmed = trimSpace(text);
        const match = trimmed.match(/^(.*?)(\s*)(\d{1,6}|[ivxlcdm]{1,8})$/i);
        if (!match) return text;
        const left = match[1].trimEnd();
        const right = match[3];
        return `${left} ${leaderDots} ${right}`.trim();
    }

    #isLeaderText(text) {
        if (typeof text !== 'string') return false;
        const value = trimSpace(text);
        if (!value) return false;
        return /^[.\u00b7\u2022\u2219\u2024]+$/.test(value);
    }

    #isBreak(textItem, nextIdx, lineHasLeader = false) {
        let nextTextItem = this.textContentItems[nextIdx];
        if (!nextTextItem) return true;
        const nextIsLeader = this.#isLeaderText(nextTextItem.str);
        if (nextTextItem.height == 0) {
            // return nextTextItem.width >= 2.5;
            return nextIsLeader ? false : nextTextItem.width > 8;
        }
        const currentIdx = nextIdx - 1;
        if (!nextIsLeader && !lineHasLeader && this.#isVisualLineBreak(currentIdx, nextIdx)) {
            return true;
        }
        const currentTransform = Array.isArray(textItem?.transform) ? textItem.transform : null;
        const nextTransform = Array.isArray(nextTextItem?.transform) ? nextTextItem.transform : null;
        if (currentTransform && nextTransform) {
            const currentY = currentTransform[5];
            const nextY = nextTransform[5];
            if (Number.isFinite(currentY) && Number.isFinite(nextY)) {
                const currentHeight = Number.isFinite(textItem.height) ? textItem.height : 0;
                const nextHeight = Number.isFinite(nextTextItem.height) ? nextTextItem.height : 0;
                const height = Math.max(currentHeight, nextHeight, 1);
                const yDiff = Math.abs(nextY - currentY);
                if (yDiff > height * 0.5) {
                    return true;
                }
            }
        }
        if (nextIsLeader || lineHasLeader) {
            return false;
        }
        return nextTextItem.height != textItem.height || nextTextItem.color != textItem.color;
    }

    #isVisualLineBreak(currentIdx, nextIdx) {
        if (!Array.isArray(this.textDivs)) return false;
        const currentEl = this.textDivs[currentIdx];
        const nextEl = this.textDivs[nextIdx];
        if (!currentEl || !nextEl) return false;

        const currentBox = this.#getElementBox(currentEl);
        const nextBox = this.#getElementBox(nextEl);
        if (!currentBox || !nextBox) return false;

        const sizeCandidates = [
            this.#parsePx(currentEl.getAttribute('data-fontsize')),
            this.#parsePx(nextEl.getAttribute('data-fontsize')),
            currentBox.height,
            nextBox.height
        ].filter(value => Number.isFinite(value) && value > 0);
        const minSize = sizeCandidates.length ? Math.min(...sizeCandidates) : 1;
        const maxSize = sizeCandidates.length ? Math.max(...sizeCandidates) : minSize;

        const topDiff = Math.abs(nextBox.top - currentBox.top);
        const leftReset = nextBox.left < currentBox.left - Math.max(maxSize * 0.5, 6);
        const strongThreshold = Math.max(minSize * 0.6, 2);
        const weakThreshold = Math.max(minSize * 0.25, 2);

        if (topDiff > strongThreshold) {
            return true;
        }
        if (leftReset && topDiff > weakThreshold) {
            return true;
        }
        return false;
    }

    #getTextPartBounds(textPart, baseElement, forceRefresh = false) {
        if (!textPart) return null;
        if (textPart.bounds && !forceRefresh) {
            const adjusted = this.#applyPdfLineWidth({ ...textPart.bounds }, null, textPart.itemIndices);
            if (adjusted) {
                textPart.bounds = adjusted;
                textPart.width = adjusted.width;
            }
            return textPart.bounds;
        }
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
        let bounds = {
            left,
            top,
            right,
            bottom,
            width: right - left,
            height: bottom - top
        };
        bounds = this.#applyPdfLineWidth(bounds, elements, textPart.itemIndices) || bounds;
        bounds.width = bounds.right - bounds.left;
        bounds.height = bounds.bottom - bounds.top;
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

    #handleTextLayerClick(e) {
        const target = e?.target;
        if (target instanceof Element) {
            const elDiv = target.closest('[data-id]');
            if (elDiv && this.elTextLayer && this.elTextLayer.contains(elDiv)) {
                this.convertWidget(elDiv);
                return;
            }
        }
        if (!this.elTextLayer) return;
        const rect = this.elTextLayer.getBoundingClientRect();
        const x = e?.clientX - rect.left;
        const y = e?.clientY - rect.top;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const hitPart = this.#findTextPartByPoint(x, y);
        if (!hitPart) return;
        const baseElement = this.#getTextPartElement(hitPart, null);
        if (!baseElement) return;
        this.convertWidget(baseElement);
    }

    #findTextPartByPoint(x, y) {
        const parts = this.textParts;
        if (!Array.isArray(parts) || !parts.length) return null;
        const padding = 1;
        for (const part of parts) {
            if (!part) continue;
            let bounds = part.bounds;
            if (!bounds) {
                bounds = this.#getTextPartBounds(part, this.#getTextPartElement(part, null));
            }
            if (!bounds) continue;
            if (this.#pointInBounds(x, y, bounds, padding)) {
                return part;
            }
        }
        return null;
    }

    #pointInBounds(x, y, bounds, padding = 0) {
        const left = bounds.left - padding;
        const right = bounds.right + padding;
        const top = bounds.top - padding;
        const bottom = bounds.bottom + padding;
        return x >= left && x <= right && y >= top && y <= bottom;
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

    #getBackgroundColorByCanvas(bounds, textColor, expanded = false) {
        if (!bounds || !this.content) return null;
        const ctx = this.content.getContext('2d');
        if (!ctx) return null;
        const scale = this.outputScale || 1;
        const inset = expanded ? 6 : 3;
        const xLeft = bounds.left - inset;
        const xRight = bounds.right + inset;
        const xMid = bounds.left + bounds.width * 0.5;
        const yTop = bounds.top - inset;
        const yBottom = bounds.bottom + inset;
        const yMid = bounds.top + bounds.height * 0.5;
        const candidates = [
            { x: xLeft, y: yMid },
            { x: xRight, y: yMid },
            { x: xMid, y: yTop },
            { x: xMid, y: yBottom },
            { x: bounds.left + bounds.width * 0.2, y: yTop },
            { x: bounds.left + bounds.width * 0.8, y: yTop },
            { x: bounds.left + bounds.width * 0.2, y: yBottom },
            { x: bounds.left + bounds.width * 0.8, y: yBottom }
        ];

        const textRgb = textColor ? this.#parseColorToRgba(textColor) : null;
        const samples = [];
        for (const point of candidates) {
            const px = Math.round(point.x * scale);
            const py = Math.round(point.y * scale);
            if (px < 0 || py < 0 || px >= this.content.width || py >= this.content.height) {
                continue;
            }
            const color = getPixelColor(ctx, px, py);
            const rgb = this.#parseColorToRgba(color);
            if (!rgb) continue;
            if (textRgb && this.#isNearColor(rgb.r, rgb.g, rgb.b, textRgb, 18)) {
                continue;
            }
            samples.push(rgb);
        }

        if (!samples.length) return null;
        const counts = new Map();
        const quant = 8;
        samples.forEach(rgb => {
            const rq = Math.max(0, Math.min(255, Math.round(rgb.r / quant) * quant));
            const gq = Math.max(0, Math.min(255, Math.round(rgb.g / quant) * quant));
            const bq = Math.max(0, Math.min(255, Math.round(rgb.b / quant) * quant));
            const key = `${rq},${gq},${bq}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        });

        let bestKey = null;
        let bestCount = -1;
        counts.forEach((count, key) => {
            if (count > bestCount) {
                bestCount = count;
                bestKey = key;
            }
        });
        if (!bestKey) return null;
        const parts = bestKey.split(',').map(v => parseInt(v, 10));
        if (parts.length < 3 || parts.some(v => !Number.isFinite(v))) return null;
        return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
    }

    #inferTextColorByCanvas(bounds, bgColor) {
        if (!bounds || !this.content) return null;
        const ctx = this.content.getContext('2d');
        if (!ctx) return null;
        const scale = this.outputScale || 1;
        const x0 = Math.max(0, Math.floor(bounds.left * scale));
        const y0 = Math.max(0, Math.floor(bounds.top * scale));
        const x1 = Math.min(this.content.width, Math.ceil(bounds.right * scale));
        const y1 = Math.min(this.content.height, Math.ceil(bounds.bottom * scale));
        if (x1 <= x0 || y1 <= y0) return null;

        const width = x1 - x0;
        const height = y1 - y0;
        let data;
        try {
            data = ctx.getImageData(x0, y0, width, height).data;
        } catch (err) {
            return null;
        }
        if (!data || data.length === 0) return null;

        const bg = this.#parseColorToRgba(bgColor);
        const tolerance = 24;
        const quant = 8;
        const counts = new Map();
        const sampleRows = [0.3, 0.5, 0.7].map(ratio => {
            const row = Math.floor(height * ratio);
            return Math.max(0, Math.min(height - 1, row));
        });
        const stepX = Math.max(1, Math.floor(width / 60));

        const record = (r, g, b) => {
            const rq = Math.max(0, Math.min(255, Math.round(r / quant) * quant));
            const gq = Math.max(0, Math.min(255, Math.round(g / quant) * quant));
            const bq = Math.max(0, Math.min(255, Math.round(b / quant) * quant));
            const key = `${rq},${gq},${bq}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        };

        let found = false;
        for (const row of sampleRows) {
            const rowOffset = row * width * 4;
            for (let x = 0; x < width; x += stepX) {
                const idx = rowOffset + x * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];
                if (a < 10) continue;
                if (bg && this.#isNearColor(r, g, b, bg, tolerance)) {
                    continue;
                }
                record(r, g, b);
                found = true;
            }
        }

        if (!found) {
            for (const row of sampleRows) {
                const rowOffset = row * width * 4;
                for (let x = 0; x < width; x += stepX) {
                    const idx = rowOffset + x * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const a = data[idx + 3];
                    if (a < 10) continue;
                    record(r, g, b);
                }
            }
        }

        if (!counts.size) return null;
        const parseKey = (key) => {
            const parts = key.split(',').map(v => parseInt(v, 10));
            if (parts.length < 3 || parts.some(v => !Number.isFinite(v))) return null;
            return parts;
        };

        const contrast = (rgb) => {
            if (!bg) return 0;
            return Math.abs(rgb[0] - bg.r) + Math.abs(rgb[1] - bg.g) + Math.abs(rgb[2] - bg.b);
        };

        // Prefer the best-contrast color among the top-K most frequent samples.
        // This avoids picking anti-aliased gray edge pixels as the "dominant" text color.
        const entries = [];
        counts.forEach((count, key) => {
            const rgb = parseKey(key);
            if (!rgb) return;
            if (bg && this.#isNearColor(rgb[0], rgb[1], rgb[2], bg, tolerance)) return;
            entries.push({ key, count, rgb });
        });
        if (!entries.length) return null;
        entries.sort((a, b) => b.count - a.count);

        const top = entries.slice(0, 6);
        let chosen = top[0];
        if (bg) {
            let best = null;
            let bestC = -1;
            for (const item of top) {
                const c = contrast(item.rgb);
                if (!best || c > bestC || (c === bestC && item.count > best.count)) {
                    best = item;
                    bestC = c;
                }
            }
            if (best) chosen = best;
        }

        return `rgb(${chosen.rgb[0]}, ${chosen.rgb[1]}, ${chosen.rgb[2]})`;
    }

    #refineLineBoundsByCanvas(bounds, bgColor, fontSize) {
        if (!bounds || !this.content) return null;
        const ctx = this.content.getContext('2d');
        if (!ctx) return null;
        const bg = this.#parseColorToRgba(bgColor);
        if (!bg) return null;
        const scale = this.outputScale || 1;
        const padPx = Math.max(6, Math.ceil((fontSize || 0) * 0.6));
        const pad = Math.max(0, Math.round(padPx * scale));
        const x0 = Math.max(0, Math.floor(bounds.left * scale));
        const y0 = Math.max(0, Math.floor(bounds.top * scale));
        const x1 = Math.min(this.content.width, Math.ceil(bounds.right * scale) + pad);
        const y1 = Math.min(this.content.height, Math.ceil(bounds.bottom * scale));
        if (x1 <= x0 || y1 <= y0) return null;

        const width = x1 - x0;
        const height = y1 - y0;
        let data;
        try {
            data = ctx.getImageData(x0, y0, width, height).data;
        } catch (err) {
            return null;
        }
        if (!data || data.length === 0) return null;

        const sampleRows = [0.3, 0.5, 0.7].map(ratio => {
            const row = Math.floor(height * ratio);
            return Math.max(0, Math.min(height - 1, row));
        });
        const tolerance = 16;
        let maxX = -1;
        for (const row of sampleRows) {
            const rowOffset = row * width * 4;
            for (let x = width - 1; x >= 0; x--) {
                const idx = rowOffset + x * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                if (!this.#isNearColor(r, g, b, bg, tolerance)) {
                    maxX = Math.max(maxX, x);
                    break;
                }
            }
        }
        if (maxX < 0) return null;
        const newRight = (x0 + maxX + 1) / scale;
        if (Number.isFinite(newRight) && newRight > bounds.right) {
            const refined = {
                left: bounds.left,
                top: bounds.top,
                right: newRight,
                bottom: bounds.bottom,
                width: newRight - bounds.left,
                height: bounds.bottom - bounds.top
            };
            return refined;
        }
        return bounds;
    }

    #parseColorToRgba(value) {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('#')) {
            const hex = trimmed.slice(1);
            if (hex.length === 3) {
                const r = parseInt(hex[0] + hex[0], 16);
                const g = parseInt(hex[1] + hex[1], 16);
                const b = parseInt(hex[2] + hex[2], 16);
                return { r, g, b, a: 1 };
            }
            if (hex.length >= 6) {
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
                return { r, g, b, a };
            }
        }
        const match = /^rgba?\(([^)]+)\)$/i.exec(trimmed);
        if (match) {
            const parts = match[1].split(',').map(part => part.trim());
            if (parts.length >= 3) {
                const nums = parts.slice(0, 3).map(val => parseFloat(val));
                if (nums.some(val => !Number.isFinite(val))) return null;
                const max = Math.max(...nums);
                const scale = max <= 1 ? 255 : 1;
                const r = Math.max(0, Math.min(255, Math.round(nums[0] * scale)));
                const g = Math.max(0, Math.min(255, Math.round(nums[1] * scale)));
                const b = Math.max(0, Math.min(255, Math.round(nums[2] * scale)));
                let a = 1;
                if (parts.length >= 4) {
                    const alpha = parseFloat(parts[3]);
                    if (Number.isFinite(alpha)) {
                        a = Math.max(0, Math.min(1, alpha));
                    }
                }
                return { r, g, b, a };
            }
        }
        return null;
    }

    #isNearColor(r, g, b, ref, tolerance) {
        const diff = Math.abs(r - ref.r) + Math.abs(g - ref.g) + Math.abs(b - ref.b);
        return diff <= tolerance;
    }

    #parsePx(value) {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
    }

    #normalizeFontColor(value) {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (trimmed === 'transparent') return null;
        if (trimmed.startsWith('#')) return trimmed;
        if (trimmed.startsWith('rgba')) {
            const match = /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i.exec(trimmed);
            if (match) {
                const alpha = parseFloat(match[4]);
                if (!Number.isFinite(alpha) || alpha <= 0) return null;
                const r = Math.max(0, Math.min(255, Math.round(parseFloat(match[1]))));
                const g = Math.max(0, Math.min(255, Math.round(parseFloat(match[2]))));
                const b = Math.max(0, Math.min(255, Math.round(parseFloat(match[3]))));
                return `rgb(${r}, ${g}, ${b})`;
            }
            return trimmed;
        }
        if (trimmed.startsWith('rgb')) return trimmed;

        const parts = trimmed.split(/[,\s]+/).filter(Boolean);
        if (parts.length === 1 || parts.length === 2) {
            const value = parseFloat(parts[0]);
            if (!Number.isFinite(value)) return null;
            const scaled = value <= 1 ? Math.round(value * 255) : Math.round(value);
            const gray = Math.max(0, Math.min(255, scaled));
            return `rgb(${gray}, ${gray}, ${gray})`;
        }
        if (parts.length >= 4) {
            const nums = parts.slice(0, 4).map(v => parseFloat(v));
            if (nums.some(v => !Number.isFinite(v))) return null;
            const max = Math.max(...nums);
            const toUnit = v => {
                const scaled = max <= 1 ? v : v / 255;
                return Math.max(0, Math.min(1, scaled));
            };
            const c = toUnit(nums[0]);
            const m = toUnit(nums[1]);
            const y = toUnit(nums[2]);
            const k = toUnit(nums[3]);
            const r = Math.round(255 * (1 - c) * (1 - k));
            const g = Math.round(255 * (1 - m) * (1 - k));
            const b = Math.round(255 * (1 - y) * (1 - k));
            return `rgb(${r}, ${g}, ${b})`;
        }
        if (parts.length < 3) return null;
        const nums = parts.slice(0, 3).map(v => parseFloat(v));
        if (nums.some(v => !Number.isFinite(v))) return null;
        const max = Math.max(...nums);
        const scale = max <= 1 ? 255 : 1;
        const toByte = v => Math.max(0, Math.min(255, Math.round(v * scale)));
        return `rgb(${toByte(nums[0])}, ${toByte(nums[1])}, ${toByte(nums[2])})`;
    }
};
