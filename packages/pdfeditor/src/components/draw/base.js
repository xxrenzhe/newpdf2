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
        this.activeInputType = null;
        this.lastPrimaryInteractionAt = 0;
        this.initEventTypes();
        this.initEvents();
    }

    initEvents() {
        const eventTypeGroups = [this.eventTypes, ...(this.fallbackEventTypes || [])];
        const downEvents = [...new Set(eventTypeGroups.map(types => types.down))];
        const moveEvents = [...new Set(eventTypeGroups.map(types => types.move))];
        const upEvents = [...new Set(eventTypeGroups.map(types => types.up))];

        const onDown = e => {
            if (this.shouldIgnoreFallbackMouseEvent(e)) return;
            if (this.drawing) return;
            if (this.disabled || (e.target != this.container && !e.target?.classList?.contains('__draw_canvas'))) return;
            //不放在getPoe方法中是为了避免每次调用都去计算offset
            this.offset = this.getOffset(this.container);
            this.drawing = true;
            this.activeInputType = this.getInputType(e);
            if (this.activeInputType !== 'mouse') {
                this.lastPrimaryInteractionAt = Date.now();
            }
            this.firstPos = this.getPos(e);
            this.onDown(e);
        };

        const onMove = e => {
            if (!this.drawing || this.disabled) return;
            if (this.shouldIgnoreFallbackMouseEvent(e)) return;
            if (this.activeInputType && this.getInputType(e) !== this.activeInputType) return;
            if (this.activeInputType !== 'mouse') {
                this.lastPrimaryInteractionAt = Date.now();
            }
            this.onMove(e);
        };

        const onUp = e => {
            if (!this.drawing || this.disabled) return;
            if (this.shouldIgnoreFallbackMouseEvent(e)) return;
            if (this.activeInputType && this.getInputType(e) !== this.activeInputType) return;
            if (this.activeInputType !== 'mouse') {
                this.lastPrimaryInteractionAt = Date.now();
            }
            this.drawing = false;
            this.flushRect(e);
            let res = this.onUp(e);
            if (!res) {
                res = [];
            }
            this.activeInputType = null;
            this.options.onFinished(...res);
        };

        downEvents.forEach(type => this.container.addEventListener(type, onDown));
        moveEvents.forEach(type => this.container.addEventListener(type, onMove));
        upEvents.forEach(type => this.container.addEventListener(type, onUp));
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
        const point = this.getEventPoint(e);
        let x = 0;
        let y = 0;
        if (this.scrollElement) {
            x = this.scrollElement.scrollLeft;
            y = this.scrollElement.scrollTop;
        }
        const pos = {
            x: point.x - this.offset.left + x,
            y: point.y - this.offset.top + y
        };
        if (!this.firstPos) {
            this.firstPos = pos;   
        }
        return pos;
    }

    initEventTypes() {
        this.fallbackEventTypes = [];
        if (window.PointerEvent) {
            this.eventTypes = {
                down: 'pointerdown',
                up: 'pointerup',
                move: 'pointermove'
            };
            this.fallbackEventTypes.push({
                down: 'mousedown',
                up: 'mouseup',
                move: 'mousemove'
            });
        } else {
            try {
                document.createEvent('TouchEvent');
                this.eventTypes = {
                    down: 'touchstart',
                    up: 'touchend',
                    move: 'touchmove'
                };
                this.fallbackEventTypes.push({
                    down: 'mousedown',
                    up: 'mouseup',
                    move: 'mousemove'
                });
            } catch (e) {
                this.eventTypes = {
                    down: 'mousedown',
                    up: 'mouseup',
                    move: 'mousemove'
                };
            }
        }
    }

    getInputType(e) {
        if (!e?.type) return 'mouse';
        if (e.type.indexOf('pointer') === 0) return 'pointer';
        if (e.type.indexOf('touch') === 0) return 'touch';
        return 'mouse';
    }

    shouldIgnoreFallbackMouseEvent(e) {
        if (!e || !e.type || e.type.indexOf('mouse') !== 0 || !e.isTrusted) return false;
        if (!this.lastPrimaryInteractionAt) return false;
        return Date.now() - this.lastPrimaryInteractionAt < 800;
    }

    getEventPoint(e) {
        if (e?.touches?.length) {
            return {
                x: e.touches[0].pageX,
                y: e.touches[0].pageY
            };
        }
        if (e?.changedTouches?.length) {
            return {
                x: e.changedTouches[0].pageX,
                y: e.changedTouches[0].pageY
            };
        }
        if (typeof e?.pageX === 'number' && typeof e?.pageY === 'number') {
            return {
                x: e.pageX,
                y: e.pageY
            };
        }
        return {
            x: (e?.clientX || 0) + window.scrollX,
            y: (e?.clientY || 0) + window.scrollY
        };
    }
}

export default Base;
