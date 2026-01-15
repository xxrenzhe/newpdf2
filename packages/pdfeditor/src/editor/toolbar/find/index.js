import { ToolbarItemBase } from '../ToolbarItemBase';

class Find extends ToolbarItemBase {
    init() {
        this.name = 'find';
    }

    initActions(objElement) {
        const temp = document.createElement('div');
        temp.innerHTML = require('./actions.phtml')();

        let elActions = [];
        for (let elChild of temp.children) {
            elActions.push(elChild);
        }
        $L.bind(temp);
        return elActions;
    }
}

export default Find;