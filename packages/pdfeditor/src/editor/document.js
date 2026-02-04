import { StandardFonts } from 'pdf-lib';
import { Events, PDFEvent } from '../event';
import { Font } from '../font';
import { trimSpace } from '../misc';
import { PDFPage } from './page';
import opentype from 'opentype.js';


export class PDFDocument {
    editor = null;
    documentProxy = null;
    pages = [];
    embedFonts = {};
    pageRemoved = [];

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
                    console.log('error');
                    console.log(e);
                    await this.setFont(pageId, fontFile, StandardFonts.Helvetica);
                }
            }
        }
        PDFEvent.dispatch(Event.DOWNLOAD);
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
                    this.setFont(pageId, fontFile, arrayBuffer);
                } else {
                    if (!isFetchFont) {
                        if (_text) {
                            try {
                                Font.fetchFallbackFont().then(fallbackBuffer => {
                                    this.editor.fontWorker.postMessage({
                                        type: 'font_subset',
                                        text: _text,
                                        pageId: pageId,
                                        fontFile: fontFile,
                                        arrayBuffer: arrayBuffer,
                                        fallbackBuffer: fallbackBuffer
                                    }, [
                                        arrayBuffer,
                                        fallbackBuffer
                                    ]);
                                }).catch(e => {
                                    this.setFont(pageId, fontFile, StandardFonts.Helvetica);
                                });
                            } catch (e) {
                                this.setFont(pageId, fontFile, StandardFonts.Helvetica);
                            }
                        } else {
                            this.setFont(pageId, fontFile, arrayBuffer);
                        }
                    } else {
                        arrayBuffer = await Font.fetchFont(pageId, text.join(''), Font.UNICODE_FONT);
                        this.setFont(pageId, fontFile, arrayBuffer);
                    }
                }
            } else {
                //从服务器拉取字体数据
                arrayBuffer = await Font.fetchFont(pageId, text, fontFile);
                this.setFont(pageId, fontFile, arrayBuffer);
            }
            // if (!arrayBuffer) {
            //     arrayBuffer = this.documentProxy.embedFont(StandardFonts.Helvetica);
            // }
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