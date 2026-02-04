import { Events, PDFEvent } from '../../event';
import DragElement from '../../components/DragElement';
import { createId } from '../../misc'; 

class BaseElement {
    page = null;
    options = {
        pos: {
            position: 'absolute',
            x: 0,
            y: 0
        },
        drawOffset: {
            y: 0,
            x: 0
        },
        resizable: true,
        resizableOptions: {
            showBorder: true,
            minWidth: null,
            minHeight: null
        },
        draggable: true,
        draggableOptions: {
            isCancelDefaultEvent: true
        },
        setActions: that => {}
    };

    constructor(page, attrs, options) {
        this.page = page;
        if (options) {
            this.options = Object.assign(this.options, options);
        }
        if (!this.options.pos.position) {
            this.options.pos.position = 'absolute';
        }
        if (!this.options.pos.x) {
            this.options.pos.x = 0;
        }
        if (!this.options.pos.y) {
            this.options.pos.y = 0;
        }
        this.dragElement = null;
        this.drawOffset = this.options.drawOffset;
        this.attrs = attrs ? attrs : {};
        this.dataType = '';
        this.id = this.attrs.id || createId();
        this.el = null;
        this.elChild = null;
        this.elClass = '__pdf_editor_element';
        this.childClass = '__pdf_editor_element_child';
        this.elActions = null;
        this.elActionsWrapper = null;
        this.actualRect = null;
        this.initElement();
        this.init();
    }

    get editor() {
        return this.page.editor;
    }

    get reader() {
        return this.editor.reader;
    }

    get pdfDocument() {
        return this.page.pdfDocument;
    }

    //页面上的显示缩放级别
    get pageScale() {
        // return this.scale * this.page.readerPage.outputScale;
        return this.scale;
    }

    get scale() {
        return this.page.readerPage.scale;
    }

    /**
     * @param {boolean} value
     */
    set disableDrag(value) {
        if (this.dragElement.plugins.draggable) {
            this.dragElement.plugins.draggable.disabled = value;
        }
    }

    /**
     * @param {boolean} value
     */
    set disableResize(value) {
        if (this.dragElement.plugins.resizable) {
            this.dragElement.plugins.resizable.disabled = value;
        }
    }

    degrees(angle) {
        if (angle > 0) {
            angle = ~angle+1;
        } else if (angle < 0) {
            angle = Math.abs(angle);
        }
        return this.editor.PDFLib.degrees(parseFloat(angle));
    }

    init() {}

    //添加或编辑后的css样式设置
    setStyle() {}

    async insertToPDF() {}

    childElement() {
        return null;
    }

