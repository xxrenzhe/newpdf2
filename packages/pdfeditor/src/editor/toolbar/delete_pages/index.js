import { ToolbarItemBase } from '../ToolbarItemBase';
import { VIEW_MODE } from '../../../defines';


class DeletePages extends ToolbarItemBase {
    init() {
        this.name = 'delete_pages';
        this.srcViewMode = this.reader.viewMode;
    }

    onClick() {
        let viewMode = this.reader.viewMode != VIEW_MODE.VIEW_2PAGE ? VIEW_MODE.VIEW_2PAGE : this.srcViewMode;
        this.reader.setViewMode(viewMode);
    }

    onActive(status) {
        if (!status) {
            this.reader.setViewMode(this.srcViewMode);
        }
    }
}

export default DeletePages;