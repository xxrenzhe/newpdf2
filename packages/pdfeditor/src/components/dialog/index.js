import './index.css';

const CLASS_DIALOG = '__dialog';
const CLASS_DIALOG_OVERLAY = '__dialog_overlay';
const CLASS_DIALOG_MAIN = '__dialog_main';
const CLASS_DIALOG_HEADER = '__dialog_header';
const CLASS_DIALOG_TITLE = '__dialog_header_title';
const CLASS_DIALOG_CONTROLS = '__dialog_header_controls';
const CLASS_DIALOG_BODY = '__dialog_body';
const CLASS_OPEN = '__dialog_open';
const CLASS_CLOSE = '__dialog_close';
const CLASS_BTN = '__dialog_control_btn';

class Dialog {
    constructor(options) {
        this.options = {
            id: null,
            width: 400,
            height: 300,
            zIndex: 100,
            title: '',
            body: null,
            showHeader: true,
            showHeaderControls: true,
            overlayCloseClick: true,
            mainClass: '',
            closeBtn: {
                width: 24,
                height: 24
                // color: '#000000'
            },
            esc: true,
            animate: 'fade',
            closeRemove: false,
            initOpened: true,
            onOpen: that => {},
            onClose: that => {}
        };
        if (options) {
            this.options = Object.assign(this.options, options);
        }
        this.id = this.options.id ? this.options.id : '__dialog_' + new Date().getTime();
        this.title = this.options.title;
        this.width = this.options.width;
        this.height = this.options.height;
        this.elDialog = null;
        this.elDialogOverlay = null;
        this.elDialogMain = null;
        this.elDialogHeader = null;
        this.elDialogTitle = null;
        this.elDialogControls = null;
        this.elDialogBody = null;
        this.elClose = null;
        
        this.init();
        if (this.options.initOpened) {
            this.open();
        }
    }

    init() {
        this.elDialog = document.createElement('div');
        this.elDialog.className = CLASS_DIALOG;
        this.elDialog.setAttribute('id', this.id);

        this.elDialogOverlay = document.createElement('div');
        this.elDialogOverlay.className = CLASS_DIALOG_OVERLAY;

        this.elDialogMain = document.createElement('div');
        this.elDialogMain.className = CLASS_DIALOG_MAIN + ' ' + (this.options.mainClass || '');

        this.elDialogHeader = document.createElement('div');
        this.elDialogHeader.className = CLASS_DIALOG_HEADER;

        this.elDialogBody = document.createElement('div');
        this.elDialogBody.className = CLASS_DIALOG_BODY;

        if (this.options.showHeader) {
            this.elDialogMain.appendChild(this.elDialogHeader);
        }
        this.elDialogMain.appendChild(this.elDialogBody);

        this.elDialogOverlay.appendChild(this.elDialogMain);
        if (this.options.overlayCloseClick) {
            this.elDialogOverlay.addEventListener('mousedown', (e) => {
                if (e.target == this.elDialogOverlay) {
                    this.close();
                }
            });
        }
        this.elDialog.appendChild(this.elDialogOverlay);

        this.elDialogTitle = document.createElement('div');
        this.elDialogTitle.className = CLASS_DIALOG_TITLE;

        this.elDialogControls = document.createElement('div');
        this.elDialogControls.className = CLASS_DIALOG_CONTROLS;

        if (this.options.showHeader) {
            this.elDialogTitle.textContent = this.title;
            this.elDialogHeader.appendChild(this.elDialogTitle);

            if (this.options.showHeaderControls) {
                this.elClose = document.createElement('div');
                this.elClose.classList.add(CLASS_BTN);
                // this.elClose.style.height = this.options.closeBtn.height + 'px';
                const elSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                elSvg.setAttribute('viewBox', '0 0 1024 1024');
                elSvg.setAttribute('version', '1.1');
                elSvg.setAttribute('width', this.options.closeBtn.width);
                elSvg.setAttribute('height', this.options.closeBtn.height);
    
                const elSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                elSvgPath.setAttribute('d', 'M810.666667 273.493333L750.506667 213.333333 512 451.84 273.493333 213.333333 213.333333 273.493333 451.84 512 213.333333 750.506667 273.493333 810.666667 512 572.16 750.506667 810.666667 810.666667 750.506667 572.16 512z');
                // elSvgPath.setAttribute('fill', this.options.closeBtn.color);
                elSvg.appendChild(elSvgPath);
                this.elClose.appendChild(elSvg);
                this.elClose.addEventListener('click', () => {
                    this.close();
                });
                this.elDialogControls.appendChild(this.elClose);
                this.elDialogHeader.appendChild(this.elDialogControls);
            }
        }

        if (this.options.animate) {
            this.elDialog.classList.add(CLASS_DIALOG + '_' + this.options.animate);
        }

        if (this.options.body !== null) {
            this.setBody(this.options.body);
        }
        this.elDialog.style.zIndex = this.options.zIndex;
        document.body.appendChild(this.elDialog);
    }

    prependHeaderControl(el) {
        const elContainer = document.createElement('div');
        elContainer.classList.add(CLASS_BTN);
        elContainer.appendChild(el);
        if (this.elDialogControls.insertAdjacentElement) {
            this.elDialogControls.insertAdjacentElement('afterbegin', elContainer);
        } else {
            this.elDialogControls.insertBefore(elContainer, this.elDialogControls.firstElementChild);
        }
    }

    appendHeaderControl(el) {
        const elContainer = document.createElement('div');
        elContainer.classList.add(CLASS_BTN);
        elContainer.appendChild(el);
        if (this.elDialogControls.insertAdjacentElement) {
            this.elDialogControls.insertAdjacentElement('beforeend', elContainer);
        } else {
            this.elDialogControls.appendChild(elContainer);
        }
    }

    open() {
        const keyupEvent = (e) => {
            if (this.options.esc) {
                // if (e.keyCode == 27) {
                if (e.key == 'Escape') {
                    this.close();
                    document.removeEventListener('keyup', keyupEvent);
                }
            }
        }
        document.addEventListener('keyup', keyupEvent);
        this.elDialog.offsetWidth;
        if (this.width !== undefined && this.width !== null) {
            let width = typeof(this.width) == 'number' ? this.width + 'px' : this.width;
            this.elDialogBody.style.width = width;
        }

        if (this.height !== undefined && this.height !== null) {
            let height = typeof(this.height) == 'number' ? this.height + 'px' : this.height;
            this.elDialogBody.style.height = height;
        }
        this.elDialog.classList.remove(CLASS_CLOSE);
        this.elDialog.classList.add(CLASS_OPEN);
        this.options.onOpen(this);
    }

    close() {
        this.elDialog.classList.remove(CLASS_OPEN);
        this.elDialog.classList.add(CLASS_CLOSE);
        if (this.options.closeRemove) {
            setTimeout(() => {
                this.elDialog.remove();
            }, 300);
        }
        this.options.onClose(this);
    }

    setBody(content) {
        if (content instanceof Node) {
            this.elDialogBody.appendChild(content);
        } else {
            this.elDialogBody.innerHTML = content;
        }
    }
}

export default Dialog;