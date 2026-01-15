import { Events, PDFEvent } from '../../../event';
import { ToolbarItemBase } from '../ToolbarItemBase';

class Pages extends ToolbarItemBase {
    init() {
        this.name = 'pages';
        this.clickable = false;
    }

    initAfter() {
        this.elInput = document.createElement('input');
        this.elPrev = document.createElement('div');
        this.elNext = document.createElement('div');
        this.elPageNums = document.createElement('div');
        this.elPageNums.textContent = this.reader.pdfDocument.pageCount;
        this.elInput.value = this.reader.pdfDocument.pageActive;


        PDFEvent.on(Events.PAGE_ACTIVE, e => {
            this.elInput.value = e.data;
        });

        this.elPrev.addEventListener('click', e => {
            this.reader.prev();
        });

        this.elNext.addEventListener('click', e => {
            this.reader.next();
        });

        this.elInput.addEventListener('keyup', e => {
            if (e.code !== undefined) {
                if (e.code != 'Enter' && e.code != 'NumpadEnter') {
                    return;
                }
            } else if (e.keyCode !== undefined) {
                if (e.keyCode != 13) {
                    return;
                }
            }
            let page = parseInt(this.elInput.value);
            if (!page || page < 1 || page > this.reader.pdfDocument.pageCount) {
                page = 1;
            }
            this.reader.to(page);
        });
    }
}

export default Pages;