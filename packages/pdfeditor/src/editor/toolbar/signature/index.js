import { ToolbarItemBase } from '../ToolbarItemBase';
import Dialog from '../../../components/dialog';
import Pickr from '@simonwep/pickr';
import { Locale } from '../../../locale';
import { trimSpace } from '../../../misc';
import DrawLine from '../../../components/draw/line';


const selectFontList = 'select-font-list';
const btnSignClear = 'btn-sign-clear';
const btnSignOk = 'btn-sign-ok';
const btnSignCancel = 'btn-sign-cancel';
const btnSignInput = 'sign_input';
const ACTIVE_CLASS = 'table_btn_active';
const DEF_TEXT = 'QWERPDF';


class Signature extends ToolbarItemBase {
    init() {
        this.name = 'signature';
        let attrs = {
            opacity: 1,
            rotate: undefined
        };
        if (Signature.attrs) {
            attrs = Object.assign(attrs, Signature.attrs);
        }
        this.setAttrs(attrs);
        this.actions = Signature.actions;
        this.image = null;
        this.imageType = null;
        this.floatElement = null;
        this.arrayBuffer = null;
        this.isPageClick = false;
        this.text = DEF_TEXT;
        this.textFontSize = 40;
        this.textColor = '#000000';
        this.textFontFamily = 'Allura';
        this.mode = 'text';
        this.zIndex = 1;


        this.dialog = new Dialog({
            initOpened: false,
            width: 700,
            height: 'auto',
            body: require('./popup.html')(),
            title: Locale.get('add_signature')
        });
        Locale.bind(this.dialog.elBody);

        
        const elBody = this.dialog.elDialogBody;
        let elSignEnter = elBody.querySelector('.sign_enter');
        elSignEnter.textContent = this.text;
        let elSignImg = elBody.querySelector('.sign_img');
        let elSignDraw = elBody.querySelector('.sign_draw');
        let elSelectFonts = elBody.querySelector('#' + selectFontList);
        elSelectFonts.addEventListener('change', () => {
            elSignEnter.style.fontFamily = elSelectFonts.value;
            this.textFontFamily = elSelectFonts.value;
        });
        elSignEnter.style.fontFamily = elSelectFonts.value;


        //上传图片
        this.elFile = elBody.querySelector('#sign_upload');
        this.elFile.addEventListener('change', e => {
            let file = e.target.files[0];
            this.imageType = file.type;
            this.isPageClick = false;
            if (file) {
                this.image = new window.Image();
                this.image.addEventListener('load', () => {
                    URL.revokeObjectURL(file);
                    const fileReader = new FileReader();
                    fileReader.readAsArrayBuffer(file);
                    fileReader.addEventListener('loadend', async e => {
                        let pageNum = this.reader.pdfDocument.pageActive;
                        let page = this.reader.pdfDocument.getPage(pageNum);
                        this.arrayBuffer = e.target.result;
                        
                        const viewport = {
                            width: parseInt(page.elContainer.style.width),
                            height: parseInt(page.elContainer.style.height)
                        };
                        
                        let scaleWidth = (viewport.width * 0.35);
                        let width = parseInt((this.image.width > scaleWidth ? scaleWidth : this.image.width));
                        let height = (parseInt(this.image.width) != width ? parseInt(this.image.height * (width / this.image.width)) : this.image.height);
                        let _element = this.image.cloneNode();
                        _element.style.width = width + 'px';
                        _element.style.height = height + 'px';
                        this.createFloatElement(_element);
                        this.dialog.close();
                    });
                });
                this.image.src = URL.createObjectURL(file);
                this.image.style.width = '100%';
                this.image.style.height = '100%';
            }
            this.elFile.value = '';
        });


        //初始化可绘制区域
        const line = new DrawLine({
            container: elSignDraw,
            lineWidth: 2,
            lineColor: this.textColor,
            lineCap: 'round',
            straightLine: false,
            onFinished: async (rect, dataURL) => {
                this.arrayBuffer = dataURL;
            }
        });


        let elSignColorBox = elBody.querySelector('.sign_color');
        elBody.querySelectorAll('.sign_table').forEach(el => {
            el.addEventListener('click', e => {
                let type = e.currentTarget.getAttribute('data-type');
                this.mode = type;
                elBody.querySelector('.sign_table.' + ACTIVE_CLASS)?.classList.remove(ACTIVE_CLASS);
                e.currentTarget.classList.add(ACTIVE_CLASS);

                let colorDisplay = '';
                let clearDisplay = '';
                let fontListDisplay = '';
                if (type == 'text') {
                    fontListDisplay = '';
                    elSignInput.style.display = '';
                    elSignEnter.style.display = '';
                    elSignImg.style.display = 'none';
                    elSignDraw.style.display = 'none';
                    clearDisplay = 'none';
                } else if (type == 'img') {
                    colorDisplay = 'none';
                    clearDisplay = 'none';
                    fontListDisplay = 'none';
                    elSignEnter.style.display = 'none';
                    elSignImg.style.display = 'block';
                    elSignDraw.style.display = 'none';
                    elSignInput.style.display = 'none';
                } else if (type == 'draw') {
                    fontListDisplay = 'none';
                    elSignEnter.style.display = 'none';
                    elSignImg.style.display = 'none';
                    elSignDraw.style.display = 'block';
                    elSignInput.style.display = 'none';
                }
                elSignColorBox.style.display = colorDisplay;
                elSignClear.style.display = clearDisplay;
                elSelectFonts.style.display = fontListDisplay;
            });
        });

        const elSignOk = elBody.querySelector('#' + btnSignOk);
        elSignOk.addEventListener('click', () => {
            if (this.mode == 'text') {
                this.text = trimSpace(elSignEnter.textContent);
                this.textToImage(elSignEnter.getBoundingClientRect());
                this.createFloatElement(elSignEnter.cloneNode(true));
            } else if (this.mode == 'draw') {
                this.setImage(this.arrayBuffer);
                line.clearCanvas();
            }
            this.dialog.close();
        });


        const elSignCancel = elBody.querySelector('#' + btnSignCancel);
        elSignCancel.addEventListener('click', () => {
            this.dialog.close();
        });

        const elSignClear = elBody.querySelector('#' + btnSignClear);
        elSignClear.addEventListener('click', () => {
            if (this.mode == 'text') {
                elSignEnter.textContent = this.text = DEF_TEXT;
            } else if (this.mode == 'draw') {
                line.clearCanvas();
            }
        });

        const elSignInput = elBody.querySelector('#' + btnSignInput);
        elSignInput.addEventListener('input', () => {
            elSignEnter.textContent = elSignInput.value;
        });

        const __setColor = color => {
            if (this.mode == 'text') {
                elSignEnter.style.color = color;
            } else if (this.mode == 'draw') {
                line.lineColor = color;
            }
            this.textColor = color;
        }

        elBody.querySelectorAll('.color-item').forEach(elColor => {
            elColor.addEventListener('click', e => {
                let bgColor = elColor.getAttribute('data-color');
                __setColor(bgColor);
            });
        });

        const elColorPickr = elBody.querySelector('.color-picker');
        const colorPickr = Pickr.create({
            el: elColorPickr,
            theme: 'classic',
            comparison: false,
            useAsButton: true,
            default: this.textColor,
            components: {
                preview: true,
                opacity: false,
                hue: true,
                interaction: {
                    hex: true,
                    rgba: false,
                    hsla: false,
                    hsva: false,
                    cmyk: false,
                    input: true,
                    clear: false,
                    save: false
                }
            }
        });
        colorPickr.on('show', () => {
            colorPickr.setColor(this.textColor);
        });
        colorPickr.on('change', color => {
            let bgColor = color.toHEXA().toString().toLocaleLowerCase();
            __setColor(bgColor);
        });
    }

