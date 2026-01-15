import { ToolbarItemBase } from '../ToolbarItemBase';
import DrawLine from '../../../components/draw/line';
import Pickr from '@simonwep/pickr';

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
            rotate: undefined
        };
        if (Line.attrs) {
            attrs = Object.assign(attrs, Line.attrs);
        }
        this.setAttrs(attrs);
        this.actions = Line.actions;
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

        const elColors = temp.querySelector('.__act_colors');
        elColors.querySelectorAll('.color-item').forEach(elColor => {
            elColor.addEventListener('click', e => {
                let color = elColor.getAttribute('data-color');
                this.updateAttrs({
                    color
                }, objElement);

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
                    hex: false,
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
            this.updateAttrs({
                color: _color
            }, objElement);

            this.__setPreview(elPreview);
        });


        const elOpacityText = temp.querySelector('.__act_opacity_text');
        elOpacityText.textContent = (this.attrs.opacity * 100) + '%';

        const elOpacity = temp.querySelector('.__act_opacity');
        elOpacity.value = this.attrs.opacity * 10;


        const opacityChange = () => {
            elOpacityText.textContent = (elOpacity.value * 10) + '%';
            let opacity = elOpacity.value / 10;
            this.updateAttrs({
                opacity
            }, objElement);

            this.__setPreview(elPreview);
        };
        elOpacity.addEventListener('input', opacityChange);

        const elOpacityReduce = temp.querySelector('.__act_range_reduce');
        elOpacityReduce.addEventListener('click', () => {
            elOpacity.stepDown();
            opacityChange();
        });

        const elOpacityPlus = temp.querySelector('.__act_range_plus');
        elOpacityPlus.addEventListener('click', () => {
            elOpacity.stepUp();
            opacityChange();
        });


        const elDrawStrokeText = temp.querySelector('.__act_draw_text');
        elDrawStrokeText.textContent = this.attrs.lineWidth + 'px';

        const elDrawStroke = temp.querySelector('.__act_draw');
        elDrawStroke.value = this.attrs.lineWidth;


        const drawStrokeChange = () => {
            elDrawStrokeText.textContent = elDrawStroke.value + 'px';
            let lineWidth = elDrawStroke.value;
            this.updateAttrs({
                lineWidth
            }, objElement);

            this.__setPreview(elPreview);
        };
        elDrawStroke.addEventListener('input', drawStrokeChange);

        const elDrawStrokeReduce = temp.querySelector('.__act_draw_range_reduce');
        elDrawStrokeReduce.addEventListener('click', () => {
            elDrawStroke.stepDown();
            drawStrokeChange();
        });

        const elDrawStrokePlus = temp.querySelector('.__act_draw_range_plus');
        elDrawStrokePlus.addEventListener('click', () => {
            elDrawStroke.stepUp();
            drawStrokeChange();
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
            style: this.attrs.style,
            onFinished: async (rect, dataURL) => {
                line.clearCanvas();
                page.elements.add('svgPath', {
                    width: rect.width,
                    height: rect.height,
                    x: rect.x,
                    y: rect.y,
                    borderWidth: this.attrs.borderWidth,
                    borderLineCap: this.attrs.cap,
                    opacity: this.attrs.opacity,
                    color: this.attrs.color,
                    path: dataURL,
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