import { Events, PDFEvent } from '../event';
import { PDFLinkService } from 'pdfjs-dist-v2/lib/web/pdf_link_service';
import { computeScale } from '../misc';

const CAVANS_CLASS = '__pdf_item_render';
const PREVIEW_CLASS = '__pdf_page_preview';
const WRAPPER_CLASS = PREVIEW_CLASS + '_wrapper';
const ELEMENT_LAYER_CLASS = 'elementLayer';
const DRAW_LAYER_CLASS = 'drawLayer';
const TEXT_LAYER_CLASS = 'textLayer';
const ANNOTATION_LAYER_CLASS= 'annotationLayer';
const TEXT_MARKUP_LAYER_CLASS = 'textMarkupLayer';

const textContentOptions = {
    // Keep items separate so text highlights don't span large whitespace gaps.
    disableCombineTextItems: true,
    includeMarkedContent: false
};

export class PDFPageBase {
    pdfDocument = null;
    pageProxy = null;
    id = null;
    index = 0;
    pageNum = 1;
    isNewPage = false;
    newPageSize = null;
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
    elMarkupLayer = null;
    elDrawLayer = null;
    content = null;
    #canvasImage = null;
    renderPromise = null;
    textMarkups = null;
    textMarkupEls = null;

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
        this.elMarkupLayer = document.createElement('div');
        this.elMarkupLayer.classList.add(TEXT_MARKUP_LAYER_CLASS);
        this.elMarkupLayer.style.position = 'absolute';
        this.elMarkupLayer.style.left = '0px';
        this.elMarkupLayer.style.top = '0px';
        this.elMarkupLayer.style.pointerEvents = 'none';
        this.elElementLayer.appendChild(this.elMarkupLayer);
        this.textMarkups = new Map();
        this.textMarkupEls = new Map();
        
        
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
        if (this.isNewPage) {
            this.applyVirtualScale(scale, force);
            return;
        }
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

