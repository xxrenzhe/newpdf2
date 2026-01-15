
import './resizable.css';

class Resizable {

    /**
     * 
     * @param {*} options 
     * @param {String|Array[Node]|Node} options.selector
     * options.selector可以为字符串、Node数组或Node
     */
    constructor(options = {}) {
        this.options = {
            selector: null,
            minWidth: 100,
            minHeight: 100,
            //限制可拖动范围，默认当前body. 参数Element
            inElement: null,
            inElementPadding: 0,
            showBorder: false,
            elementClass: '__resizable',
            borderClass: '__resizable-border',
            position: ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw', 'wr', 'er', 'nr', 'sr', 'ner', 'ser', 'swr', 'nwr'], //Border styles 'wr', 'er', 'nr', 'sr', 'ner', 'ser', 'swr', 'nwr'
            onDown: (activeElement, e, that) => {},
            onResizeStart: (activeElement, e, that) => {},
            onMove: (activeElement, e, that) => {},
            onUp: (activeElement, e, that) => {},
            //是否默认给主元素加上定位
            setPosition: false,
            disabled: false,
            disabledRotate: true,
            isRatio: false
        };
        this.options = Object.assign(this.options, options);
        this._disabled = this.options.disabled;
        this._disabledRotate = this.options.disabledRotate;
        this.isMouseDown = false;
        this.dragging = false;
        this.deg = 0;

        if (this.supportTouchEvent()) {
            this.eventTypes = {
                down: 'touchstart',
                up: 'touchend',
                move: 'touchmove'
            };
        } else {
            this.eventTypes = {
                down: 'mousedown',
                up: 'mouseup',
                move: 'mousemove'
            };
        }
        this.inElement = this.options.inElement;

        this.position = null;
        this.activeElement = null;
        if (this.options.selector) {
            this.initEvents();
        } else {
            this.elements = []; 
        }
    }

    get disabled() {
        return this._disabled;
    }

    set disabled(val) {
        this._disabled = val;
        this.elements.forEach(element => {
            let elHandles = element.querySelectorAll('.resizable-handle');
            elHandles.forEach(handle => {
                if (this._disabled) {
                    handle.classList.add('resizable-disabled');
                } else {
                    handle.classList.remove('resizable-disabled');
                }
            });
        });
    }

    get disabledRotate() {
        return this._disabledRotate;
    }

    set disabledRotate(val) {
        this._disabledRotate = val;
        this.elements.forEach(element => {
            let elHandle= element.querySelectorAll('.resizable-rotation');
            if (this._disabledRotate) {
                elHandle.classList.add('resizable-disabled');
            } else {
                elHandle.classList.remove('resizable-disabled');
            }
        });
    }

    initEvents() {
        this.elements = [];
        if (this.options.selector instanceof Node) {
            this.elements.push(this.options.selector);
        } else if (this.options.selector instanceof NodeList) {
            this.elements = this.options.selector;
        } else {
            this.elements = document.querySelectorAll(this.options.selector);
        }

        this.nodeListToArray();
        this.elements.forEach(element => {
            this.addElement(element);
        });
    }

    nodeListToArray() {
        const arrElements = [];
        if (this.elements instanceof NodeList) {
            this.elements.forEach(item => {
                arrElements.push(item);
            });
            this.elements = arrElements;
        }
    }

    addElement(element) {
        element.classList.add(this.options.elementClass);
        if (this.options.showBorder) {
            element.classList.add(this.options.borderClass);
        }
        if (this.options.setPosition) {
            element.style.position = 'absolute';
        }
        this.options.position.forEach(name => {
            const newElement = document.createElement('div');
            newElement.className = 'resizable-handle resizable-' + name + (this.disabled ? ' resizable-disabled' : '');
            element.append(newElement);

            newElement.addEventListener(this.eventTypes.down, e => {
                this.activeElement = element;
                this.position = name;
                return this.downEvent(e);
            });
        });
        if (!this.disabledRotate) {
            const rotElement = document.createElement('div');
            rotElement.className = 'resizable-handle resizable-rotation' + (this.disabled ? ' resizable-disabled' : '');
            const rotHandleElement = document.createElement('div');
            rotHandleElement.className = 'resizable-rotation-handle';
            rotHandleElement.addEventListener(this.eventTypes.down, e => {
                e.stopPropagation();
                this.activeElement = element;
                return this.downRotateEvent(e);
            });
            rotElement.append(rotHandleElement);
            element.append(rotElement);
        }
        this.elements.push(element);
    }

