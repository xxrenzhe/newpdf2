class Base {
    constructor(options) {
        this.options = {
            container: '',
            zIndex: 1,
            onFinished: () => {},
            scrollElement: null
        };
        if (options) {
            this.options = Object.assign(this.options, options);
        }

        this.scrollElement = this.options.scrollElement;
        this.firstPos = null;
        //元素到body之间的偏移
        this.offset = {
            left: 0,
            top: 0
        };

        this.rect = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };

        if (this.options.container instanceof Node) {
            this.container = this.options.container;
        } else {
            this.container = document.querySelector(this.options.container);
        }

        this.disabled = false;
        this.drawing = false;
        this.initEventTypes();
        this.initEvents();
    }

    initEvents() {
        // this.drawing = false;
        this.container.addEventListener(this.eventTypes.down, e => {
            if (this.disabled || (e.target != this.container && !e.target.classList.contains('__draw_canvas'))) return;
            //不放在getPoe方法中是为了避免每次调用都去计算offset
            this.offset = this.getOffset(this.container);
            this.drawing = true;
            this.firstPos = this.getPos(e);
            this.onDown(e);
        });

        this.container.addEventListener(this.eventTypes.move, e => {
            if (!this.drawing || this.disabled) return;
            this.onMove(e);
        });

        this.container.addEventListener(this.eventTypes.up, e => {
            if (!this.drawing || this.disabled) return;
            this.drawing = false;
            this.flushRect(e);
            let res = this.onUp(e);
            if (!res) {
                res = [];
            }
            this.options.onFinished(...res);
        });
    }

    enable() {
        this.disabled = false;
    }

    disable() {
        this.drawing = false;
        this.disabled = true;
    }

    flushRect(e) {
        //line基于canvas绘制，没有box对象
        if (!this.box) {
            // let pos = this.getPos(e);
            // this.rect = {
            //     x: this.firstPos.x,
            //     y: this.firstPos.y,
            //     width: pos.x - this.firstPos.x,
            //     height: pos.y - this.firstPos.y
            // };
            return this.rect;
        }

        let _rect = this.box.getBoundingClientRect();
        this.rect = {
            x: parseInt(this.box.style.left),
            y: parseInt(this.box.style.top),
            width: _rect.width,
            height: _rect.height
        };
        return this.rect;
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
        let x = 0;
        let y = 0;
        if (this.scrollElement) {
            x = this.scrollElement.scrollLeft;
            y = this.scrollElement.scrollTop;
        }
        const pos = {
            x: e.pageX - this.offset.left + x,
            y: e.pageY - this.offset.top + y
        };
        if (!this.firstPos) {
            this.firstPos = pos;   
        }
        return pos;
    }

    initEventTypes() {
        if (window.PointerEvent) {
            this.eventTypes = {
                down: 'pointerdown',
                up: 'pointerup',
                move: 'pointermove'
            };
        } else {
            try {
                document.createEvent('TouchEvent');
                this.eventTypes = {
                    down: 'touchstart',
                    up: 'touchend',
                    move: 'touchmove'
                };
            } catch (e) {
                this.eventTypes = {
                    down: 'mousedown',
                    up: 'mouseup',
                    move: 'mousemove'
                };
            }
        }
    }
}

export default Base;