    applyVirtualScale(viewMode, force) {
        if (!this.newPageSize || !this.reader?.mainBox) return false;
        const [pdfWidth, pdfHeight] = this.newPageSize;
        if (!pdfWidth || !pdfHeight) return false;
        const nextScale = computeScale(viewMode, pdfWidth, pdfHeight, this.reader.mainBox, 1);
        if (this.scale === nextScale && !force) return false;
        this.scale = nextScale;

        const widthPx = Math.max(1, Math.round(pdfWidth * nextScale)) + 'px';
        const heightPx = Math.max(1, Math.round(pdfHeight * nextScale)) + 'px';
        this.elWrapper.style.width = widthPx;
        this.elWrapper.style.height = heightPx;
        this.elDrawLayer.style.width = widthPx;
        this.elDrawLayer.style.height = heightPx;
        if (this.elTextLayer) {
            this.elTextLayer.style.width = widthPx;
            this.elTextLayer.style.height = heightPx;
        }
        if (this.elAnnotationLayer) {
            this.elAnnotationLayer.style.width = widthPx;
            this.elAnnotationLayer.style.height = heightPx;
        }
        if (this.elMarkupLayer) {
            this.elMarkupLayer.style.width = widthPx;
            this.elMarkupLayer.style.height = heightPx;
        }
        this.renderTextMarkups();
        return true;
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
        if (this.renderPromise) {
            return this.renderPromise;
        }

        const task = (async () => {
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
            this.renderTextMarkups();
            PDFEvent.dispatch(Events.PAGE_RENDERED, this);
            return this.content;
        })();

        this.renderPromise = task;
        try {
            return await task;
        } finally {
            if (this.renderPromise === task) {
                this.renderPromise = null;
            }
        }
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

    addTextMarkup(markup) {
        if (!markup || !markup.id) return null;
        if (!this.textMarkups) {
            this.textMarkups = new Map();
        }
        const entry = Object.assign({
            hidden: false
        }, markup);
        this.textMarkups.set(entry.id, entry);
        this.renderTextMarkups();
        return entry;
    }

    removeTextMarkup(id) {
        if (!this.textMarkups) return;
        this.textMarkups.delete(id);
        if (this.textMarkupEls?.has(id)) {
            this.textMarkupEls.get(id).remove();
            this.textMarkupEls.delete(id);
        }
    }

    setTextMarkupVisible(id, visible) {
        if (!this.textMarkups) return;
        const markup = this.textMarkups.get(id);
        if (!markup) return;
        markup.hidden = !visible;
        const el = this.textMarkupEls?.get(id);
        if (el) {
            el.style.display = markup.hidden ? 'none' : '';
        }
        this.scheduleThumbRefresh({ refreshImage: false, delay: 120 });
    }

    getTextMarkups() {
        if (!this.textMarkups) return [];
        return Array.from(this.textMarkups.values());
    }

    renderTextMarkups() {
        if (!this.textMarkups || this.textMarkups.size === 0) {
            if (this.elMarkupLayer) {
                this.elMarkupLayer.innerHTML = '';
            }
            if (this.textMarkupEls) {
                this.textMarkupEls.clear();
            }
            return;
        }
        if (!this.elMarkupLayer) {
            this.elMarkupLayer = document.createElement('div');
            this.elMarkupLayer.classList.add(TEXT_MARKUP_LAYER_CLASS);
            this.elMarkupLayer.style.position = 'absolute';
            this.elMarkupLayer.style.left = '0px';
            this.elMarkupLayer.style.top = '0px';
            this.elMarkupLayer.style.pointerEvents = 'none';
            this.elElementLayer.appendChild(this.elMarkupLayer);
        }
        if (!this.textMarkupEls) {
            this.textMarkupEls = new Map();
        }

        const width = this.content?.style?.width || this.elWrapper?.style?.width;
        const height = this.content?.style?.height || this.elWrapper?.style?.height;
        if (width) this.elMarkupLayer.style.width = width;
        if (height) this.elMarkupLayer.style.height = height;

        for (const [id, el] of this.textMarkupEls.entries()) {
            if (!this.textMarkups.has(id)) {
                el.remove();
                this.textMarkupEls.delete(id);
            }
        }

        const scale = this.scale || 1;
        for (const markup of this.textMarkups.values()) {
            let el = this.textMarkupEls.get(markup.id);
            if (!el) {
                el = document.createElement('div');
                el.classList.add('__pdf_text_markup', '__pdf_text_markup_' + markup.type);
                el.style.position = 'absolute';
                el.style.pointerEvents = 'none';
                el.style.zIndex = '0';
                this.elMarkupLayer.appendChild(el);
                this.textMarkupEls.set(markup.id, el);
            }
            const x = (markup.x || 0) * scale;
            const y = (markup.y || 0) * scale;
            const widthPx = (markup.width || 0) * scale;
            const heightPx = (markup.height || 0) * scale;
            el.style.left = x + 'px';
            el.style.width = widthPx + 'px';
            el.style.background = markup.background || '';
            el.style.opacity = markup.opacity == null ? '' : markup.opacity;
            if (markup.type === 'underline' || markup.type === 'strikethrough') {
                const thickness = (markup.thickness || 0) * scale;
                const offset = (markup.offset || 0) * scale;
                el.style.top = (y + offset) + 'px';
                el.style.height = thickness + 'px';
            } else {
                el.style.top = y + 'px';
                el.style.height = heightPx + 'px';
            }
            el.style.display = markup.hidden ? 'none' : '';
        }
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
     * Lightweight thumbnail renderer (avoid full-page toDataURL caching).
     * @param {{ width?: number; quality?: number }} opts
     * @returns {Promise<HTMLImageElement>}
     */
    async renderThumbImage(opts = {}) {
        const width = typeof opts.width === 'number' ? opts.width : 140;
        const quality = typeof opts.quality === 'number' ? opts.quality : 0.78;

        if (this.isNewPage && this.newPageSize) {
            const [pdfWidth, pdfHeight] = this.newPageSize;
            const scale = width / Math.max(1, pdfWidth || 1);
            const viewportWidth = Math.ceil(Math.max(1, pdfWidth * scale));
            const viewportHeight = Math.ceil(Math.max(1, pdfHeight * scale));

            const canvas = document.createElement('canvas');
            canvas.width = viewportWidth;
            canvas.height = viewportHeight;

            const ctx = canvas.getContext('2d', { alpha: false });
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            const image = new Image();
            image.classList.add(CAVANS_CLASS);
            image.src = canvas.toDataURL('image/jpeg', quality);
            return image;
        }

        await this.getPageProxy();
        const viewport0 = this.pageProxy.getViewport({ scale: 1 });
        const scale = width / Math.max(1, viewport0.width);
        const viewport = this.pageProxy.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
            throw new Error('Canvas 2D context unavailable');
        }

        await this.pageProxy.render({ canvasContext: ctx, canvas, viewport }).promise;

        const image = new Image();
        image.classList.add(CAVANS_CLASS);
        image.src = canvas.toDataURL('image/jpeg', quality);
        return image;
    }

    scheduleThumbRefresh(opts = {}) {
        this._thumbDirty = true;
        if (!this.elThumbs || !this.elThumbs.isConnected) {
            return;
        }
        const delay = typeof opts.delay === 'number' ? opts.delay : 120;
        const includeOverlays = opts.includeOverlays !== false;
        const refreshImage = opts.refreshImage === true;
        clearTimeout(this._thumbRefreshTimer);
        this._thumbRefreshTimer = setTimeout(() => {
            this.refreshThumb({ includeOverlays, refreshImage }).catch(() => {});
        }, delay);
    }

    async refreshThumb(opts = {}) {
        if (!this.elThumbs || !this.elThumbs.isConnected) {
            return;
        }
        const wrapper = this.elThumbs.querySelector('.' + WRAPPER_CLASS);
        if (!wrapper) return;

        const includeOverlays = opts.includeOverlays !== false;
        const refreshImage = opts.refreshImage !== false;
        const width = typeof opts.width === 'number' ? opts.width : 140;
        const quality = typeof opts.quality === 'number' ? opts.quality : 0.78;
        const token = (this._thumbRefreshToken = (this._thumbRefreshToken || 0) + 1);

        let image = null;
        if (!refreshImage) {
            image = wrapper.querySelector('.' + CAVANS_CLASS);
        }
        if (!image) {
            image = await this.renderThumbImage({ width, quality });
            if (token !== this._thumbRefreshToken) return;
        }

        if (!this.elThumbs || !this.elThumbs.isConnected) {
            return;
        }

        if (refreshImage) {
            wrapper.querySelectorAll('.' + CAVANS_CLASS).forEach(el => el.remove());
            wrapper.appendChild(image);
        } else if (image && !wrapper.contains(image)) {
            wrapper.appendChild(image);
        }

        wrapper.querySelectorAll('.__pdf_thumb_overlay').forEach(el => el.remove());
        if (includeOverlays) {
            const overlay = this.#buildThumbOverlay(wrapper);
            if (overlay) {
                wrapper.appendChild(overlay);
            }
            this._thumbDirty = false;
        }
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
        
        let context = canvas.getContext('2d', { alpha: false });
        if (!context) context = canvas.getContext('2d');
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

    #buildThumbOverlay(wrapper) {
        if (!wrapper) return null;
        const elementLayer = this.elElementLayer;
        const drawLayer = this.elDrawLayer;
        const textLayer = this.elTextLayer;
        const markupLayer = this.elMarkupLayer;
        const highlightSelector = '.text_highlight:not(.__removed), .text_underline:not(.__removed), .text_strike:not(.__removed)';
        const hasElements = Boolean(elementLayer && elementLayer.querySelector('.__pdf_editor_element:not(.__pdf_el_hidden)'));
        const hasDraw = Boolean(drawLayer && drawLayer.childElementCount > 0);
        const hasHighlights = Boolean(textLayer && textLayer.querySelector(highlightSelector));
        const hasMarkups = Boolean(markupLayer && markupLayer.childElementCount > 0);
        if (!hasElements && !hasDraw && !hasHighlights && !hasMarkups) {
            return null;
        }

        const baseRect = this.elWrapper?.getBoundingClientRect?.();
        let baseWidth = baseRect?.width || 0;
        let baseHeight = baseRect?.height || 0;
        if ((!baseWidth || !baseHeight) && this.content) {
            const contentRect = this.content.getBoundingClientRect();
            baseWidth = contentRect.width || baseWidth;
            baseHeight = contentRect.height || baseHeight;
        }
        if (!baseWidth || !baseHeight) {
            return null;
        }

        const thumbRect = wrapper.getBoundingClientRect();
        const scaleX = thumbRect.width / baseWidth;
        const scaleY = thumbRect.height / baseHeight;
        if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) {
            return null;
        }

        const overlay = document.createElement('div');
        overlay.classList.add('__pdf_thumb_overlay');
        overlay.style.width = baseWidth + 'px';
        overlay.style.height = baseHeight + 'px';
        overlay.style.transform = 'scale(' + scaleX + ',' + scaleY + ')';

        if (hasElements && elementLayer) {
            overlay.appendChild(elementLayer.cloneNode(true));
        }
        if (hasDraw && drawLayer) {
            overlay.appendChild(drawLayer.cloneNode(true));
        }
        if (hasHighlights && textLayer) {
            overlay.appendChild(textLayer.cloneNode(true));
        }
        if (hasMarkups && markupLayer && !hasElements) {
            overlay.appendChild(markupLayer.cloneNode(true));
        }

        this.#stripThumbOverlay(overlay);
        return overlay;
    }

    #stripThumbOverlay(overlay) {
        if (!overlay) return;
        overlay.querySelectorAll('.__pdf_el_actions_wrapper').forEach(el => el.remove());
        overlay.querySelectorAll('.resizable-handle').forEach(el => el.remove());
        overlay.querySelectorAll('.__resizable').forEach(el => el.classList.remove('__resizable'));
        overlay.querySelectorAll('.__resizable-border').forEach(el => el.classList.remove('__resizable-border'));
        overlay.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
        overlay.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        overlay.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
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
