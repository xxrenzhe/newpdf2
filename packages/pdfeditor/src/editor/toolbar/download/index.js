import { ToolbarItemBase } from '../ToolbarItemBase';

class Download extends ToolbarItemBase {
    init() {
        this.name = 'download';
        this.clickable = false;
    }

    initAfter() {
        this.container.addEventListener('click', e => {
            this.editor.download();
        });
    }
}

export default Download;