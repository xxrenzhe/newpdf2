import { Events, PDFEvent } from '../event';
import { PDFDocument } from './document';
import { elSliderToggle, mergeDeep, normalizeWheelEventDirection } from '../misc';
import { SCALE, VIEW_MODE } from '../defines';
import { Locale } from '../locale';
import { Font } from '../font';


const obServerThumbs = {
    rootMargin: '0px',
    threshold: 0.1
};
const obServerMain = {
    rootMargin: '0px',
    threshold: 0.2
};

const VIEW_2PAGE_CLASS = 'view_page_2';

const btnOpenFile = 'open_pdf';
const btnPageToFirst = 'pdf_page_to_first';
const btnPageToPrev = 'pdf_page_to_prev';
const btnPageToNumber = 'pdf_page_to_number';
const btnPageToNext = 'pdf_page_to_next';
const btnPageToLast = 'pdf_page_to_last';
const btnSelectZoom = 'pdf_page_select_zoom';
const btnZoomPrev = 'pdf_page_zoom_prev';
const btnZoomRange = 'pdf_page_zoom_range';
const btnZoomNext = 'pdf_page_zoom_next';
const btnThumbsSlider = 'pdf_thumbs_slider';
const thumbsWrapper = 'pdf_thumbs_wrapper';
const btnThumbsClose = 'pdf_thumbs_close';
const btnViewMode = 'view_mode';
const btnRotatePrev = 'rotate_prev';
const btnRotateNext = 'rotate_next';


export class PDFReader {
    options = {
        url: null,
        thumbs: null,
        main: null,
        renderType: 'canvas',
        scale: null,
        viewMode: VIEW_MODE.AUTO_ZOOM,
        parent: null,
        disableViewer: false,
        cMapUrl: null,
        standardFontDataUrl: null,
        usePageBase: true,
        wheel: true,
        expandThumbs: true
    };
    scale = null;
    viewMode = null;
    password = null;
    thumbsBox = null;
    mainBox = null;
    parentElement = null;
    pdfDocument = null;
    disableViewer = false;
    pdfjsLib = null;
    usePageBase = true;
    // outputScale = window.devicePixelRatio || 1;
    outputScale = 2;
    locale = null;

    constructor(options, pdfjsLib, password = null) {
        if (options) {
            this.options = mergeDeep(this.options, options);
        }
        this.scale = this.options.scale;
        this.viewMode = this.options.viewMode;

        this.usePageBase = this.options.usePageBase;
        this.password = password;
        this.disableViewer = this.options.disableViewer;
        this.pdfjsLib = pdfjsLib;

        PDFEvent.on(Events.SET_SCALE, (e, sendResponse) => {
            this.scale = e.data;
            if (this.viewMode == VIEW_MODE.VIEW_2PAGE) {
                this.mainBox.classList.add(VIEW_2PAGE_CLASS);
            } else {
                this.mainBox.classList.remove(VIEW_2PAGE_CLASS);
            }
        });
        this.#UIEvents();
    }

    get pageCount() {
        return this.pdfDocument.pageCount;
    }

    open() {
        if (!this.elFile) {
            this.elFile = document.createElement('input');
            this.elFile.setAttribute('type', 'file');
            this.elFile.addEventListener('change', e => {
                const file = e.target.files[0];
                if (!file) {
                    return;
                }
                if (this.pdfDocument?.documentProxy) {
                    this.pdfDocument.documentProxy._transport.fontLoader.clear();
                }
                Font.clear();
                
                this.load(URL.createObjectURL(file));
                this.elFile.value = '';
            });
        }
        this.elFile.click();
    }

