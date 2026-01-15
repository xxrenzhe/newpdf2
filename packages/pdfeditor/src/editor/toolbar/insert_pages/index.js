import { ToolbarItemBase } from '../ToolbarItemBase';
import Dialog from '../../../components/dialog';
import { Locale } from '../../../locale';
import { Events, PDFEvent } from '../../../event';

const BTN_OK = 'btn-ok';
const BTN_CANCEL = 'btn-cancel';

class InsertPages extends ToolbarItemBase {
    init() {
        this.name = 'insert_pages';

        this.dialog = new Dialog({
            initOpened: false,
            width: 300,
            height: 'auto',
            body: require('./popup.html')(),
            title: Locale.get('insert_pages'),
            onOpen: () => {
                let currentPage = this.reader.pdfDocument.pageActive;
                elPageNum.value = currentPage;
            }
        });
        Locale.bind(this.dialog.elBody);
        const elBody = this.dialog.elDialogBody;
        let type = 'custom';

        let elPageTotalSpan = elBody.querySelector('.page_total');
        elPageTotalSpan.textContent = ' / ' + this.reader.pageCount;

        let elPageNum = this.dialog.elDialogBody.querySelector('#page_num');
        elBody.querySelector('.' + BTN_CANCEL).addEventListener('click', () => {
            this.dialog.close();
        });

        elBody.querySelectorAll('.__text_align').forEach(el => {
            el.addEventListener('click', e => {
                type = e.currentTarget.value;
            });
        })

        elBody.querySelector('.' + BTN_OK).addEventListener('click', () => {
            let pageNum = parseInt(elPageNum.value) + 1;
            if (type == 'first') {
                pageNum = 1;
            } else if (type == 'last') {
                pageNum = this.reader.pageCount + 1;
            }
            PDFEvent.dispatch(Events.PAGE_ADD, {
                pageNum: pageNum
            });
            this.dialog.close();
        });
    }

    onClick() {
        this.dialog.open();
    }
}

export default InsertPages;