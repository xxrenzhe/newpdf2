import { StandardFonts } from 'pdf-lib';
import { Events, PDFEvent } from '../event';
import { Font } from '../font';
import { trimSpace } from '../misc';
import { PDFPage } from './page';
import opentype from 'opentype.js';

const FONT_SUBSET_TIMEOUT_MS = 15000;

export class PDFDocument {
    editor = null;
    documentProxy = null;
    pages = [];
    embedFonts = {};
    pageRemoved = [];
    fontSubsetRequestId = 0;

    constructor(editor, documentProxy) {
        this.editor = editor;
        this.documentProxy = documentProxy;
    }

    get pageCount() {
        return this.documentProxy.getPageCount();
    }

    getPageActive() {
        if (this.editor.reader && this.editor.reader.pdfDocument) {
            let pageNum = this.editor.reader.pdfDocument.getPageActive().pageNum;
            return this.getPage(pageNum);
        }
    }

    async fixFontData() {
        let texts = Object.create(null);
        for (let i in this.pages) {
            const page = this.getPage(parseInt(i) + 1);
            if (!this.embedFonts[page.id]) {
                this.embedFonts[page.id] = Object.create(null);
            }
            for (let id in page.elements.items) {
                let item = page.elements.items[id];
                if (['text', 'textbox'].indexOf(item.dataType) < 0) continue;
                if (!texts[page.id]) {
                    texts[page.id] = Object.create(null);
                }
                if (!texts[page.id][item.attrs.fontFile]) {
                    texts[page.id][item.attrs.fontFile] = item.attrs.text;
                } else {
                    texts[page.id][item.attrs.fontFile] += item.attrs.text;
                }
                this.embedFonts[page.id][item.attrs.fontFile] = null;
            }
        }
        
        //是否立即下载（合并本地字体会通过message异步下载）
        for (let pageId in texts) {
            for (let fontFile in texts[pageId]) {
                let text = texts[pageId][fontFile];
                if (!trimSpace(text)) continue;
                try {
                    await this.getFont(pageId, text, fontFile);
                } catch(e) {
                    console.error('[pdfeditor] getFont failed, fallback to Helvetica', e);
                    await this.setFontFallback(pageId, fontFile, e);
                }
            }
        }
        PDFEvent.dispatch(Events.DOWNLOAD);
    }

    async subsetFontWithWorker({
        text,
        pageId,
        fontFile,
        arrayBuffer,
        fallbackBuffer
    }) {
        const worker = this.editor?.fontWorker;
        if (!worker) {
            throw new Error('font worker unavailable');
        }
        const requestId = ++this.fontSubsetRequestId;
        return new Promise((resolve, reject) => {
            let finished = false;
            const finish = (callback, value) => {
                if (finished) return;
                finished = true;
                worker.removeEventListener('message', onMessage);
                worker.removeEventListener('error', onError);
                worker.removeEventListener('messageerror', onMessageError);
                clearTimeout(timeoutId);
                callback(value);
            };
            const onMessage = (event) => {
                const data = event?.data;
                if (!data || typeof data !== 'object') return;
                if (typeof data.requestId !== 'number' || data.requestId !== requestId) return;
                if (data.type === 'font_subset_after') {
                    if (!data.newBuffer) {
                        finish(reject, new Error('font subset worker returned empty buffer'));
                        return;
                    }
                    finish(resolve, data.newBuffer);
                    return;
                }
                if (data.type === 'font_subset_error') {
                    const message =
                        typeof data.message === 'string' && data.message
                            ? data.message
                            : 'font subset worker failed';
                    finish(reject, new Error(message));
                }
            };
            const onError = (event) => {
                const message = event?.message || 'font subset worker failed';
                finish(reject, new Error(message));
            };
            const onMessageError = () => {
                finish(reject, new Error('font subset worker message error'));
            };
            const timeoutId = setTimeout(() => {
                finish(reject, new Error('font subset worker timeout'));
            }, FONT_SUBSET_TIMEOUT_MS);
            worker.addEventListener('message', onMessage);
            worker.addEventListener('error', onError);
            worker.addEventListener('messageerror', onMessageError);
            try {
                worker.postMessage({
                    type: 'font_subset',
                    requestId,
                    text,
                    pageId,
                    fontFile,
                    arrayBuffer,
                    fallbackBuffer
                }, [
                    arrayBuffer,
                    fallbackBuffer
                ]);
            } catch (error) {
                finish(reject, error);
            }
        });
    }