    async init() {
        if (!this.options.url) {
            return false;
        }
        let cfg = {
            url: this.options.url,
            cMapPacked: true,
            cMapUrl: this.options.cMapUrl,
            disableAutoFetch: false,
            disableFontFace: false,
            disableRange: false,
            disableStream: false,
            useSystemFonts: false,
            // docBaseUrl: "",
            enableXfa: true,
            fontExtraProperties: true,
            isEvalSupported: true,
            maxImageSize: -1,
            pdfBug: false,
            standardFontDataUrl: this.options.standardFontDataUrl,
            verbosity: 1
        };

        if (this.password !== null) {
            cfg.password = this.password;
        }

        try {
            const loadingTask = this.pdfjsLib.getDocument(cfg);
            if (this.password) {
                loadingTask.onPassword = (passCallback, reason) => {
                    let msg = '';
                    if (this.pdfjsLib.PasswordResponses.NEED_PASSWORD == reason) {
                        msg = 'This document is password protected. Please enter a password.';
                    } else if (this.pdfjsLib.PasswordResponses.INCORRECT_PASSWORD == reason) {
                        msg = 'Invalid password. Please try again.';
                    }
                    let password = prompt(msg);
                    passCallback(password);
                }
            }
            this.pdfDocument = new PDFDocument(this, await loadingTask.promise);
            if (!this.disableViewer) {
                this.#initReader();
            }
            PDFEvent.dispatch(Events.READER_INIT);
            return this;
        } catch (e) {
            if (e.name == 'PasswordException') {
                // alert('Password protected file');
                PDFEvent.dispatch(Events.PASSWORD_ERROR);
            }
            console.log(e);
            return false;
        }
    }

    /**
     * 加载PDF文件
     * @param {string | ArrayBuffer} url
     */
    async load(url) {
        this.options.url = url;
        if (this.mainBox) {
            while (this.mainBox.firstElementChild) {
                this.mainBox.removeChild(this.mainBox.firstElementChild);
            }
        }
        if (this.thumbsBox) {
            while (this.thumbsBox.firstElementChild) {
                this.thumbsBox.removeChild(this.thumbsBox.firstElementChild);
            }
        }
        return this.init();
    }

    async getData() {
        return this.pdfDocument.getData();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.zoom(this.viewMode, this.options.renderType);
    }

    zoom(scale, renderType, force) {
        if (!this.pdfDocument) {
            return;
        }
        this.pdfDocument.zoom(scale, renderType, force);
    }

