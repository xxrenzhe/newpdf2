import { ToolbarItemBase } from '../ToolbarItemBase';
import Dialog from '../../../components/dialog';
import { Font } from '../../../font';
import { Locale } from '../../../locale';


const HEADER_TEXT = 'header_text';
const FOOTER_TEXT = 'footer_text';

const HEADER_PREVIEW_BOX_CLASS = 'perview_dom';
const FOOTER_PREVIEW_BOX_CLASS = 'perview_dom_bottom';
const ACTIVE_CLASS = 'table_btn_active';
const PAGE_START = 'page_start';
const PAGE_END = 'page_end';
const HEADER_UPLOAD = 'upload_img_h';
const FOOTER_UPLOAD = 'upload_img_f';

class HeaderFooter extends ToolbarItemBase {
    init() {
        this.name = 'header_footer';
        this.textColor = '#000000';
        this.headerText = Locale.get('header_footer_demo_text');
        this.footerText = Locale.get('header_footer_demo_text');
        this.textSize = 12;
        const defaultFont = Font.getDefaultFont();
        const uiFonts = Font.getUiFontList();
        const fallbackFont = uiFonts.find(font => font.fontFamily === defaultFont.fontFamily) || uiFonts[0] || defaultFont;
        this.fontFamily = fallbackFont.fontFamily;
        this.fontFile = fallbackFont.fontFile;
        this.mode = 'text';
        this.headerAlign = 'left';
        this.footerAlign = 'left';
        this.headerArrayBuffer = null;
        this.footerArrayBuffer = null;
        this.headerImageType = null;
        this.footerImageType = null;


        this.dialog = new Dialog({
            initOpened: false,
            width: 700,
            height: 'auto',
            body: require('./popup.html')(),
            title: Locale.get('header_footer_popup_title')
        });
        Locale.bind(this.dialog.elBody);

        const elBody = this.dialog.elDialogBody;
        const elImgBox = elBody.querySelectorAll('.popup_uploadimg');
        const elTextBox = elBody.querySelectorAll('.popup_editText');

        const elHeaderText = elBody.querySelector('#' + HEADER_TEXT);
        elHeaderText.addEventListener('input', e => {
            this.headerText = elHeaderText.value;
            __updatePreview();
        });

        const elFooterText = elBody.querySelector('#' + FOOTER_TEXT);
        elFooterText.addEventListener('input', e => {
            this.footerText = elFooterText.value;
            __updatePreview();
        });

        //set align
        elBody.querySelectorAll('.__text_align').forEach(el => {
            el.addEventListener('click', e => {
                let type = el.getAttribute('data-type');
                let align = el.value;
                if (type == 'header') {
                    this.headerAlign = align;
                } else {
                    this.footerAlign = align;
                }
                __updatePreview();
            });
        });


        const elFontList = elBody.querySelector('.font_family');
        uiFonts.forEach(font => {
            let elOption = document.createElement('option');
            elOption.text = font.showName;
            elOption.fontFamily = font.fontFamily;
            elOption.fontFile = font.fontFile;
            elFontList.appendChild(elOption);
        });
        elFontList.addEventListener('change', e => {
            let option = elFontList.selectedOptions[0];
            this.fontFamily = option.fontFamily;
            this.fontFile = option.fontFile;
            __updatePreview();
        });

        const elFontSize = elBody.querySelector('.font_size');
        elFontSize.addEventListener('change', e => {
            this.textSize = elFontSize.value;
            __updatePreview();
        });


        const elHeaderPreviewBox = elBody.querySelector('.' + HEADER_PREVIEW_BOX_CLASS);
        const elHeaderPreview = elHeaderPreviewBox.querySelector('span');
        const elFooterPreviewBox = elBody.querySelector('.' + FOOTER_PREVIEW_BOX_CLASS);
        const elFooterPreview = elFooterPreviewBox.querySelector('span');
        const elHeaderImg = elHeaderPreviewBox.querySelector('img');
        const elFooterImg = elFooterPreviewBox.querySelector('img');

        elBody.querySelectorAll('.hf_table').forEach(el => {
            el.addEventListener('click', e => {
                let type = e.currentTarget.getAttribute('data-type');
                this.mode = type;
                elBody.querySelector('.hf_table.' + ACTIVE_CLASS)?.classList.remove(ACTIVE_CLASS);
                e.currentTarget.classList.add(ACTIVE_CLASS);
                if (type == 'text') {
                    elHeaderImg.style.display = 'none';
                    elFooterImg.style.display = 'none';
                    elHeaderPreview.style.display = '';
                    elFooterPreview.style.display = '';
                    elTextBox.forEach(el => {
                        el.style.display = '';
                    });
                    elImgBox.forEach(el => {
                        el.style.display = 'none';
                    });
                } else if (type == 'img') {
                    elHeaderImg.style.display = '';
                    elFooterImg.style.display = '';
                    elHeaderPreview.style.display = 'none';
                    elFooterPreview.style.display = 'none';
                    elTextBox.forEach(el => {
                        el.style.display = 'none';
                    });
                    elImgBox.forEach(el => {
                        el.style.display = 'flex';
                    });
                }
            });
        });


        //上传图片
        const elHeaderUpload = elBody.querySelector('#' + HEADER_UPLOAD);
        elHeaderUpload.addEventListener('change', e => {
            let file = e.target.files[0];
            if (file) {
                this.headerImageType = file.type || 'image/png';
                elHeaderImg.addEventListener('load', () => {
                    const fileReader = new FileReader();
                    fileReader.readAsArrayBuffer(file);
                    fileReader.addEventListener('loadend', async e => {
                        this.headerArrayBuffer = e.target.result;
                    });
                    setTimeout(() => {
                        __updatePreview();
                    }, 10);
                });
                elHeaderImg.src = URL.createObjectURL(file);
            }
            elHeaderUpload.value = '';
        });

        const elFooterUpload = elBody.querySelector('#' + FOOTER_UPLOAD);
        elFooterUpload.addEventListener('change', e => {
            let file = e.target.files[0];
            if (file) {
                this.footerImageType = file.type || 'image/png';
                elFooterImg.addEventListener('load', () => {
                    const fileReader = new FileReader();
                    fileReader.readAsArrayBuffer(file);
                    fileReader.addEventListener('loadend', async e => {
                        this.footerArrayBuffer = e.target.result;
                    });
                    setTimeout(() => {
                        __updatePreview();
                    }, 10);
                });
                elFooterImg.src = URL.createObjectURL(file);
            }
            elFooterUpload.value = '';
        });

        elHeaderPreview.style.fontSize = this.textSize + 'px';
        elFooterPreview.style.fontSize = this.textSize + 'px';
        elHeaderPreview.style.fontFamily = this.fontFamily;
        elFooterPreview.style.fontFamily = this.fontFamily;
        const __updatePreview = () => {
            if (this.mode == 'text') {
                elHeaderImg.style.display = 'none';
                elFooterImg.style.display = 'none';
                elHeaderPreview.style.display = '';
                elFooterPreview.style.display = '';

                elHeaderPreview.textContent = this.headerText;
                elFooterPreview.textContent = this.footerText;

                elHeaderPreview.style.fontSize = this.textSize + 'px';
                elFooterPreview.style.fontSize = this.textSize + 'px';

                elHeaderPreview.style.fontFamily = this.fontFamily;
                elFooterPreview.style.fontFamily = this.fontFamily;
            } else {
                elHeaderImg.style.display = '';
                elFooterImg.style.display = '';
                elHeaderPreview.style.display = 'none';
                elFooterPreview.style.display = 'none';
            }
            elHeaderPreviewBox.style.justifyContent = this.headerAlign;
            elFooterPreviewBox.style.justifyContent = this.footerAlign;
        }

        const elPageStart = elBody.querySelector('#' + PAGE_START);
        const elPageEnd = elBody.querySelector('#' + PAGE_END);
        elPageEnd.value = this.reader.pageCount;
        elPageEnd.setAttribute('max', this.reader.pageCount);


        const elBtnOk = elBody.querySelector('.btn_ok');
        elBtnOk.addEventListener('click', async () => {
            try {
                const start = Math.max(1, parseInt(elPageStart.value || '1'));
                const end = Math.min(this.reader.pageCount, parseInt(elPageEnd.value || String(this.reader.pageCount)));
                if (start > end) return;

                const margin = 10;

                for (let pageNum = start; pageNum <= end; pageNum++) {
                    const page = this.editor.pdfDocument.getPage(pageNum);
                    await page.getReaderPageProxy();

                    const readerPage = page.readerPage;
                    if (!readerPage.content && readerPage.pageProxy) {
                        const viewport = readerPage.pageProxy.getViewport({ scale: readerPage.scale });
                        readerPage.elWrapper.style.width = viewport.width + 'px';
                        readerPage.elWrapper.style.height = viewport.height + 'px';
                        readerPage.elDrawLayer.style.width = viewport.width + 'px';
                        readerPage.elDrawLayer.style.height = viewport.height + 'px';
                        readerPage.content = readerPage.elWrapper;
                    }

                    const container = readerPage.content ?? readerPage.elWrapper;
                    const containerW = container.offsetWidth;
                    const containerH = container.offsetHeight;

                    const place = (element, align, top) => {
                        const rect = element.el.getBoundingClientRect();
                        let left = margin;
                        if (align === 'center') left = Math.max(margin, containerW / 2 - rect.width / 2);
                        if (align === 'right') left = Math.max(margin, containerW - rect.width - margin);

                        element.el.style.left = left + 'px';
                        element.el.style.top = top + 'px';
                        element.setActualRect();
                        element.zoom(element.scale);
                        element.disableDrag = true;
                        element.disableResize = true;
                        element.el.classList.remove('__resizable', '__resizable-border');
                    };

                    if (this.mode === 'text') {
                        if (this.headerText) {
                            const headerEl = page.elements.add(
                                'textCanvas',
                                {
                                    size: this.textSize,
                                    color: this.textColor,
                                    text: this.headerText,
                                    opacity: 1,
                                    rotate: 0,
                                    fontFamily: this.fontFamily,
                                    fontFile: this.fontFile,
                                },
                                { pos: { x: margin, y: margin } },
                                true
                            );
                            place(headerEl, this.headerAlign, margin);
                        }
                        if (this.footerText) {
                            const footerEl = page.elements.add(
                                'textCanvas',
                                {
                                    size: this.textSize,
                                    color: this.textColor,
                                    text: this.footerText,
                                    opacity: 1,
                                    rotate: 0,
                                    fontFamily: this.fontFamily,
                                    fontFile: this.fontFile,
                                },
                                { pos: { x: margin, y: Math.max(margin, containerH - 40) } },
                                true
                            );
                            const rect = footerEl.el.getBoundingClientRect();
                            place(footerEl, this.footerAlign, Math.max(margin, containerH - rect.height - margin));
                        }
                    } else {
                        const loadImage = async (arrayBuffer, imageType) => {
                            const blob = new Blob([arrayBuffer], { type: imageType || 'image/png' });
                            const url = URL.createObjectURL(blob);
                            const img = new Image();
                            img.src = url;
                            await new Promise(resolve => {
                                img.addEventListener('load', resolve, { once: true });
                                img.addEventListener('error', resolve, { once: true });
                            });
                            URL.revokeObjectURL(url);
                            return img;
                        };

                        if (this.headerArrayBuffer) {
                            const img = await loadImage(this.headerArrayBuffer, this.headerImageType);
                            const headerImgEl = page.elements.add(
                                'image',
                                {
                                    image: img,
                                    imageType: this.headerImageType || 'image/png',
                                    opacity: 1,
                                    arrayBuffer: this.headerArrayBuffer,
                                    rotate: 0,
                                },
                                { pos: { x: margin, y: margin } },
                                true
                            );
                            place(headerImgEl, this.headerAlign, margin);
                        }
                        if (this.footerArrayBuffer) {
                            const img = await loadImage(this.footerArrayBuffer, this.footerImageType);
                            const footerImgEl = page.elements.add(
                                'image',
                                {
                                    image: img,
                                    imageType: this.footerImageType || 'image/png',
                                    opacity: 1,
                                    arrayBuffer: this.footerArrayBuffer,
                                    rotate: 0,
                                },
                                { pos: { x: margin, y: Math.max(margin, containerH - 80) } },
                                true
                            );
                            const rect = footerImgEl.el.getBoundingClientRect();
                            place(footerImgEl, this.footerAlign, Math.max(margin, containerH - rect.height - margin));
                        }
                    }
                }
            } finally {
                this.dialog.close();
            }
        });


        const elBtnCancel = elBody.querySelector('.btn_cancel');
        elBtnCancel.addEventListener('click', () => {
            this.dialog.close();
        });
    }

    onClick() {
        this.dialog.open();
    }
}

export default HeaderFooter;
