import { ToolbarItemBase } from '../ToolbarItemBase';
import DrawRect from '../../../components/draw/rect';
import Pickr from '@simonwep/pickr';
import { Events, PDFEvent } from '../../../event';

class Rect extends ToolbarItemBase {
    zIndex = 1;
    
    init() {
        this.name = 'rect';
        let attrs = {
            background: '#ffffff',
            opacity: 1,
            rotate: undefined,
            borderWidth: undefined,
            borderColor: undefined
        };
        if (Rect.attrs) {
            attrs = Object.assign(attrs, Rect.attrs);
        }
        this.setAttrs(attrs);
        //最小绘制
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = Rect.actions;
    }

    __setPreview(elPreview) {
        if (!elPreview) {
            return;
        }
        elPreview.style.background = this.attrs.background;
        elPreview.style.opacity = this.attrs.opacity;
    }

    initActions(objElement) {
        const temp = document.createElement('div');
        temp.innerHTML = require('./actions.phtml')();

        let elPreview = temp.querySelector('.__act_color_preview');
        if (!objElement) {
            this.__setPreview(elPreview);
        } else {
            elPreview.remove();
        }

        const elColors = temp.querySelector('.__act_colors');
        elColors.querySelectorAll('.color-item').forEach(elColor => {
            elColor.addEventListener('click', e => {
                let background = elColor.getAttribute('data-color');
                this.updateAttrs({
                    background
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
            default: this.attrs.background,
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
            colorPickr.setColor(this.attrs.background);
        });
        colorPickr.on('change', color => {
            let background = color.toHEXA().toString().toLocaleLowerCase();
            this.updateAttrs({
                background
            }, objElement);

            this.__setPreview(elPreview);
        });


        const elBGOpacityText = temp.querySelector('.__act_bg_opacity_text');
        elBGOpacityText.textContent = (this.attrs.opacity * 100) + '%';
        const elBGOpacity = temp.querySelector('.__act_bg_opacity');
        elBGOpacity.value = this.attrs.opacity * 10;

        const opacityChange = () => {
            elBGOpacityText.textContent = (elBGOpacity.value * 10) + '%';
            let opacity = elBGOpacity.value / 10;
            this.updateAttrs({
                opacity
            }, objElement);

            this.__setPreview(elPreview);
        };
        elBGOpacity.addEventListener('input', opacityChange);

        const elBGOpacityReduce = temp.querySelector('.__act_range_reduce');
        elBGOpacityReduce.addEventListener('click', () => {
            elBGOpacity.stepDown();
            opacityChange();
        });

        const elBGOpacityPlus = temp.querySelector('.__act_range_plus');
        elBGOpacityPlus.addEventListener('click', () => {
            elBGOpacity.stepUp();
            opacityChange();
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
            handle.background = this.attrs.background;
            handle.opacity = this.attrs.opacity;
        }
    }

    createDrawHandle(readerPage) {
        const page = this.editor.pdfDocument.getPage(readerPage.pageNum);
        return new DrawRect({
            container: readerPage.elDrawLayer,
            scrollElement: this.reader.parentElement,
            background: this.attrs.background,
            opacity: this.attrs.opacity,
            onFinished: rect => {
                if (rect.width < this.minWidth && rect.height < this.minHeight) {
                    return;
                }
                const element = page.elements.add('rect', {
                    width: rect.width,
                    height: rect.height,
                    opacity: this.attrs.opacity,
                    background: this.attrs.background,
                    rotate: this.attrs.rotate,
                    borderWidth: this.attrs.borderWidth,
                    borderColor: this.attrs.borderColor
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

export default Rect;