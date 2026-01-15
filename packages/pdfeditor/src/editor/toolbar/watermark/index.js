import { ToolbarItemBase } from '../ToolbarItemBase';
import Dialog from '../../../components/dialog';
import Pickr from '@simonwep/pickr';
import { Locale } from '../../../locale';

const WATERMARK_TEXT = 'watermark_text';
const WATERMARK_OPACITY = 'watermark_opacity';
const WATERMARK_ROTATE = 'watermark_rotate';
const WATERMARK_PAGE_START = 'page_start';
const WATERMARK_PAGE_END = 'page_end';
const PREVIEW_ID = 'pdfview_img';
const PREVIEW_BOX_CLASS = 'popup_preview_box';
const POS_ACTIVE_CLASS = 'option-active';
const ACTIVE_CLASS = 'table_btn_active';
const UPLOAD_ID = 'upload_img_w';
const BTN_OK = 'btn-ok';
const BTN_CANCEL = 'btn-cancel';

class Watermark extends ToolbarItemBase {
    init() {
        this.name = 'watermark';
        this.textColor = '#000000';
        this.text = '';
        this.textSize = 22;
        this.position = 1;
        this.opacity = 0.5;
        this.rotate = 0;
        this.mode = 'text';
        this.arrayBuffer = null;


        this.dialog = new Dialog({
            initOpened: false,
            width: 700,
            height: 'auto',
            body: require('./popup.html')(),
            title: Locale.get('watermark')
        });
        Locale.bind(this.dialog.elBody);

        const elBody = this.dialog.elDialogBody;
        const elTextBox = elBody.querySelector('.watermark_text');
        const elImgBox = elBody.querySelector('.watermark_uploadimg');
        const elPreviewBox = elBody.querySelector('.' + PREVIEW_BOX_CLASS);
        const elPreview = elBody.querySelector('#' + PREVIEW_ID);
        this.reader.pdfDocument.getPageActive().toImage().then(dataURL => {
            elPreview.setAttribute('src', dataURL);
        });

        const elImg = new window.Image();
        elImg.style.position = 'absolute';
        elPreviewBox.appendChild(elImg);
        //上传图片
        const elFile = elBody.querySelector('#' + UPLOAD_ID);
        elFile.addEventListener('change', e => {
            let file = e.target.files[0];
            if (file) {
                elImg.addEventListener('load', () => {
                    URL.revokeObjectURL(file);
                    const fileReader = new FileReader();
                    fileReader.readAsArrayBuffer(file);
                    fileReader.addEventListener('loadend', async e => {
                        this.arrayBuffer = e.target.result;
                        let rectPreview = elPreview.getBoundingClientRect();
                        const viewport = {
                            width: rectPreview.width,
                            height: rectPreview.height
                        };
                        
                        let scaleWidth = (viewport.width * 0.35);
                        let width = parseInt((elImg.width > scaleWidth ? scaleWidth : elImg.width));
                        let height = (parseInt(elImg.width) != width ? parseInt(elImg.height * (width / elImg.width)) : elImg.height);
                        elImg.style.width = width + 'px';
                        elImg.style.height = height + 'px';
                    });
                    setTimeout(() => {
                        __updatePreview();
                    }, 10);
                });
                elImg.src = URL.createObjectURL(file);
                
            }
            elFile.value = '';
        });


        elBody.querySelectorAll('.watermark_table').forEach(el => {
            el.addEventListener('click', e => {
                let type = e.currentTarget.getAttribute('data-type');
                this.mode = type;
                elBody.querySelector('.watermark_table.' + ACTIVE_CLASS)?.classList.remove(ACTIVE_CLASS);
                e.currentTarget.classList.add(ACTIVE_CLASS);
                if (type == 'text') {
                    elTextBox.style.display = '';
                    elImgBox.style.display = 'none';
                    if (this.position != 10) {
                        elText.style.visibility = 'visible';
                        arrTexts.forEach(el => {
                            el.style.visibility = 'hidden';
                        });
                    } else {
                        elText.style.visibility = 'hidden';
                        arrTexts.forEach(el => {
                            el.style.visibility = 'visible';
                        });
                    }
                    elImg.style.visibility = 'hidden';
                    arrImgs.forEach(el => {
                        el.style.visibility = 'hidden';
                    });
                } else if (type == 'img') {
                    elTextBox.style.display = 'none';
                    elImgBox.style.display = 'flex';
                    if (this.position != 10) {
                        elImg.style.visibility = 'visible';
                        arrImgs.forEach(el => {
                            el.style.visibility = 'hidden';
                        });
                    } else {
                        elImg.style.visibility = 'hidden';
                        arrImgs.forEach(el => {
                            el.style.visibility = 'visible';
                        });
                    }
                    elText.style.visibility = 'hidden';
                    arrTexts.forEach(el => {
                        el.style.visibility = 'hidden';
                    });
                }
            });
        });


        const arrTexts = [];
        const arrImgs = [];
        const __updatePreview = () => {
            let rectText = elText.getBoundingClientRect();
            let rectImg = elImg.getBoundingClientRect();
            let _rectEL = this.mode == 'text' ? rectText : rectImg;
            let rectPreview = elPreview.getBoundingClientRect();
            let _pos = {
                left: 0,
                center: rectPreview.width / 2 - _rectEL.width / 2,
                right: rectPreview.width - _rectEL.width,
                top: elPreview.offsetTop,
                middle: elPreview.offsetTop + elPreview.height / 2 - _rectEL.height / 2,
                bottom: elPreview.offsetTop + rectPreview.height - _rectEL.height
            };
            let objPos = {
                1: {
                    top: _pos.top,
                    left: _pos.left
                },
                2: {
                    top: _pos.top,
                    left: _pos.center
                },
                3: {
                    top: _pos.top,
                    left: _pos.right
                },
                4: {
                    top: _pos.middle,
                    left: _pos.left
                },
                5: {
                    top: _pos.middle,
                    left: _pos.center
                },
                6: {
                    top: _pos.middle,
                    left: _pos.right
                },
                7: {
                    top: _pos.bottom,
                    left: _pos.left
                },
                8: {
                    top: _pos.bottom,
                    left: _pos.center
                },
                9: {
                    top: _pos.bottom,
                    left: _pos.right
                }
            }

            const updateStyle = (el, pos) => {
                // set text
                el.textContent = this.text;

                //set color
                el.style.color = this.textColor;

                //set position
                el.style.top = pos.top + 'px';
                el.style.left = pos.left + 'px';

                //set opactiy
                el.style.opacity = this.opacity;

                //set rotation
                el.style.transform = 'rotate('+ this.rotate +'deg)';
            }

            let el = elText;
            let arrEl = arrTexts;
            if (this.mode == 'img') {
                el = elImg;
                arrEl = arrImgs;
            }
            
            if (this.position != 10) {
                el.style.visibility = 'visible';
                updateStyle(el, objPos[this.position]);
                if (arrEl.length > 0) {
                    arrEl.forEach(el => {
                        el.style.visibility = 'hidden';
                    });
                }
            } else {
                el.style.visibility = 'hidden';
                if (arrEl.length == 0) {
                    for (let i = 1; i < 10; i++) {
                        let _elText = el.cloneNode(true);
                        _elText.style.visibility = 'visible';
                        updateStyle(_elText, objPos[i]);
                        arrEl.push(_elText);
                        elPreviewBox.appendChild(_elText);
                    }
                } else {
                    arrEl.forEach((_elText, i) => {
                        _elText.style.visibility = 'visible';
                        updateStyle(_elText, objPos[i + 1]);
                    });
                }
            }
        }

        let elMosaic = elBody.querySelector('#mosaic');
        let oldPosItem = elBody.querySelector('.popup_pos_item.' + POS_ACTIVE_CLASS);
        elMosaic.addEventListener('click', e => {
            elBody.querySelectorAll('.popup_pos_item').forEach(el => {
                if (elMosaic.checked) {
                    el.classList.add(POS_ACTIVE_CLASS);
                    this.position = 10;
                } else {
                    el.classList.remove(POS_ACTIVE_CLASS);
                    oldPosItem.classList.add(POS_ACTIVE_CLASS);
                    this.position = oldPosItem.getAttribute('data-pos');
                }
            });
            __updatePreview();
        });

        elBody.querySelectorAll('.popup_pos_item').forEach(el => {
            el.addEventListener('click', e => {
                if (elMosaic.checked) return;
                elBody.querySelector('.popup_pos_item.' + POS_ACTIVE_CLASS)?.classList.remove(POS_ACTIVE_CLASS);
                e.currentTarget.classList.add(POS_ACTIVE_CLASS);
                this.position = parseInt(e.currentTarget.getAttribute('data-pos'));
                oldPosItem = e.currentTarget;
                __updatePreview();
            });
        });

        const elWatermarkText = elBody.querySelector('#' + WATERMARK_TEXT);
        const elText = document.createElement('div');
        elText.style.color = this.textColor;
        elText.style.position = 'absolute';
        elText.style.fontSize = this.textSize + 'px';
        elPreviewBox.appendChild(elText);

        elWatermarkText.addEventListener('input', e => {
            this.text = elWatermarkText.value;
            __updatePreview();
        });


        elBody.querySelectorAll('.color-item').forEach(elColor => {
            elColor.addEventListener('click', e => {
                this.textColor = elColor.getAttribute('data-color');
                __updatePreview();
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
            this.textColor = color.toHEXA().toString().toLocaleLowerCase();
            __updatePreview();
        });

        const elOpacity = elBody.querySelector('#' + WATERMARK_OPACITY);
        elOpacity.addEventListener('change', () => {
            this.opacity = elOpacity.value;
            __updatePreview();
        });

        const elRotate = elBody.querySelector('#' + WATERMARK_ROTATE);
        elRotate.addEventListener('change', () => {
            this.rotate = elRotate.value;
            __updatePreview();
        });

        const elPageStart = elBody.querySelector('#' + WATERMARK_PAGE_START);
        const elPageEnd = elBody.querySelector('#' + WATERMARK_PAGE_END);
        elPageEnd.value = this.reader.pageCount;
        elPageEnd.setAttribute('max', this.reader.pageCount);

        elBody.querySelector('.' + BTN_CANCEL).addEventListener('click', () => {
            this.dialog.close();
        });

        elBody.querySelector('.' + BTN_OK).addEventListener('click', () => {
            let start = parseInt(elPageStart.value);
            let end =  Math.min(this.editor.pdfDocument.pages.length + 1, parseInt(elPageEnd.value)) ;
            let rectText = elText.getBoundingClientRect();
            let rectImg = elImg.getBoundingClientRect();
            let _rectEL = this.mode == 'text' ? rectText : rectImg;
            const page = this.editor.pdfDocument.getPageActive();
            let rectPreview = page.readerPage.elWrapper.getBoundingClientRect();
            let _pos = {
                left: 0,
                center: rectPreview.width / 2 - _rectEL.width / 2,
                right: rectPreview.width - _rectEL.width,
                top: 0,
                middle: elPreview.height / 2 - _rectEL.height / 2,
                bottom: rectPreview.height - _rectEL.height
            };
            let objPos = {
                1: {
                    top: _pos.top,
                    left: _pos.left
                },
                2: {
                    top: _pos.top,
                    left: _pos.center
                },
                3: {
                    top: _pos.top,
                    left: _pos.right
                },
                4: {
                    top: _pos.middle,
                    left: _pos.left
                },
                5: {
                    top: _pos.middle,
                    left: _pos.center
                },
                6: {
                    top: _pos.middle,
                    left: _pos.right
                },
                7: {
                    top: _pos.bottom,
                    left: _pos.left
                },
                8: {
                    top: _pos.bottom,
                    left: _pos.center
                },
                9: {
                    top: _pos.bottom,
                    left: _pos.right
                }
            }
            if (this.mode == 'text') {
                if (!this.text) return;
                for (start; start <= end; start++) {
                    const page = this.editor.pdfDocument.getPage(start);
                    if (elMosaic.checked) {
                        let keys = Object.keys(objPos);
                        for (let i in keys) {
                           const element = page.elements.add('textCanvas', {
                                size: this.textSize,
                                color: this.textColor,
                                text: this.text,
                                opacity: this.opacity,
                                rotate: this.rotate
                            }, {
                                pos: {
                                    x: objPos[keys[i]].left,
                                    y: objPos[keys[i]].top
                                }
                            });
                            element.disableDrag = true;
                            element.disableResize = true;
                            element.el.classList.remove('__resizable', '__resizable-border'); 
                        }
                    } else {
                        const element = page.elements.add('textCanvas', {
                            size: this.textSize,
                            color: this.textColor,
                            text: this.text,
                            opacity: this.opacity,
                            rotate: this.rotate
                        }, {
                            pos: {
                                x: objPos[this.position].left,
                                y: objPos[this.position].top
                            }
                        });
                        element.disableDrag = true;
                        element.disableResize = true;
                        element.el.classList.remove('__resizable', '__resizable-border');
                    }
                }
            } else {
                if (!this.arrayBuffer) return;
                for (start; start <= end; start++) {
                    const page = this.editor.pdfDocument.getPage(start);
                    if (elMosaic.checked) {
                        let keys = Object.keys(objPos);
                        for (let i in keys) {
                            let elImage = new Image();
                            let blob = new Blob([this.arrayBuffer], {
                                type: 'image/jpeg'
                            });
                            elImage.src = URL.createObjectURL(blob);
                            elImage.style.width = '100%';
                            elImage.style.height = '100%';
                            page.elements.add('image', {
                                image: elImage,
                                imageType: 'image/jpeg',
                                opacity: this.opacity,
                                arrayBuffer: this.arrayBuffer,
                                rotate: this.rotate,
                                width: 100,
                                height: 100
                            }, {
                                pos: {
                                    x: objPos[keys[i]].left,
                                    y: objPos[keys[i]].top
                                }
                            });
                        }
                    } else {
                        let elImage = new Image();
                        let blob = new Blob([this.arrayBuffer], {
                            type: 'image/jpeg'
                        });
                        elImage.src = URL.createObjectURL(blob);
                        elImage.style.width = '100%';
                        elImage.style.height = '100%';
                        page.elements.add('image', {
                            image: elImage,
                            imageType: 'image/jpeg',
                            opacity: this.opacity,
                            arrayBuffer: this.arrayBuffer,
                            rotate: this.rotate,
                            width: 100,
                            height: 100
                        }, {
                            pos: {
                                x: objPos[this.position].left,
                                y: objPos[this.position].top
                            }
                        });
                    }
                }
            }
            this.dialog.close();
        });
    }

    onClick() {
        this.dialog.open();
    }
}

export default Watermark;