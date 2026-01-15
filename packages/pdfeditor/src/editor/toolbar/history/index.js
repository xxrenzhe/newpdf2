import { Events, PDFEvent } from '../../../event';
import { ToolbarItemBase } from '../ToolbarItemBase';

const DISABLED_CLASS = 'disabled';

class History extends ToolbarItemBase {
    init() {
        this.name = 'history';
        this.elUndo = document.createElement('div');
        this.elRedo = document.createElement('div');
        PDFEvent.on(Events.HISTORY_CHANGE, e => {
            const { step, maxStep } = e.data;
            if (step < 1) {
                this.elUndo.classList.add(DISABLED_CLASS);
            } else {
                this.elUndo.classList.remove(DISABLED_CLASS);
            }
            if (step >= maxStep) {
                this.elRedo.classList.add(DISABLED_CLASS);
            } else {
                this.elRedo.classList.remove(DISABLED_CLASS);
            }
        });

        this.elUndo.addEventListener('click', e => {
            if (!this.elUndo.classList.contains(DISABLED_CLASS)) {
                this.editor.history.undo();
            }
        });

        this.elRedo.addEventListener('click', e => {
            if (!this.elRedo.classList.contains(DISABLED_CLASS)) {
                this.editor.history.redo();
            }
        });
    }
}

export default History;