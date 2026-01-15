/*
{ type: 'mousedown', listener: listeners.pointerDown },
{ type: 'mousemove', listener: listeners.pointerMove },
{ type: 'mouseup', listener: listeners.pointerUp },

{ type: 'touchstart', listener: releasePointersOnRemovedEls },
{ type: 'touchstart', listener: listeners.pointerDown },
{ type: 'touchmove', listener: listeners.pointerMove },
{ type: 'touchend', listener: listeners.pointerUp },
{ type: 'touchcancel', listener: listeners.pointerUp },


PointerEvent

up:     'pointerup',
down:   'pointerdown',
over:   'pointerover',
out:    'pointerout',
move:   'pointermove',
cancel: 'pointercancel',
*/


class Draggable {

    /**
     * 
     * @param {*} options 
     * @param {String|Array[Node]|Node} options.selector
     * options.selector可以为字符串、Node数组或Node
     */
    constructor(options = {}) {
        this.options = {
            selector: null,
            onDown: (activeElement, e, that) => {},
            onMoveStart: (activeElement, e, that) => {},
            onMove: (activeElement, e, that) => {},
            onUp: (activeElement, e, that) => {},
            //重叠在一起时
            onMergeEnter: (activeElement, targetElement, e, that) => {},
            onMergeOut: (activeElement, targetElement, e, that) => {},
            //重叠并松开鼠标
            onMerge: (activeElement, targetElement, e, that) => {},
            
            //当snap为true时grid应用到拖动时，为false时应用到松开鼠标时
            //{x | y}
            grid: null,
            disabled: false,
            snap: false,
            snapType: 'mouseup',
            mergeStayTime: 260,
            mergeAllow: true,
            //限制可拖动范围，参数Element
            inElement: null,
            inElementPadding: 0,
            isCancelDefaultEvent: true,
            zIndex: 1
        };
        this.options = Object.assign(this.options, options);
        this.disabled = this.options.disabled;
        this.offsetX = 0;
        this.offsetY = 0;
        this.clientX = 0;
        this.clientY = 0;
        //实时的鼠标位置，主要用在合并的判断
        this.currentClientX = 0;
        this.currentClientY = 0;
        this.timeout = null;
        this.isMouseDown = false;
        this.dragging = false;
        this.merging = false;
        this.inElement = this.options.inElement || document.body;
        this.snap = this.options.snap || false;
        this.snapType = this.options.snapType || 'mouseup';  //mouseup, mousemove,
        this.grid = {
            x: 0,
            y: 0
        };
        if (typeof(this.options.grid) == 'object') {
            this.grid = Object.assign(this.grid, this.options.grid);
        }
        
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
        
        //当前拖动的对象
        this.activeElement = null;
        //放置的对象
        this.targetElement = null;
        if (this.options.selector) {
            this.initEvents();
        } else {
            this.elements = []; 
        }

        this._downEvent = e => {
            return this.downEvent(e);
        }
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
            element.zIndex = this.options.zIndex;
            element.addEventListener(this.eventTypes.down, e => {
                return this.downEvent(e);
            });
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

    addElement(element, positionOptions) {
        element.zIndex = this.options.zIndex;
        if (positionOptions) {
            if (positionOptions.position) {
                if (element.moveElement) {
                    element.moveElement.style.position = positionOptions.position;
                } else {
                    element.style.position = positionOptions.position;
                }
            }
            if (positionOptions.x !== null) {
                if (element.moveElement) {
                    element.moveElement.style.left = positionOptions.x;
                } else {
                    element.style.left = positionOptions.x;
                }
            }
            if (positionOptions.y !== null) {
                if (element.moveElement) {
                    element.moveElement.style.top = positionOptions.y;
                } else {
                    element.style.top = positionOptions.y;
                }
            }
        }
        
        this.addEvents(element);
        this.elements.push(element);
    }

    removeElement(element) {
        let index = this.elements.findIndex(el => el == element);
        let elements = this.elements.splice(index, 1);
        elements.forEach(el => {
            this.removeEvents(el);
        });
    }

    addEvents(el) {
        el.addEventListener(this.eventTypes.down, this._downEvent);
    }

    removeEvents(el) {
        el.removeEventListener(this.eventTypes.down, this._downEvent);
    }

    downEvent(e) {
        if (e.target instanceof Image) {
            this.cancelDefaultEvent(e);
        }
        if (e.which != 1 || this.disabled) {
            if (this.options.isCancelDefaultEvent) {
                this.cancelDefaultEvent(e);
            }
            return;
        }
        const element = e.currentTarget;
        // element.style.cursor = 'move';
        //指定拖动元素
        if (element.moveElement) {
            this.activeElement = element.moveElement;
            this.activeElement.zIndex = this.options.zIndex;
        } else {
            this.activeElement = element;
        }
        
        //计算除当前点击外所有对象的位置
        this.setPositionAll();

        this.isMouseDown = true;
        if (e.type == 'mousedown' && this.options.isCancelDefaultEvent) {
            this.cancelDefaultEvent(e);
        }

        const rect = this.activeElement.getBoundingClientRect();
        let hanlder = e.touches ? e.touches[0] : e;
        //鼠标点击位置到所在元素的边距
        //看了jspanel的源码，里面注释说明android下的ff不支持page[X|Y]属性
        //page[X|Y]替换为client[X|Y]
        this.clientX = hanlder.clientX;
        this.clientY = hanlder.clientY;
        this.offsetX = rect.left;
        this.offsetY = rect.top;
        let that = this;

        this.activeElement.oriLeft = this.activeElement.style.left;
        this.activeElement.oriTop = this.activeElement.style.top;

        this.activeElement.style.position = 'fixed';
        this.activeElement.style.zIndex = this.activeElement.zIndex + 1;
        // this.activeElement.style.margin = '0';
        this.activeElement.style.left = rect.left + 'px';
        this.activeElement.style.top = rect.top + 'px';

        //监听移动事件
        let moveEvent = function(e) {
            return that.moveEvent(e);
        };
        document.addEventListener(this.eventTypes.move, moveEvent);

        //监听鼠标松开事件
        let upEvent = function(e) {
            document.removeEventListener(that.eventTypes.move, moveEvent);
            document.removeEventListener(that.eventTypes.up, upEvent);
            return that.upEvent(e);
        }
        document.addEventListener(this.eventTypes.up, upEvent);

        //鼠标右键事件
        // this.activeElement.addEventListener('contextmenu', (e) => {
        //     document.removeEventListener(that.eventTypes.move, moveEvent);
        //     document.removeEventListener(that.eventTypes.up, upEvent);
        //     return that.upEvent(e);
        // });

        this.options.onDown(this.activeElement, e, this);
    }

    _isMerge(elTarget, elActive) {
        let targetRect = elTarget.getBoundingClientRect();
        let targetMinX = targetRect.x;
        let targetMinY = targetRect.y;
        let targetMaxX = targetRect.x + targetRect.width;
        let targetMaxY = targetRect.y + targetRect.height;

        let activeRect = elActive.getBoundingClientRect();
        let activeMinX = activeRect.x;
        let activeMinY = activeRect.y;
        let activeMaxX = activeRect.x + activeRect.width;
        let activeMaxY = activeRect.y + activeRect.height;
        return targetMinX <= activeMaxX &&
                targetMaxX >= activeMinX &&
                targetMinY <= activeMaxY &&
                targetMaxY >= activeMinY;
    }

    setPositionAll() {
        this.elements.forEach((element, i) => {
            //编号 方便调换位置
            element.sort = i;
        });
    }
    
    moveEvent(e) {
        if (this.isMouseDown) {
            if (!this.dragging) {
                this.options.onMoveStart(this.activeElement, e, this);
            }
            this.dragging = true;
        }
        let hanlder = e.touches ? e.touches[0] : e;
        let x = hanlder.clientX - this.clientX;
        let y = hanlder.clientY - this.clientY;
        x += this.offsetX;
        y += this.offsetY;

        if (this.inElement) {
            const inElementRect = this.inElement.getBoundingClientRect();
            const activeElementRect = this.activeElement.getBoundingClientRect();

            let minX = inElementRect.left + this.options.inElementPadding;
            let maxX = inElementRect.right - activeElementRect.width - this.options.inElementPadding;
            if (x < minX) {
                x = minX;
            }
            if (x > maxX) {
                x = maxX;
            }
            
            let minY = inElementRect.top + this.options.inElementPadding;
            let maxY = inElementRect.bottom - activeElementRect.height - this.options.inElementPadding;
            if (y < minY) {
                y = minY;
            }
            if (y > maxY) {
                y = maxY;
            }
            /*
            let minX = this.inElement.offsetLeft;
            let maxX = this.inElement.offsetWidth - this.activeElement.offsetWidth;
            if (x < minX) {
                x = minX;
            }
            if (x > maxX) {
                x = maxX;
            }
            
            let minY = this.inElement.offsetTop;
            let maxY = this.inElement.offsetTop + this.inElement.offsetHeight - this.activeElement.offsetHeight;
            if (y < minY) {
                y = minY;
            }
            if (y > maxY) {
                y = maxY;
            }
            */
        }

        if (this.snap && this.snapType == 'move') {
            let gridX = typeof(this.grid.x) != 'undefined';
            let gridY = typeof(this.grid.y) != 'undefined';
            if (gridX && this.grid.x > 0) {
                x = Math.round((this.offsetX + (hanlder.clientX - this.clientX)) / this.grid.x) * this.grid.x;
            }
            
            if (gridY && this.grid.y > 0) {
                y = Math.round((this.offsetY + (hanlder.clientY - this.clientY)) / this.grid.x) * this.grid.x;
            }
        }
        this.activeElement.style.top = y + 'px';
        this.activeElement.style.left = x + 'px';
        
        if (this.options.mergeAllow && this.dragging) {
            this.currentClientX = hanlder.clientX;
            this.currentClientY = hanlder.clientY;
            

            let isMergeEntered = false;
            for (let i = 0; i < this.elements.length; i++) {
                const item = this.elements[i];
                if (this.activeElement == item) {
                    continue;
                }
                if (this._isMerge(item, this.activeElement)) {
                    isMergeEntered = true;
                    if (this.targetElement == this.activeElement || this.targetElement == item) {
                        break;
                    }
                    this.targetElement = item;

                    if (!this.timeout) {
                        this.timeout = setTimeout(() => {
                            clearTimeout(this.timeout);
                            this.timeout = null;
    
                            if (!this.merging && this.dragging && this.targetElement && this._isMerge(this.targetElement, this.activeElement)) {
                                this.merging = true;
                                this.options.onMergeEnter(this.activeElement, this.targetElement, e, this);
                            }
                        }, this.options.mergeStayTime);
                    }
                    break;
                }
                // } else {
                //     this.targetElement = null;
                //     isMergeEntered = false;
                // }
            }

            if (!isMergeEntered) {
                if (this.merging) {
                    this.merging = false;
                    this.options.onMergeOut(this.activeElement, this.targetElement, e, this);
                }
                this.targetElement = null;
            }
        }

        this.options.onMove(this.activeElement, e, this);
    }

    setZIndex(element, zIndex) {
        element.zIndex = zIndex;
    }

    snapEnable(snapType, grid) {
        this.snap = true;
        if (snapType) {
            this.snapType = snapType;
        }
        if (grid) {
            this.grid = grid;
        }
    }

    snapTo(callback) {
        let ms = 300;
        this.elements.forEach(element => {
            let el = element.moveElement || element;
            if (el.offsetLeft <= 0 || el.offsetTop <= 0) {
                return;
            }
            el.style.transition = 'left ' + ms + 'ms, top ' + ms + 'ms';
            let x = Math.round(el.offsetLeft / this.grid.x) * this.grid.x;
            let y = Math.round(el.offsetTop / this.grid.y) * this.grid.y;
            el.style.left = x + 'px';
            el.style.top = y + 'px';

            this.options.onUp(el, null, this);
        });

        setTimeout(() => {
            this.elements.forEach(element => {
                let el = element.moveElement || element;
                el.style.transition = '';
                if (typeof(callback) == 'function') {
                    callback(el);
                }
            });
        }, ms);
    }

    snapDisable() {
        this.snap = false;
    }

    upEvent(e) {
        this.isMouseDown = false;
        if (!this.activeElement) return;
        let hanlder = e.changedTouches ? e.changedTouches[0] : e;
        // this.activeElement.style.cursor = 'default';
        if (e.type == 'mouseup' && this.options.isCancelDefaultEvent) {
            this.cancelDefaultEvent(e);
        }
        
        if (this.snap && this.snapType == 'mouseup' && this.dragging) {
            let x = Math.round(this.activeElement.offsetLeft / this.grid.x) * this.grid.x;
            let y = Math.round(this.activeElement.offsetTop / this.grid.y) * this.grid.y;
            this.activeElement.style.left = x + 'px';
            this.activeElement.style.top = y + 'px';
        }
        this.dragging = false;

        if (this.options.mergeAllow && this.merging) {
            this.merging = false;
            this.options.onMerge(this.activeElement, this.targetElement, hanlder, this);
            this.options.onUp(this.activeElement, e, this);
            this.activeElement = null;
            this.targetElement = null;
            return;
        }

        // this.activeElement.style.zIndex = 'inherit';
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

        this.activeElement.style.zIndex = this.activeElement.style.zIndex - 1;

        this.options.onUp(this.activeElement, e, this);
        this.activeElement = null;
        this.targetElement = null;
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

export default Draggable;