    async getFont(pageId, text, fontFile) {
        // return this.documentProxy.embedFont(StandardFonts.Helvetica);

        if (!this.embedFonts[pageId]) {
            this.embedFonts[pageId] = Object.create(null);
        }
        const embedFont = this.embedFonts[pageId][fontFile];
        if (embedFont) {
            return embedFont;
        }

        //从pdf文件中提取字体数据
        let arrayBuffer = Font.getCache(pageId, fontFile);
        if (!arrayBuffer) {
            const page = this.getPageForId(pageId);
            if (!page?.readerPage?.pageProxy?.commonObjs) {
                await this.setFontFallback(pageId, fontFile, new Error('missing page font context'));
                return this.embedFonts[pageId][fontFile];
            }
            let commonObjs = page.readerPage.pageProxy.commonObjs;
            if (commonObjs.has(fontFile)) {
                let fontFace = commonObjs.get(fontFile);
                arrayBuffer = fontFace.data.buffer;
                let newFont = opentype.parse(arrayBuffer);
                text = text.split('').filter((value, index, self) => self.indexOf(value) === index);
                let isFetchFont = text.some(val => (!newFont.charToGlyph(val).unicode && Font.CHARS.indexOf(val) == -1));
                let _text = text.map(val => {
                    if (!newFont.charToGlyph(val).unicode && Font.CHARS.indexOf(val) > -1) {
                        return val;
                    }
                    return '';
                }).join('');

                //如果包含CJK并需要补字体
                let isIncludeCJK = new RegExp(Font.CJK_RANGE);
                if (isIncludeCJK.test(text) && _text) {
                    arrayBuffer = await Font.fetchFont(pageId, text.join(''), Font.UNICODE_FONT);
                    await this.setFont(pageId, fontFile, arrayBuffer);
                } else {
                    if (!isFetchFont) {
                        if (_text) {
                            try {
                                const fallbackBuffer = await Font.fetchFallbackFont();
                                const subsetBuffer = await this.subsetFontWithWorker({
                                    text: _text,
                                    pageId: pageId,
                                    fontFile: fontFile,
                                    arrayBuffer: arrayBuffer,
                                    fallbackBuffer: fallbackBuffer
                                });
                                await this.setFont(pageId, fontFile, subsetBuffer);
                            } catch (e) {
                                console.warn('[pdfeditor] font subset fallback failed, use Helvetica', e);
                                await this.setFontFallback(pageId, fontFile, e);
                            }
                        } else {
                            await this.setFont(pageId, fontFile, arrayBuffer);
                        }
                    } else {
                        arrayBuffer = await Font.fetchFont(pageId, text.join(''), Font.UNICODE_FONT);
                        await this.setFont(pageId, fontFile, arrayBuffer);
                    }
                }
            } else {
                //从服务器拉取字体数据
                arrayBuffer = await Font.fetchFont(pageId, text, fontFile);
                await this.setFont(pageId, fontFile, arrayBuffer);
            }
            // if (!arrayBuffer) {
            //     arrayBuffer = this.documentProxy.embedFont(StandardFonts.Helvetica);
            // }
        } else {
            await this.setFont(pageId, fontFile, arrayBuffer);
        }
        return this.embedFonts[pageId][fontFile];
    }

    async setFontFallback(pageId, fontFile, error) {
        try {
            await this.setFont(pageId, fontFile, StandardFonts.Helvetica);
        } catch (fallbackError) {
            const baseMessage =
                (error && typeof error.message === 'string' && error.message) || String(error);
            const fallbackMessage =
                (fallbackError && typeof fallbackError.message === 'string' && fallbackError.message)
                    || String(fallbackError);
            throw new Error('setFont fallback failed: ' + baseMessage + '; ' + fallbackMessage);
        }
    }

    async setFont(pageId, fontFile, arrayBuffer) {
        //当获取字体数据错误时，使用默认字体
        if (!arrayBuffer) {
            arrayBuffer = StandardFonts.Helvetica;
        }
        Font.setCache(pageId, fontFile, arrayBuffer);
        this.embedFonts[pageId][fontFile] = this.documentProxy.embedFont(arrayBuffer);
    }

    checkFonts() {
        return Object.values(this.embedFonts).every(fonts => {
            return Object.values(fonts).every(font => font != null);
        });
    }

    destroyDocumentProxy() {
        const documentProxy = this.documentProxy;
        this.documentProxy = null;
        if (!documentProxy || typeof documentProxy.destroy !== 'function') {
            return;
        }
        try {
            const result = documentProxy.destroy();
            if (result && typeof result.then === 'function') {
                result.catch(() => {});
            }
        } catch (err) {
            // ignore
        }
    }

