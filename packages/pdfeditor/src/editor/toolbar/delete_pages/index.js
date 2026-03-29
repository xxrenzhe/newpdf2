import { ToolbarItemBase } from '../ToolbarItemBase.js';
import { VIEW_MODE } from '../../../defines.js';

const DELETE_PAGES_MODE_CLASS = '__mode_delete_pages';

class DeletePages extends ToolbarItemBase {
    init() {
        this.name = 'delete_pages';
        this.srcViewMode = this.reader.viewMode;
    }

    #syncInsertedPagePreviewSize() {
        const readerPages = this.reader?.pdfDocument?.pages;
        if (!Array.isArray(readerPages) || readerPages.length < 1) {
            return;
        }

        readerPages.forEach((page, index) => {
            if (!page?.isNewPage) {
                return;
            }

            let refPage = readerPages[index - 1];
            if (!refPage || !refPage.elWrapper?.style?.width) {
                refPage = readerPages.find(candidate => candidate && !candidate.isNewPage && candidate.elWrapper?.style?.width);
            }
            if (!refPage || !page.elWrapper) {
                return;
            }

            const width = refPage.elWrapper.style.width;
            const height = refPage.elWrapper.style.height;
            if (width) {
                page.elWrapper.style.width = width;
                page.elDrawLayer && (page.elDrawLayer.style.width = width);
                page.elTextLayer && (page.elTextLayer.style.width = width);
                page.elAnnotationLayer && (page.elAnnotationLayer.style.width = width);
            }
            if (height) {
                page.elWrapper.style.height = height;
                page.elDrawLayer && (page.elDrawLayer.style.height = height);
                page.elTextLayer && (page.elTextLayer.style.height = height);
                page.elAnnotationLayer && (page.elAnnotationLayer.style.height = height);
            }
        });
    }

    #scheduleSyncInsertedPagePreviewSize() {
        [0, 80, 220].forEach(delay => {
            setTimeout(() => {
                this.#syncInsertedPagePreviewSize();
            }, delay);
        });
    }

    onClick() {
        if (!this.status) {
            this.srcViewMode = this.reader.viewMode;
        }
    }

    onActive(status) {
        this.reader.mainBox?.classList.toggle(DELETE_PAGES_MODE_CLASS, status);
        if (status) {
            this.srcViewMode = this.reader.viewMode;
            if (this.reader.viewMode != VIEW_MODE.VIEW_2PAGE) {
                this.reader.setViewMode(VIEW_MODE.VIEW_2PAGE);
            }
            this.#scheduleSyncInsertedPagePreviewSize();
            return;
        }

        if (this.srcViewMode != null && this.reader.viewMode != this.srcViewMode) {
            this.reader.setViewMode(this.srcViewMode);
        }
        this.#scheduleSyncInsertedPagePreviewSize();
    }
}

export { DELETE_PAGES_MODE_CLASS };
export default DeletePages;
