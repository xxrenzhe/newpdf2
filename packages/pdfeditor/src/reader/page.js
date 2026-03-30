import { Events, PDFEvent } from '../event.js';
import { PDFLinkService } from 'pdfjs-dist-v2/lib/web/pdf_link_service';
import { PDFPageBase } from './page_base.js';
import { getPixelColor, trimSpace } from '../misc.js';
import { collectTextIndicesInRect } from './text_selection.js';
import { getTextRotation, shouldBreakTextRun, getRunReadGap, isVerticalTextRun } from './text_layout.js';
import { countTextMatches } from '../search_text.js';
import {
    collectClearTextItems,
    markClearTextIndices,
    restoreClearTextIndices
} from './clear_text_state.js';

const textContentOptions = {
    disableCombineTextItems: false,
    includeMarkedContent: false
};
const REMOVE_BTN = 'remove_page';

export class PDFPage extends PDFPageBase {
    textParts = [];
    textLayerReady = null;
    clearTexts = [];
    clearTextIndexCounts = Object.create(null);
    textItemRects = [];
    //要隐藏的元素
    hideOriginElements = [];
    isConvertWidget = [];

    init() {
        super.init();
        let elRemoveBtn = document.createElement('img');
        elRemoveBtn.src = ASSETS_URL + 'img/deletepage.svg';
        elRemoveBtn.classList.add(REMOVE_BTN);
        elRemoveBtn.style.display = 'none';
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
        setTimeout(()=>{
            elRemoveBtn.style.display = 'block';
        },1000)
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
        }
        this.elTextLayer.style.width = canvas.style.width;
        this.elTextLayer.style.height = canvas.style.height;
        