    resetForNewSource() {
        this.pages.forEach(page => {
            try {
                page?.elements?.clearSilently?.();
            } catch (err) {
                // ignore
            }
            if (page) {
                page.elements = null;
                page.pdfDocument = null;
            }
        });
        this.pages = [];
        this.embedFonts = {};
        this.pageRemoved = [];
        this.destroyDocumentProxy();
        this.fontSubsetRequestId = 0;
    }

    addPage(pageNum) {
        const page = new PDFPage();
        const prevPage = this.getPage(pageNum - 1);
        const newReaderPage = this.editor.reader.pdfDocument.createPage(pageNum);
        if (pageNum == 1) {
            page.addToFirst(prevPage, newReaderPage);
        } else {
            page.addTo(prevPage, newReaderPage);
        }
        this.pages.forEach(page => {
            if (page.pageNum >= pageNum) {
                page.index++;
                page.pageNum++;
            }
        });
        this.pages.splice(page.index, 0, page);
        

        this.editor.reader.pdfDocument.pages.forEach(page => {
            if (page.pageNum >= pageNum) {
                page.index++;
                page.pageNum++;
                page.elContainer.setAttribute('data-page', page.pageNum);
                page.elThumbs.setAttribute('data-page', page.pageNum);
                page.elThumbs.querySelector('.__pdf_page_number').textContent = page.pageNum;
            }
        });
        this.editor.reader.pdfDocument.pages.splice(newReaderPage.index, 0, newReaderPage);
    }

    removePage(pageNum) {
        let index = pageNum - 1;
        const page = this.getPage(pageNum);
        //只有原本PDF中的页需要删除
        if (!page.newPagesize) {
            this.pageRemoved.push(index);
        }
        page.readerPage.elContainer.remove();
        page.readerPage.elThumbs.remove();

        this.pages.forEach(page => {
            if (page.pageNum > pageNum) {
                page.index--;
                page.pageNum--;
            }
        });
        this.pages.splice(index, 1);


        this.editor.reader.pdfDocument.pages.forEach(page => {
            if (page.pageNum > pageNum) {
                page.index--;
                page.pageNum--;
                page.elContainer.setAttribute('data-page', page.pageNum);
                page.elThumbs.setAttribute('data-page', page.pageNum);
                page.elThumbs.querySelector('.__pdf_page_number').textContent = page.pageNum;
            }
        });
        this.editor.reader.pdfDocument.pages.splice(index, 1);
    }

    /**
     * @param {boolean} toBlob 是否返回一个Blob对象 默认为false
     * @returns {Promise<Uint8Array> | Promise<Blob>}
     */
    async save(toBlob) {
        PDFEvent.dispatch(Events.SAVE_BEFORE, this);

        if (this.pageRemoved.length > 0) {
            this.pageRemoved.forEach(pageIndex => {
                this.documentProxy.removePage(pageIndex);
            });
        }

        for (let i in this.pages) {
            const page = this.getPage(parseInt(i) + 1);
            if (page.newPagesize) {
                page.insert();
            }
            await page.save();
        }
        PDFEvent.dispatch(Events.SAVE_AFTER, this);

        return new Promise(resolve => {
            const bytesPromise = this.documentProxy.save();
            if (toBlob) {
                bytesPromise.then(bytes => {
                    const blob = new Blob([bytes], {
                        type: "application/pdf"
                    });
                    resolve(blob);
                })
            } else {
                resolve(bytesPromise);
            }
        });
    }

    remove(pageNum) {
        const pageIndex = Math.max(0, parseInt(pageNum) - 1);
        this.pages.splice(pageIndex, 1);
        this.documentProxy.removePage(pageIndex);
    }

    removePages(pages) {
        let i = 1;
        pages.sort();
        pages.map(p => {
            try {
                const pageIndex = parseInt(p) - i;
                this.pages.splice(pageIndex, 1);
                this.documentProxy.removePage(pageIndex);
                i++;
            } catch (e) {}
        });
    }

    /**
     * 
     * @param {*} pageNum 
     * @returns {PDFPage}
     */
    getPage(pageNum) {
        let pageIndex = Math.max(0, parseInt(pageNum) - 1);
        if (this.pages[pageIndex]) {
            return this.pages[pageIndex];
        }
        let page = new PDFPage(this, pageNum);
        this.pages[pageIndex] = page;
        return this.pages[pageIndex];
    }

    getPageForId(pageId) {
        return this.pages.find(page => page.id == pageId);
    }
};
