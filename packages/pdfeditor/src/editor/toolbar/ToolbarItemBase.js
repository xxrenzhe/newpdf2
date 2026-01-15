import { Events, PDFEvent } from "../../event";
import { Locale } from "../../locale";

class ToolbarItemBase {
    constructor(toolbar, attrs) {
        this.attrs = {};
        this.toolbar = toolbar;
        this.editor = toolbar.editor;
        this.container = null;
        this.name = '';
        this.icon = null;
        //是否触发toolbar点击事件
        this.clickable = true;
        //只有带有绘制功能的元素才用到
        this.drawHandles = [];
        this.status = false;
        this.actions = () => {};
        this.elActions = [];
        this.objElements = {};
        this.zIndex = 0;
        this.isSetActions = true;
        this.init();
        if (attrs) {
            this.attrs = attrs;
        }
        this.initIcon();
        this.initAfter();
    }

    get reader() {
        return this.editor.reader;
    }

    init() {}

    initAfter() {}

    /**
     * @return {Array<Element>}
     */
    initActions() {
        return [];
    }

    setAttrs(attrs) {
        this.attrs = Object.assign(this.attrs, attrs);
    }

    updateAttrs(attrs, objElement) {
        if (objElement) {
            // let keys = Object.keys(attrs);
            // for (let i in keys) {
            //     let key = keys[i];
            //     let value = attrs[key];
            //     objElement.attrs[key] = value;
            // }
            // objElement.setStyle();
            // objElement.zoom(objElement.scale);
            objElement.edit(attrs);
        } else {
            this.setAttrs(attrs);
        }
        PDFEvent.dispatch(Events.TOOLBAR_ITEM_OPTION_CLICK, {
            tool: this,
            objElement
        });
    }

    //当工具激活状态改变时
    onActive(status) {}

    onClick(e) {}

    click() {
        return this.container.click();
    }

    //PDF页点击的事件
    pageClick() {}

    setActive(status) {
        if (this.status == status) return;
        this.status = status;
        if (this.status) {
            PDFEvent.dispatch(Events.TOOLBAR_ITEM_ACTIVE, this);
        } else {
            PDFEvent.dispatch(Events.TOOLBAR_ITEM_BLUR, this);
        }
        this.onActive(status);
    }

    initIcon() {
        this.container = document.createElement('div');
        this.container.classList.add('__toolbar_item', '__toolbar_item_' + this.name);
        if (this.icon) {
            this.container.appendChild(this.icon);
        }
        if (this.clickable) {
            this.container.addEventListener('click', e => {
                this.__setzIndex();
                PDFEvent.dispatch(Events.TOOLBAR_ITEM_CLICK, this);
                this.onClick(e);
                this.toolbar.setActive(this);
                this.setActive(true);
            });
        }
    }

    __setzIndex() {
        for (let i in this.reader.pdfDocument.pages) {
            const page = this.reader.pdfDocument.getPage(parseInt(i) + 1);
            if (!page.rendered) continue;
            page.elDrawLayer.style.zIndex = this.zIndex;
        }
    }

    setActions(objElement) {
        this.objElements[objElement.id] = objElement;
        if (this.isSetActions) {
            this.elActions = this.initActions(objElement);
            this.elActions.forEach(action => {
                objElement.elActions.appendChild(action);
            });
            Locale.bind(objElement.elActions);
        }
        
        //外部追加的actions
        if (this.actions) {
            this.actions(objElement, this);
        }

        const actRemove = document.createElement('div');
        actRemove.className = '__act_item __act_item_btn __act_remove';
        actRemove.innerHTML = '<svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M689.257 279.687l-95.113 0c-4.745-41.142-39.749-73.208-82.146-73.208-42.392 0-77.393 32.064-82.139 73.208l-95.118 0c-38.493 0-69.803 31.321-69.803 69.811l0 3.581c0 29.413 18.316 54.591 44.116 64.848l0 329.782c0 38.493 31.314 69.811 69.804 69.811l266.283 0c38.49 0 69.802-31.322 69.802-69.811l0-329.781c25.799-10.26 44.116-35.436 44.116-64.848l0-3.581c0-38.493-31.313-69.813-69.802-69.813zM512 239.587c24.112 0 44.238 17.283 48.692 40.1l-97.375 0c4.452-22.819 24.579-40.1 48.682-40.1zM681.838 747.709c0 20.239-16.465 36.705-36.697 36.705l-266.283 0c-20.23 0-36.697-16.469-36.697-36.705l0-324.818 339.677 0 0 324.818zM725.953 353.08c0 20.239-16.465 36.705-36.697 36.705l-354.514 0c-20.23 0-36.697-16.467-36.697-36.705l0-3.581c0-20.239 16.465-36.705 36.697-36.705l354.515 0c20.23 0 36.697 16.467 36.697 36.705l0 3.581zM423.251 742.074c9.142 0 16.553-7.414 16.553-16.553l0-186.382c0-9.141-7.412-16.554-16.553-16.554s-16.553 7.415-16.553 16.554l0 186.382c-0.002 9.142 7.41 16.553 16.552 16.553zM512 742.074c9.143 0 16.554-7.415 16.554-16.553l0-186.382c0-9.141-7.415-16.554-16.554-16.554-9.142 0-16.553 7.415-16.553 16.554l0 186.382c0 9.142 7.41 16.553 16.552 16.553zM600.749 742.074c9.142 0 16.552-7.414 16.552-16.553l0-186.382c0-9.141-7.412-16.554-16.552-16.554-9.143 0-16.553 7.415-16.553 16.554l0 186.382c-0.002 9.142 7.414 16.553 16.553 16.553z"></path></svg>';
        actRemove.addEventListener('click', e => {
            objElement.page.elements.remove(objElement.id);
        });
        objElement.elActions.appendChild(actRemove);
    }

    enable() {
        this.drawHandles.forEach(handle => {
            handle.enable();
        });
    }

    disable() {
        this.drawHandles.forEach(handle => {
            handle.disable();
        });
    }
    
    getOffset(el, left, top) {
        if (left == null) {
            left = 0;
        }
        if (top == null) {
            top = 0;
        }
        if (!el.offsetParent) {
            return {
                left,
                top
            };
        }
        left += el.offsetLeft;
        top += el.offsetTop;
        return this.getOffset(el.offsetParent, left, top);
    }

    getPos(e) {
        let x = this.reader.mainBox.scrollLeft;
        let y = this.reader.mainBox.scrollTop;
        return {
            x: e.pageX - this.offset.left + x,
            y: e.pageY - this.offset.top + y
        };
    }
}

export { ToolbarItemBase };