        const viewport = this.pageProxy.getViewport({ scale: this.scale / this.outputScale });
        this.textLayerReady = this.getTextContent().then(async textContent => {
            const readableStream = this.pageProxy.streamTextContent(textContentOptions);
            // const x = transform[4];
            // const y = transform[5];
            //首先按 Y desc , X asc 对文本进行排序
            // this.textContentItems.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
            const styles = textContent.styles;
            this.textParts = [];
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

            await taskTextLayer.promise;
            this.hideOriginElements.forEach(data => {
                let textDiv = this.textDivs[data.idx];
                if (!textDiv) {
                    return;
                }
                textDiv.style.userSelect = data.hiddenUserSelect ?? data.userSelect ?? '';
                textDiv.style.padding = data.hiddenPadding ?? data.padding ?? '';
                textDiv.style.backgroundColor = data.hiddenBackgroundColor ?? data.backgroundColor ?? '';
                if (data.className) {
                    textDiv.classList.add(data.className);
                }
                textDiv.classList.remove('text-border');
            });

            const wrapperRect = this.elWrapper ? this.elWrapper.getBoundingClientRect() : null;
            this.textItemRects = [];
            let text = '';
            let textWidth = 0;
            let elements = [];
            let lineBounds = null;
            let lineRotate = null;
            let n = 0;
            // console.log(this.textContentItems);
            
            for (let i = 0; i < this.textContentItems.length; i++) {
                let textItem = this.textContentItems[i];
                // [KISS Optimization] 智能重构：补全 PDF 分散文本块中丢失的空格，提升编辑和复制准确性
                if (elements.length > 0) {
                    let prevTextItem = this.textContentItems[i - 1];
                    let isVertical = isVerticalTextRun(textItem);
                    let gap = getRunReadGap(prevTextItem, textItem, isVertical);
                    let size = isVertical ? textItem.width : textItem.height;
                    if (gap > (size || 10) * 0.22 && !prevTextItem.str.endsWith(' ') && !textItem.str.startsWith(' ')) {
                        text += ' ';
                    }
                }
                text += textItem.str;
                if (lineRotate === null) {
                    lineRotate = getTextRotation(textItem);
                }
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

                const rect = elDiv.getBoundingClientRect();
                textWidth += rect.width;
                // [KISS Optimization] 智能 Z-Index 碰撞体积优化：按面积反比分配 z-index，保证短文本/内联文本不会被大文本框遮挡而无法点击
                // [KISS Optimization] 扩大微小文字或符号的点击热区 (Hitbox padding)
                // [KISS Optimization] 智能 Z-Index 碰撞体积优化与热区扩展：保证微小符号、注音、标点符号容易被点击选中
                const MIN_HITBOX = 16;
                const hitWidth = Math.max(rect.width, MIN_HITBOX);
                const hitHeight = Math.max(rect.height, MIN_HITBOX);
                const area = hitWidth * hitHeight;
                const zIndex = Math.max(1, Math.floor(1000000 / (area || 1)));
                elDiv.style.zIndex = zIndex;
                // Extend hit box invisibly for small fragments
                if (rect.width < MIN_HITBOX || rect.height < MIN_HITBOX) {
                    elDiv.style.padding = '4px';
                    elDiv.style.margin = '-4px';
                }

                if (wrapperRect) {
                    const left = rect.left - wrapperRect.left;
                    const top = rect.top - wrapperRect.top;
                    const right = left + rect.width;
                    const bottom = top + rect.height;
                    this.textItemRects[i] = {
                        dataIdx: i,
                        rect: { left, top, width: rect.width, height: rect.height }
                    };
                    if (!lineBounds) {
                        lineBounds = { left, top, right, bottom };
                    } else {
                        lineBounds.left = Math.min(lineBounds.left, left);
                        lineBounds.top = Math.min(lineBounds.top, top);
                        lineBounds.right = Math.max(lineBounds.right, right);
                        lineBounds.bottom = Math.max(lineBounds.bottom, bottom);
                    }
                }

                elements.push(elDiv);
                elDiv.addEventListener('click', () => {
                    this.convertWidget(elDiv);
                });

                if ((i+1) == this.textContentItems.length) {
                    this.textParts[n] = {
                        text: text,
                        elements: elements,
                        width: textWidth,
                        bounds: lineBounds,
                        rotate: lineRotate
                    };
                    this.#filterDiv(n);
                    break;
                }

                if (textItem.hasEOL) {
                    text += '\n';
                }
                
                if (this.#isBreak(textItem, i+1)) {

                    this.textParts[n] = {
                        text: trimSpace(text),
                        elements: elements,
                        width: textWidth,
                        bounds: lineBounds,
                        rotate: lineRotate
                    };
                    this.#filterDiv(n);
                    text = '';
                    textWidth = 0;
                    elements = [];
                    lineBounds = null;
                    lineRotate = null;
                    n++;
                }
            }
            return true;
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

    async ensureTextLayerReady() {
        if (!this.rendered || !this.elTextLayer) {
            this.rendered = false;
            await this.render('html');
        }

        if (this.textLayerReady && typeof this.textLayerReady.then === 'function') {
            await this.textLayerReady;
        }
        return true;
    }

    async find(text, isCase) {
        if (Array.isArray(this.textParts) && this.textParts.length > 0) {
            const found = this.findTextParts(text, isCase);
            if (found) {
                return found;
            }
        }
        return super.find(text, isCase);
    }

    #collectPartTextIndices(textPart) {
        if (!textPart || !Array.isArray(textPart.elements)) {
            return [];
        }
        const indices = [];
        for (const element of textPart.elements) {
            if (!element || typeof element.getAttribute !== 'function') {
                continue;
            }
            const idx = Number.parseInt(element.getAttribute('data-idx'), 10);
            if (Number.isNaN(idx) || idx < 0) {
                continue;
            }
            if (indices.indexOf(idx) === -1) {
                indices.push(idx);
            }
        }
        return indices;
    }

    #isTextPartHidden(indices) {
        if (!Array.isArray(indices) || indices.length === 0) {
            return false;
        }

        return indices.some((idx) => {
            return (this.clearTextIndexCounts?.[idx] || 0) > 0;
        });
    }

    findTextParts(text, isCase) {
        const query = String(text ?? '');
        if (!query || !Array.isArray(this.textParts) || this.textParts.length === 0) {
            return null;
        }

        const found = [];
        this.textParts.forEach((textPart, partIdx) => {
            const partText = String(textPart?.text ?? '');
            if (!partText) {
                return;
            }

            const indices = this.#collectPartTextIndices(textPart);
            if (this.#isTextPartHidden(indices)) {
                return;
            }

            const hints = countTextMatches(partText, query, isCase);
            if (hints < 1) {
                return;
            }

            found.push({
                idx: indices[0] ?? partIdx,
                partIdx,
                str: partText,
                indices,
                hints
            });
        });

        return found.length > 0 ? found : null;
    }