    downEvent(e) {
        if (e.which != 1 || this.disabled) {
            return;
        }
        this.isMouseDown = true;
        if (e.type == 'mousedown') {
            this.cancelDefaultEvent(e);
        }

        this.activeElement.oriLeft = this.activeElement.style.left;
        this.activeElement.oriTop = this.activeElement.style.top;

        if (getComputedStyle(this.activeElement).getPropertyValue('position') != 'fixed') {
            const rect = this.activeElement.getBoundingClientRect();
            this.activeElement.style.position = 'fixed';
            this.activeElement.style.left = rect.left + 'px';
            this.activeElement.style.top = rect.top + 'px';
        }

        let handler = e.touches ? e.touches[0] : e;
        //鼠标点击位置到所在元素的边距
        this.clientX = handler.clientX;
        this.clientY = handler.clientY;
        this.offsetX = this.activeElement.offsetLeft;
        this.offsetY = this.activeElement.offsetTop;
        this.offsetW = this.activeElement.offsetWidth;
        this.offsetH = this.activeElement.offsetHeight;
        let that = this;

        //监听移动事件
        let moveEvent = function(e) {
            return that.moveEvent(e);
        };
        document.addEventListener(this.eventTypes.move, moveEvent);

        //监听鼠标松开事件
        let upEvent = function(e) {
            that.position = null;
            document.removeEventListener(that.eventTypes.move, moveEvent);
            document.removeEventListener(that.eventTypes.up, upEvent);
            return that.upEvent(e);
        }
        document.addEventListener(this.eventTypes.up, upEvent);

        //鼠标右键事件
        // this.activeElement.addEventListener('contextmenu', (e) => {
        //     that.position = null;
        //     document.removeEventListener(that.eventTypes.move, moveEvent);
        //     document.removeEventListener(that.eventTypes.up, upEvent);
        //     return that.upEvent(e);
        // });

        this.options.onDown(this.activeElement, e, this);
    }

