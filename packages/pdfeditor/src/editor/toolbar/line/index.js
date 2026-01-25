import { ToolbarItemBase } from '../ToolbarItemBase';
import DrawLine from '../../../components/draw/line';
import Pickr from '@simonwep/pickr';
import { Events, PDFEvent } from '../../../event';

class Line extends ToolbarItemBase {
    init() {
        this.name = 'line';
        let attrs = {
            lineWidth: 2,
            color: '#000000',
            cap: 'round',
            opacity: 1,
            style: {
                position: 'absolute',
                top: 0,
                left: 0
            },
            rotate: undefined,
            straightLine: false
        };
        if (Line.attrs) {
            attrs = Object.assign(attrs, Line.attrs);
        }
        this.setAttrs(attrs);
        //最小绘制
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = Line.actions;
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

        // Stroke thickness buttons (pdf.net style)
        const elStrokeOptions = temp.querySelector('.__act_stroke_options');
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

        // Color grid (pdf.net style)
        const elColorsGrid = temp.querySelector('.__act_colors_grid');
        const colorDots = elColorsGrid.querySelectorAll('.color-dot');

        const updateActiveColor = (color) => {
            colorDots.forEach(dot => {
                const dotColor = dot.getAttribute('data-color');
                if (dotColor && dotColor.toLowerCase() === color.toLowerCase()) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        };
        updateActiveColor(this.attrs.color);

        colorDots.forEach(colorDot => {
            colorDot.addEventListener('click', () => {
                let color = colorDot.getAttribute('data-color');
                this.updateAttrs({ color }, objElement);
                updateActiveColor(color);
                this.__setPreview(elPreview);
            });
        });

        // Custom color picker
        const elColorPickr = temp.querySelector('.color-picker-dot');
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
            handle.lineColor = this.attrs.color;
            handle.lineCap = this.attrs.cap;
            handle.opacity = this.attrs.opacity;
        }
    }

    createDrawHandle(readerPage) {
        const page = this.editor.pdfDocument.getPage(readerPage.pageNum);
        const line = new DrawLine({
            container: readerPage.elDrawLayer,
            scrollElement: this.reader.parentElement,
            lineWidth: this.attrs.lineWidth,
            lineColor: this.attrs.color,
            lineCap: this.attrs.cap,
            straightLine: this.attrs.straightLine,
            style: this.attrs.style,
            onFinished: async (rect, dataURL) => {
                line.clearCanvas();
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
        return line;
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

export default Line;