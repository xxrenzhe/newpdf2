import '../../src/css/pdf_viewer.css';
import '../../src/css/reader.css';
import '../../src/css/editor.css';
import '../../src/css/toolbar.css';
import '../../src/css/pdfeditor_mobile.css';
import '../../src/assets/fonts.css';
import '@simonwep/pickr/dist/themes/classic.min.css';
import { PDFReader } from '../../src/reader';
import { PDFEditor } from '../../src/editor';
import { Font } from '../../src/font';
import { Events, PDFEvent } from '../../src/event';
import * as pdfjsLib from 'pdfjs-dist-v2/legacy/build/pdf';
import { LANG_LIST, VIEW_MODE } from '../../src/defines';
import Loading from '../components/loading';
import { getUrlParam,downloadLoad } from '../misc';
import { Locale } from '../locale';
import { createLoadTokenTracker, toArrayBuffer } from './load_token_tracker';
import {
    getErrorMessage,
    normalizeToolName,
    shouldLockTouchGestures,
    TOUCH_GESTURE_LOCK_CLASS
} from './runtime_safety';
let baseUrl = ASSETS_URL + 'js/pdfjs/';
const workerVersion = typeof pdfjsLib.version === 'string' ? pdfjsLib.version : '2.15.349';
pdfjsLib.GlobalWorkerOptions.workerSrc = baseUrl + 'pdf.worker.min.js?v=' + encodeURIComponent(workerVersion);
const cMapUrl = baseUrl + 'cmaps/';
const standardFontDataUrl = baseUrl + 'standard_fonts/';
const TOOLS = [
    'mouse', 
    'hand', 
    'text', 
    'image', 
    'eraser', 
    'highlight', 
    'line', 
    'download', 
    'text_highlight', 
    'history', 
    'shapes', 
    'circle', 
    'ellipse', 
    'textbox', 
    'find', 
    'underline', 
    'strikethrough', 
    'signature', 
    'watermark',
    'header_footer',
    'page_number',
    'forms',
    'insert_pages',
    'delete_pages',
    'textArt',
    'stamp'
];

let activeLoadToken = 0;
let readySent = false;
let fileNameState = '';
let activeBlobUrl = null;
let pendingRenderCompleteLoadId = null;
let pendingRenderCompleteToken = null;
let renderCompletePollTimer = null;
const loadTokenTracker = createLoadTokenTracker(24);

const clearActiveBlobUrl = () => {
    if (!activeBlobUrl) return;
    try {
        URL.revokeObjectURL(activeBlobUrl);
    } catch (err) {
        // ignore
    }
    activeBlobUrl = null;
};

const clearRenderCompleteWait = () => {
    pendingRenderCompleteLoadId = null;
    pendingRenderCompleteToken = null;
    if (renderCompletePollTimer) {
        window.clearInterval(renderCompletePollTimer);
        renderCompletePollTimer = null;
    }
};

const isFirstPageRendered = () => {
    const page = document.querySelector('#pdf-main .__pdf_page_preview[data-page="1"]');
    if (!page) return false;
    return !!page.querySelector('.__pdf_item_render');
};

const postRenderComplete = (loadId, fallbackToken = activeLoadToken) => {
    const resolvedLoadId = typeof loadId === 'number' ? loadId : pendingRenderCompleteLoadId;
    if (typeof resolvedLoadId !== 'number') return;
    const tokenHint =
        typeof pendingRenderCompleteToken === 'number' ? pendingRenderCompleteToken : fallbackToken;
    const token = resolveLoadToken({ loadId: resolvedLoadId }, tokenHint);
    postToParent({
        type: 'pdf-render-complete',
        loadToken: token
    });
    clearRenderCompleteWait();
};

const watchForFirstPageRender = () => {
    if (renderCompletePollTimer) {
        window.clearInterval(renderCompletePollTimer);
        renderCompletePollTimer = null;
    }
    if (typeof pendingRenderCompleteLoadId !== 'number') return;
    let checks = 0;
    renderCompletePollTimer = window.setInterval(() => {
        checks += 1;
        if (typeof pendingRenderCompleteLoadId !== 'number') {
            window.clearInterval(renderCompletePollTimer);
            renderCompletePollTimer = null;
            return;
        }
        if (isFirstPageRendered()) {
            postRenderComplete(pendingRenderCompleteLoadId);
            return;
        }
        if (checks >= 240) {
            window.clearInterval(renderCompletePollTimer);
            renderCompletePollTimer = null;
        }
    }, 100);
};

