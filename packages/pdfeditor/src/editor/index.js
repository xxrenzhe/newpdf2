import { Events, PDFEvent } from '../event';
import { elSliderHide, elSliderShow, elSliderToggle, mergeDeep } from '../misc';
import * as PDFLib from 'pdf-lib';
import regeneratorRuntime from '@babel/runtime/regenerator';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from './document';
import { Font } from '../font';
import { saveAs } from 'file-saver';
import { Toolbar } from './toolbar';
import { History } from './history';
import { Locale } from '../locale';

if (!globalThis.regeneratorRuntime) {
    globalThis.regeneratorRuntime = regeneratorRuntime;
}

const DISABLED_CLASS = 'disabled';
const DRAW_ICON_COLOR_CLASS = 'draw_icon_color';
const HISTORY_PAGE_CLASS = 'history-page';
const HISTORY_BOX_CLASS = 'history-box';
const HISTORY_PAGE_TITLE_CLASS = 'history-page-title';
const HISTORY_LIST_CLASS = 'history-list';
const HISTORY_BTN_CLASS = 'history-remove-btn';
const btnHistorySlider = 'history_slider';
const historyWrapper = 'history_wrapper';
const btnFormsSlider = 'forms_slider';
const formsWrapper = 'forms_wrapper';

const TAB_ITEM_CLASS = 'tab-item';
const TOOLS_BOX_CLASS = 'tools-box';

const btnUndo = 'tool_undo';
const btnRedo = 'tool_redo';
const btnMouse = 'tool_mouse';
const btnHand = 'tool_hand';
const btnAddImage = 'tool_image';
const pdfElActionsWrapper = 'pdf-el-actions-wrapper';
const pdfElActions = 'pdf-el-actions';
const btnHighlight = 'tool_highlight';
const btnEraser = 'tool_eraser';
const btnDraw = 'tool_draw';
const btnText = 'tool_text';
const btnTextBox = 'tool_textbox';
const btnShapes = 'tool_shapes';
const btnFindText = 'tool_find_text';
const btnHighlightText = 'tool_text_highlight';
const btnUnderline = 'tool_underline';
const btnStrikethrough = 'tool_strikethrough';
const btnSignature = 'tool_signature';
const btnInsertPages = 'tool_insert_pages';
const btnDeletePages = 'tool_delete_pages';
const btnWatermark = 'tool_watermark';
const btnHeaderFooter = 'tool_header_footer';
const btnPageNumber = 'tool_page_number';
const btnForms = 'tool_forms';
const btnTextArt = 'tool_textArt';
const btnSeal = 'tool_seal';

const DOWNLOAD_RETRY_DELAY_MS = 500;
const DOWNLOAD_FONT_WAIT_MS = 10000;


export class PDFEditor {
    options = {
        tools: ['pages', 'mouse', 'text', 'image', 'eraser', 'radact', 'highlight', 'line', 'download', 'text_highlight', 'history','textArt'],
        toolbar: null,
        producer: null,
        creator: null,
        debug: false,
        history: false
    };
    reader = null;
    toolbar = null;
    pdfDocument = null;
    pdfData = null;
    PDFLib = null;
    history = null;
    fontWorker = new Worker(new URL('./font_worker.js', import.meta.url));
    fontWarningBanner = null;
    actionsBarReady = false;
    actionsBarInitAttempts = 0;
    downloadActive = false;
    downloadInProgress = false;
    downloadWaitTimer = null;
    downloadWaitStartedAt = 0;