    //初始化并创建元素父容器
    initElement() {
        this.el = document.createElement('div');
        this.el.classList.add(this.elClass);
        this.el.style.cursor = 'pointer';
        //绘制的line如果不加zIndex会有无法选中的情况
        this.el.style.zIndex = 1;
        this.el.setAttribute('id', this.id);
        if (this.options.drawOffset.x) {
            this.el.style.paddingLeft = this.options.drawOffset.x + 'px';
            this.el.style.paddingRight = this.options.drawOffset.x + 'px';
        }
        if (this.options.drawOffset.y) {
            this.el.style.paddingTop = this.options.drawOffset.y + 'px';
            this.el.style.paddingBottom = this.options.drawOffset.y + 'px';
        }
        // this.elActions = this.options.setActions(this);
        this.elActions = document.createElement('div');
        this.elActions.classList.add('__pdf_el_actions');

        this.elActionsWrapper = document.createElement('div');
        this.elActionsWrapper.classList.add('__pdf_el_actions_wrapper');
        this.elActionsWrapper.appendChild(this.elActions);
        //点击工具栏时禁用拖动事件
        this.elActionsWrapper.addEventListener('mousedown', e => {
            e.stopPropagation();
            this.disableDrag = true;
            // this.dragElement.plugins.draggable.options.isCancelDefaultEvent = false;
        });
        this.elActionsWrapper.addEventListener('mouseup', () => {
            this.disableDrag = false;
            // this.dragElement.plugins.draggable.options.isCancelDefaultEvent = this.options.draggableOptions.isCancelDefaultEvent;
        });
        this.el.appendChild(this.elActionsWrapper);

        this.options.setActions(this);

        //设置功能栏
        // if (!this.elActions) {
        //     this.elActions = document.createElement('div');
        //     this.elActions.style.position = 'absolute';
    
        //     this.actRemove = document.createElement('div');
        //     this.actRemove.className = '__act_item __act_remove';
        //     this.actRemove.innerHTML = '<svg t="1637567089744" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2465" width="32" height="32"><path d="M689.257 279.687l-95.113 0c-4.745-41.142-39.749-73.208-82.146-73.208-42.392 0-77.393 32.064-82.139 73.208l-95.118 0c-38.493 0-69.803 31.321-69.803 69.811l0 3.581c0 29.413 18.316 54.591 44.116 64.848l0 329.782c0 38.493 31.314 69.811 69.804 69.811l266.283 0c38.49 0 69.802-31.322 69.802-69.811l0-329.781c25.799-10.26 44.116-35.436 44.116-64.848l0-3.581c0-38.493-31.313-69.813-69.802-69.813zM512 239.587c24.112 0 44.238 17.283 48.692 40.1l-97.375 0c4.452-22.819 24.579-40.1 48.682-40.1zM681.838 747.709c0 20.239-16.465 36.705-36.697 36.705l-266.283 0c-20.23 0-36.697-16.469-36.697-36.705l0-324.818 339.677 0 0 324.818zM725.953 353.08c0 20.239-16.465 36.705-36.697 36.705l-354.514 0c-20.23 0-36.697-16.467-36.697-36.705l0-3.581c0-20.239 16.465-36.705 36.697-36.705l354.515 0c20.23 0 36.697 16.467 36.697 36.705l0 3.581zM423.251 742.074c9.142 0 16.553-7.414 16.553-16.553l0-186.382c0-9.141-7.412-16.554-16.553-16.554s-16.553 7.415-16.553 16.554l0 186.382c-0.002 9.142 7.41 16.553 16.552 16.553zM512 742.074c9.143 0 16.554-7.415 16.554-16.553l0-186.382c0-9.141-7.415-16.554-16.554-16.554-9.142 0-16.553 7.415-16.553 16.554l0 186.382c0 9.142 7.41 16.553 16.552 16.553zM600.749 742.074c9.142 0 16.552-7.414 16.552-16.553l0-186.382c0-9.141-7.412-16.554-16.552-16.554-9.143 0-16.553 7.415-16.553 16.554l0 186.382c-0.002 9.142 7.414 16.553 16.553 16.553z" p-id="2466"></path></svg>';
        //     this.actRemove.addEventListener('click', e => {
        //         this.page.elements.remove(this.id);
        //     });
        //     this.elActions.appendChild(this.actRemove);
        // }
        // this.elActions.className = '__pdf_el_actions';
        // this.el.appendChild(this.elActions);

        PDFEvent.on(Events.ELEMENT_RESIZE_END, e => {
            // const rect = this.el.getBoundingClientRect();
            // this.attrs.width = rect.width;
            // this.attrs.height = rect.height;
            this.updateAttrSize();
        });
    }

    //更新数据
    updateAttrSize() {
        this.attrs.width = this.actualRect.width * this.scale;
        this.attrs.height = this.actualRect.height * this.scale;
    }

    //抛开缩放后的实际大小
    setActualRect() {
        this.actualRect = {
            x: parseInt(this.el.style.left),
            y: parseInt(this.el.style.top),
            width: parseInt(this.el.style.width),
            height: parseInt(this.el.style.height)
        };
        this.actualRect.x /= this.scale;
        this.actualRect.y /= this.scale;
        this.actualRect.width /= this.scale;
        this.actualRect.height /= this.scale;
    }