    getTextPartElement(partIdx) {
        const textPart = this.textParts?.[partIdx];
        if (!textPart || !Array.isArray(textPart.elements)) {
            return null;
        }
        return textPart.elements.find((element) => element?.isConnected) || textPart.elements[0] || null;
    }

    async convertTextPart(partIdx) {
        await this.ensureTextLayerReady();
        const anchor = this.getTextPartElement(partIdx);
        if (!anchor) {
            return false;
        }
        return this.convertWidget(anchor);
    }

    markClearTextsByIndices(indices) {
        const accepted = markClearTextIndices({
            indices,
            textContentItems: this.textContentItems,
            clearTextIndexCounts: this.clearTextIndexCounts
        });

        this.syncClearTextsFromCounts();
        return accepted;
    }

    syncClearTextsFromCounts() {
        this.clearTexts = collectClearTextItems({
            clearTextIndexCounts: this.clearTextIndexCounts,
            textContentItems: this.textContentItems,
            fallbackItems: this.clearTexts
        });
        return this.clearTexts;
    }

    getClearTextItems() {
        return this.syncClearTextsFromCounts();
    }

    restoreClearTexts(indices) {
        const restoredIndices = restoreClearTextIndices({
            indices,
            clearTextIndexCounts: this.clearTextIndexCounts
        });

        if (restoredIndices.length === 0) {
            return [];
        }

        this.syncClearTextsFromCounts();

        const restoredSet = new Set(restoredIndices.map((idx) => String(idx)));
        this.hideOriginElements = this.hideOriginElements.filter((data) => {
            const idx = Number.parseInt(data?.idx, 10);
            if (Number.isNaN(idx) || !restoredSet.has(String(idx))) {
                return true;
            }
            const textDiv = this.textDivs?.[idx];
            if (textDiv) {
                if (data.className) {
                    textDiv.classList.remove(data.className);
                }
                textDiv.classList.add('text-border');
                textDiv.style.userSelect = data.originUserSelect ?? '';
                textDiv.style.padding = data.originPadding ?? '';
                textDiv.style.backgroundColor = data.originBackgroundColor ?? '';
            }
            return false;
        });

        return restoredIndices;
    }
    lockConvertedTextPart(partIdx) {
        const key = String(partIdx ?? '');
        if (!key) {
            return false;
        }
        if (this.isConvertWidget.indexOf(key) > -1) {
            return false;
        }
        this.isConvertWidget.push(key);
        return true;
    }

    releaseConvertedTextPart(partIdx) {
        const key = String(partIdx ?? '');
        if (!key) {
            return false;
        }
        const index = this.isConvertWidget.indexOf(key);
        if (index === -1) {
            return false;
        }
        this.isConvertWidget.splice(index, 1);
        return true;
    }

