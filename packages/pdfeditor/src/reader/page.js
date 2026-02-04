import { Events, PDFEvent } from '../event';
import { Font } from '../font';
import { PDFLinkService } from 'pdfjs-dist/lib/web/pdf_link_service';
import { PDFPageBase } from './page_base';
import { getPixelColor, trimSpace } from '../misc';
import { Locale } from '../locale';

const textContentOptions = {
    disableCombineTextItems: false,
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
        elBox.style.display = 'none';
        let elBg = document.createElement('div');
        elBg.classList.add('insert_page_bg');
        elBox.appendChild(elBg);
        elBox.appendChild(this.elInsertPage);
        this.elContainer.appendChild(elBox);


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
            elBox.style.display = 'flex';
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
                    elDiv.addEventListener('click', () => {
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
        let x = parseFloat(elDiv.style.left);
        let y = parseFloat(elDiv.style.top);
        let fontName = textPart.elements[0].getAttribute('data-fontname')?.toLocaleLowerCase();;
        let bold = fontName && fontName.indexOf('bold') > -1 ? true : false;
        let italic = fontName && (fontName.indexOf('oblique') > -1 || fontName.indexOf('italic') > -1);
        if (italic) {
            elDiv.style.width = (parseFloat(elDiv.style.width) + 3) + 'px';
        }

        let fontSize = parseFloat(elDiv.getAttribute('data-fontsize'));
        let color = elDiv.getAttribute('data-fontcolor');
        let bgColor = elDiv.getAttribute('data-bgcolor') || getPixelColor(this.content.getContext('2d'), x * this.outputScale, y * this.outputScale);
        let fontFamily = elDiv.getAttribute('data-loadedname') || 'Helvetica';

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
};