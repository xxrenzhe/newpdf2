import './index.css';
const CLASS_OVERLAY = '__l_overlay';
const CLASS_ON = 'on';
const CLASS_DISABLED = 'disabled';
const MS = 350;

class Loading {
    constructor(target, width, height, color, text, fontSize) {
        this.status = 0;
        this.el = null;
        this.isOverlay = false;
        if (!width) {
            width = 24;
        }
        if (!height) {
            height = 24;
        }
        if (!color) {
            color = '#212529';
        }
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('viewBox', '0 0 1024 1024');
        this.svg.setAttribute('version', '1.1');
        this.svg.setAttribute('class', '_loading');
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
        this.svg.style.fill = color;
        const elSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        elSvgPath.setAttribute('d', 'M512 981.312a469.312 469.312 0 1 0-445.824-322.24A42.688 42.688 0 1 0 147.2 632.32 384 384 0 1 1 512 896a42.688 42.688 0 1 0 0 85.312z');
        this.svg.appendChild(elSvgPath);

        this.span = document.createElement('span');
        if (text) {
            this.span.textContent = text;
            this.span.style.color = color;
            this.span.style.fontSize = fontSize || (height / 3) + 'px';
        }

        if (target) {
            if (target instanceof Node) {
                this.el = target;
            } else if (typeof (target) == 'string') {
                this.el = document.querySelector(target);
            }

            const rect = this.el.getBoundingClientRect();
            this.targetAttrs = {
                html: this.el.innerHTML,
                width: rect.width,
                height: rect.height
            }
        }
        

        if (!this.el) {
            this.isOverlay = true;
            this.el = document.createElement('div');
            this.el.className = CLASS_OVERLAY;
            this.el.style.display = 'none';
        }
    }

    setIcon(el) {
        this.svg.remove();
        if (el instanceof Node) {
            this.svg = el;
        } else {
            this.svg = new Image();
            this.svg.src = el;
        }
        this.svg.classList.add('_loading');
    }

    getStatus() {
        return this.status;
    }

    start(callback) {
        if (this.status == 0) {
            if (this.targetAttrs) {
                this.el.innerHTML = '';
                this.el.classList.add(CLASS_DISABLED);
                if (this.targetAttrs.width) {
                    this.el.style.width = this.targetAttrs.width + 'px';
                }
                if (this.targetAttrs.height) {
                    this.el.style.height = this.targetAttrs.height + 'px';
                }
            }

            this.status = 1;
            this.el.appendChild(this.svg);
            this.el.appendChild(this.span);
            setTimeout(() => {
                this.svg.offsetWidth;
                this.svg.classList.add(CLASS_ON);
                this.span.offsetWidth;
            }, 5);
            
            if (this.isOverlay) {
                this.el.style.display = '';
                document.body.appendChild(this.el);
                this.el.offsetWidth;
                this.el.classList.add(CLASS_ON);
            }
            if (typeof (callback) == 'function') {
                callback();
            }
        }
    }

    end(callback) {
        if (this.el && this.status == 1) {
            this.svg.classList.remove(CLASS_ON);
            setTimeout(() => {
                if (this.el.contains(this.svg)) {
                    this.el.removeChild(this.svg);
                }
            }, MS);
            if (this.isOverlay) {
                this.el.classList.remove(CLASS_ON);
                setTimeout(() => {
                    this.el.remove();    
                }, MS);
            } else if (this.targetAttrs) {
                setTimeout(() => {
                    this.el.innerHTML = this.targetAttrs.html;
                    this.el.classList.remove(CLASS_DISABLED);
                    if (this.targetAttrs.width) {
                        this.el.style.width = '';
                    }
                    if (this.targetAttrs.height) {
                        this.el.style.height = '';
                    }
                }, MS);
            }

            if (typeof (callback) == 'function') {
                setTimeout(() => {
                    callback();
                }, MS);
            }
        }
        this.status = 0;
    }
}

export default Loading;