    async convertWidget(elDiv) {
        let idx = elDiv.getAttribute('data-parts');
        const originTextPartIdx = String(idx ?? '');
        if (!originTextPartIdx || this.isConvertWidget.indexOf(originTextPartIdx) > -1) {
            return;
        }

        let id = this.pageNum + '_' + idx + '_' + elDiv.getAttribute('data-l');
        const textPart = this.textParts[idx];
        if (!textPart) {
            return;
        }
        const originTextIndices = this.#collectPartTextIndices(textPart);
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
                // [KISS Optimization] 优化背景取色的精准度：采用段落包围盒的中心点提取背景色，防止只取首字母边缘引发透明黑底 (Ghosting Background)
        let bgX = x + (textPart.bounds ? (textPart.bounds.right - textPart.bounds.left) / 2 : 0);
        let bgY = y + (textPart.bounds ? (textPart.bounds.bottom - textPart.bounds.top) / 2 : 0);
        let bgColor = elDiv.getAttribute('data-bgcolor') || getPixelColor(this.content.getContext('2d'), bgX * this.outputScale, bgY * this.outputScale);
        let fontFamily = elDiv.getAttribute('data-loadedname') || 'Helvetica';
        const rotate = Number.isFinite(textPart.rotate) ? textPart.rotate : null;

        PDFEvent.dispatch(Events.CONVERT_TO_ELEMENT, {
            elDiv,
            type: 'text',
            attrs: {
                id: id,
                size: fontSize / this.scale,
                color: color,
                text: textPart.text,
                lineHeight: (textPart.bounds ? (textPart.bounds.bottom - textPart.bounds.top) : fontSize) / this.scale,
                fontFamily: fontFamily,
                fontFile: fontFamily,
                fontName: elDiv.getAttribute('data-fontname'),
                opacity: 1,
                underline: null,
                background: null,
                bold: bold,
                italic: italic,
                rotate: rotate,
                originTextIndices,
                originPageNum: this.pageNum,
                originTextPartIdx
            },
            options: {
                pos: {
                    x, y
                }
            },
            pageNum: this.pageNum
        }, () => {
            this.lockConvertedTextPart(originTextPartIdx);
            elDiv.style.cursor = 'default';
            textPart.elements.forEach((element) => {
                let textItemIdx = element.getAttribute('data-idx');
                if (this.hideOriginElements.findIndex(data => String(data.idx) === String(textItemIdx)) === -1) {
                    this.hideOriginElements.push({
                        idx: textItemIdx,
                        className: 'text-hide',
                        originPadding: element.style.padding,
                        originBackgroundColor: element.style.backgroundColor,
                        originUserSelect: element.style.userSelect,
                        hiddenPadding: '3px 0 3px 0',
                        hiddenBackgroundColor: bgColor,
                        hiddenUserSelect: 'none'
                    });
                }

                element.classList.remove('text-border');
                element.classList.add('text-hide');
                element.style.backgroundColor = bgColor;
                element.style.userSelect = 'none';
                element.style.padding = '3px 0 3px 0';
                element.style.top = (y - 2) + 'px';
                element.style.left = (x - 2) + 'px';
            });
            this.markClearTextsByIndices(originTextIndices);
        });
        return true;
    }

    markClearTextsInRect(rect) {
        if (!rect || !this.elWrapper || !this.textContentItems) {
            return [];
        }
        const hasCachedRects = Array.isArray(this.textItemRects) && this.textItemRects.length > 0;
        const containerRect = hasCachedRects
            ? { left: 0, top: 0 }
            : this.elWrapper.getBoundingClientRect();
        const textDivs = hasCachedRects ? this.textItemRects : this.textDivs;
        const indices = collectTextIndicesInRect({
            rect,
            textDivs,
            containerRect,
            getRect: hasCachedRects ? (item) => item.rect : undefined
        });
        return this.markClearTextsByIndices(indices);
    }

    dispose() {
        this.textParts = [];
        this.textLayerReady = null;
        this.clearTexts = [];
        this.clearTextIndexCounts = Object.create(null);
        this.textItemRects = [];
        this.hideOriginElements = [];
        this.isConvertWidget = [];
        super.dispose();
    }

    #filterDiv(n) {
        const textParts = this.textParts[n];
        let firstElement = null;
        const rotate = Number.isFinite(textParts?.rotate) ? textParts.rotate : 0;
        const isRotatedRun = Math.abs(rotate) > 2;

        textParts.elements.forEach((el) => {
            let isEmptyStr = trimSpace(el.textContent) == '';
            if (!firstElement) {
                if (!isEmptyStr) {
                    firstElement = el;
                    if (!isRotatedRun) {
                        firstElement.style.transform = 'none';
                    }
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
            if (textParts.bounds) {
                const width = Math.max(0, textParts.bounds.right - textParts.bounds.left);
                const height = Math.max(0, textParts.bounds.bottom - textParts.bounds.top);
                if (Number.isFinite(textParts.bounds.left)) {
                    firstElement.style.left = textParts.bounds.left + 'px';
                }
                if (Number.isFinite(textParts.bounds.top)) {
                    firstElement.style.top = textParts.bounds.top + 'px';
                }
                if (Number.isFinite(width) && width > 0) {
                    firstElement.style.width = width + 'px';
                }
                if (Number.isFinite(height) && height > 0) {
                    firstElement.style.height = height + 'px';
                }
            } else {
                firstElement.style.width = (textParts.width * this.outputScale) + 'px';
            }
        }
    }

    #isBreak(textItem, nextIdx) {
        let nextTextItem = this.textContentItems[nextIdx];
        return shouldBreakTextRun(textItem, nextTextItem);
    }
};
