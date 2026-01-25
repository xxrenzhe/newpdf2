import { ToolbarItemBase } from '../ToolbarItemBase';
import DrawArrow from '../../../components/draw/arrow';
import Pickr from '@simonwep/pickr';
import { Events, PDFEvent } from '../../../event';

class Arrow extends ToolbarItemBase {
    init() {
        this.name = 'arrow';
        let attrs = {
            lineWidth: 2,
            color: '#ff0000',
            opacity: 1,
            rotate: undefined
        };
        if (Arrow.attrs) {
            attrs = Object.assign(attrs, Arrow.attrs);
        }
        this.setAttrs(attrs);
        this.actions = Arrow.actions;
        this.minWidth = 13;
        this.minHeight = 13;
        this.zIndex = 1;
        this.isSetActions = false;
    }

    __setPreview(elPreview) {
        if (!elPreview) {
            return;
        }
        elPreview.style.background = this.attrs.color;
        elPreview.style.opacity = this.attrs.opacity;
        elPreview.style.height = this.attrs.lineWidth + 'px';
    }

    initActions(objElement) {
        const temp = document.createElement('div');
        temp.innerHTML = require('./actions.phtml')();

        let elPreview = temp.querySelector('.__act_draw_preview');
        if (!objElement) {
            this.__setPreview(elPreview);
        } else {
            elPreview.remove();
        }

        // Color selection with active state (pdf.net style)
        const elColors = temp.querySelector('.__act_colors');
        const colorItems = elColors.querySelectorAll('.color-item');

        const updateActiveColor = (color) => {
            colorItems.forEach(item => {
                const itemColor = item.getAttribute('data-color');
                if (itemColor && itemColor.toLowerCase() === color.toLowerCase()) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        };
        updateActiveColor(this.attrs.color);

        colorItems.forEach(elColor => {
            elColor.addEventListener('click', e => {
                let color = elColor.getAttribute('data-color');
                this.updateAttrs({ color }, objElement);
                updateActiveColor(color);
                this.__setPreview(elPreview);
            });
        });

        const elColorPickr = temp.querySelector('.color-picker');
        const colorPickr = Pickr.create({
            el: elColorPickr,
            theme: 'classic',
            comparison: false,
            useAsButton: true,
            default: this.attrs.color,
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
            colorPickr.setColor(this.attrs.color);
        });
        colorPickr.on('change', color => {
            let _color = color.toHEXA().toString().toLocaleLowerCase();
            this.updateAttrs({ color: _color }, objElement);
            updateActiveColor(_color);
            this.__setPreview(elPreview);
        });

        // Stroke thickness buttons (pdf.net style)
        const elStrokeOptions = temp.querySelector('.__act_stroke_options');
        if (elStrokeOptions) {
            const strokeBtns = elStrokeOptions.querySelectorAll('.__act_stroke_btn');

            const updateActiveStroke = (lineWidth) => {
                strokeBtns.forEach(btn => {
                    const stroke = parseInt(btn.getAttribute('data-stroke'));
                    if (stroke === parseInt(lineWidth)) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            };
            updateActiveStroke(this.attrs.lineWidth);

            strokeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const lineWidth = parseInt(btn.getAttribute('data-stroke'));
                    this.updateAttrs({ lineWidth }, objElement);
                    updateActiveStroke(lineWidth);
                    this.__setPreview(elPreview);
                });
            });
        }

        let elActions = [];
        for (let elChild of temp.children) {
            elActions.push(elChild);
        }
        return elActions;
    }

    setAttrs(attrs) {
        super.setAttrs(attrs);
        for (let i in this.drawHandles) {
            let handle = this.drawHandles[i];
            handle.lineWidth = this.attrs.lineWidth;
            handle.color = this.attrs.color;
        }
    }

    createDrawHandle(readerPage) {
        const page = this.editor.pdfDocument.getPage(readerPage.pageNum);
        const arrow = new DrawArrow({
            container: readerPage.elDrawLayer,
            scrollElement: this.reader.parentElement,
            lineWidth: this.attrs.lineWidth,
            color: this.attrs.color,
            onFinished: async (rect, dataURL) => {
                arrow.clearCanvas();
                if (rect.width < this.minWidth && rect.height < this.minHeight) {
                    return;
                }
                let image = new Image();
                image.src = dataURL;
                image.style.width = '100%';
                image.style.height = '100%';
                image.style.position = 'absolute';
                const element = page.elements.add('image', {
                    width: rect.width,
                    height: rect.height,
                    opacity: this.attrs.opacity,
                    image: image,
                    imageType: 'image/png',
                    arrayBuffer: dataURL,
                    rotate: this.attrs.rotate
                }, {
                    pos: {
                        x: rect.x,
                        y: rect.y
                    },
                    setActions: that => {
                        this.setActions(that);
                    }
                });

                PDFEvent.dispatch(Events.ELEMENT_BLUR, {
                    page,
                    element
                });
            }
        });
        return arrow;
    }

    getDrawHandle(pageNum) {
        if (!this.drawHandles[pageNum]) {
            const readerPage = this.reader.pdfDocument.getPage(pageNum);
            this.drawHandles[pageNum] = this.createDrawHandle(readerPage);
        }
        return this.drawHandles[pageNum];
    }

    onActive(active) {
        let pageNum = this.reader.pdfDocument.pageActive;
        if (!this.drawHandles[pageNum]) {
            const readerPage = this.reader.pdfDocument.getPage(pageNum);
            this.drawHandles[pageNum] = this.createDrawHandle(readerPage);
        }
        if (active) {
            this.enable();
        } else {
            this.disable();
        }
    }

    pageClick(e) {
        const readerPage = e.data.page;
        let pageNum = readerPage.pageNum;
        if (this.drawHandles[pageNum]) return;
        const drawHandle = this.createDrawHandle(readerPage);
        //主动触发一次点击事件
        drawHandle.offset = drawHandle.getOffset(drawHandle.container);
        drawHandle.drawing = true;
        drawHandle.firstPos = drawHandle.getPos(e.data.evt);
        drawHandle.onDown(e.data.evt);
        this.drawHandles[readerPage.pageNum] = drawHandle;
    }
}

export default Arrow;