import '../../src/css/pdf_viewer.css';
import '../../src/css/reader.css';
import '../../src/css/editor.css';
import '../../src/css/toolbar.css';
import '../../src/assets/fonts.css';
import '@simonwep/pickr/dist/themes/classic.min.css';
import { PDFReader } from '../../src/reader';
import { PDFEditor } from '../../src/editor';
import { Font } from '../../src/font';
import { Events, PDFEvent } from '../../src/event';
import * as pdfjsLib from 'pdfjsLib';
import { LANG_LIST, VIEW_MODE } from '../../src/defines';
import Loading from '../components/loading';
import { getUrlParam,downloadLoad } from '../misc';
import { Locale } from '../locale';
let baseUrl = ASSETS_URL + 'js/pdfjs/';
if (NODE_ENV == 'development') {
    baseUrl = 'http://localhost/pdf/pdf.js/build/generic/build/';
}
pdfjsLib.GlobalWorkerOptions.workerSrc = baseUrl + 'pdf.worker.min.js';
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
// Offline font assets base (same-origin). `Font.fetchFont()` loads from this base.
// Example: "/pdfeditor/assets/".
Font.fontUrl = ASSETS_URL;
const EDITOR_READY_MESSAGE = 'pdf-editor-ready';
const DOWNLOAD_TIMEOUT_MS = 45000;
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
            setupButtonA11y();
        });
    }
}

// 切换语言
var langItem = document.querySelector(".lang_item");
var langChecked = document.querySelector(".lang_checked");
var langText = document.querySelector('.langText');
if (langItem && langChecked && langText) {
    langItem.addEventListener('click',() => {
        if(langChecked.classList.contains('hide')){
            langChecked.classList.remove('hide');
        }else{
            langChecked.classList.add('hide');
        }
    });
    langChecked.addEventListener('click',(e) => {
        if(e.target.className == 'lang_checked_item'){
            langChecked.classList.add('hide');
            langText.innerHTML = e.target.innerHTML;
            var langCode = e.target.dataset.lang;
            if (LANG_LIST.indexOf(langCode) >= 0) {
                Locale.langCode = langCode;
                Locale.load(langCode).then(() => {
                    Locale.bind();
                    setupButtonA11y();
                });
            }
        }
    });
}

// let fileUrl = getUrlParam('fileUrl') || 'http://localhost/files/hr-technology.pdf';
let fileUrl = getUrlParam('fileUrl') || null;

const fileNameEl = document.getElementById('file-name');
const setFileName = (name) => {
    if (!fileNameEl) return;
    const value = name ? String(name) : '';
    fileNameEl.textContent = value;
};

const extractFileName = (value) => {
    if (!value) return '';
    try {
        const parsed = new URL(value, window.location.origin);
        const last = parsed.pathname.split('/').pop();
        return last || '';
    } catch {
        const cleaned = String(value).split('?')[0].split('#')[0];
        const parts = cleaned.split('/');
        return parts[parts.length - 1] || '';
    }
};

const fileNameParam = getUrlParam('fileName') || getUrlParam('filename');
if (fileNameParam) {
    setFileName(fileNameParam);
} else {
    const derivedName = extractFileName(fileUrl);
    if (derivedName) {
        setFileName(derivedName);
    }
}

// Embedded mode (inside iframe): tweak styling for host app integration.
const isEmbedded = window.parent && window.parent !== window;
if (isEmbedded) {
    document.documentElement.classList.add('embed');
} else {
    document
        .querySelectorAll(
            '.more-dropdown-item.tool_convert, .more-dropdown-item.tool_compress, .more-dropdown-item.tool_merge, .more-dropdown-item.tool_redact'
        )
        .forEach(el => {
            el.style.display = 'none';
        });
}

const XFA_EMBED_SELECTOR = 'iframe, frame, object, embed';
let xfaEmbedObserver = null;

const isExternalUrl = (rawUrl) => {
    if (!rawUrl) return false;
    try {
        const parsed = new URL(rawUrl, window.location.href);
        return parsed.origin !== window.location.origin;
    } catch {
        return true;
    }
};

const scrubXfaEmbeds = (root) => {
    if (!(root instanceof Element)) return;
    const layers = root.matches('.xfaLayer') ? [root] : Array.from(root.querySelectorAll('.xfaLayer'));
    if (layers.length === 0) return;
    layers.forEach(layer => {
        layer.querySelectorAll(XFA_EMBED_SELECTOR).forEach((el) => {
            const tag = el.tagName.toLowerCase();
            const url = tag === 'object'
                ? el.getAttribute('data')
                : el.getAttribute('src');
            if (!url || isExternalUrl(url)) {
                try {
                    if (el instanceof HTMLIFrameElement) {
                        el.src = 'about:blank';
                    } else if (el instanceof HTMLObjectElement) {
                        el.data = '';
                    } else if (el instanceof HTMLEmbedElement) {
                        el.src = '';
                    }
                } catch {
                    // ignore
                }
                el.replaceWith(document.createComment('XFA embedded content blocked'));
            }
        });
    });
};