    constructor(options, pdfData, reader) {
        if (typeof(options) == 'object') {
            this.options = mergeDeep(this.options, options);
        }
        this.pdfData = pdfData;
        this.reader = reader;
        this.PDFLib = PDFLib;
        Font.fontkit = fontkit;
        if (this.options.history) {
            this.history = new History(this);
        }

        PDFEvent.on(Events.CONVERT_TO_ELEMENT, (e, sendResponse) => {
            if (!this.toolbar) return;
            if (!this.pdfDocument) return;
            const textTool = this.toolbar.get('text');
            if (!textTool) return;

            // When user clicks original PDF text, switch to Text mode automatically.
            if (!this.toolbar.toolActive || this.toolbar.toolActive.name !== 'text') {
                this.toolbar.setActive(textTool);
                textTool.setActive(true);
            }
            const page = this.pdfDocument.getPage(e.data.pageNum);
            if (!page) return;
            e.data.options.oriText = e.data.attrs.text;
            const element = page.elements.add(
                e.data.type,
                e.data.attrs,
                e.data.options
            );
            textTool.setActions(element);
            sendResponse(true);
            
            const elFontList = element?.elActions ? element.elActions.querySelector('.font-dropdown') : null;
            if (elFontList) {
                const elOption = document.createElement('div');
                elOption.classList.add('font-item');
                elOption.textContent = element.attrs.showName;
                elOption.fontFamily = element.attrs.fontFamily;
                elOption.fontFile = element.attrs.fontFile;
                elOption.selected = true;
                elFontList.insertBefore(elOption, elFontList.firstElementChild);
            }

            const elSpan = document.querySelector('#history_slider span');
            if (elSpan) {
                elSpan.textContent = document.querySelectorAll('#pdf-main .__pdf_editor_element').length;
            }
        });

        let timeout = null;
        PDFEvent.on(Events.PAGE_RENDERED, e => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                let pageNum = e.data.pageNum;
                let scale = e.data.scale;
                this.pdfDocument.getPage(pageNum).zoom(scale);
            }, 1);
        });

        PDFEvent.on(Events.PAGE_ADD, e => {
            this.pdfDocument.addPage(e.data.pageNum);
        });

        PDFEvent.on(Events.PAGE_REMOVE, e => {
            this.pdfDocument.removePage(e.data.pageNum);
        });

        PDFEvent.on(Events.READER_INIT, () => {
            this.initToolbar();
            // Match common PDF editor UX: default to selection tool, not edit mode.
            this.toolbar.get('mouse').click();
            PDFEvent.dispatch(Events.TOOLBAR_INIT);
        });

        PDFEvent.on(Events.FONT_WARNING, e => {
            this.#showFontWarningBanner(e.data?.message);
        });

        PDFEvent.on(Events.SAVE, () => {
            Promise.resolve(this.pdfDocument.fixFontData()).catch(err => {
                console.log(err);
                PDFEvent.dispatch(Events.ERROR, err);
            });
        });

        PDFEvent.on(Events.DOWNLOAD, () => {
            if (!this.downloadActive || this.downloadInProgress) return;

            //检查字体是否加载完成
            let fontsReady = this.pdfDocument.checkFonts();
            if (!fontsReady) {
                if (!this.downloadWaitStartedAt) {
                    this.downloadWaitStartedAt = Date.now();
                }
                const elapsed = Date.now() - this.downloadWaitStartedAt;
                if (elapsed >= DOWNLOAD_FONT_WAIT_MS) {
                    this.pdfDocument.ensureFallbackFonts();
                    fontsReady = this.pdfDocument.checkFonts();
                }
                if (!fontsReady) {
                    this.#scheduleDownloadRetry();
                    return;
                }
            }

            this.downloadInProgress = true;
            this.pdfDocument
                .save(true)
                .then(async blob => {
                    // if (this.options.debug) {
                    //     // window.open(URL.createObjectURL(blob));
                    //     location = URL.createObjectURL(blob);
                    // } else {
                    //     saveAs(blob, 'edited.pdf');
                    // }

                    parent.postMessage({ type: 'pdf-download', blob }, '*');
                    await this.reset();
                })
                .catch(err => {
                    console.log(err);
                    PDFEvent.dispatch(Events.ERROR, err);
                })
                .finally(() => {
                    this.downloadInProgress = false;
                    this.#resetDownloadState();
                    PDFEvent.dispatch(Events.DOWNLOAD_AFTER);
                });
        });

        this.fontWorker.addEventListener('message', e => {
            let data = e.data;
            if (data.type == 'font_subset_after') {
                this.pdfDocument.setFont(data.pageId, data.fontFile, data.newBuffer);
                PDFEvent.dispatch(Events.DOWNLOAD);
            }
            if (data.type == 'font_subset_error') {
                console.warn('font_subset failed, falling back to Helvetica:', data.message);
                this.pdfDocument.setFont(data.pageId, data.fontFile, null);
                PDFEvent.dispatch(Events.DOWNLOAD);
            }
        });

        PDFEvent.on(Events.ERROR, () => {
            this.#resetDownloadState();
        });

        window.addEventListener('mousedown', e => {
            const target = e.target;
            if (!target || typeof target.getAttribute !== 'function') {
                return;
            }
            const parent = target.parentElement;
            if (target.getAttribute('role') == 'presentation' 
                || target.getAttribute('contenteditable')
                || parent?.getAttribute('contenteditable')) {
                return;
            }
            const page = this.pdfDocument?.getPageActive?.();
            if (page && page.elements.activeId) {
                const element = page.elements.get(page.elements.activeId);
                if (element?.el?.classList?.contains('active')) {
                    element.el.classList.remove('active');
                    PDFEvent.dispatch(Events.ELEMENT_BLUR, {
                        page,
                        element: page.elements.get(page.elements.activeId)
                    });
                }
                page.elements.activeId = null;
            }
        }, true);
    }

    async init() {
        this.pdfDocument = new PDFDocument(this);
        return true;
    }

    async initToolbar() {
        if (this.options.toolbar && !this.toolbar) {
            this.toolbar = new Toolbar(this, {
                box: this.options.toolbar,
                items: this.options.tools
            });
            this.#UIEvents();
        }
        return true;
    }

    /**
     * 
     * @param {Base64String | Uint8Array | ArrayBuffer} data
     */
    async load(pdfData) {
        this.reset();
        this.pdfData = pdfData;
        return this.init();
    }

    async setDocumentProxy(pdfData) {
        this.pdfDocument.documentProxy = await PDFLib.PDFDocument.load(pdfData || this.pdfData, {
            ignoreEncryption: true
        });
        this.pdfDocument.documentProxy.registerFontkit(Font.fontkit);
        this.pdfDocument.documentProxy.setProducer(this.options.producer);
        this.pdfDocument.documentProxy.setCreator(this.options.creator);
        return true;
    }

    async flushData() {
        let isUpdateStream = false;
        let chars = {};
        for (let page of this.reader.pdfDocument.pages) {
            for (let i = 0; i < page.clearTexts.length; i++) {
                if (!chars[page.index]) {
                    chars[page.index] = [];
                }
                chars[page.index].push(page.clearTexts[i]);
                isUpdateStream = true;
            }
        }

        const fallbackToReaderData = () =>
            this.reader.getData().then(int8Array => this.setDocumentProxy(int8Array));

        if (!isUpdateStream) {
            return fallbackToReaderData();
        }

        const handler = this.reader?.pdfDocument?.documentProxy?._transport?.messageHandler;
        if (!handler?.sendWithPromise) {
            return fallbackToReaderData();
        }

        const ASSEMBLE_TIMEOUT_MS = 4000;
        const assembleSafe = handler
            .sendWithPromise('AssemblePDF', {
                outType: 'Uint8Array',
                chars: chars
            })
            .then(stream => ({ ok: true, stream }))
            .catch(error => ({ ok: false, error }));

        let timeoutId = null;
        const timeoutSafe = new Promise(resolve => {
            timeoutId = setTimeout(() => resolve({ ok: false, timeout: true }), ASSEMBLE_TIMEOUT_MS);
        });

        const result = await Promise.race([assembleSafe, timeoutSafe]).finally(() => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        });

        if (result?.ok) {
            return this.setDocumentProxy(result.stream);
        }

        console.warn('AssemblePDF unavailable, falling back to reader data.', result?.error || result?.timeout);
        return fallbackToReaderData();
    }

    async reset() {
        if (this.pdfDocument) {
            this.pdfDocument.embedFonts = {};
        }
        this.history?.clear();
        if (this.elHistoryWrapper) {
            const historyBox = this.elHistoryWrapper.querySelector('.' + HISTORY_BOX_CLASS);
            if (historyBox) {
                historyBox.innerHTML = '';
            }
        }
        if (this.elHistoryBtn) {
            this.elHistoryBtn.style.display = 'none';
        }
        // this.reader.pdfjsLib.getDocument(this.pdfData).promise.then(documentProxy => {
        //     this.reader.pdfDocument.documentProxy = documentProxy;
        // })
        // const documentProxy = await this.reader.pdfjsLib.getDocument(this.pdfData).promise;
        // this.reader.pdfDocument.documentProxy = documentProxy;
    }

    async download(fileName) {
        try {
            if (this.downloadActive) return;
            this.downloadActive = true;
            this.downloadWaitStartedAt = Date.now();
            if (this.downloadWaitTimer) {
                clearTimeout(this.downloadWaitTimer);
                this.downloadWaitTimer = null;
            }
            await this.flushData();
            PDFEvent.dispatch(Events.SAVE);
            // this.pdfDocument.save(true).then(async blob => {
            //     if (this.options.debug) {
            //         window.open(URL.createObjectURL(blob));
            //     } else {
            //         saveAs(blob, fileName);
            //     }
            //     this.reset();
            // });
        } catch (e) {
            console.log(e);
            this.#resetDownloadState();
            PDFEvent.dispatch(Events.ERROR, e);
        }
    }

    #scheduleDownloadRetry() {
        if (this.downloadWaitTimer) return;
        this.downloadWaitTimer = setTimeout(() => {
            this.downloadWaitTimer = null;
            PDFEvent.dispatch(Events.DOWNLOAD);
        }, DOWNLOAD_RETRY_DELAY_MS);
    }

    #resetDownloadState() {
        this.downloadActive = false;
        this.downloadInProgress = false;
        this.downloadWaitStartedAt = 0;
        if (this.downloadWaitTimer) {
            clearTimeout(this.downloadWaitTimer);
            this.downloadWaitTimer = null;
        }
    }

    #UIEvents() {
        PDFEvent.on(Events.TOOLBAR_ITEM_OPTION_CLICK, e => {
            const tool = e.data.tool;
            if (tool.name == 'line') {
                document.querySelectorAll('.' + DRAW_ICON_COLOR_CLASS).forEach(el => {
                    el.setAttribute('fill', tool.attrs.color);
                });
            }
        })

        this.btnMouse = document.getElementById(btnMouse);
        if (this.btnMouse && this.options.tools.indexOf('mouse') >= 0) {
            this.btnMouse.addEventListener('click', () => {
                this.toolbar.get('mouse').click();
            });
        }

        
        //手形工具
        this.btnHand = document.getElementById(btnHand);
        if (this.btnHand && this.options.tools.indexOf('hand') >= 0) {
            this.btnHand.addEventListener('click', () => {
                this.toolbar.get('hand').click();
            });
        }


        //添加图片
        this.btnAddImage = document.getElementById(btnAddImage);
        if (this.btnAddImage && this.options.tools.indexOf('image') >= 0) {
            this.btnAddImage.addEventListener('click', () => {
                this.toolbar.get('image').click();
            });
        }
        

        //绘制高亮
        this.btnHighlight = document.getElementById(btnHighlight);
        if (this.btnHighlight && this.options.tools.indexOf('highlight') >= 0) {
            this.btnHighlight.addEventListener('click', () => {
                this.toolbar.get('highlight').click();
            });
        }

        this.btnEraser = document.getElementById(btnEraser);
        if (this.btnEraser && this.options.tools.indexOf('eraser') >= 0) {
            this.btnEraser.addEventListener('click', () => {
                this.toolbar.get('eraser').click();
            });
        }

        this.btnDraw = document.getElementById(btnDraw);
        if (this.btnDraw && this.options.tools.indexOf('line') >= 0) {
            this.btnDraw.addEventListener('click', () => {
                this.toolbar.get('line').click();
            });
        }


        this.btnText = document.getElementById(btnText);
        if (this.btnText && this.options.tools.indexOf('text') >= 0) {
            this.btnText.addEventListener('click', () => {
                this.toolbar.get('text').click();
            });
        }


        this.btnTextBox = document.getElementById(btnTextBox);
        if (this.btnTextBox && this.options.tools.indexOf('textbox') >= 0) {
            this.btnTextBox.addEventListener('click', () => {
                this.toolbar.get('textbox').click();
            });
        }


        this.btnShapes = document.getElementById(btnShapes);
        if (this.btnShapes && this.options.tools.indexOf('shapes') >= 0) {
            this.btnShapes.addEventListener('click', () => {
                this.toolbar.get('shapes').click();
            });
        }


        this.btnFindText = document.getElementById(btnFindText);
        if (this.btnFindText && this.options.tools.indexOf('find') >= 0) {
            this.btnFindText.addEventListener('click', () => {
                this.toolbar.get('find').click();
            });
        }


        this.btnHighlightText = document.getElementById(btnHighlightText);
        if (this.btnHighlightText && this.options.tools.indexOf('text_highlight') >= 0) {
            this.btnHighlightText.addEventListener('click', () => {
                this.toolbar.get('text_highlight').click();
            });
        }


        this.btnUnderline = document.getElementById(btnUnderline);
        if (this.btnUnderline && this.options.tools.indexOf('underline') >= 0) {
            this.btnUnderline.addEventListener('click', () => {
                this.toolbar.get('underline').click();
            });
        }
        

        this.btnStrikethrough = document.getElementById(btnStrikethrough);
        if (this.btnStrikethrough && this.options.tools.indexOf('strikethrough') >= 0) {
            this.btnStrikethrough.addEventListener('click', () => {
                this.toolbar.get('strikethrough').click();
            });
        }


        this.btnSignature = document.getElementById(btnSignature);
        if (this.btnSignature && this.options.tools.indexOf('signature') >= 0) {
            this.btnSignature.addEventListener('click', () => {
                this.toolbar.get('signature').click();
            });
        }


        this.btnInsertPages = document.getElementById(btnInsertPages);
        if (this.btnInsertPages && this.options.tools.indexOf('insert_pages') >= 0) {
            this.btnInsertPages.addEventListener('click', () => {
                this.toolbar.get('insert_pages').click();
            });
        }

        this.btnDeletePages = document.getElementById(btnDeletePages);
        if (this.btnDeletePages && this.options.tools.indexOf('delete_pages') >= 0) {
            this.btnDeletePages.addEventListener('click', () => {
                this.toolbar.get('delete_pages').click();
            });
        }


        this.btnWatermark = document.getElementById(btnWatermark);
        if (this.btnWatermark && this.options.tools.indexOf('watermark') >= 0) {
            this.btnWatermark.addEventListener('click', () => {
                this.toolbar.get('watermark').click();
            });
        }


        this.btnHeaderFooter = document.getElementById(btnHeaderFooter);
        if (this.btnHeaderFooter && this.options.tools.indexOf('header_footer') >= 0) {
            this.btnHeaderFooter.addEventListener('click', () => {
                this.toolbar.get('header_footer').click();
            });
        }


        this.btnPageNumber = document.getElementById(btnPageNumber);
        if (this.btnPageNumber && this.options.tools.indexOf('page_number') >= 0) {
            this.btnPageNumber.addEventListener('click', () => {
                this.toolbar.get('page_number').click();
            });
        }

        this.btnForms = document.getElementById(btnForms);
        if (this.btnForms && this.options.tools.indexOf('forms') >= 0) {
            this.btnForms.addEventListener('click', () => {
                this.toolbar.get('forms').click();
            });
        }

        this.btnTextArt = document.getElementById(btnTextArt);
        if (this.btnTextArt && this.options.tools.indexOf('textArt') >= 0) {
            this.btnTextArt.addEventListener('click', () => {
                this.toolbar.get('textArt').click();
            });
        }

        this.btnSeal = document.getElementById(btnSeal);
        if (this.btnSeal && this.options.tools.indexOf('stamp') >= 0) {
            this.btnSeal.addEventListener('click', () => {
                this.toolbar.get('stamp').click();
            });
        }

        // More dropdown menu (pdf.net style)
        this.btnMore = document.getElementById('tool_more');
        this.moreDropdown = document.getElementById('more_dropdown');
        if (this.btnMore && this.moreDropdown) {
            // Toggle dropdown on click
            this.btnMore.addEventListener('click', (e) => {
                e.stopPropagation();
                const toolMore = this.btnMore.closest('.tool_more');
                toolMore.classList.toggle('open');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                const toolMore = this.btnMore.closest('.tool_more');
                if (!toolMore.contains(e.target)) {
                    toolMore.classList.remove('open');
                }
            });

            // Handle dropdown item clicks
            this.moreDropdown.querySelectorAll('.more-dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tool = item.getAttribute('data-tool');
                    const toolMore = this.btnMore.closest('.tool_more');
                    toolMore.classList.remove('open');

	                    // Trigger the corresponding tool
	                    if (tool === 'convert') {
	                        parent.postMessage({ type: 'open-tool', tool: 'convert' }, '*');
	                    } else if (tool === 'compress') {
	                        parent.postMessage({ type: 'open-tool', tool: 'compress' }, '*');
	                    } else if (tool === 'merge') {
	                        parent.postMessage({ type: 'open-tool', tool: 'merge' }, '*');
	                    } else if (tool === 'redact') {
	                        parent.postMessage({ type: 'open-tool', tool: 'redact' }, '*');
	                    } else if (tool === 'watermark' && this.options.tools.indexOf('watermark') >= 0) {
	                        this.toolbar.get('watermark').click();
                    } else if (tool === 'page_number' && this.options.tools.indexOf('page_number') >= 0) {
                        this.toolbar.get('page_number').click();
                    } else if (tool === 'header_footer' && this.options.tools.indexOf('header_footer') >= 0) {
                        this.toolbar.get('header_footer').click();
	                    } else if (tool === 'seal' && this.options.tools.indexOf('stamp') >= 0) {
                        this.toolbar.get('stamp').click();
                    } else if (tool === 'textArt' && this.options.tools.indexOf('textArt') >= 0) {
                        this.toolbar.get('textArt').click();
                    }
                });
            });
        }


        //顶部工具栏设置
        this.#initActionsBar();



        //操作历史记录
        this.btnUndo = document.getElementById(btnUndo);
        if (this.btnUndo) {
            this.btnUndo.addEventListener('click', () => {
                if (!this.btnUndo.classList.contains(DISABLED_CLASS)) {
                    this.history.undo();
                }
            });
        }

        this.btnRedo = document.getElementById(btnRedo);
        if (this.btnRedo) {
            this.btnRedo.addEventListener('click', () => {
                if (!this.btnRedo.classList.contains(DISABLED_CLASS)) {
                    this.history.redo();
                }
            });
        }

        PDFEvent.on(Events.HISTORY_CHANGE, e => {
            const { step, maxStep } = e.data;
            if (!this.btnUndo || !this.btnRedo) {
                return;
            }
            if (step < 1) {
                this.btnUndo.classList.add(DISABLED_CLASS);
            } else {
                this.btnUndo.classList.remove(DISABLED_CLASS);
            }
            if (step >= maxStep) {
                this.btnRedo.classList.add(DISABLED_CLASS);
            } else {
                this.btnRedo.classList.remove(DISABLED_CLASS);
            }
        });

        PDFEvent.on(Events.HISTORY_REMOVE, e => {
            document.querySelector('[data-id="'+ e.data.element.id +'"]')?.remove();
        });
        
        
        this.btnHistorySlider = document.getElementById(btnHistorySlider);
        this.elHistoryWrapper = document.getElementById(historyWrapper);
        const toggleHistory = () => {
            if (!this.btnHistorySlider || !this.elHistoryWrapper) {
                return;
            }
            if (this.btnFormsSlider?.classList.contains('active')) {
                this.btnFormsSlider.click();
            }
            
            if (this.btnHistorySlider.classList.contains('active')) {
                this.btnHistorySlider.classList.remove('active');
            } else {
                this.btnHistorySlider.classList.add('active');
            }
            elSliderToggle(this.elHistoryWrapper, 'show', 'flex');
        }
        if (this.btnHistorySlider && this.elHistoryWrapper) {
            this.btnHistorySlider.addEventListener('click', toggleHistory);
        }


        const tempHistoryItem = '<div class="history-item">' +
                        '<div class="history-item-icon">' +
                            '<svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path d="M100.992 64h822.016v277.44h-36.352S817.28 172.032 735.424 157.248c-81.856-14.784-138.752-4.608-138.752-4.608l-1.024 707.328s22.72 47.808 60.224 51.2h83.008V960H285.184l1.152-50.048 72.704-1.152s54.592-17.088 54.592-56.896c0-39.744 1.152-693.568 1.152-693.568s-89.792-12.416-136.448-1.024c-46.592 11.328-128.512 79.552-140.992 179.584l-36.352 1.152V64z" fill="#333333"></path></svg>' +
                        '</div>' +
                        '<div class="history-item-text"></div>' +
                        '<div class="history-item-icon history-item-btn edit">' +
                            '<img src="'+ ASSETS_URL +'img/edit_side.svg">' +
                        '</div>' +
                        '<div class="history-item-icon history-item-btn remove">' +
                            '<img width="15" height="15" src="'+ ASSETS_URL +'img/delete.svg">' +
                        '</div>' +
                    '</div>';
        const historyIcons = {
            text: '<svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path d="M100.992 64h822.016v277.44h-36.352S817.28 172.032 735.424 157.248c-81.856-14.784-138.752-4.608-138.752-4.608l-1.024 707.328s22.72 47.808 60.224 51.2h83.008V960H285.184l1.152-50.048 72.704-1.152s54.592-17.088 54.592-56.896c0-39.744 1.152-693.568 1.152-693.568s-89.792-12.416-136.448-1.024c-46.592 11.328-128.512 79.552-140.992 179.584l-36.352 1.152V64z" fill="#333333"></path></svg>',
            image: '<img src="'+ ASSETS_URL +'img/addimages.svg">',
            highlight: '<img src="'+ ASSETS_URL +'img/HighlightArea.svg">',
            eraser: '<img src="'+ ASSETS_URL +'img/eraser.svg">',
            rect: '<img src="'+ ASSETS_URL +'img/shapes.svg">',
            circle: '<img src="'+ ASSETS_URL +'img/shapes.svg">',
            line: '<img src="'+ ASSETS_URL +'img/draw.svg">',
            ellipse: '<img src="'+ ASSETS_URL +'img/oval.svg">',
            arrow: '<img src="'+ ASSETS_URL +'img/arrow.svg">',
            signature: '<img src="'+ ASSETS_URL +'img/signature.svg">',
            textbox: '<img src="'+ ASSETS_URL +'img/textbox.svg">',
            forms: '<img src="'+ ASSETS_URL +'img/forms.svg">'
        };
        

        this.elHistoryBtn = this.elHistoryWrapper?.querySelector('.' + HISTORY_BTN_CLASS);
        if (this.elHistoryBtn && this.elHistoryWrapper) {
            this.elHistoryBtn.addEventListener('click', e => {
                let elPageBox = this.elHistoryWrapper.querySelectorAll('.'+ HISTORY_PAGE_CLASS);
                elPageBox.forEach(elPage => {
                    const page = this.pdfDocument.getPageForId(elPage.getAttribute('data-pageid'));
                    page.elements.removeAll();
                    elPage.querySelectorAll('.history-item').forEach(elItem => {
                        elItem.remove();
                    });
                });
            });
        }


        this.btnFormsSlider = document.getElementById(btnFormsSlider);
        this.elFormsWrapper = document.getElementById(formsWrapper);
        const toggleForms = () => {
            if (!this.btnFormsSlider || !this.elFormsWrapper) {
                return;
            }
            if (this.btnHistorySlider?.classList.contains('active')) {
                this.btnHistorySlider.click();
            }

            if (this.btnFormsSlider.classList.contains('active')) {
                this.btnFormsSlider.classList.remove('active');
            } else {
                this.btnFormsSlider.classList.add('active');
                this.toolbar.get('forms')?.click();
            }
            elSliderToggle(this.elFormsWrapper, 'show', 'flex');
        }
        if (this.btnFormsSlider && this.elFormsWrapper) {
            this.btnFormsSlider.addEventListener('click', toggleForms);
        }

        const scheduleThumbRefresh = (page, opts = {}) => {
            const readerPage = page?.readerPage;
            if (!readerPage || typeof readerPage.scheduleThumbRefresh !== 'function') {
                return;
            }
            readerPage.scheduleThumbRefresh(opts);
        };

        
        PDFEvent.on(Events.ELEMENT_CREATE, e => {
            if (!this.elHistoryWrapper || !this.elHistoryBtn) {
                return;
            }
            this.elHistoryBtn.style.display = 'block';
            const element = e.data.element;
            const page = e.data.page;
            let elHistoryBox = this.elHistoryWrapper.querySelector('.' + HISTORY_BOX_CLASS);
            let elHistoryPage = this.elHistoryWrapper.querySelector('.'+ HISTORY_PAGE_CLASS +'[data-pageid="'+ page.id +'"]');
            if (!elHistoryPage) {
                elHistoryPage = document.createElement('div');
                elHistoryPage.classList.add(HISTORY_PAGE_CLASS);
                elHistoryPage.setAttribute('data-pageid', page.id);

                let elPageTitle = document.createElement('div');
                elPageTitle.classList.add(HISTORY_PAGE_TITLE_CLASS);
                elPageTitle.textContent = Locale.get('page', { num: page.pageNum });
                elHistoryPage.appendChild(elPageTitle);

                let elList = document.createElement('div');
                elList.classList.add(HISTORY_LIST_CLASS);
                elHistoryPage.appendChild(elList);
                elHistoryBox.appendChild(elHistoryPage);
            }
            
            let elTemp = document.createElement('div');
            elTemp.innerHTML = tempHistoryItem;
            let elItem = elTemp.firstElementChild;
            let elIcon = historyIcons[this.toolbar.toolActive.name];
            elItem.setAttribute('data-id', element.id);
            elTemp.querySelector('.history-item-icon').innerHTML = elIcon;
            if (['text'].indexOf(this.toolbar.toolActive.name) == -1) {
                elTemp.querySelector('.history-item-text').textContent = Locale.get(this.toolbar.toolActive.name);
            }
            if (this.toolbar.toolActive.name != 'text') {
                elTemp.querySelector('.history-item-btn.edit').remove();
            }
            elHistoryPage.querySelector('.' + HISTORY_LIST_CLASS).appendChild(elItem);
            elItem.querySelector('.remove').addEventListener('click', e => {
                elItem.remove();
                page.elements.remove(element.id);
            });
            
            if (element.dataType == 'text') {
                let elText = elItem.querySelector('.history-item-text');
                let elTextInput = document.createElement('input');
                elTextInput.setAttribute('type', 'text');
                elTextInput.addEventListener('blur', () => {
                    elText.textContent = elTextInput.value;
                    element.attrs.text = elTextInput.value;
                    element.elText.textContent = elTextInput.value;
                });

                elItem.querySelector('.edit')?.addEventListener('click', e => {
                    let text = elText.textContent;
                    elText.textContent = '';
                    elTextInput.style.fontFamily = elItem.style.fontFamily;
                    elTextInput.value = text;
                    elText.appendChild(elTextInput);
                    elTextInput.focus();
                });

                element.elHistory = elItem;

                elItem.querySelector('.history-item-text').textContent = element.attrs.text;
                elItem.style.fontFamily = element.attrs.fontFamily;
                elTextInput.style.fontFamily = element.attrs.fontFamily;
            }

            scheduleThumbRefresh(page, { refreshImage: false });
        });

        PDFEvent.on(Events.ELEMENT_UPDATE_AFTER, e => {
            const element = e.data?.element;
            if (!element) return;
            if (element.dataType == 'text' && element.elHistory) {
                element.elHistory.style.fontFamily = element.attrs?.fontFamily;
                const elHistoryText = element.elHistory.querySelector('.history-item-text');
                if (elHistoryText) {
                    elHistoryText.textContent = element.attrs?.text ?? '';
                }
            }
            scheduleThumbRefresh(e.data.page, { refreshImage: false });
        });

        PDFEvent.on(Events.ELEMENT_ACTIVE, e => {
            const element = e.data?.element;
            if (!element?.el) return;
            const currentZ = Number.parseInt(element.el.style.zIndex || '0', 10);
            const nextZ = Number.isFinite(currentZ) ? currentZ + 1 : 1;
            element.el.style.zIndex = String(nextZ);
            // console.log(e);
        });

        PDFEvent.on(Events.ELEMENT_REMOVE, e => {
            const element = e.data.element;
            const page = e.data.page;
            if (this.elHistoryWrapper) {
                let elHistoryPage = this.elHistoryWrapper.querySelector('.'+ HISTORY_PAGE_CLASS +'[data-pageid="'+ page.id +'"]');
                elHistoryPage?.querySelector('[data-id="'+ element.id +'"]')?.remove();
            }
            // this.hideElActions();
            scheduleThumbRefresh(page, { refreshImage: false });
        });

        PDFEvent.on(Events.ELEMENT_BLUR, e => {
            const element = e.data?.element;
            if (!element?.el) return;
            element.el.classList.remove('active');
            const currentZ = Number.parseInt(element.el.style.zIndex || '1', 10);
            const nextZ = Number.isFinite(currentZ) ? currentZ - 1 : 1;
            element.el.style.zIndex = String(Math.max(1, nextZ));
            if (element.elHistory && element.dataType == 'text') {
                const elText = element.elHistory.querySelector('.history-item-text');
                if (elText) {
                    elText.textContent = element.attrs?.text ?? '';
                }
            }
            scheduleThumbRefresh(e.data.page, { refreshImage: false });
        });

        PDFEvent.on(Events.ELEMENT_MOVE, e => {
            scheduleThumbRefresh(e.data.page, { refreshImage: false, delay: 140 });
        });

        PDFEvent.on(Events.ELEMENT_RESIZE_END, e => {
            scheduleThumbRefresh(e.data.page, { refreshImage: false });
        });

        PDFEvent.on(Events.HISTORY_PUSH, () => {
            const page = this.pdfDocument?.getPageActive();
            if (page) {
                scheduleThumbRefresh(page, { refreshImage: false, delay: 260 });
            }
        });

        // Tab switching logic removed - unified toolbar now used
    }

    #showFontWarningBanner(message) {
        if (this.fontWarningBanner) return;
        const container = document.querySelector('.pdf-main');
        if (!container) return;
        const banner = document.createElement('div');
        banner.classList.add('font-compliance-banner');
        const text = document.createElement('span');
        text.classList.add('font-compliance-text');
        text.textContent = message || '';
        const close = document.createElement('button');
        close.classList.add('font-compliance-close');
        close.setAttribute('type', 'button');
        close.textContent = 'x';
        close.addEventListener('click', () => {
            banner.remove();
            this.fontWarningBanner = null;
        });
        banner.appendChild(text);
        banner.appendChild(close);

        const header = container.querySelector('.pdf-header');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(banner, header.nextSibling);
        } else {
            container.prepend(banner);
        }
        this.fontWarningBanner = banner;
    }

    #retryInitActionsBar() {
        if (this.actionsBarReady) return;
        if (this.actionsBarInitAttempts >= 10) return;
        this.actionsBarInitAttempts += 1;
        setTimeout(() => this.#initActionsBar(), 50);
    }

    #initActionsBar() {
        if (this.actionsBarReady) return;
        this.pdfElActionsWrapper = document.getElementById(pdfElActionsWrapper);
        if (!this.pdfElActionsWrapper) {
            this.#retryInitActionsBar();
            return;
        }
        this.pdfElActions = this.pdfElActionsWrapper.querySelector('#' + pdfElActions);
        if (!this.pdfElActions) {
            this.#retryInitActionsBar();
            return;
        }
        this.actionsBarReady = true;

        const updateActionsWidth = () => {
            if (!this.reader?.mainBox || !this.reader?.parentElement) {
                this.pdfElActionsWrapper.style.width = '100%';
                return;
            }
            const mainBoxRect = this.reader.mainBox.getBoundingClientRect();
            const scrollWidth = this.reader.parentElement.offsetWidth - this.reader.parentElement.clientWidth;
            const width = Math.max(0, Math.round(mainBoxRect.width - scrollWidth));
            this.pdfElActionsWrapper.style.width = width > 0 ? width + 'px' : '100%';
        };
        updateActionsWidth();
        requestAnimationFrame(updateActionsWidth);
        window.addEventListener('resize', updateActionsWidth);
        let bindedLang = {};

        const showActions = e => {
            if(e.data.name != 'textArt'){
                const dropdownTextArt = document.querySelector("#dropdown_textArt");
                if(dropdownTextArt){
                    dropdownTextArt.style.display = 'none';
                }
            }
            if(e.data.name != 'stamp'){
                const dropdownStamp = document.querySelector("#dropdown_stamp");
                if(dropdownStamp){
                    dropdownStamp.style.display = 'none';
                }
            }
            toolActive = document.querySelector('.tool_' + e.data.name);
            if (toolActive) {
                toolActive.classList.add('active');
            }
            
            this.pdfElActions.innerHTML = '';
            let elActions = cacheActions[e.data.name];
            if (!elActions) {
                elActions = e.data.initActions();
                cacheActions[e.data.name] = elActions;
            }
            if (elActions.length == 0) {
                elSliderHide(this.pdfElActionsWrapper, 'show');
                return;
            }
            
            elActions.forEach(action => {
                this.pdfElActions.appendChild(action);
            });
            elSliderShow(this.pdfElActionsWrapper, 'show', 'flex');
            if (!bindedLang[e.data.name]) {
                Locale.bind(this.pdfElActionsWrapper);
                bindedLang[e.data.name] = true;
            }
        }
        let toolActive = null;
        const cacheActions = {};
        PDFEvent.on(Events.TOOLBAR_ITEM_ACTIVE, e => {
            showActions(e);
            if (e.data.name == 'forms') {
                if (this.btnHistorySlider?.classList.contains('active')) {
                    this.btnHistorySlider.click();
                }
                if (this.btnFormsSlider && !this.btnFormsSlider.classList.contains('active')) {
                    this.btnFormsSlider.click();
                }
            }
        });

        PDFEvent.on(Events.TOOLBAR_ITEM_CLICK, e => {
            if (!toolActive) {
                showActions(e);
            } else if (toolActive == document.querySelector('.tool_' + e.data.name)) {
                toolActive.classList.remove('active');
                toolActive = null;
                elSliderHide(this.pdfElActionsWrapper, 'show');
                
            }
        });

        PDFEvent.on(Events.TOOLBAR_ITEM_BLUR, e => {
            toolActive?.classList.remove('active');
            toolActive = null;
            // elSliderHide(this.pdfElActionsWrapper, 'show');
            if (e.data.name == 'forms') {
                if (this.btnFormsSlider?.classList.contains('active')) {
                    this.btnFormsSlider.click();
                }
            }
        });
    }

    // toggleElActions() {
    //     const status = elSliderToggle(this.pdfElActionsWrapper, 'show');
    //     if (status) {
    //         setTimeout(() => {
    //             this.pdfElActionsWrapper.style.position = 'fixed';
    //         }, 300);
    //     } else {
    //         this.pdfElActionsWrapper.style.position = '';
    //     }
    // }
}