const rememberLoadToken = (loadId, token) => {
    loadTokenTracker.remember(loadId, token);
};

const resolveLoadToken = (payload, fallbackToken = activeLoadToken) => {
    const loadId = payload?.loadId;
    return loadTokenTracker.resolve(loadId, fallbackToken);
};

const postToParent = (payload) => {
    try {
        if (window.parent) {
            window.parent.postMessage(payload, '*');
        }
    } catch (err) {
        // ignore
    }
};

const setTouchGestureLock = (enabled) => {
    if (!document?.body) return;
    document.body.classList.toggle(TOUCH_GESTURE_LOCK_CLASS, !!enabled);
};

const postRuntimeError = (error) => {
    const message = getErrorMessage(error);
    if (!message) return;
    postToParent({
        type: 'pdf-error',
        message,
        loadToken: activeLoadToken
    });
};

const installRuntimeErrorBridge = () => {
    window.addEventListener('unhandledrejection', event => {
        postRuntimeError(event?.reason || event);
    });
    window.addEventListener('error', event => {
        postRuntimeError(event?.error || event?.message || event);
    });
};

const setFileName = (value) => {
    const text = typeof value === 'string' ? value.trim() : '';
    fileNameState = text;
    const fileNameEl = document.getElementById('file-name');
    if (fileNameEl) {
        fileNameEl.textContent = text;
    }
};

const sendEditorReady = (force = false) => {
    if (readySent && !force) return;
    readySent = true;
    postToParent({ type: 'pdf-editor-ready' });
};

const isEmbedded = () => {
    try {
        return window.self !== window.top;
    } catch (err) {
        return true;
    }
};

const normalizeUrl = (url) => {
    if (!url) return null;
    try {
        return new URL(url, window.location.href);
    } catch (err) {
        return null;
    }
};

const isBlockedProtocol = (parsed) => {
    if (!parsed) return false;
    return parsed.protocol === 'blob:' || parsed.protocol === 'data:' || parsed.protocol === 'about:';
};

const isExternalUrl = (url) => {
    const parsed = normalizeUrl(url);
    if (!parsed) return false;
    if (isBlockedProtocol(parsed)) return true;
    return parsed.origin !== window.location.origin;
};

