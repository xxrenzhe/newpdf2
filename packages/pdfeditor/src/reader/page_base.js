import { Events, PDFEvent } from '../event';
import { PDFLinkService } from 'pdfjs-dist/lib/web/pdf_link_service';
import { computeScale } from '../misc';

const CAVANS_CLASS = '__pdf_item_render';
const PREVIEW_CLASS = '__pdf_page_preview';
const WRAPPER_CLASS = PREVIEW_CLASS + '_wrapper';
const ELEMENT_LAYER_CLASS = 'elementLayer';
const DRAW_LAYER_CLASS = 'drawLayer';
const TEXT_LAYER_CLASS = 'textLayer';
const ANNOTATION_LAYER_CLASS= 'annotationLayer';

const textContentOptions = {
    disableCombineTextItems: false,
    includeMarkedContent: false
};

export class PDFPageBase {
    pdfDocument = null;
    pageProxy = null;
    id = null;
    index = 0;
    pageNum = 1;
    scale = 1;
    rendered = false;
    textDivs = [];
    textContentItems = null; //array || null
    textContentStyles = {};
    elContainer = null;
    elThumbs = null;
    elWrapper = null;
    elElementLayer = null;
    elTextLayer = null;
    elAnnotationLayer = null;
    elDrawLayer = null;
    content = null;
    #canvasImage = null;

    constructor(pdfDocument, pageNum, scale) {
        this.pdfDocument = pdfDocument;
        this.pageNum = parseInt(pageNum);
        this.index = Math.max(0, parseInt(this.pageNum) - 1);
        this.scale = scale;
        this.init();
    }

    get reader() {
        return this.pdfDocument.reader;
    }

    get outputScale() {
        return this.reader.outputScale;
    }

    init() {
        this.elContainer = document.createElement('div');
        this.elContainer.classList.add(PREVIEW_CLASS);
        this.elContainer.setAttribute('data-page', this.pageNum);

        this.elDrawLayer = document.createElement('div');
        this.elDrawLayer.style.position = 'absolute';
        this.elDrawLayer.style.left = '0px';
        this.elDrawLayer.style.top = '0px';
        this.elDrawLayer.classList.add(DRAW_LAYER_CLASS);

        this.elElementLayer = document.createElement('div');
        // this.elElementLayer.style.position = 'absolute';
        // this.elElementLayer.style.left = '0px';
        // this.elElementLayer.style.top = '0px';
        // this.elElementLayer.style.zIndex = 1;
        this.elElementLayer.classList.add(ELEMENT_LAYER_CLASS);
        
        
        this.elWrapper = document.createElement('div');
        this.elWrapper.classList.add(WRAPPER_CLASS);
        this.elWrapper.style.position = 'relative';
        this.elWrapper.addEventListener('mousedown', e => {
            if (e.target.getAttribute('role') == 'presentation' 
                || e.target.getAttribute('contenteditable')
                || e.target.parentElement.getAttribute('contenteditable')) {
                return;
            }
            PDFEvent.dispatch(Events.PAGE_DOWN, {
                evt: e,
                page: this
            });
        });
        this.elWrapper.appendChild(this.elElementLayer);
        this.elWrapper.appendChild(this.elDrawLayer);
        this.elContainer.appendChild(this.elWrapper);
    }

    async zoom(scale, renderType, force) {
        if (!this.rendered) return;
        // scale = computeScale(scale, this.pageProxy.view[2], this.pageProxy.view[3], this.reader.mainBox, this.outputScale);
        scale = computeScale(scale, this.pageProxy.view[2], this.pageProxy.view[3], this.reader.mainBox, 1);
        if (this.scale == scale && !force) return;
        this.scale = scale;
        this.rendered = false;
        this.render(renderType).then(() => {
            PDFEvent.dispatch(Events.PAGE_ZOOM, this);
            PDFEvent.dispatch(Events.SET_SCALE, this.scale);
        });
    }

    /**
     * 
     * @param {*} options 
     * @returns {Promise<canvas>}
     */
    async render(renderType) {
        if (this.rendered) {
            return this.content;
        }

        switch (renderType) {
            case 'html':
                this.content = await this.renderHTML();
                break;
            case 'image':
                this.content = await this.renderImage();
                break;
            case 'canvas':
                this.content = await this.renderCanvas();
                break;
        }
        this.rendered = true;
        this.#clearWrapper();
        this.elWrapper.appendChild(this.content);
        this.elDrawLayer.style.width = this.content.style.width;
        this.elDrawLayer.style.height = this.content.style.height;
        this.elWrapper.style.width = this.content.style.width;
        this.elWrapper.style.height = this.content.style.height;
        PDFEvent.dispatch(Events.PAGE_RENDERED, this);
        return this.content;
    }

