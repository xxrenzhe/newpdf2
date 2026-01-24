import { Events, PDFEvent } from '../event';
import { ImageElement } from './element/ImageElement';
import { TextCanvasElement } from './element/TextCanvasElement';
import { TextElement } from './element/TextElement';
import { RectElement } from './element/RectElement';
import { CircleElement } from './element/CircleElement';
import { EllipseElement } from './element/EllipseElement';
import { trimSpace } from '../misc';
import { TextBoxElement } from './element/TextBoxElement';
import { SvgPathElement } from './element/SvgPathElement';
import { CheckboxElement } from './element/CheckboxElement';
import { RadioGroupElement } from './element/RadioGroupElement';
import { TextFieldElement } from './element/TextFieldElement';
import { DropdownElement } from './element/DropdownElement';
import {TextArtElement} from './element/TextArtElement'

const _ELEMENTS = {
    text: TextElement,
    textArt: TextArtElement,
    textbox: TextBoxElement,
    textCanvas: TextCanvasElement,
    rect: RectElement,
    circle: CircleElement,
    ellipse: EllipseElement,
    image: ImageElement,
    svgPath: SvgPathElement,
    checkbox: CheckboxElement,
    radioGroup: RadioGroupElement,
    textField: TextFieldElement,
    dropdown: DropdownElement
};

export class Elements {
    page = null;

    constructor(page) {
        this.page = page;
        this.items = {};
        this.activeId = null;
    }

    setActive(id) {
        if (this.activeId == id) {
            return;
        }
        
        //已经有选中的元素时触发失去焦点事件
        // if (this.activeId) {
        //     const oriElement = this.get(this.activeId);
        //     if (oriElement.el.classList.contains('active')) {
        //         oriElement.el.classList.remove('active');
        //         PDFEvent.dispatch(Events.ELEMENT_BLUR, {
        //             page: this.page,
        //             element: oriElement
        //         });
        //     } else {
        //         this.activeId == null;
        //         return;
        //     }
        // }
        this.activeId = id;
        if (id === null) {
            return;
        }
        const element = this.get(id);
        element.el.classList.add('active');
        PDFEvent.dispatch(Events.ELEMENT_ACTIVE, {
            page: this.page,
            element: element
        });
    }

    zoom(scale) {
        for (let i in this.items) {
            this.items[i].zoom(scale);
        }
    }

    async insertToPDF() {
        for (let i in this.items) {
            const item = this.items[i];
            const isTextLike = ['text', 'textbox', 'textCanvans', 'textCanvas'].indexOf(item.dataType) > -1;
            const isEmptyText = trimSpace(item.attrs?.text || '') == '';
            // Keep converted text elements even when empty so export can cover/redact the original glyphs.
            if (isTextLike && isEmptyText && !item.attrs?.coverOriginal) {
                this.remove(this.items[i].id);
                continue;
            }
            await this.items[i].insertToPDF();
        }
        return true;
    }

    get length() {
        return Object.keys(this.items).length;
    }

    add(type, attrs, options, doNotEvent) {
        const element = new _ELEMENTS[type](this.page, attrs, options);
        element.render();
        //Draw类对象不会直接渲染，绘制前内容是空的，不用setActive
        if (!element.elChild) return;
        this.items[element.id] = element;
        element.zoom(element.scale);
        this.setActive(element.id);
        if (!doNotEvent) {
            PDFEvent.dispatch(Events.ELEMENT_CREATE, {
                page: this.page,
                element: element
            });
        }
        return element;
    }

    get(id) {
        return this.items[id];
    }

    edit(id, attrs) {
        return this.get(id).edit(attrs);
    }

    remove(id) {
        const element = this.get(id);
        if (!element) return;
        if (element.el && element.el.parentElement) {
            const prev = element.el.previousElementSibling;
            const next = element.el.nextElementSibling;
            element.__historyAnchor = {
                prevId: prev ? prev.id : null,
                nextId: next ? next.id : null
            };
        }

        // Converted original PDF text needs a "soft delete" so export can still cover/redact
        // the original glyphs. Removing the element outright would make the deleted text
        // reappear in the saved PDF because the source content is unchanged.
        const isConvertedText = element.dataType === 'text' && element.attrs?.coverOriginal;
        if (isConvertedText) {
            if (element.elText) {
                element.elText.textContent = '';
            }
            element.edit({
                text: '',
                hidden: true
            });
            this.activeId = null;
            return;
        }

        element.remove();
        delete this.items[id];
        this.activeId = null;
        PDFEvent.dispatch(Events.ELEMENT_REMOVE, {
            page: this.page,
            element: element
        });
    }

    removeAll() {
        for (let i in this.items) {
            this.remove(i);
        }
    }
}
