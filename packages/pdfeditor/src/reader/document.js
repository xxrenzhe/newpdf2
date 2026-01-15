import { Events, PDFEvent } from '../event';
import { PDFPage } from './page';
import { PDFPageBase } from './page_base';

export class PDFDocument {
    reader = null;
    documentProxy = null;
    pages = [];
    pageActive = null;

    constructor(reader, documentProxy) {
        this.reader = reader;
        this.documentProxy = documentProxy;
    }

    get pageCount() {
        return this.documentProxy.numPages;
    }

    get scale() {
        return this.reader.scale;
    }

    async getData() {
        return this.documentProxy.annotationStorage.size > 0 ? 
                    this.documentProxy.saveDocument() : 
                    this.documentProxy.getData();
    }

    zoom(scale, renderType, force) {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            let start = Math.max(1, this.pageActive - 5);
            let end = Math.min(this.pageCount, this.pageActive + 5);
            for (let i = start; i <= end; i++) {
                this.getPage(i).zoom(scale, renderType, force);
            }
        }, 1);
    }

    mainScrollTo(pageNum, setActive) {
        if (this.pageActive == pageNum) {
            return;
        }
        if (setActive) {
            this.setPageActive(pageNum);
        }
        const parentClientRect = this.reader.parentElement.getBoundingClientRect();
        let parentTop = parentClientRect.top;

        const childRect = this.getPage(pageNum).elContainer.getBoundingClientRect();
        let childTop = childRect.top;
        this.reader.parentElement.scrollTop -= parentTop - childTop;
    }

    thumbScrollTo(pageNum, setActive) {
        if (this.pageActive == pageNum) {
            return;
        }
        if (setActive) {
            this.setPageActive(pageNum);
        }
        const elThumbs = this.reader.thumbsBox.querySelector('.__pdf_page_preview[data-page="'+ pageNum +'"]');
        const parentClientRect = this.reader.thumbsBox.getBoundingClientRect();
        let parentBottom = parentClientRect.bottom;
        let parentTop = parentClientRect.top;
        
        const childRect = elThumbs.getBoundingClientRect();
        let childBottom = childRect.bottom;
        let childTop = childRect.top;

        //额外增加的滚动量
        const offsetHeight = 50;
        if (childBottom > parentBottom) {
            //往下滚动时多显示50px
            this.reader.thumbsBox.scrollTop += childBottom - parentBottom + offsetHeight;
        }
        
        if (childTop < parentTop) {
            this.reader.thumbsBox.scrollTop -= parentTop - childTop + offsetHeight;
        }
    }

    setPageActive(pageNum) {
        if (this.pageActive == pageNum) {
            return;
        }
        this.pageActive = pageNum;
        const page = this.getPageActive();
        if (page) {
            if (this.reader.mainBox) {
                this.reader.mainBox.querySelector('.__pdf_page_preview.active')?.classList.remove('active');
            }
            if (this.reader.thumbsBox) {
                this.reader.thumbsBox.querySelector('.__pdf_page_preview.active')?.classList.remove('active');
                this.reader.thumbsBox.querySelector('.__pdf_page_preview[data-page="'+ pageNum +'"]')?.classList.add('active');
            }
            page.elContainer.classList.add('active');
        }
        PDFEvent.dispatch(Events.PAGE_ACTIVE, pageNum);
    }

    getPageActive() {
        return this.getPage(this.pageActive);
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
        this.pages[pageIndex] = this.createPage(pageNum);
        return this.pages[pageIndex];
    }

    createPage(pageNum) {
        const _PAGE = this.reader.usePageBase ? PDFPageBase : PDFPage;
        const page = new _PAGE(this, pageNum, this.scale);
        return page;
    }

    getPageForId(pageId) {
        return this.pages.find(page => page.id == pageId);
    }

    async find(text, isCase) {
        let found = {
            hints: 0,
            res: []
        };

        for (let i = 0; i < this.pageCount; i++) {
            let page = this.getPage(i + 1);
            let res = await page.find(text, isCase);
            if (res) {
                let hints = 0;
                res.forEach(obj => {
                    hints += obj.hints;
                });
                found.res.push({
                    res,
                    pageId: page.id,
                    pageNum: page.pageNum,
                    hints
                });
                found.hints += hints;
            }
        }
        return found;
    }
};