const ensureXfaEmbedSanitizer = () => {
    if (xfaEmbedObserver) return;
    const target = document.querySelector('#pdf-main') || document.body;
    if (!target) return;
    xfaEmbedObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node instanceof Element) {
                    scrubXfaEmbeds(node);
                }
            });
        });
    });
    xfaEmbedObserver.observe(target, { childList: true, subtree: true });
    scrubXfaEmbeds(target);
};

let hostLoadToken = 0;

const interactiveSelectors = [
    '.tool-item',
    '.pdf-page-btn',
    '.view-btn',
    '.slide-item',
    '.more-dropdown-item',
    '.__act_item_btn',
    '.btn-download',
    '#pdf_thumbs_close',
    '.lang_item',
    '.lang_checked_item'
];

const setupButtonA11y = () => {
    const selector = interactiveSelectors.join(',');
    document.querySelectorAll(selector).forEach(el => {
        if (!(el instanceof HTMLElement)) return;
        if (!el.hasAttribute('role')) {
            el.setAttribute('role', 'button');
        }
        if (!el.hasAttribute('tabindex')) {
            const disabled = el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true';
            el.setAttribute('tabindex', disabled ? '-1' : '0');
        }
        if (!el.hasAttribute('aria-label')) {
            const title = el.getAttribute('title');
            if (title) {
                el.setAttribute('aria-label', title);
            }
        }
        if (el.classList.contains('disabled') && !el.hasAttribute('aria-disabled')) {
            el.setAttribute('aria-disabled', 'true');
        }
    });
};

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const selector = interactiveSelectors.join(',');
    if (!target.matches(selector)) return;
    if (target.classList.contains('disabled') || target.getAttribute('aria-disabled') === 'true') return;
    event.preventDefault();
    target.click();
});

function postToParent(message) {
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, '*');
        }
    } catch {
        // ignore
    }
}

let editorReadyPosted = false;
const postEditorReady = () => {
    if (editorReadyPosted) return;
    editorReadyPosted = true;
    postToParent({ type: EDITOR_READY_MESSAGE });
};

const normalizeErrorMessage = (value) => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value.message === 'string' && value.message.trim()) return value.message.trim();
    if (value && typeof value.reason === 'string' && value.reason.trim()) return value.reason.trim();
    try {
        return String(value);
    } catch {
        return 'Unknown error';
    }
};

let lastErrorMessage = '';
let lastErrorAt = 0;
const reportError = (value, context) => {
    const message = normalizeErrorMessage(value);
    const now = Date.now();
    if (message === lastErrorMessage && now - lastErrorAt < 1500) {
        return;
    }
    lastErrorMessage = message;
    lastErrorAt = now;
    const prefix = context ? `${context}: ` : '';
    const payload = { type: 'pdf-error', message: `${prefix}${message}` };
    if (hostLoadToken) {
        payload.loadToken = hostLoadToken;
    }
    postToParent(payload);
};

try {
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(postEditorReady);
    } else {
        setTimeout(postEditorReady, 0);
    }
} catch {
    setTimeout(postEditorReady, 0);
}

window.addEventListener('error', (event) => {
    reportError(event?.error || event?.message || 'Script error', 'Editor');
});

window.addEventListener('unhandledrejection', (event) => {
    reportError(event?.reason || 'Unhandled promise rejection', 'Editor');
});

PDFEvent.on(Events.ERROR, (evt) => {
    reportError(evt?.data?.message || evt?.data || 'Unknown error', 'Editor');
});

PDFEvent.on(Events.LOAD_PROGRESS, (evt) => {
    const loaded = evt?.data?.loaded;
    const total = evt?.data?.total;
    if (typeof loaded !== 'number') return;
    postToParent({ type: 'pdf-progress', loaded, total, loadToken: hostLoadToken });
});

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
    enableXfa: true,
    fontExtraProperties: true,
    usePageBase: false,
    expandThumbs: false,
    lazyThumbs: true,
    initPageBatchSize: 12,
    initThumbBatchSize: 40
}, pdfjsLib);