    zoom(scale) {
        const rect = {
            x: this.actualRect.x * scale,
            y: this.actualRect.y * scale,
            width: this.actualRect.width * scale,
            height: this.actualRect.height * scale,
        };

        this.el.style.left = rect.x + 'px';
        this.el.style.top = rect.y + 'px';
        this.el.style.width = rect.width + 'px';
        this.el.style.height = rect.height + 'px';

        this.updateAttrSize();

        if (this.dragElement.options.draggable) {
            this.dragElement.plugins.draggable.inElement = this.page.readerPage.content;
        }
        if (this.dragElement.options.resizable) {
            this.dragElement.plugins.resizable.inElement = this.page.readerPage.content;
        }
        return rect;
    }

    edit(attrs) {
        const oriAttrs = Object.assign({}, this.attrs);
        PDFEvent.dispatch(Events.ELEMENT_UPDATE_BEFORE, {
            page: this.page,
            element: this,
            oriAttrs
        });
        this.attrs = Object.assign(this.attrs, attrs);
        this.setStyle(this.attrs);
        this.zoom(this.scale);
        PDFEvent.dispatch(Events.ELEMENT_UPDATE_AFTER, Object.assign({}, {
            page: this.page,
            element: this,
            updated: attrs,
            oriAttrs: oriAttrs,
            attrs: this.attrs
        }));
    }

    remove() {
        this.el.remove();
    }

    appendChild(el) {
        el.classList.add(this.childClass);
        this.el.classList.add('__pdf_el_' + this.dataType);
        if(this.dataType == 'textArt'){
            this.elChild.classList.add('text_art_' + this.attrs.textArtType)
            this.elChild.classList.add('text_art');
        }
        this.el.appendChild(el);
    }

    getY() {
        const height = this.page.height;
        let rect = this.page.readerPage.content.getBoundingClientRect();
        let scale = height / rect.height;
        let y = !this.el.style.top ? 0 : parseFloat(this.el.style.top);
        return y * scale + (this.options.drawOffset.y / this.pageScale);
    }

    getX() {
        const width = this.page.width;
        let rect = this.page.readerPage.content.getBoundingClientRect();
        let scale = width / rect.width;
        let x = !this.el.style.left ? 0 : parseFloat(this.el.style.left);
        return x * scale + (this.options.drawOffset.x / this.pageScale);
    }

