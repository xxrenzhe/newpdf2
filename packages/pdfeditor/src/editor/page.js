import { createId } from '../misc';
import { Elements } from './elements';


export class PDFPage {
    pdfDocument = null;
    index = 0;
    pageNum = 1;
    elements = null;
    #id = null;
    newPagesize = false;

    constructor(pdfDocument, pageNum) {
        this.pdfDocument = pdfDocument;
        this.pageNum = parseInt(pageNum);
        this.index = Math.max(0, parseInt(this.pageNum) - 1);
        this.elements = new Elements(this);
        this.init();
    }

    get id() {
        if (!this.#id) {
            //AssemblePDF使用了压缩流，ref已经改变了
            // this.#id = this.pageProxy.ref ? this.pageProxy.ref.objectNumber + '_' + this.pageProxy.ref.generationNumber : createId('page');
            this.#id = this.reader.pdfDocument.getPage(this.pageNum).id;
        }
        return this.#id;
    }

    set id(value) {
        this.#id = value;
    }

    get editor() {
        return this.pdfDocument.editor;
    }

    get reader() {
        return this.editor.reader;
    }

    get readerPage() {
        return this.reader.pdfDocument.getPage(this.pageNum);
    }

    get pageProxy() {
        return this.pdfDocument.documentProxy.getPage(this.pageNum - 1);
    }

    get width() {
        return this.pageProxy.getWidth();
    }

    get height() {
        return this.pageProxy.getHeight();
    }

    async init() {}

    zoom(scale) {
        this.elements.zoom(scale);
    }

    async getReaderPageProxy() {
        return this.readerPage.getPageProxy();
    }

    async save() {
        if (this.elements.length < 1) {
            return true;
        }
        return this.elements.insertToPDF();
    }

    addTo(prevPage, newReaderPage) {
        this.id = createId('new_');
        this.pdfDocument = prevPage.pdfDocument;
        this.index = prevPage.index + 1;
        this.pageNum = prevPage.pageNum + 1;
        this.scale = prevPage.scale;
        let prevWrapper = this.pdfDocument.getPage(1).readerPage.elWrapper;

        if (prevPage.newPagesize) {
            this.newPagesize = prevPage.newPagesize;  
        } else {
            let size = this.pdfDocument.getPage(1).readerPage.pageProxy.view;
            if (prevPage.readerPage.pageProxy) {
                size = prevPage.readerPage.pageProxy.view;
                prevWrapper = prevPage.readerPage.elWrapper;
            }

            const [ x, y, width, height ] = size;
            this.newPagesize = [width, height];
        }
        
        newReaderPage.elWrapper.style.width = prevWrapper.style.width;
        newReaderPage.elWrapper.style.height = prevWrapper.style.height;
        newReaderPage.elDrawLayer.style.width = prevWrapper.style.width;
        newReaderPage.elDrawLayer.style.height = prevWrapper.style.height;
        newReaderPage.content = newReaderPage.elWrapper;
        newReaderPage.isNewPage = true;

        let targetElement = prevPage.readerPage.elContainer;
        targetElement.parentNode.insertBefore(newReaderPage.elContainer, targetElement.nextElementSibling);
        this.reader.mainObserver.observe(newReaderPage.elContainer);
        

        let elPageText = document.createElement('div');
        elPageText.textContent = this.pageNum;
        elPageText.classList.add('__pdf_page_number');
        let elThumbs = newReaderPage.elContainer.cloneNode(true);
        elThumbs.appendChild(elPageText);
        newReaderPage.elThumbs = elThumbs;
        elThumbs.addEventListener('click', () => {
            let pageNum = elThumbs.getAttribute('data-page');
            this.reader.pdfDocument.mainScrollTo(pageNum, true);
        });


        elThumbs.querySelector('.__pdf_page_preview_wrapper').setAttribute('style', '');
        elThumbs.querySelector('.drawLayer').setAttribute('style', '');

        let targetElementThumb = prevPage.readerPage.elThumbs;
        targetElementThumb.parentNode.insertBefore(newReaderPage.elThumbs, targetElementThumb.nextElementSibling);
    }

    addToFirst(oriFirstPage, newReaderPage) {
        this.id = createId('new_');
        this.scale = oriFirstPage.scale;
        this.pdfDocument = oriFirstPage.pdfDocument;
        this.index = 0;
        this.pageNum = 1;
        let prevWrapper = oriFirstPage.readerPage.elWrapper;

        if (oriFirstPage.newPagesize) {
            this.newPagesize = oriFirstPage.newPagesize;  
        } else {
            let size = oriFirstPage.readerPage.pageProxy.view;
            const [ x, y, width, height ] = size;
            this.newPagesize = [width, height];
        }

        newReaderPage.elWrapper.style.width = prevWrapper.style.width;
        newReaderPage.elWrapper.style.height = prevWrapper.style.height;
        newReaderPage.elDrawLayer.style.width = prevWrapper.style.width;
        newReaderPage.elDrawLayer.style.height = prevWrapper.style.height;
        newReaderPage.content = newReaderPage.elWrapper;
        newReaderPage.isNewPage = true;

        let targetElement = oriFirstPage.readerPage.elContainer;
        targetElement.parentNode.insertBefore(newReaderPage.elContainer, targetElement);
        newReaderPage.reader.mainObserver.observe(newReaderPage.elContainer);

        let elPageText = document.createElement('div');
        elPageText.textContent = this.pageNum;
        elPageText.classList.add('__pdf_page_number');
        let elThumbs = newReaderPage.elContainer.cloneNode(true);
        elThumbs.appendChild(elPageText);
        newReaderPage.elThumbs = elThumbs;
        elThumbs.addEventListener('click', () => {
            let pageNum = elThumbs.getAttribute('data-page');
            newReaderPage.reader.pdfDocument.mainScrollTo(pageNum, true);
        });


        elThumbs.querySelector('.__pdf_page_preview_wrapper').setAttribute('style', '');
        elThumbs.querySelector('.drawLayer').setAttribute('style', '');

        let targetElementThumb = oriFirstPage.readerPage.elThumbs;
        targetElementThumb.parentNode.insertBefore(newReaderPage.elThumbs, targetElementThumb);
    }

    insert() {
        return this.pdfDocument.documentProxy.insertPage(this.index, this.newPagesize);
    }
};