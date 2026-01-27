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
        actRemove.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M9 3h6a1 1 0 0 1 1 1v1h4v2h-2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7H2V5h4V4a1 1 0 0 1 1-1h2zm2 0v1h2V3h-2zm-3 4h2v11H8V7zm6 0h-2v11h2V7z"></path></svg>';
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