reader.init();
ensureXfaEmbedSanitizer();
setupButtonA11y();

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
const handleDownloadClick = () => {
    let elDiv = document.querySelector('._loadingv2');
    const elDivParent = elDiv ? elDiv.parentElement : null;
    let intervalItem = null;
    let downloadTimeout = null;

    if (elDiv) {
        loading.setIcon(elDiv);
        var loadItme = 0;
        intervalItem = setInterval(() => {
            loadItme ++;
            if(loadItme<99){
                downloadLoad(loadItme);
            }else{
                downloadLoad(99);
                clearInterval(intervalItem);
            }
        },100);
        elDiv.classList.remove('_loading');
        loading.start();
    }

    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (intervalItem) {
            clearInterval(intervalItem);
        }
        if (downloadTimeout) {
            clearTimeout(downloadTimeout);
            downloadTimeout = null;
        }
        if (elDiv) {
            downloadLoad(100);
            loading.end(() => {
                downloadLoad(0);
                if (elDivParent && !elDivParent.contains(elDiv)) {
                    elDivParent.appendChild(elDiv);
                }
            });
        }
        PDFEvent.unbind(Events.DOWNLOAD_AFTER, cleanup);
        PDFEvent.unbind(Events.ERROR, onError);
    };

    const onError = (evt) => {
        try {
            const message = evt?.data?.message || (evt?.data ? String(evt.data) : 'Unknown error');
            postToParent({ type: 'pdf-error', message, loadToken: hostLoadToken });
        } catch {
            // ignore
        }
        cleanup();
    };

    PDFEvent.on(Events.DOWNLOAD_AFTER, cleanup);
    PDFEvent.on(Events.ERROR, onError);
    if (DOWNLOAD_TIMEOUT_MS > 0) {
        downloadTimeout = setTimeout(() => {
            PDFEvent.dispatch(Events.ERROR, { message: 'Download timed out. Please try again.' });
        }, DOWNLOAD_TIMEOUT_MS);
    }
    editor.download();
};

if (elDownload) {
    elDownload.addEventListener('click', handleDownloadClick);
} else {
    reportError('Download button missing', 'Editor');
}

// PDFEvent.on(Events.TOOLBAR_INIT, () => {
//     editor.toolbar.get('forms').click();
// });

let readyLoadId = 0;
let sentLoadedForLoadId = 0;
let readyFallbackTimer = null;

PDFEvent.on(Events.READER_INIT, () => {
    ensureXfaEmbedSanitizer();
    if (elDownload) {
        elDownload.style.display = 'block';
    }
    readyLoadId = reader.loadId;
    if (readyFallbackTimer) {
        clearTimeout(readyFallbackTimer);
        readyFallbackTimer = null;
    }
    // Kick off page 1 rendering immediately for faster first-screen time.
    try {
        reader.pdfDocument?.getPage(1)?.render(reader.options.renderType).catch(() => {});
    } catch {
        // ignore
    }

    // Safety net: if page rendering stalls, don't block the host overlay forever.
    const thisLoadId = reader.loadId;
    readyFallbackTimer = setTimeout(() => {
        if (reader.loadId !== thisLoadId) return;
        if (sentLoadedForLoadId === thisLoadId) return;
        sentLoadedForLoadId = thisLoadId;
        postToParent({ type: 'pdf-loaded', pageCount: reader.pageCount, loadToken: hostLoadToken });
    }, 15000);
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
    if (page?.elWrapper) {
        scrubXfaEmbeds(page.elWrapper);
    }
    if (!page || page.pageNum !== 1) return;
    if (reader.loadId !== readyLoadId) return;
    if (sentLoadedForLoadId === reader.loadId) return;
    sentLoadedForLoadId = reader.loadId;
    if (readyFallbackTimer) {
        clearTimeout(readyFallbackTimer);
        readyFallbackTimer = null;
    }
    postToParent({ type: 'pdf-loaded', pageCount: reader.pageCount, loadToken: hostLoadToken });
});

PDFEvent.on(Events.PASSWORD_ERROR, () => {
    postToParent({ type: 'pdf-password-error', loadToken: hostLoadToken });
});

window.addEventListener('message', e => {
    if (e.data.type == 'load-pdf') {
        postEditorReady();
        const payload = e.data || {};
        hostLoadToken = typeof payload.loadToken === 'number' ? payload.loadToken : 0;
        const payloadName = payload.fileName || payload.name;
        if (payloadName) {
            setFileName(payloadName);
        }
        if (payload.data instanceof ArrayBuffer) {
            reader.load(payload.data);
        } else if (typeof payload.url === 'string' && payload.url) {
            reader.load(payload.url);
        } else if (payload.blob instanceof Blob) {
            reader.load(URL.createObjectURL(payload.blob));
        }
    }
    if (e.data.type === 'set-file-name') {
        const payloadName = e.data?.fileName || e.data?.name;
        setFileName(payloadName);
    }
    if (e.data.type === 'ping') {
        postEditorReady();
    }
    if (e.data.type === 'cancel-load') {
        const token = typeof e.data.loadToken === 'number' ? e.data.loadToken : null;
        if (token !== null && token !== hostLoadToken) return;
        if (readyFallbackTimer) {
            clearTimeout(readyFallbackTimer);
            readyFallbackTimer = null;
        }
        const cancelledToken = hostLoadToken;
        hostLoadToken = 0;
        try {
            reader.cancelLoad?.();
        } catch {
            // ignore
        }
        postToParent({ type: 'pdf-load-cancelled', loadToken: cancelledToken });
    }
    if (e.data.type == 'download') {
        if (elDownload) {
            elDownload.click();
        } else {
            reportError('Download button missing', 'Editor');
        }
    }
    if (e.data.type === 'set-tool' && typeof e.data.tool === 'string') {
        try {
            editor.toolbar?.get(e.data.tool)?.click?.();
        } catch {
            // ignore
        }
    }
});

window.reader = reader;
window.editor = editor;