    moveEvent(e) {
        if (this.isMouseDown) {
            if (!this.dragging) {
                this.options.onResizeStart(this.activeElement, e, this);
            }
            this.dragging = true;
        }

        //clientHeight 内容 + 内边距
        //offsetHeight 内容 + 内边距 + 边框
        let handler = e.touches ? e.touches[0] : e;
        let width = null;
        let height = null;

        // const rect = this.activeElement.getBoundingClientRect();
        // let intElWidth = rect.width;
        // let intElHeight = rect.height;
        
        let inElementRect = {
            left: 0,
            right: window.innerWidth - 10,
            top: 0,
            bottom: window.innerHeight - 10
        };
        if (this.inElement) {
            inElementRect = this.inElement.getBoundingClientRect();
        }
        
        // let intElWidth = parseInt(this.activeElement.style.width);
        // let intElHeight = parseInt(this.activeElement.style.height);

        let clientX = handler.clientX;
        let clientY = handler.clientY;

        switch (this.position) {
            case 'n':
            case 'nr':
                if (inElementRect && handler.clientY <= (inElementRect.top + this.options.inElementPadding)) {
                    return;
                }

                height = this.offsetY - handler.clientY;
                if ((this.offsetH + height) < this.options.minHeight) {
                    return;
                }
                this.activeElement.style.top = handler.clientY + 'px';
                this.activeElement.style.height = (this.offsetH + height) + 'px';
                break;
            case 'e':
            case 'er':
                if (inElementRect && handler.clientX >= (inElementRect.right - this.options.inElementPadding)) {
                    return;
                }

                width = handler.clientX - this.offsetX - this.offsetW;
                if ((this.offsetW + width) < this.options.minWidth) {
                    return;
                }
                this.activeElement.style.width = (this.offsetW + width) + 'px';
                break;
            case 's':
            case 'sr':
                if (inElementRect && handler.clientY >= (inElementRect.bottom - this.options.inElementPadding)) {
                    return;
                }

                height = handler.clientY - this.offsetY - this.offsetH;
                if ((this.offsetH + height) < this.options.minHeight) {
                    return;
                }
                this.activeElement.style.height = (this.offsetH + height) + 'px';
                break;
            case 'w':
            case 'wr':
                if (inElementRect && handler.clientX <= (inElementRect.left + this.options.inElementPadding)) {
                    return;
                }

                width = this.offsetX - handler.clientX;
                if ((this.offsetW + width) < this.options.minWidth) {
                    return;
                }
                this.activeElement.style.left = handler.clientX + 'px';
                this.activeElement.style.width = (this.offsetW + width) + 'px';
                break;
            case 'ne':
            case 'ner':
                height = this.offsetY - handler.clientY;
                width = handler.clientX - this.offsetX - this.offsetW;
                if (this.options.isRatio) {
                    let offset = this.clientY - handler.clientY;
                    width = offset;
                    height = offset;
                    clientY = this.offsetY - offset;
                }

                if (!(inElementRect && handler.clientY <= (inElementRect.top + this.options.inElementPadding))) {
                    if ((this.offsetH + height) < this.options.minHeight) {
                        return;
                    }
                    this.activeElement.style.top = clientY + 'px';
                    this.activeElement.style.height = (this.offsetH + height) + 'px';
                }
                
                if (!(inElementRect && handler.clientX >= (inElementRect.right - this.options.inElementPadding))) {
                    if ((this.offsetW + width) < this.options.minWidth) {
                        return;
                    }
                    this.activeElement.style.width = (this.offsetW + width) + 'px';
                }
                break;
            case 'se':
            case 'ser':
                height = handler.clientY - this.offsetY - this.offsetH;
                width = handler.clientX - this.offsetX - this.offsetW;
                if (this.options.isRatio) {
                    let offset = handler.clientY - this.clientY;
                    width = offset;
                    height = offset;
                }

                if (!(inElementRect && handler.clientY >= (inElementRect.bottom - this.options.inElementPadding))) {
                    if ((this.offsetH + height) < this.options.minHeight) {
                        return;
                    }
                    this.activeElement.style.height = (this.offsetH + height) + 'px';
                }

                if (!(inElementRect && handler.clientX >= (inElementRect.right - this.options.inElementPadding))) {
                    if ((this.offsetW + width) < this.options.minWidth) {
                        return;
                    }
                    this.activeElement.style.width = (this.offsetW + width) + 'px';
                }
                break;
            case 'sw':
            case 'swr':
                height = handler.clientY - this.offsetY - this.offsetH;
                width = this.offsetX - handler.clientX;
                if (this.options.isRatio) {
                    let offset = handler.clientY - this.clientY;
                    width = offset;
                    height = offset;
                    clientX = this.offsetX - offset;
                }

                if (!(inElementRect && handler.clientY >= (inElementRect.bottom - this.options.inElementPadding))) {
                    if ((this.offsetH + height) < this.options.minHeight) {
                        return;
                    }
                    this.activeElement.style.height = (this.offsetH + height) + 'px';
                }

                if (!(inElementRect && handler.clientX <= (inElementRect.left + this.options.inElementPadding))) {
                    if ((this.offsetW + width) < this.options.minWidth) {
                        return;
                    }
                    this.activeElement.style.left = clientX + 'px';
                    this.activeElement.style.width = (this.offsetW + width) + 'px';
                }
                break;
            case 'nw':
            case 'nwr':
                height = this.offsetY - handler.clientY;
                width = this.offsetX - handler.clientX;
                if (this.options.isRatio) {
                    let offset = this.clientY - handler.clientY;
                    width = offset;
                    height = offset;
                    clientX = this.offsetX - offset;
                    clientY = this.offsetY - offset;
                }
                
                if (!(inElementRect && handler.clientY <= (inElementRect.top + this.options.inElementPadding))) {
                    if ((this.offsetH + height) < this.options.minHeight) {
                        return;
                    }
                    this.activeElement.style.top = clientY + 'px';
                    this.activeElement.style.height = (this.offsetH + height) + 'px';
                }

                if (!(inElementRect && handler.clientX <= (inElementRect.left + this.options.inElementPadding))) {
                    if ((this.offsetW + width) < this.options.minWidth) {
                        return;
                    }
                    this.activeElement.style.left = clientX + 'px';
                    this.activeElement.style.width = (this.offsetW + width) + 'px';
                }
        }

        this.options.onMove(this.activeElement, e, this);
    }

