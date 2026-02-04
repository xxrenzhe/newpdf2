import { ToolbarItemBase } from '../ToolbarItemBase';
import Dialog from '../../../components/dialog';
import { Locale } from '../../../locale';


const HEADER_PREVIEW_BOX_CLASS = 'perview_dom';
const FOOTER_PREVIEW_BOX_CLASS = 'perview_dom_bottom';
const POS_ACTIVE_CLASS = 'pos_module_active';
const PAGE_START = 'page_start';
const PAGE_END = 'page_end';


class PageNumber extends ToolbarItemBase {
    init() {
        this.name = 'page_number';
        this.textColor = '#000000';
        this.headerText = 1;
        this.footerText = 1;
        this.textSize = 12;
        this.fontFamily = fontList[0].fontFamily;
        this.fontFile = fontList[0].fontFile;
        this.position = 1;


        this.dialog = new Dialog({
            initOpened: false,
            width: 700,
            height: 'auto',
            body: require('./popup.html')(),
            title: Locale.get('add_page_number')
        });
        Locale.bind(this.dialog.elBody);

        const elBody = this.dialog.elDialogBody;


        const elFontList = elBody.querySelector('.font_family');
        fontList.forEach(font => {
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


        elBody.querySelectorAll('.popup_pos_module').forEach(el => {
            el.addEventListener('click', e => {
                elBody.querySelector('.popup_pos_module.' + POS_ACTIVE_CLASS)?.classList.remove(POS_ACTIVE_CLASS);
                e.currentTarget.classList.add(POS_ACTIVE_CLASS);
                this.position = parseInt(e.currentTarget.getAttribute('data-pos'));
                __updatePreview();
            });
        });


        elHeaderPreview.style.fontSize = this.textSize + 'px';
        elFooterPreview.style.fontSize = this.textSize + 'px';
        elHeaderPreview.style.fontFamily = this.fontFamily;
        elFooterPreview.style.fontFamily = this.fontFamily;

        let pos = {
            1: 'left',
            2: 'center',
            3: 'right',
            4: 'left',
            5: 'center',
            6: 'right'
        };
        const __updatePreview = () => {
            elHeaderPreview.style.display = '';
            elFooterPreview.style.display = '';

            elHeaderPreview.textContent = this.headerText;
            elFooterPreview.textContent = this.footerText;

            elHeaderPreview.style.fontSize = this.textSize + 'px';
            elFooterPreview.style.fontSize = this.textSize + 'px';

            elHeaderPreview.style.fontFamily = this.fontFamily;
            elFooterPreview.style.fontFamily = this.fontFamily;

            if (this.position >= 1 && this.position <= 3) {
                elHeaderPreviewBox.style.justifyContent = pos[this.position];
            }

            if (this.position >= 4 && this.position <= 6) {
                elFooterPreviewBox.style.justifyContent = pos[this.position];
            }
        }

        const elPageStart = elBody.querySelector('#' + PAGE_START);
        const elPageEnd = elBody.querySelector('#' + PAGE_END);
        elPageEnd.value = this.reader.pageCount;
        elPageEnd.setAttribute('max', this.reader.pageCount);

        const elBtnOk = elBody.querySelector('.btn_ok');
        elBtnOk.addEventListener('click', () => {
            this.dialog.close();
            let pageStart = elPageStart.value;
            let pageEnd = elPageEnd.value;

            
            for (let i = pageStart; i <= pageEnd; i++) {
                let page = this.editor.pdfDocument.getPage(i);
                page.elements.add('text', {
                    size: this.textSize,
                    color: this.textColor,
                    text: i.toString(),
                    fontFamily: this.fontFamily,
                    fontFile: this.fontFile
                }, {
                    pos: {
                        x: 0,
                        y: 0
                    }
                }, true);
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

export default PageNumber;