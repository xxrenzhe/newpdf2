import { hexToRgb, trimSpace } from '../../misc';
import { Events, PDFEvent } from '../../event';
import { BaseElement } from './BaseElement';

class TextElement extends BaseElement {
    init() {
        this.dataType = 'text';
        let attrs = {
            size: 20,
            color: '#000000',
            text: '',
            lineHeight: null,
            opacity: 1,
            lineStyle: null,    //underline, strike
            background: null,
            bold: false,
            italic: false,
            rotate: undefined,
            fontFamily: 'NotoSansCJKsc',
            fontFile: 'NotoSansCJKsc-Regular.otf'
        };
        this.attrs = Object.assign(attrs, this.attrs);
        this.options.draggableOptions.isCancelDefaultEvent = false;
        this.options.draggableOptions.disabled = false;
        if (!this.attrs.lineHeight) {
            this.attrs.lineHeight = this.attrs.size;
        }
        this.options.resizable = false;
    
        //套用Resizable对象定义的鼠标移入移出的边框css
        this.el.classList.add('__resizable', '__resizable-border');
        
        this.el.addEventListener('paste', (e) => {
            let data = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
            let regex = /<(?!(\/\s*)?(a|b|i|em|s|strong|u)[>,\s])([^>])*>/g;
            data = data.replace(regex, '');
            document.execCommand('insertHTML', false, data);
            e.preventDefault();
        });

        this.elText = document.createElement('div');
    }

    setStyle() {
        if (!this.elText.textContent) {
            this.elText.textContent = this.attrs.text;
        }
        this.elText.style.color = this.attrs.color;
        this.elText.style.fontSize = this.attrs.size + 'px';
        this.elText.style.fontWeight = this.attrs.bold ? 'bold' : '';
        this.elText.style.fontStyle = this.attrs.italic ? 'italic' : '';
        this.elText.style.background = this.attrs.background;
        this.elText.style.fontFamily = this.attrs.fontFamily;
        this.elText.style.lineHeight = this.attrs.lineHeight + 'px';
        this.elText.style.opacity = this.attrs.opacity;
        if (this.attrs.rotate) {
            this.elText.style.transform = 'rotate('+ this.attrs.rotate +'deg)';
        }
        switch (this.attrs.lineStyle) {
            case 'underline':
                this.elText.style.textDecoration = 'underline #ff0000';
                break;
            case 'strike':
                this.elText.style.textDecoration = 'line-through #ff0000';
                break;
        }
    }

    // setActualRect() {
    //     super.setActualRect();
    //     this.attrs.size /= this.scale;
    //     this.attrs.lineHeight /= this.scale;
    // }

    zoom(scale) {
        super.zoom(scale);
        this.elText.style.fontSize = this.attrs.size * this.pageScale + 'px';
        this.elText.style.lineHeight = this.attrs.lineHeight * this.pageScale + 'px';
    }

    childElement() {
        this.setStyle();
        this.elText.addEventListener('input', () => {
            this.attrs.text = this.elText.innerText;
        });

        this.elText.setAttribute('contenteditable', true);
        //禁用在选中文本时的可拖放事件
        this.elText.setAttribute('draggable', false);
        this.elText.addEventListener('dragstart', e => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // this.el.addEventListener('mouseup', () => {
            // this.disableDrag = true;
            // this.elText.setAttribute('contenteditable', true);
            // this.elText.focus();
        // });

        this.elText.addEventListener('blur', e => {
            if (!trimSpace(this.attrs.text)) {
                PDFEvent.dispatch(Events.HISTORY_REMOVE, {
                    page: this.page,
                    element: this
                });
                this.page.elements.remove(this.id);
                return;
            }
            // this.disableDrag = false;
            // this.elText.setAttribute('contenteditable', false);
            
            this.page.elements.activeId = null;
            //重复事件判断，编辑状态下点击console面板，再点击页面会多触发一次blur事件
            if (!this.el.classList.contains('active')) {
                return;
            }
            this.elText.style.cursor = 'pointer';
            this.el.classList.remove('active');
            PDFEvent.dispatch(Events.ELEMENT_BLUR, {
                page: this.page,
                element: this
            });
        });

        setTimeout(() => {
            this.elText.style.cursor = 'auto';
            this.elText.focus();

            //全选文本
            // let selection = window.getSelection();
            // let range = document.createRange();
            // range.selectNodeContents(this.elText);
            // selection.removeAllRanges();
            // selection.addRange(range);

            //光标至最后
            let selection = window.getSelection();
            selection.selectAllChildren(this.elText);
            selection.collapseToEnd();
        }, 10);
        return this.elText;
    }

    async insertToPDF() {
        let lineTop = 2.5;
        let fontSize = this.attrs.size;
        let lines = this.attrs.text.split(/[\n\f\r\u000B]/);
        let thickness = this.attrs.lineStyle ? fontSize / 14 : 0;
        let x = this.getX();
        let y = this.page.height - (this.getY() + fontSize - fontSize * 0.3);
        let lineHeight = (this.attrs.lineHeight ? this.attrs.lineHeight : (fontSize - 2)) + lineTop;
        //let lineHeight = options.font.heightAtSize(fontSize);

        let options = {
            x: x,
            y: y,
            size: fontSize,
            color: this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.color).map(v => (v / 255))),
            opacity: this.attrs.opacity,
            lineHeight: lineHeight,
            font: await this.pdfDocument.getFont(this.page.id, this.attrs.text, this.attrs.fontFile),
            rotate: this.attrs.rotate ? this.degrees(this.attrs.rotate) : undefined
        };

        if (this.attrs.background) {
            let maxWidth = 0;
            lines.forEach(v => {
                let w = options.font.widthOfTextAtSize(v, fontSize);
                if (w > maxWidth) {
                    maxWidth = w;
                }
            });

            this.page.pageProxy.drawRectangle({
                x: x,
                y: y - ((lines.length - 1) * lineHeight) - 3.5,
                width: maxWidth + 2.5,
                height: lines.length * (options.lineHeight + thickness) - 2,
                color: this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.background).map(v => (v / 255))),
                opacity: options.opacity
            });
        }
        this.page.pageProxy.drawText(this.attrs.text, options);

        if (this.attrs.lineStyle) {
            let lineY = 0;
            for (let i = 0; i < lines.length; i++) {
                if (this.attrs.lineStyle == 'underline') {
                    lineY = options.y - options.lineHeight * i - thickness;
                } else if (this.attrs.lineStyle == 'strike') {
                    lineY = options.y - options.lineHeight * i - thickness + (options.lineHeight / 2 - thickness - lineTop);
                }
                this.page.pageProxy.drawLine({
                    start: { x: x, y: lineY },
                    end: { x: x + options.font.widthOfTextAtSize(lines[i], fontSize), y: lineY },
                    thickness: thickness,
                    // color: options.color,
                    color: this.editor.PDFLib.componentsToColor(hexToRgb('#ff0000').map(v => (v / 255))),
                    opacity: options.opacity
                });
            }
        }
    }
}

export { TextElement };