    /**
     * 
     * @returns {Promise<canvas>}
     */
    async renderHTML() {
        const canvas = await this.renderCanvas();
        if (!this.elTextLayer) {
            this.elTextLayer = document.createElement('div');
            this.elTextLayer.classList.add(TEXT_LAYER_CLASS);
            this.elWrapper.appendChild(this.elTextLayer);
        }
        this.elTextLayer.style.width = canvas.style.width;
        this.elTextLayer.style.height = canvas.style.height;
        
        const viewport = this.pageProxy.getViewport({ scale: this.scale });
        this.getTextContent().then(textContent => {
            const readableStream = this.pageProxy.streamTextContent(textContentOptions);
            this.textDivs = [];
            let textContentItemsStr = [];
            this.reader.pdfjsLib.renderTextLayer({
                textContent: textContent,
                textContentStream: readableStream,
                container: this.elTextLayer,
                viewport: viewport,
                textDivs: this.textDivs,
                textContentItemsStr: textContentItemsStr,
                enhanceTextSelection: false
            });
        });

        if (!this.elAnnotationLayer) {
            this.elAnnotationLayer = document.createElement('div');
            this.elAnnotationLayer.classList.add(ANNOTATION_LAYER_CLASS);
            this.elWrapper.appendChild(this.elAnnotationLayer);
        }
        
        let params = {
            annotations: this.annotations,
            viewport: viewport.clone({ dontFlip: true }),
            div: this.elAnnotationLayer,
            page: this.pageProxy,
            renderForms: true,
            annotationStorage: this.pdfDocument.documentProxy.annotationStorage,
            linkService: new PDFLinkService()
        };
        if (!this.annotations) {
            this.pageProxy.getAnnotations().then(annotations => {
                this.annotations = annotations;
                params.annotations = annotations;
                pdfjsLib.AnnotationLayer.render(params);
            });
        } else {
            pdfjsLib.AnnotationLayer.update(params);
        }
        return canvas;
    }


    /**
     * 
     * @param {*} options 
     * @returns {Promise<image>}
     */
    async renderImage() {
        let image = new Image();
        image.src = await this.toImage();
        image.classList.add(CAVANS_CLASS);
        return image;
    }

    /**
     * 
     * @returns {Promise<canvas>}
     */
    async renderCanvas() {
        await this.getPageProxy();
        const viewport = this.pageProxy.getViewport({ scale: this.scale });
        const canvas = document.createElement('canvas');
        canvas.classList.add(CAVANS_CLASS);
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        canvas.width = Math.floor(viewport.width * this.outputScale);
        canvas.height = Math.floor(viewport.height * this.outputScale);
        
        let context = canvas.getContext('2d');
        let transform = this.outputScale !== 1 ?
            [this.outputScale, 0, 0, this.outputScale, 0, 0] : null;

        let renderContext = {
            canvasContext: context,
            transform: transform,
            viewport: viewport
        };
        await this.pageProxy.render(renderContext).promise;
        return canvas;
    }

    async getTextContent() {
        await this.getPageProxy();
        const textContent = await this.pageProxy.getTextContent(textContentOptions);
        this.textContentItems = textContent.items;
        this.textContentStyles = textContent.styles;
        return textContent;
    }

    async find(text, isCase) {
        return this.getTextContent().then(textContent => {
            let found = [];
            let flags = isCase ? 'g' : 'ig';
            textContent.items.forEach((obj, i) => {
                let hints = obj.str.match(new RegExp(text, flags));
                if (hints) {
                    found.push({
                        idx: i,
                        str: obj.str,
                        hints: hints.length
                    });
                }
            });
            return found.length > 0 ? found : null;
        });
    }

    async toImage() {
        if (!this.#canvasImage) {
            const canvas = await this.renderCanvas();
            this.#canvasImage = canvas.toDataURL();
        }
        return this.#canvasImage;
    }

    async getPageProxy() {
        if (!this.pageProxy) {
            this.pageProxy = await this.pdfDocument.documentProxy.getPage(this.pageNum);
            // this.scale = computeScale(this.reader.viewMode, this.pageProxy.view[2], this.pageProxy.view[3], this.reader.mainBox, this.outputScale);
            this.scale = computeScale(this.reader.viewMode, this.pageProxy.view[2], this.pageProxy.view[3], this.reader.mainBox, 1);
            PDFEvent.dispatch(Events.SET_SCALE, this.scale);
        }
        if (this.pageProxy.ref) {
            this.id = this.pageProxy.ref.num + '_' + this.pageProxy.ref.gen;
        }
        return this.pageProxy;
    }

    #clearWrapper() {
        //滚动缩放在事件结束前可能会产生多个canvas
        this.elWrapper.querySelectorAll('.' + CAVANS_CLASS).forEach(canvas => {
            canvas.remove();
        });
        if (this.elTextLayer) {
            this.elTextLayer.innerHTML = '';
        }
        // if (this.elAnnotationLayer) {
            // this.elAnnotationLayer.innerHTML = '';
        // }
    }
};