    upEvent(e) {
        this.isMouseDown = false;
        this.dragging = false;
        if (e.type == 'mouseup') {
            this.cancelDefaultEvent(e);
        }

        this.activeElement.style.position = 'absolute';
        if (this.inElement) {
            const rect = this.inElement.getBoundingClientRect();
            let left = parseInt(this.activeElement.style.left) - rect.left;
            let top = parseInt(this.activeElement.style.top) - rect.top;
            if (getComputedStyle(this.inElement).getPropertyValue('position') != 'static') {
                left -= this.inElement.clientLeft;
                top -= this.inElement.clientTop;
                this.activeElement.style.left = left + 'px';
                this.activeElement.style.top = top + 'px';
            } else if (!this.isStaticPosition(this.inElement)) {
                this.activeElement.style.left = left + 'px';
                this.activeElement.style.top = top + 'px';
            }
        }

        this.options.onUp(this.activeElement, e, this);
        this.activeElement = null;
    }

    downRotateEvent(e) {
        if (e.which != 1 || this.disabled || this.disabledRotate) {
            return;
        }
        this.isMouseDown = true;
        if (e.type == 'mousedown') {
            this.cancelDefaultEvent(e);
        }
        if (!this.activeElement.rotate) {
            this.activeElement.rotate = 0;
        }
        let handler = e.touches ? e.touches[0] : e;
        this.clientRotateX = handler.clientX;
        this.clientRotateY = handler.clientY;
        this.deg = 0;
        let that = this;

        //监听移动事件
        let moveEvent = function(e) {
            return that.moveRotateEvent(e);
        };
        document.addEventListener(this.eventTypes.move, moveEvent);

        //监听鼠标松开事件
        let upEvent = function(e) {
            that.position = null;
            document.removeEventListener(that.eventTypes.move, moveEvent);
            document.removeEventListener(that.eventTypes.up, upEvent);
            return that.upRotateEvent(e);
        }
        document.addEventListener(this.eventTypes.up, upEvent);
    }

    moveRotateEvent(e) {
        if (this.isMouseDown) {
            this.dragging = true;
        }
        let handler = e.touches ? e.touches[0] : e;
        this.deg = this.activeElement.rotate + (handler.clientX + handler.clientY) - (this.clientRotateX + this.clientRotateY);
        this.activeElement.style.transform = 'rotate('+ this.deg +'deg)';
    }

    upRotateEvent(e) {
        this.isMouseDown = false;
        this.dragging = false;
        if (e.type == 'mouseup') {
            this.cancelDefaultEvent(e);
        }
        this.activeElement.rotate = this.deg;
        this.activeElement = null;
    }

    isStaticPosition(el) {
        if (!el.offsetParent) {
            return true;
        }
        if (getComputedStyle(el.offsetParent).getPropertyValue('position') != 'static') {
            return false;
        }
        return this.isStaticPosition(el.offsetParent);
    }

    supportTouchEvent() {
        let isSupportTouchEvent = true;
        try {
            document.createEvent('TouchEvent');
        } catch (e) {
            isSupportTouchEvent = false;
        }
        return isSupportTouchEvent;
    }

    cancelDefaultEvent(e) {
        e.preventDefault();
        e.stopPropagation();
    }
}

export default Resizable;