import { Events, PDFEvent } from '../event';
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
                    elDiv.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.convertWidget(elDiv);
                    });

                    if ((i+1) == this.textContentItems.length) {
                        this.textParts[n] = {
                            text: text,
                            elements: elements
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
        let idx = elDiv.getAttribute('data-parts');
        if (this.isConvertWidget.indexOf(idx) > -1) {
            return;
        }

        let id = this.pageNum + '_' + idx + '_' + elDiv.getAttribute('data-l');
        const textPart = this.textParts[idx];
        let x = parseFloat(elDiv.style.left);
        let y = parseFloat(elDiv.style.top);
        let fontName = textPart.elements[0].getAttribute('data-fontname')?.toLocaleLowerCase();
        let bold = fontName && fontName.indexOf('bold') > -1 ? true : false;
        let italic = fontName && (fontName.indexOf('oblique') > -1 || fontName.indexOf('italic') > -1);
        if (italic) {
            elDiv.style.width = (parseFloat(elDiv.style.width) + 3) + 'px';
        }

        let fontSize = parseFloat(elDiv.getAttribute('data-fontsize'));
        let color = elDiv.getAttribute('data-fontcolor');
        let bgColor = elDiv.getAttribute('data-bgcolor') || getPixelColor(this.content.getContext('2d'), x * this.outputScale, y * this.outputScale);
        let fontFamily = elDiv.getAttribute('data-loadedname') || 'Helvetica';

        PDFEvent.dispatch(Events.CONVERT_TO_ELEMENT, {
            elDiv,
            type: 'text',
            attrs: {
                id: id,
                // size: fontSize / this.scale / this.outputScale,
                size: fontSize / this.scale,
                color: color,
                text: textPart.text,
                lineHeight: null,
                fontFamily: fontFamily,
                fontFile: fontFamily,
                fontName: elDiv.getAttribute('data-fontname'),
                opacity: 1,
                underline: null,
                background: null,
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
            elDiv.style.cursor = 'default';
            textPart.elements.forEach(async (element, i) => {
                element.classList.remove('text-border');
                element.classList.add('text-hide');
                element.style.backgroundColor = bgColor;
                element.style.userSelect = 'none';
                element.style.padding = '3px 0 3px 0';
                element.style.top = (y - 2) + 'px';
                element.style.left = (x - 2) + 'px';
    
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
        if (!textParts || !Array.isArray(textParts.elements)) return;
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

    #splitElementsByAnchors(sorted, anchors) {
        if (!Array.isArray(sorted) || !sorted.length) return null;
        if (!Array.isArray(anchors) || anchors.length < 2) return null;
        const indices = anchors.map(el => sorted.indexOf(el)).filter(idx => idx >= 0);
        if (indices.length < 2) return null;
        indices.sort((a, b) => a - b);
        const clusters = [];
        for (let i = 0; i < indices.length; i++) {
            const start = indices[i];
            const end = i + 1 < indices.length ? indices[i + 1] : sorted.length;
            const slice = sorted.slice(start, end);
            if (slice.length) {
                clusters.push(slice);
            }
        }
        return clusters.length > 1 ? clusters : null;
    }

    #syncPartElementIds(textPart, partIndex) {
        if (!textPart || !Array.isArray(textPart.elements)) return;
        const baseId = this.pageNum + '_' + partIndex + '_';
        textPart.elements.forEach((el, idx) => {
            if (!el) return;
            el.setAttribute('data-parts', partIndex);
            el.setAttribute('data-l', idx);
            el.setAttribute('data-id', baseId + idx);
        });
    }

    #buildCoverRects(itemBoxes, baseFontSize, spaceThreshold) {
        if (!Array.isArray(itemBoxes) || itemBoxes.length < 2) return null;
        const gaps = [];
        const wordGaps = [];
        let prevBox = null;
        let prevWordBox = null;
        let lineLeft = Infinity;
        let lineRight = -Infinity;
        let maxGap = 0;
        for (let i = 0; i < itemBoxes.length; i++) {
            const box = itemBoxes[i];
            if (!box) continue;
            const left = box.left;
            const right = box.right;
            const hasPos = Number.isFinite(left) && Number.isFinite(right);
            if (hasPos) {
                lineLeft = Math.min(lineLeft, left);
                lineRight = Math.max(lineRight, right);
            }
            if (prevBox && hasPos && Number.isFinite(prevBox.right)) {
                const gap = left - prevBox.right;
                if (Number.isFinite(gap) && gap > 0) {
                    gaps.push(gap);
                }
            }
            const text = box.element?.textContent || '';
            const isWhitespace = trimSpace(text) === '';
            if (!isWhitespace && hasPos) {
                if (prevWordBox && Number.isFinite(prevWordBox.right)) {
                    const wordGap = left - prevWordBox.right;
                    if (Number.isFinite(wordGap) && wordGap > 0) {
                        wordGaps.push(wordGap);
                    }
                }
                prevWordBox = box;
            }
            if (hasPos) {
                prevBox = box;
            }
        }
        if (!gaps.length) return null;
        const sortedGaps = [...gaps].sort((a, b) => a - b);
        const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] || 0;
        const sortedWordGaps = wordGaps.length ? [...wordGaps].sort((a, b) => a - b) : [];
        const medianWordGap = sortedWordGaps.length
            ? sortedWordGaps[Math.floor(sortedWordGaps.length / 2)] || 0
            : 0;
        const sortedGapSizes = [...gaps].sort((a, b) => b - a);
        const maxGapValue = sortedGapSizes[0] || 0;
        const secondGapValue = sortedGapSizes[1] || 0;
        const safeFontSize = Number.isFinite(baseFontSize) ? baseFontSize : 0;
        const safeSpace = Number.isFinite(spaceThreshold) ? spaceThreshold : 0;
        const baseThreshold = Math.max(safeFontSize * 0.75, safeSpace * 3, 6);
        const typicalGap = medianWordGap || medianGap || 0;
        let leaderGapThreshold = baseThreshold;
        if (medianWordGap > 0) {
            leaderGapThreshold = Math.max(baseThreshold, medianWordGap * 2.2);
        } else if (gaps.length > 1) {
            leaderGapThreshold = Math.max(baseThreshold, typicalGap * 2.2);
        } else if (gaps.length === 1) {
            leaderGapThreshold = Math.max(baseThreshold * 2, safeFontSize * 3, 20);
        }
        const maxReasonableThreshold = Math.max(baseThreshold * 6, safeFontSize * 6, 36);
        if (leaderGapThreshold > maxReasonableThreshold) {
            leaderGapThreshold = maxReasonableThreshold;
        }
        const largeGapTrigger = Math.max(baseThreshold * 4, safeFontSize * 5, 60);
        if (maxGapValue >= largeGapTrigger) {
            const capTarget = secondGapValue >= largeGapTrigger ? secondGapValue : maxGapValue;
            const cappedThreshold = Math.max(baseThreshold, capTarget * 0.9);
            if (leaderGapThreshold > cappedThreshold) {
                leaderGapThreshold = cappedThreshold;
            }
        }
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
                if (gap > maxGap) {
                    maxGap = gap;
                }
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
        const lineWidth = Number.isFinite(lineLeft) && Number.isFinite(lineRight)
            ? Math.max(0, lineRight - lineLeft)
            : 0;
        return { rects, elements, maxGap, lineWidth };
    }

    #shouldSplitByGap(coverData, baseFontSize, layerWidth) {
        if (!coverData) return true;
        const maxGap = coverData.maxGap;
        const lineWidth = coverData.lineWidth;
        if (!Number.isFinite(maxGap) || !Number.isFinite(lineWidth) || lineWidth <= 0) {
            return true;
        }
        const gapRatio = maxGap / lineWidth;
        const safeFontSize = Number.isFinite(baseFontSize) ? baseFontSize : 0;
        const isColumnGap = this.#isLikelyColumnGap(coverData, layerWidth);
        const minGapPx = Math.max(safeFontSize * 6, 60);
        // Only split when the gap is clearly a column break.
        if (!isColumnGap && gapRatio < 0.12 && maxGap < minGapPx) {
            return false;
        }
        const tinyGap = Math.max(safeFontSize * 3, 12);
        if (!isColumnGap && maxGap < tinyGap) {
            return false;
        }
        return true;
    }

    #isLikelyColumnGap(coverData, layerWidth) {
        if (!coverData || !Array.isArray(coverData.rects) || coverData.rects.length < 2) {
            return false;
        }
        if (!Number.isFinite(layerWidth) || layerWidth <= 0) {
            return false;
        }
        const columnThreshold = layerWidth * 0.45;
        return coverData.rects.slice(1).some(rect => Number.isFinite(rect.left) && rect.left >= columnThreshold);
    }

    #getTextItemBox(element, viewport) {
        if (!element) return null;
        const util = this.reader?.pdfjsLib?.Util;
        if (!util || typeof util.transform !== 'function') return null;
        if (!viewport || !viewport.transform) return null;
        const idx = Number.parseInt(element.getAttribute('data-idx'), 10);
        if (!Number.isFinite(idx)) return null;
        const item = this.textContentItems ? this.textContentItems[idx] : null;
        if (!item || !Array.isArray(item.transform)) return null;
        const style = this.textContentStyles ? this.textContentStyles[item.fontName] : null;
        const tx = util.transform(viewport.transform, item.transform);
        if (!tx || tx.length < 6) return null;
        let angle = Math.atan2(tx[1], tx[0]);
        if (style?.vertical) {
            angle += Math.PI / 2;
        }
        const fontHeight = Math.hypot(tx[2], tx[3]);
        if (!Number.isFinite(fontHeight) || fontHeight <= 0) return null;
        const ascentRatioRaw = Number.isFinite(style?.ascent) ? style.ascent : 0.8;
        const ascentRatio = Math.min(Math.max(ascentRatioRaw, 0), 1.2);
        const fontAscent = fontHeight * ascentRatio;
        let left;
        let top;
        if (angle === 0) {
            left = tx[4];
            top = tx[5] - fontAscent;
        } else {
            left = tx[4] + fontAscent * Math.sin(angle);
            top = tx[5] - fontAscent * Math.cos(angle);
        }
        const divWidth = (style?.vertical ? item.height : item.width) * viewport.scale;
        const divHeight = fontHeight;
        if (!Number.isFinite(divWidth) || !Number.isFinite(divHeight)) return null;
        const offsetX = 2;
        const originX = left + offsetX;
        const originY = top;
        if (angle === 0) {
            return {
                left: originX,
                right: originX + Math.max(0, divWidth),
                top: originY,
                bottom: originY + Math.max(0, divHeight)
            };
        }
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const corners = [
            { x: originX, y: originY },
            { x: originX + divWidth * cos, y: originY + divWidth * sin },
            { x: originX - divHeight * sin, y: originY + divHeight * cos },
            { x: originX + divWidth * cos - divHeight * sin, y: originY + divWidth * sin + divHeight * cos }
        ];
        let minLeft = Infinity;
        let maxRight = -Infinity;
        let minTop = Infinity;
        let maxBottom = -Infinity;
        corners.forEach(pt => {
            if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return;
            minLeft = Math.min(minLeft, pt.x);
            maxRight = Math.max(maxRight, pt.x);
            minTop = Math.min(minTop, pt.y);
            maxBottom = Math.max(maxBottom, pt.y);
        });
        if (!Number.isFinite(minLeft) || !Number.isFinite(maxRight)
            || !Number.isFinite(minTop) || !Number.isFinite(maxBottom)) {
            return null;
        }
        return {
            left: minLeft,
            right: maxRight,
            top: minTop,
            bottom: maxBottom
        };
    }

    #getMetricsViewport() {
        if (!this.pageProxy) return null;
        const scale = this.scale || 1;
        if (this._metricsViewport && this._metricsViewportScale === scale) {
            return this._metricsViewport;
        }
        const viewport = this.pageProxy.getViewport({ scale });
        this._metricsViewport = viewport;
        this._metricsViewportScale = scale;
        return viewport;
    }

    #getTextItemWidth(textItem, viewport) {
        if (!textItem) return null;
        const scale = viewport && Number.isFinite(viewport.scale) ? viewport.scale : null;
        const style = this.textContentStyles ? this.textContentStyles[textItem.fontName] : null;
        const isVertical = Boolean(style?.vertical);
        const baseWidth = isVertical ? textItem.height : textItem.width;
        if (!Number.isFinite(baseWidth)) return null;
        if (scale === null) return baseWidth;
        return baseWidth * scale;
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

    #isBreak(textItem, nextIdx) {
        let nextTextItem = this.textContentItems[nextIdx];
        if (!nextTextItem) return true;
        if (nextTextItem.height == 0) {
            // return nextTextItem.width >= 2.5;
            return nextTextItem.width > 8;
        } else {
            return nextTextItem.height != textItem.height || nextTextItem.color != textItem.color;
        }
    }

    #mergeTextPartsByLine() {
        if (!Array.isArray(this.textParts) || this.textParts.length < 2) return;
        const metrics = [];
        this.textParts.forEach(part => {
            if (!part) return;
            const indices = Array.isArray(part.itemIndices) && part.itemIndices.length
                ? part.itemIndices
                : Array.isArray(part.elements)
                    ? part.elements.map(el => {
                        const idx = Number.parseInt(el?.getAttribute?.('data-idx'), 10);
                        return Number.isFinite(idx) ? idx : null;
                    }).filter(idx => idx !== null)
                    : [];
            if (!indices.length) return;
            const lineMetrics = indices.map(idx => this.#getTextItemLineMetrics(idx)).filter(Boolean);
            if (!lineMetrics.length) return;
            const ys = lineMetrics.map(entry => entry.y).filter(value => Number.isFinite(value));
            if (!ys.length) return;
            ys.sort((a, b) => a - b);
            const medianY = ys[Math.floor(ys.length / 2)];
            const maxHeight = lineMetrics.reduce((acc, entry) => {
                const next = Number.isFinite(entry.height) ? entry.height : 0;
                return Math.max(acc, next);
            }, 0);
            const minX = lineMetrics.reduce((acc, entry) => {
                const next = Number.isFinite(entry.x) ? entry.x : acc;
                return Math.min(acc, next);
            }, Infinity);
            const rotated = lineMetrics.some(entry => entry.rotated || entry.isVertical);
            metrics.push({
                part,
                y: medianY,
                height: maxHeight,
                minX,
                rotated
            });
        });

        if (!metrics.length) return;
        const clusters = [];
        metrics.forEach(entry => {
            if (!Number.isFinite(entry.y) || entry.rotated) {
                clusters.push({
                    y: entry.y,
                    height: entry.height,
                    minX: entry.minX,
                    parts: [entry.part],
                    rotated: true,
                    count: 1
                });
                return;
            }
            let match = null;
            for (const cluster of clusters) {
                if (cluster.rotated) continue;
                const baseHeight = Math.min(cluster.height || 0, entry.height || 0)
                    || Math.max(cluster.height || 0, entry.height || 0)
                    || 1;
                const tolerance = Math.max(baseHeight * 0.8, 1);
                if (Math.abs(entry.y - cluster.y) <= tolerance) {
                    match = cluster;
                    break;
                }
            }
            if (!match) {
                clusters.push({
                    y: entry.y,
                    height: entry.height,
                    minX: entry.minX,
                    parts: [entry.part],
                    rotated: false,
                    count: 1
                });
                return;
            }
            match.parts.push(entry.part);
            match.count += 1;
            match.y = (match.y * (match.count - 1) + entry.y) / match.count;
            match.height = Math.max(match.height, entry.height);
            match.minX = Math.min(match.minX, entry.minX);
        });

        const mergedParts = clusters
            .sort((a, b) => {
                const yDiff = (b.y ?? 0) - (a.y ?? 0);
                if (Math.abs(yDiff) > 0.01) return yDiff;
                return (a.minX ?? 0) - (b.minX ?? 0);
            })
            .map(cluster => {
                if (!Array.isArray(cluster.parts) || cluster.parts.length === 0) {
                    return null;
                }
                if (cluster.parts.length === 1) {
                    return cluster.parts[0];
                }
                const merged = {
                    text: '',
                    elements: [],
                    width: 0,
                    rawWidth: 0,
                    itemIndices: []
                };
                const elementSet = new Set();
                cluster.parts.forEach(part => {
                    if (Array.isArray(part.elements)) {
                        part.elements.forEach(el => {
                            if (!el || elementSet.has(el)) return;
                            elementSet.add(el);
                            merged.elements.push(el);
                        });
                    }
                    if (Array.isArray(part.itemIndices)) {
                        merged.itemIndices.push(...part.itemIndices);
                    }
                    const width = Number.isFinite(part.rawWidth) ? part.rawWidth : part.width;
                    if (Number.isFinite(width)) {
                        merged.rawWidth += width;
                        merged.width += width;
                    }
                });
                merged.itemIndices = Array.from(new Set(merged.itemIndices));
                if (!Number.isFinite(merged.rawWidth) || merged.rawWidth <= 0) {
                    const fallbackWidth = cluster.parts.reduce((sum, part) => {
                        const width = Number.isFinite(part.width) ? part.width : 0;
                        return sum + width;
                    }, 0);
                    if (fallbackWidth > 0) {
                        merged.rawWidth = fallbackWidth;
                        merged.width = fallbackWidth;
                    }
                } else {
                    merged.width = merged.rawWidth;
                }
                return merged;
            })
            .filter(part => part && Array.isArray(part.elements) && part.elements.length);

        if (mergedParts.length) {
            this.textParts = mergedParts;
        }
    }

    #normalizeTextItemColor(value) {
        const normalizeString = (input) => {
            if (typeof input !== 'string') return null;
            const trimmed = input.trim();
            if (!trimmed) return null;
            return trimmed.replace(/\s+/g, '').toLowerCase();
        };
        if (value === undefined || value === null) return null;
        if (typeof value === 'string') {
            const normalized = this.#normalizeFontColor(value);
            const normalizedString = normalizeString(normalized || value);
            return normalizedString === 'transparent' ? null : normalizedString;
        }
        if (Array.isArray(value)) {
            const parts = value
                .map(part => {
                    const num = typeof part === 'number' ? part : parseFloat(part);
                    return Number.isFinite(num) ? num : null;
                })
                .filter(part => part !== null);
            if (!parts.length) return null;
            const serialized = parts.join(',');
            const normalized = this.#normalizeFontColor(serialized) || serialized;
            return normalizeString(normalized);
        }
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) return null;
            const serialized = String(value);
            const normalized = this.#normalizeFontColor(serialized) || serialized;
            return normalizeString(normalized);
        }
        return null;
    }

    #isVisualLineBreak(currentIdx, nextIdx) {
        if (!Array.isArray(this.textContentItems)) return null;
        const current = this.#getTextItemLineMetrics(currentIdx);
        const next = this.#getTextItemLineMetrics(nextIdx);
        if (!current || !next) return null;
        if (current.isVertical || next.isVertical || current.rotated || next.rotated) {
            return null;
        }

        const sizeCandidates = [current.height, next.height].filter(value => Number.isFinite(value) && value > 0);
        const minSize = sizeCandidates.length ? Math.min(...sizeCandidates) : 1;
        const maxSize = sizeCandidates.length ? Math.max(...sizeCandidates) : minSize;
        const baseSize = Math.max(minSize, maxSize);

        const topDiff = Math.abs(next.y - current.y);
        const leftReset = next.x < current.x - Math.max(maxSize * 0.5, 6);
        const strongThreshold = Math.max(baseSize * 0.9, 3);
        const weakThreshold = Math.max(baseSize * 0.55, 3);

        if (topDiff > strongThreshold) {
            return true;
        }
        if (leftReset && topDiff > weakThreshold) {
            return true;
        }
        return false;
    }

    #getTextItemLineMetrics(idx) {
        const item = Array.isArray(this.textContentItems) ? this.textContentItems[idx] : null;
        if (!item || !Array.isArray(item.transform)) return null;
        const style = this.textContentStyles ? this.textContentStyles[item.fontName] : null;
        const tx = item.transform;
        const x = tx[4];
        const y = tx[5];
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        const height = Number.isFinite(item.height)
            ? item.height
            : Math.hypot(tx[2], tx[3]);
        const width = Number.isFinite(item.width)
            ? item.width
            : Math.hypot(tx[0], tx[1]);
        return {
            x,
            y,
            height,
            width,
            isVertical: Boolean(style?.vertical),
            rotated: Math.abs(tx[1]) > 0.01 || Math.abs(tx[2]) > 0.01
        };
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
        if (textPart && Number.isFinite(textPart.rawWidth) && textPart.rawWidth > 0) {
            const fontSource = baseElement || elements[0];
            const baseFontSize = fontSource
                ? (this.#parsePx(fontSource.getAttribute('data-fontsize')) || this.#parsePx(fontSource.style.fontSize))
                : null;
            const clampPadding = Number.isFinite(baseFontSize)
                ? Math.max(2, baseFontSize * 0.2)
                : 2;
            const scaledRawWidth = textPart.rawWidth * (this.outputScale || 1);
            const clampTarget = scaledRawWidth + clampPadding;
            const hasCoverRects = Array.isArray(textPart.coverRects) && textPart.coverRects.length > 1;
            if ((hasCoverRects || bounds.width > clampTarget * 1.2) && clampTarget < bounds.width) {
                bounds.right = bounds.left + clampTarget;
                bounds.width = clampTarget;
            }
        }
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
        if (!this.#shouldAutoConvertByBounds(hitPart, rect)) return;
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

    #shouldAutoConvertByBounds(textPart, layerRect) {
        if (!textPart || !layerRect) return true;
        let bounds = textPart.bounds;
        if (!bounds) {
            bounds = this.#getTextPartBounds(textPart, this.#getTextPartElement(textPart, null));
        }
        if (!bounds) return true;
        const width = bounds.width;
        const height = bounds.height;
        if (!Number.isFinite(width) || !Number.isFinite(height)) return true;
        const layerArea = layerRect.width * layerRect.height;
        if (layerArea > 0) {
            const areaRatio = (width * height) / layerArea;
            if (areaRatio > 0.55) {
                return false;
            }
        }
        const baseElement = this.#getTextPartElement(textPart, null);
        const fontSize = baseElement
            ? (this.#parsePx(baseElement.getAttribute('data-fontsize')) || this.#parsePx(baseElement.style.fontSize))
            : null;
        if (Number.isFinite(fontSize) && height > fontSize * 3) {
            return false;
        }
        return true;
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

    #inferPdfFontStyle(element) {
        if (!element) {
            return { bold: false, italic: false };
        }
        const rawName = element.getAttribute('data-fontname') || '';
        const name = typeof rawName === 'string' ? rawName.toLowerCase() : '';
        return {
            bold: name.includes('bold'),
            italic: name.includes('italic') || name.includes('oblique')
        };
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