    async render() {
        this.elChild = this.childElement();
        if (!this.elChild) return;
        
        this.appendChild(this.elChild);
        this.el.classList.add('active');
        this.el.setAttribute('data-type', this.dataType);

        const elCanvas = this.page.readerPage.content;
        if (this.options.pos.x === null) {
            this.options.pos.x = (elCanvas.offsetWidth / 2.2) + 'px';
        }
        if (this.options.pos.y === null) {
            this.options.pos.y = (elCanvas.offsetHeight / 2.2) + 'px';
        }
        if (typeof (this.options.pos.x) == 'number') {
            this.options.pos.x = this.options.pos.x + 'px';
        }
        if (typeof (this.options.pos.y) == 'number') {
            this.options.pos.y = this.options.pos.y + 'px';
        }

        this.options.resizableOptions.inElement = elCanvas;
        let onResizeStart = null;
        if (this.options.resizableOptions.onResizeStart) {
            onResizeStart = this.options.resizableOptions.onMove;
        }
        this.options.resizableOptions.onResizeStart = (el, evt, that) => {
            if (typeof(onResizeStart) == 'function') {
                onResizeStart(el, evt, that);
            } 
            PDFEvent.dispatch(Events.ELEMENT_RESIZE_START, {
                page: this.page,
                element: this, 
                evt, 
                that
            });
            evt.stopPropagation();
        }

        let onResizeMove = null;
        if (this.options.resizableOptions.onMove) {
            onResizeMove = this.options.resizableOptions.onMove;
        }
        this.options.resizableOptions.onMove = (el, evt, that) => {
            if (typeof(onResizeMove) == 'function') {
                onResizeMove(el, evt, that);
            } 
            PDFEvent.dispatch(Events.ELEMENT_RESIZING, {
                page: this.page,
                element: this, 
                evt, 
                that
            });
        }

        let onResizeUp = null;
        if (this.options.resizableOptions.onUp) {
            onResizeUp = this.options.resizableOptions.onUp;
        }
        this.options.resizableOptions.onUp = (el, evt, that) => {
            if (typeof(onResizeUp) == 'function') {
                onResizeUp(el, evt, that);
            } 
            this.setActualRect();
            PDFEvent.dispatch(Events.ELEMENT_RESIZE_END, {
                page: this.page,
                element: this, 
                evt, 
                that
            });
        }

        this.options.draggableOptions.inElement = elCanvas;
        this.options.draggableOptions.mergeAllow = false;

        let onDraggableDown = null;
        if (this.options.draggableOptions.onDown) {
            onDraggableDown = this.options.draggableOptions.onDown;
        }
        this.options.draggableOptions.onDown = (el, evt, that) => {
            if (typeof(onDraggableDown) == 'function') {
                onDraggableDown(el, evt, that);
            } 
            el.classList.add('moving');
            this.page.elements.setActive(this.id);
            PDFEvent.dispatch(Events.ELEMENT_DOWN, {
                page: this.page,
                element: this, 
                evt, 
                that
            });
            evt.stopPropagation();
        }


        let onMoveStart = null;
        if (this.options.draggableOptions.onMoveStart) {
            onMoveStart = this.options.draggableOptions.onMoveStart;
        }
        this.options.draggableOptions.onMoveStart = (el, evt, that) => {
            if (typeof(onMoveStart) == 'function') {
                onMoveStart(el, evt, that);
            } 
            PDFEvent.dispatch(Events.ELEMENT_MOVE_START, {
                page: this.page,
                element: this, 
                evt, 
                that
            });
            evt.stopPropagation();
        }
        

        let onDraggableUp = null;
        if (this.options.draggableOptions.onUp) {
            onDraggableUp = this.options.draggableOptions.onUp;
        }
        this.options.draggableOptions.onUp = (el, evt, that) => {
            if (typeof(onDraggableUp) == 'function') {
                onDraggableUp(el, evt, that);
            }
            el.classList.remove('moving');
            this.setActualRect();
            PDFEvent.dispatch(Events.ELEMENT_UP, {
                page: this.page,
                element: this, 
                evt, 
                that
            });
        }

        let onDraggableMove= null;
        if (this.options.draggableOptions.onMove) {
            onDraggableMove = this.options.draggableOptions.onMove;
        }
        this.options.draggableOptions.onMove = (el, evt, that) => {
            if (typeof(onDraggableMove) == 'function') {
                onDraggableMove(el, evt, that);
            }
            PDFEvent.dispatch(Events.ELEMENT_MOVE, {
                page: this.page,
                element: this, 
                evt, 
                that
            });
        }

        this.dragElement = new DragElement({
            draggable: this.options.draggable,
            draggableOptions: this.options.draggableOptions,
            resizable: this.options.resizable,
            resizableOptions: this.options.resizableOptions,
        });
        this.dragElement.addElement(this.el, this.options.pos);
        
        //添加在元素在elWrapper中会有层级问题导致无法选中
        // this.page.readerPage.elWrapper.appendChild(this.el);
        this.page.readerPage.elElementLayer.appendChild(this.el);

        this.setActualRect();

        PDFEvent.dispatch(Events.ELEMENT_RENDERD, {
            page: this.page,
            element: this
        });
        return this.el;
    }
}

export { BaseElement };