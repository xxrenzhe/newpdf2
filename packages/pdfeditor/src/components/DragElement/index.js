import Draggable from './draggable';
import Resizable from './resizable';

class DragElement {
    constructor(options = {}) {
        this.options = {
            selector: '',

            resizable: false,
            resizableOptions: {},

            draggable: true,
            draggableOptions: {}
        };
        this.options = Object.assign(this.options, options);
        this.plugins = {
            draggable: null,
            resizable: null
        };
        this.elements = null;
        if (this.options.selector) {
            this.elements = document.querySelectorAll(this.options.selector);
        }
        this.init();
    }

    init() {
        if (this.options.draggable) {
            this.setDraggable(this.elements);
        }

        if (this.options.resizable) {
            this.setResizable(this.elements);
        }
    }

    addElement(element, positionOptions) {
        if (!this.elements) {
            this.elements = [];
        }
        this.elements.push(element);
        if (this.options.draggable) {
            this.plugins.draggable.addElement(element, positionOptions);
        }
        if (this.options.resizable) {
            this.plugins.resizable.addElement(element);
        }
    }

    setDraggable(elements) {
        this.options.draggableOptions.selector = elements;
        this.plugins.draggable = new Draggable(this.options.draggableOptions);
    }

    setResizable(elements) {
        this.options.resizableOptions.selector = elements;
        this.plugins.resizable = new Resizable(this.options.resizableOptions);
    }
}

export default DragElement