const installNavigationGuard = () => {
    if (!isEmbedded()) return;
    const shouldBlock = (url) => isExternalUrl(url);
    let blockedCount = 0;
    const blockedOrigins = new Set();

    const reportBlocked = (url) => {
        try {
            const parsed = normalizeUrl(url);
            if (parsed?.origin) {
                blockedOrigins.add(parsed.origin);
            }
            blockedCount += 1;
            postToParent({
                type: 'pdf-external-embed-blocked',
                count: blockedCount,
                origins: Array.from(blockedOrigins),
                loadToken: activeLoadToken
            });
        } catch (err) {
            // ignore
        }
    };

    if (typeof window.open === 'function') {
        const originalOpen = window.open;
        window.open = function (url, target, features) {
            if (shouldBlock(url)) {
                reportBlocked(url);
                return null;
            }
            return originalOpen.call(window, url, target, features);
        };
    }

    try {
        const loc = window.location;
        const originalAssign = loc.assign?.bind(loc);
        if (originalAssign) {
            loc.assign = (url) => {
                if (shouldBlock(url)) {
                    reportBlocked(url);
                    return;
                }
                return originalAssign(url);
            };
        }
        const originalReplace = loc.replace?.bind(loc);
        if (originalReplace) {
            loc.replace = (url) => {
                if (shouldBlock(url)) {
                    reportBlocked(url);
                    return;
                }
                return originalReplace(url);
            };
        }

        const proto = Object.getPrototypeOf(loc);
        const hrefDescriptor = proto ? Object.getOwnPropertyDescriptor(proto, 'href') : null;
        if (hrefDescriptor && typeof hrefDescriptor.set === 'function' && typeof hrefDescriptor.get === 'function') {
            Object.defineProperty(proto, 'href', {
                configurable: hrefDescriptor.configurable,
                enumerable: hrefDescriptor.enumerable,
                get() {
                    return hrefDescriptor.get.call(this);
                },
                set(value) {
                    if (shouldBlock(value)) {
                        reportBlocked(value);
                        return;
                    }
                    return hrefDescriptor.set.call(this, value);
                }
            });
        }
    } catch (err) {
        // ignore
    }

    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const anchor = target?.closest?.('a');
        if (!anchor) return;
        const href = anchor.getAttribute('href') || anchor.href;
        if (shouldBlock(href)) {
            reportBlocked(href);
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);

    document.addEventListener('auxclick', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const anchor = target?.closest?.('a');
        if (!anchor) return;
        const href = anchor.getAttribute('href') || anchor.href;
        if (shouldBlock(href)) {
            reportBlocked(href);
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);

    document.addEventListener('submit', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const form = target?.closest?.('form');
        if (!form) return;
        const action = form.getAttribute('action') || form.action;
        if (shouldBlock(action)) {
            reportBlocked(action);
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
};
// Font.fontUrl = 'https://localhost:3000/api/font/load';
Font.fontUrl = '/pdfeditor/assets/fonts/';
// let fileUrl = 'http://localhost/files/150kb.pdf';
// let fileUrl = 'http://localhost/files/TEST/d/EMRPUB_2012_EN_1362.pdf';
// let fileUrl = 'http://localhost/files/E0300IUC22_Invoice.pdf';
// let fileUrl = 'http://localhost/files/TEST/de/wa540ga199heger.pdf';
// let fileUrl = null;

// Text.actions = (objElement, that) => {
//     let a = document.createElement('div');
//     a.innerHTML = '设置样式';
//     a.style.width = '100px';
//     objElement.elActions.appendChild(a)
//     a.addEventListener('click', e => {
//         //修改工具栏默认设置
//         // that.attrs.color = '#ff0000';
        
//         //修改元素样式
//         objElement.edit({
//             color: '#ff0000',
//             size: 50
//         });
//     });
// }


//加载语言文件
let lang = getUrlParam('lang');

if (lang && lang != 'en') {
    if (LANG_LIST.indexOf(lang) >= 0) {
        Locale.langCode = lang;
        Locale.load(lang).then(() => {
            Locale.bind();
        });
    }
}

// 切换语言
var langItem = document.querySelector(".lang_item");
var langChecked = document.querySelector(".lang_checked");
var langText = document.querySelector('.langText');
if (langItem && langChecked && langText) {
    langItem.addEventListener('click',()=>{
        if(langChecked.classList.contains('hide')){
            langChecked.classList.remove('hide');
        }else{
            langChecked.classList.add('hide');
        }
    })
    langChecked.addEventListener('click',(e)=>{
        if(e.target.className == 'lang_checked_item'){
            langChecked.classList.add('hide');
            langText.innerHTML = e.target.innerHTML;
            var langCode = e.target.dataset.lang;
            if (LANG_LIST.indexOf(langCode) >= 0) {
                Locale.langCode = langCode;
                Locale.load(langCode).then(() => {
                    Locale.bind();
                });
            }
        }
    })
}

// let fileUrl = getUrlParam('fileUrl') || 'http://localhost/files/hr-technology.pdf';
let fileUrl = getUrlParam('fileUrl') || null;

const reader = new PDFReader({
    // url: null,
    // url: '/assets/hr-technology.pdf',
    url: fileUrl,
    thumbs: '#pdf-thumbs',
    main: '#pdf-main',
    // parent: '.pdf-main-wrapper',
    renderType: 'html',
    viewMode: VIEW_MODE.AUTO_ZOOM,
    cMapUrl: cMapUrl,
    standardFontDataUrl: standardFontDataUrl,
    usePageBase: false,
    expandThumbs: false
}, pdfjsLib);

installNavigationGuard();
installRuntimeErrorBridge();
reader.init();

const editor = new PDFEditor({
    producer: 'QWERPDF (https://qwerpdf.com)',
    creator: 'QWERPDF',
    // toolbar: document.getElementById('pdf-toolbar'),
    toolbar: true,
    debug: process.env.NODE_ENV == 'development' ? true : false,
    history: true,
    tools: TOOLS,
}, null, reader); 
editor.init();

// PDFEvent.on(Events.READER_INIT, async () => {
//     editor.load(await reader.getData());
// });

let loading = new Loading(null, 96, 96, '#fff');
let elDownload = document.querySelector('.btn-download');
if (elDownload) {
elDownload.addEventListener('click', () => {
    
    let elDiv = document.querySelector('._loadingv2');
    loading.setIcon(elDiv);
    var loadItme = 0
    var intervalItem = setInterval(()=>{
        loadItme ++;
        if(loadItme<99){
            downloadLoad(loadItme)
        }else{
            downloadLoad(99);
            clearInterval(intervalItem)
        }
    },100)
    elDiv.classList.remove('_loading');
    loading.start();
    editor.download();
});
}

// PDFEvent.on(Events.TOOLBAR_INIT, () => {
//     editor.toolbar.get('forms').click();
// });

PDFEvent.on(Events.READER_INIT, (evt) => {
    const loadId =
        typeof evt?.data?.loadId === 'number'
            ? evt.data.loadId
            : (typeof reader?.loadId === 'number' ? reader.loadId : null);
    const token = resolveLoadToken(evt?.data);
    pendingRenderCompleteLoadId = loadId;
    pendingRenderCompleteToken = token;
    if (elDownload) {
        elDownload.style.display = 'block';
    }
    postToParent({
        type: 'pdf-loaded',
        pageCount: reader.pageCount,
        loadToken: token
    });
    if (reader.pageCount <= 0) {
        postRenderComplete(loadId, token);
        return;
    }
    if (isFirstPageRendered()) {
        postRenderComplete(loadId, token);
        return;
    }
    watchForFirstPageRender();
    // let rotate = -90;
    // let width = 300;
    // let height = 200;
    // let x = 100;
    // let y = 300;


    // fetch('/assets/1.jpg').then(res => res.arrayBuffer()).then(arrayBuffer => {
    //     const blob = new Blob([arrayBuffer], {
    //         type: 'image/jpeg'
    //     });
    //     let elements = editor.pdfDocument.getPage(1).elements;
    //     let image = new Image();
    //     image.src = URL.createObjectURL(blob);
    //     image.width = width;
    //     image.height = height;
        
    //     image.style.transform = 'rotate('+ rotate +'deg)';
    //     image.addEventListener('load', e => {
    //         elements.add('image', {
    //             image: image,
    //             imageType: 'image/jpeg',
    //             opacity: 1,
    //             arrayBuffer: arrayBuffer,
    //             rotate: rotate
    //         }, {
    //             pos: {
    //                 x: x,
    //                 y: y
    //             }
    //         });
    //     });
    // });
});

PDFEvent.on(Events.PAGE_RENDERED, (evt) => {
    const page = evt?.data;
    const pageNum = Number.parseInt(page?.pageNum, 10);
    if (!Number.isFinite(pageNum) || pageNum !== 1) return;
    const loadId = typeof page?.loadId === 'number' ? page.loadId : null;
    if (typeof pendingRenderCompleteLoadId === 'number' && typeof loadId === 'number' && pendingRenderCompleteLoadId !== loadId) {
        return;
    }
    postRenderComplete(loadId);
});

PDFEvent.on(Events.LOAD_PROGRESS, (evt) => {
    const data = evt?.data || {};
    const token = resolveLoadToken(data);
    const loaded = typeof data.loaded === 'number' ? data.loaded : 0;
    const total = typeof data.total === 'number' ? data.total : undefined;
    postToParent({
        type: 'pdf-progress',
        loaded,
        total,
        loadToken: token
    });
});

PDFEvent.on(Events.PASSWORD_ERROR, (evt) => {
    clearRenderCompleteWait();
    setTouchGestureLock(false);
    const token = resolveLoadToken(evt?.data);
    postToParent({
        type: 'pdf-password-error',
        loadToken: token
    });
});

PDFEvent.on(Events.ERROR, (evt) => {
    clearRenderCompleteWait();
    setTouchGestureLock(false);
    const token = resolveLoadToken(evt?.data);
    const message = evt?.data?.message;
    postToParent({
        type: 'pdf-error',
        message: typeof message === 'string' ? message : undefined,
        loadToken: token
    });
});

PDFEvent.on(Events.TOOLBAR_ITEM_ACTIVE, (evt) => {
    const tool = evt?.data?.tool;
    const name = tool?.name;
    if (typeof name !== 'string' || !name) return;
    setTouchGestureLock(shouldLockTouchGestures(name));
    postToParent({
        type: 'open-tool',
        tool: name === 'radact' ? 'redact' : name
    });
});

sendEditorReady();

let saveProgressTimer = null;

PDFEvent.on(Events.SAVE, () => {
    if (saveProgressTimer) {
        clearTimeout(saveProgressTimer);
        saveProgressTimer = null;
    }
    saveProgressTimer = setTimeout(() => {
        saveProgressTimer = null;
        postToParent({ type: 'pdf-save-progress', phase: 'font' });
    }, 2000);
});

PDFEvent.on(Events.DOWNLOAD, () => {
    if (saveProgressTimer) {
        clearTimeout(saveProgressTimer);
        saveProgressTimer = null;
    }
    postToParent({ type: 'pdf-save-progress', phase: 'render' });
});

PDFEvent.on(Events.HISTORY_CHANGE, (evt) => {
    const step = evt?.data?.step;
    postToParent({ type: 'pdf-dirty-state', isDirty: typeof step === 'number' && step > 0 });
});

if (fileUrl) {
    try {
        const parsed = new URL(fileUrl, window.location.href);
        const path = parsed.pathname || '';
        const candidate = path.split('/').filter(Boolean).pop();
        if (candidate) {
            setFileName(decodeURIComponent(candidate));
        }
    } catch (err) {
        // ignore
    }
}

window.addEventListener('message', e => {
    const data = e?.data;
    if (!data || typeof data !== 'object') return;

    if (data.type == 'ping') {
        sendEditorReady(true);
        return;
    }

    if (data.type === 'health-check') {
        postToParent({ type: 'health-check-ack' });
        return;
    }

    if (data.type == 'set-file-name') {
        setFileName(data.fileName || data.name || '');
        return;
    }

    if (data.type == 'load-pdf') {
        clearRenderCompleteWait();
        setTouchGestureLock(false);
        const nextToken = typeof data.loadToken === 'number' ? data.loadToken : activeLoadToken + 1;
        activeLoadToken = nextToken;
        const expectedLoadId = typeof reader?.loadId === 'number' ? reader.loadId + 1 : null;
        if (typeof expectedLoadId === 'number') {
            rememberLoadToken(expectedLoadId, nextToken);
        }
        if (typeof data.fileName === 'string' && data.fileName) {
            setFileName(data.fileName);
        }

        const runLoad = async () => {
            try {
                const dataBuffer = toArrayBuffer(data.data);
                if (dataBuffer) {
                    editor.prepareForNewLoad?.();
                    clearActiveBlobUrl();
                    await reader.load(dataBuffer);
                    return;
                }
                if (typeof data.url === 'string' && data.url) {
                    editor.prepareForNewLoad?.();
                    clearActiveBlobUrl();
                    await reader.load(data.url);
                    return;
                }
                if (data.blob instanceof Blob) {
                    editor.prepareForNewLoad?.();
                    clearActiveBlobUrl();
                    activeBlobUrl = URL.createObjectURL(data.blob);
                    await reader.load(activeBlobUrl);
                    return;
                }
                try {
                    await reader.cancelLoad(false);
                } catch (cancelErr) {
                    // ignore
                }
                try {
                    editor.prepareForNewLoad?.();
                } catch (resetErr) {
                    // ignore
                }
                clearActiveBlobUrl();
                postToParent({
                    type: 'pdf-error',
                    message: 'Missing PDF payload',
                    loadToken: nextToken
                });
            } catch (err) {
                try {
                    await reader.cancelLoad(false);
                } catch (cancelErr) {
                    // ignore
                }
                try {
                    editor.prepareForNewLoad?.();
                } catch (resetErr) {
                    // ignore
                }
                clearActiveBlobUrl();
                postToParent({
                    type: 'pdf-error',
                    message: err?.message || String(err),
                    loadToken: nextToken
                });
            }
        };

        runLoad();
        return;
    }

    if (data.type == 'cancel-load') {
        clearRenderCompleteWait();
        setTouchGestureLock(false);
        const token = typeof data.loadToken === 'number' ? data.loadToken : activeLoadToken;
        const runCancel = async () => {
            try {
                await reader.cancelLoad();
                editor.prepareForNewLoad?.();
                clearActiveBlobUrl();
                postToParent({
                    type: 'pdf-load-cancelled',
                    loadToken: token
                });
            } catch (err) {
                try {
                    await reader.cancelLoad(false);
                } catch (cancelErr) {
                    // ignore
                }
                try {
                    editor.prepareForNewLoad?.();
                } catch (resetErr) {
                    // ignore
                }
                clearActiveBlobUrl();
                postToParent({
                    type: 'pdf-error',
                    message: err?.message || String(err),
                    loadToken: token
                });
            }
        };
        runCancel();
        return;
    }

    if (data.type === 'set-tool' && typeof data.tool === 'string' && data.tool) {
        try {
            const normalizedTool = normalizeToolName(data.tool);
            setTouchGestureLock(shouldLockTouchGestures(normalizedTool));
            editor.toolbar?.get(normalizedTool)?.click?.();
        } catch (err) {
            // ignore
        }
        return;
    }

    if (data.type == 'download') {
        elDownload?.click?.();
    }
});

window.reader = reader;
window.editor = editor;