    textToImage(rect) {
        let scale = window.devicePixelRatio || 1;
        let fontSize = this.textFontSize * scale;
        let canvas = document.createElement('canvas');
        canvas.width = (rect.width * scale) + (10 * scale);
        canvas.height = fontSize + 10 * scale;
        let ctx = canvas.getContext('2d');
        ctx.fillStyle = this.textColor;
        ctx.font = fontSize + 'px ' + this.textFontFamily;
        ctx.fillText(this.text, 0, fontSize, canvas.width);

        this.image = new Image();
        this.imageType = 'image/png';
        this.arrayBuffer = canvas.toDataURL('image/png', 1);
        this.image.src = this.arrayBuffer;
        this.image.style.width = '100%';
        this.image.style.height = '100%';
    }

    setImage(dataURL) {
        this.image = new window.Image();
        this.image.src = dataURL;
        this.image.style.width = '100%';
        this.image.style.height = '100%';
        this.image.addEventListener('load', () => {
            let pageNum = this.reader.pdfDocument.pageActive;
            let page = this.reader.pdfDocument.getPage(pageNum);
            const viewport = {
                width: parseInt(page.elContainer.style.width),
                height: parseInt(page.elContainer.style.height)
            };
            
            let scaleWidth = (viewport.width * 0.35);
            let width = parseInt((this.image.width > scaleWidth ? scaleWidth : this.image.width));
            let height = (parseInt(this.image.width) != width ? parseInt(this.image.height * (width / this.image.width)) : this.image.height);
            let _element = this.image.cloneNode();
            _element.style.width = width + 'px';
            _element.style.height = height + 'px';
            this.createFloatElement(_element);
        });
    }

    onClick(e) {
        this.dialog.open();
    }

    pageClick(e) {
        if (e.data.evt.button != 0) {
            return;
        }
        if (!this.image) return;
        this.isPageClick = true;
        const readerPage = e.data.page;
        const page = this.editor.pdfDocument.getPage(readerPage.pageNum);
        
        const rect = readerPage.elWrapper.getBoundingClientRect();
        let y = parseInt(this.floatElement.style.top) - rect.top;
        let x = parseInt(this.floatElement.style.left) - rect.left;
        page.elements.add('image', {
            image: this.image,
            imageType: this.imageType,
            opacity: this.attrs.opacity,
            arrayBuffer: this.arrayBuffer,
            rotate: this.attrs.rotate
        }, {
            pos: {
                x: x,
                y: y
            },
            setActions: that => {
                this.setActions(that);
            }
        });
        this.reset();
        readerPage.elDrawLayer.style.zIndex = '';
    }

    createFloatElement(element) {
        this.floatElement = element;
        this.floatElement.style.position = 'fixed';
        this.floatElement.style.zIndex = 1;
        document.body.appendChild(this.floatElement);

        this.evtMousemove = e => {
            this.floatElement.style.top = e.clientY + 5 + 'px';
            //不加1鼠标中间滚动不灵
            this.floatElement.style.left = e.clientX + 5 + 'px';
        }
        window.addEventListener('mousemove', this.evtMousemove);
        window.addEventListener('mousedown', e => {
            if (e.button == 2 || !this.isPageClick) {
                this.reset();
            }
            this.isPageClick = false;
        }, {
            once: true
        });
        return this.floatElement;
    }

    reset() {
        window.removeEventListener('mousemove', this.evtMousemove);
        this.floatElement?.remove();
        this.image = null;
        this.imageType = null;
        this.floatElement = null;
        this.arrayBuffer = null;
    }
}

export default Signature;