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
// if (NODE_ENV == 'development') {
//     baseUrl = 'http://localhost/pdf/pdf.js/build/generic/build/';
// }
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
// Font.fontUrl = 'https://localhost:3000/api/font/load';
Font.fontUrl = 'https://genfont.qwerpdf.com/';
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

// let fileUrl = getUrlParam('fileUrl') || 'http://localhost/files/hr-technology.pdf';
let fileUrl = getUrlParam('fileUrl') || null;

const reader = new PDFReader({
    // url: null,
    url: '/assets/aa.pdf',
    // url: fileUrl,
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

// PDFEvent.on(Events.TOOLBAR_INIT, () => {
//     editor.toolbar.get('forms').click();
// });

PDFEvent.on(Events.READER_INIT, () => {
    elDownload.style.display = 'block';
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

window.addEventListener('message', e => {
    if (e.data.type == 'load-pdf') {
        reader.load(URL.createObjectURL(e.data.blob));
    }
    if (e.data.type == 'download') {
        elDownload.click();
    }
});

window.reader = reader;
window.editor = editor;