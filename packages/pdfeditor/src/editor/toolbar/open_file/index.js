import { ToolbarItemBase } from '../ToolbarItemBase';

class OpenFile extends ToolbarItemBase {
    init() {
        this.name = 'openFile';
        this.elFile = document.createElement('input');
        this.elFile.setAttribute('type', 'file');
        this.elFile.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) {
                return;
            }
            this.reader.load(URL.createObjectURL(file));
            this.elFile.value = '';
        });
    }

    onClick() {
        this.elFile.click();
    }
}

export default OpenFile;