    #initReader() {
        if (this.options.wheel) {
            window.addEventListener('wheel', e => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = normalizeWheelEventDirection(e);
                    this.scale += (SCALE.STEP * 100) / delta;
                    if (this.scale <= SCALE.MIN) {
                        this.scale = SCALE.MIN;
                    } else if (this.scale >= SCALE.MAX) {
                        this.scale = SCALE.MAX;
                    }
                    this.viewMode = this.scale;
                    this.zoom(this.scale, this.options.renderType);
                }
            }, {
                passive: false
            });
        }
        
        if (this.options.thumbs) {
            this.#initThumbs();
        }

        if (this.options.main) {
            this.#initMain();
        }

        if (this.options.parent) {
            this.parentElement = this.options.parent instanceof Node ? this.options.parent : document.querySelector(this.options.parent);
        } else {
            this.parentElement = this.mainBox;
        }

        window.addEventListener('resize', e => {
            this.zoom(this.viewMode, this.options.renderType);
        });
        this.pdfDocument.setPageActive(1);
        Locale.bind();
    }

    #initThumbs() {
        this.thumbsBox = this.options.thumbs instanceof Node ? this.options.thumbs : document.querySelector(this.options.thumbs);
        let obOptions = {
            root: null,
            rootMargin: obServerThumbs.rootMargin,
            threshold: obServerThumbs.threshold
        };
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.intersectionRatio <= 0) {
                    return;
                }
                if (entry.isIntersecting) {
                    if (!entry.target.querySelector('.__pdf_item_render')) {
                        let pageNum = entry.target.getAttribute('data-page');
                        let page = this.pdfDocument.getPage(pageNum);
                        page.renderImage().then(el => {
                            entry.target.firstChild.appendChild(el.cloneNode(true));
                        });
                    }
                }
            });
        }, obOptions);

        for (let i = 1; i <= this.pageCount; i++) {
            let page = this.pdfDocument.getPage(i);
            let elThumbs = page.elContainer.cloneNode(true);
            elThumbs.addEventListener('click', () => {
                let pageNum = elThumbs.getAttribute('data-page');
                this.pdfDocument.mainScrollTo(pageNum, true);
            });
            page.elThumbs = elThumbs;

            let elPageText = document.createElement('div');
            elPageText.textContent = i;
            elPageText.classList.add('__pdf_page_number');
            elThumbs.appendChild(elPageText);

            this.thumbsBox.appendChild(elThumbs);
            observer.observe(elThumbs);
        }
    }

    #initMain() {
        this.mainBox = this.options.main instanceof Node ? this.options.main : document.querySelector(this.options.main);
        let obOptions = {
            root: null,
            rootMargin: obServerMain.rootMargin,
            threshold: obServerMain.threshold
        };

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.intersectionRatio <= 0) {
                    return;
                }

                if (entry.isIntersecting) {
                    let pageNum = entry.target.getAttribute('data-page');
                    const page = this.pdfDocument.getPage(pageNum);
                    if (page.isNewPage) {
                        this.pdfDocument.thumbScrollTo(page.pageNum, true);
                        return;
                    }
                    if (page.scale != this.scale) {
                        page.scale = this.scale;
                        page.rendered = false;
                    }
                    page.render(this.options.renderType).then(() => {
                        this.pdfDocument.thumbScrollTo(page.pageNum, true);
                    });
                }
            });
        }, obOptions);

        for (let i = 1; i <= this.pageCount; i++) {
            let page = this.pdfDocument.getPage(i);
            this.mainBox.appendChild(page.elContainer);
            observer.observe(page.elContainer);
        }
        this.mainObserver = observer;
    }

    to(pageNum) {
        if (!this.pdfDocument) {
            return;
        }
        if (pageNum < 1) {
            pageNum = 1;
        }
        if (pageNum > this.pageCount) {
            pageNum = this.pageCount;
        }
        this.pdfDocument.mainScrollTo(pageNum);
    }

    prev() {
        if (!this.pdfDocument) {
            return;
        }
        let pageNum = Math.max(this.pdfDocument.pageActive - 1, 1);
        return this.to(pageNum);
    }

    next() {
        if (!this.pdfDocument) {
            return;
        }
        let pageNum = Math.min(this.pdfDocument.pageActive + 1, this.pageCount);
        return this.to(pageNum);
    }

    async find(text, isCase) {
        let res = await this.pdfDocument.find(text, isCase);
        console.log(res.hints);
        console.log(res);
    }

    #UIEvents() {
        this.btnOpenFile = document.getElementById(btnOpenFile);
        if (this.btnOpenFile) {
            this.btnOpenFile.addEventListener('click', () => {
                this.open();
            });
        }

        //页码按钮事件
        this.btnPageToFirst = document.getElementById(btnPageToFirst);
        if (this.btnPageToFirst) {
            this.btnPageToFirst.addEventListener('click', () => {
                this.to(1);
            });
        }

        this.btnPageToPrev = document.getElementById(btnPageToPrev);
        if (this.btnPageToPrev) {
            this.btnPageToPrev.addEventListener('click', () => {
                this.prev();
            });
        }

        this.btnPageToNumber = document.getElementById(btnPageToNumber);
        if (this.btnPageToNumber) {
            this.btnPageToNumber.addEventListener('keydown', e => {
                if (e.code == 'Enter' || e.code == 'NumpadEnter') {
                    let pageNum = parseInt(this.btnPageToNumber.value);
                    this.to(pageNum);
                }
            });
            PDFEvent.on(Events.PAGE_ACTIVE, e => {
                let pageNum = e.data;
                this.btnPageToNumber.value = pageNum;
            });
        }

        this.btnPageToNext = document.getElementById(btnPageToNext);
        if (this.btnPageToNext) {
            this.btnPageToNext.addEventListener('click', () => {
                this.next();
            });
        }

        this.btnPageToLast = document.getElementById(btnPageToLast);
        if (this.btnPageToLast) {
            this.btnPageToLast.addEventListener('click', () => {
                this.to(this.pageCount);
            });
        }
        //End


        //视图缩放按钮事件
        this.btnSelectZoom = document.getElementById(btnSelectZoom);
        if (this.btnSelectZoom) {
            this.btnSelectZoom.addEventListener('change', () => {
                let scale = this.btnSelectZoom.value;
                if (this.btnZoomRange) {
                    this.setViewMode(scale);
                    this.btnZoomRange.value = scale * 100;
                }
            });
        }

        this.btnZoomRange = document.getElementById(btnZoomRange);
        if (this.btnZoomRange) {
            this.btnZoomRange.addEventListener('input', () => {
                let scale = this.btnZoomRange.value / 100;
                this.setViewMode(scale);
            });
        }

        this.btnZoomPrev = document.getElementById(btnZoomPrev);
        if (this.btnZoomPrev) {
            this.btnZoomPrev.addEventListener('click', () => {
                this.btnZoomRange?.stepDown(25);
                let scale = this.btnZoomRange.value / 100;
                this.setViewMode(scale);
            });
        }

        this.btnZoomNext = document.getElementById(btnZoomNext);
        if (this.btnZoomNext) {
            this.btnZoomNext.addEventListener('click', () => {
                this.btnZoomRange?.stepUp(25);
                let scale = this.btnZoomRange.value / 100;
                this.setViewMode(scale);
            });
        }

        this.btnViewMode = document.querySelectorAll('.' + btnViewMode);
        if (this.btnViewMode) {
            this.btnViewMode.forEach(btn => {
                btn.addEventListener('click', () => {
                    let mode = btn.getAttribute('data-mode');
                    this.setViewMode(mode);
                });
            });
        }


        const rotates = [ 'rotate_r270', 'rotate_r180', 'rotate_r90', null, 'rotate_90', 'rotate_180', 'rotate_270' ];
        let currRotate = 3;
        this.btnRotatePrev = document.querySelectorAll('.' + btnRotatePrev);
        if (this.btnRotatePrev) {
            this.btnRotatePrev.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.mainBox.classList.remove(rotates[currRotate]);
                    currRotate--;
                    if (currRotate < 0) {
                        currRotate = rotates.length;
                    }
                    if (rotates[currRotate]) {
                        this.mainBox.classList.add(rotates[currRotate]);
                    }
                });
            });
        }
        this.btnRotateNext = document.querySelectorAll('.' + btnRotateNext);
        if (this.btnRotateNext) {
            this.btnRotateNext.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.mainBox.classList.remove(rotates[currRotate]);
                    currRotate++;
                    if (currRotate > rotates.length) {
                        currRotate = 0;
                    }
                    if (rotates[currRotate]) {
                        this.mainBox.classList.add(rotates[currRotate]);
                    }
                });
            });
        }

        PDFEvent.on(Events.SET_SCALE, e => {
            let scale = e.data;
            let isNewOption = true;
            const options = this.btnSelectZoom.options;
            for (let i = 0; i < options.length; i++) {
                let option = options[i];
                if (option.value == scale) {
                    this.btnSelectZoom.value = scale;
                    isNewOption = false;
                    break;
                }
            }
            if (isNewOption) {
                let option = null;
                if (options[0].getAttribute('custom')) {
                    option = options[0];
                } else {
                    option = document.createElement('option');
                    option.setAttribute('custom', '1');
                    this.btnSelectZoom.add(option, options[0]);
                }
                option.value = scale;
                option.text = parseInt(scale * 100) + '%';
                // this.btnSelectZoom.options[0].setAttribute('selected', 'selected');
                this.btnSelectZoom.selectedIndex = 0;
            }
            this.btnZoomRange.value = scale * 100;
        });
        //End

        
        //缩略图边栏收缩
        this.btnThumbsSlider = document.getElementById(btnThumbsSlider);
        this.btnThumbsClose = document.getElementById(btnThumbsClose);
        this.elThumbsWrapper = document.getElementById(thumbsWrapper);
        if (this.options.expandThumbs) {
            this.btnThumbsSlider.classList.add('active');
            this.elThumbsWrapper?.classList.add('show');
            this.elThumbsWrapper.style.display = 'flex';
            // setTimeout(() => {
            //     this.zoom(this.scale, this.renderType, true);
            // }, 200);
        }
        const toggleThumbs = () => {
            if (this.btnThumbsSlider.classList.contains('active')) {
                this.btnThumbsSlider.classList.remove('active');
            } else {
                this.btnThumbsSlider.classList.add('active');
            }
            elSliderToggle(this.elThumbsWrapper, 'show', 'flex');
            // setTimeout(() => {
            //     console.log('force');
            //     this.zoom(this.scale, this.renderType, true);
            // }, 200);
        }
        if (this.btnThumbsSlider) {
            this.btnThumbsSlider.addEventListener('click', toggleThumbs);
        }
        if (this.btnThumbsClose) {
            this.btnThumbsClose.addEventListener('click', toggleThumbs);
        }
    }
}