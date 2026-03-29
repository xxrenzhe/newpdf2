import { RectElement } from './RectElement';

class EraseMaskElement extends RectElement {
    init() {
        super.init();
        this.dataType = 'eraseMask';
    }

    async insertToPDF() {
        return true;
    }
}

export { EraseMaskElement };
