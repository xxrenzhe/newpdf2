import Rect from '../rect';
import DrawRect from '../../../components/draw/rect';
import Pickr from '@simonwep/pickr';
import { CSSActive } from '../../../misc';
import { COLOR_ITEMS } from '../../../defines';

class TextBox extends Rect {
    init() {
        this.name = 'textbox';
        let attrs = {
            background: '#fff000',
            opacity: 0.6,
            rotate: undefined,
            borderWidth: undefined,
            borderColor: undefined,

            size: 16,
            color: '#000000',
            text: 'Typing here..',
            lineHeight: null,
            textOpacity: 1,
            underline: false,
            bold: false,
            italic: false,
            fontFamily: 'Helvetica',
            fontFile: 'NotoSansCJKsc-Regular.otf'
        };
        if (TextBox.attrs) {
            attrs = Object.assign(attrs, TextBox.attrs);
        }
        this.setAttrs(attrs);
        //最小绘制
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = TextBox.actions;

        this.defBGColor = attrs.background;
        this.defTextColor = attrs.color;
    }

    initActions(objElement) {
        const temp = document.createElement('div');
        temp.innerHTML = require('./actions.phtml')();

        const elFontDropdown = temp.querySelector('.font-dropdown');
        fontList.forEach((font, i) => {
            let elOption = document.createElement('div');
            elOption.classList.add('font-item');
            elOption.textContent = font.showName;
            elOption.fontFamily = font.fontFamily;
            elOption.fontFile = font.fontFile;
            elOption.addEventListener('click', e => {
                e.stopPropagation();
                this.updateAttrs({
                    fontFamily: elOption.fontFamily,
                    fontFile: elOption.fontFile
                }, objElement);
                if (objElement) {
                    objElement.elText.focus();
                }
                elFontDropdown.classList.remove('show');
            });
            elFontDropdown.appendChild(elOption);
            if (i == 0) {
                this.attrs.fontFamily = font.fontFamily;
                this.attrs.fontFile = font.fontFile;
            }
        });

        const btnFontList = temp.querySelector('.fontlist');
        btnFontList.addEventListener('click', () => {
            if (elFontDropdown.classList.contains('show')) {
                elFontDropdown.classList.remove('show');
            } else {
                elFontDropdown.classList.add('show');
            }
        });

        // elFontList.addEventListener('change', () => {
        //     this.updateAttrs({
        //         fontFamily: elFontList.selectedOptions[0].fontFamily,
        //         fontFile: elFontList.selectedOptions[0].fontFile
        //     }, objElement);
        //     if (objElement) {
        //         objElement.elText.focus();
        //     }
        // });

        // const elFontsize = temp.querySelector('.font_size');
        // elFontsize.value = this.attrs.size;
        // elFontsize.addEventListener('change', () => {
        //     let size = parseInt(elFontsize.value);
        //     this.updateAttrs({
        //         size: size,
        //         lineHeight: size
        //     }, objElement);
        // });

        const elFontsizePlus = temp.querySelector('.fontsize_plus');
        elFontsizePlus.addEventListener('click', () => {
            let size = ++this.attrs.size;
            let lineHeight = ++this.attrs.lineHeight;
            if (objElement) {
                size = ++objElement.attrs.size;
                lineHeight = ++objElement.attrs.lineHeight;
            }
            this.updateAttrs({
                size: size,
                lineHeight: lineHeight
            }, objElement);
        });

        const elFontsizeReduce = temp.querySelector('.fontsize_reduce');
        elFontsizeReduce.addEventListener('click', () => {
            let size = --this.attrs.size;
            let lineHeight = --this.attrs.lineHeight;
            if (objElement) {
                size = --objElement.attrs.size;
                lineHeight = --objElement.attrs.lineHeight;
            }
            this.updateAttrs({
                size: size,
                lineHeight: lineHeight
            }, objElement);
        });

        const elFontBold = temp.querySelector('.font_bold');
        elFontBold.addEventListener('click', () => {
            const status = CSSActive(elFontBold);
            this.updateAttrs({
                bold: !status
            }, objElement);
        });

        const elFontItalic = temp.querySelector('.font_italic');
        elFontItalic.addEventListener('click', () => {
            const status = CSSActive(elFontItalic);
            this.updateAttrs({
                italic: !status
            }, objElement);
        });

        const elUnderline = temp.querySelector('.font_underline');
        const elStrike = temp.querySelector('.font_strike');
        let gLineStyle = [elUnderline, elStrike];

        elUnderline.addEventListener('click', () => {
            const status = CSSActive(gLineStyle, elUnderline);
            this.updateAttrs({
                lineStyle: status ? null : 'underline'
            }, objElement);
        });

        
        elStrike.addEventListener('click', () => {
            const status = CSSActive(gLineStyle, elStrike);
            this.updateAttrs({
                lineStyle: status ? null : 'strike'
            }, objElement);
        });


        const elFontBGColor = temp.querySelector('.font_bg');
        const elFontBGColorApply = elFontBGColor.querySelector('.color-icon');
        const elFontBGColorPickr = elFontBGColor.querySelector('.arrow');
        const elFontBGColorPreview = elFontBGColor.querySelector('.color_preview');
        elFontBGColorPreview.style.backgroundColor = this.defBGColor;
        elFontBGColorPreview.setAttribute('data-color', this.defBGColor);
        elFontBGColorApply.addEventListener('click', () => {
            if (objElement) {
                let color = elFontBGColorPreview.getAttribute('data-color');
                objElement.attrs.background = color;
                objElement.setStyle();
                objElement.zoom(objElement.scale);
            }
        });

        const applyBGColor = objColor => {
            let background = objColor.toHEXA().toString().toLocaleLowerCase();
            elFontBGColorPreview.style.backgroundColor = background;
            elFontBGColorPreview.setAttribute('data-color', background);
            if (objElement) {
                objElement.attrs.background = background;
                objElement.setStyle();
                objElement.zoom(objElement.scale);
            } else {
                this.defBGColor = background;
            }
        }

        const bgColorPickr = Pickr.create({
            el: elFontBGColorPickr,
            theme: 'classic',
            comparison: false,
            useAsButton: true,
            default: this.defBGColor,
            swatches: COLOR_ITEMS,
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
        bgColorPickr.on('show', () => {
            let color = this.defBGColor;
            if (objElement) {
                if (objElement.attrs.background) {
                    color = objElement.attrs.background;
                }
            }
            bgColorPickr.setColor(color);
        });

        bgColorPickr.on('changestop', (source, instance) => {
            applyBGColor(instance.getColor());
        });

        bgColorPickr.on('swatchselect', objColor => {
            applyBGColor(objColor);
        });


        const elFontColor = temp.querySelector('.font_color');
        const elFontColorApply = elFontColor.querySelector('.color-icon');
        const elFontColorPickr = elFontColor.querySelector('.arrow');
        const elFontColorPreview = elFontColor.querySelector('.color_preview');
        elFontColorPreview.style.backgroundColor = this.defTextColor;
        elFontColorPreview.setAttribute('data-color', this.defTextColor);
        elFontColorApply.addEventListener('click', () => {
            if (objElement) {
                let color = elFontColorPreview.getAttribute('data-color');
                objElement.attrs.color = color;
                objElement.setStyle();
                objElement.zoom(objElement.scale);
            }
        });

        const applyColor = objColor => {
            let color = objColor.toHEXA().toString().toLocaleLowerCase();
            elFontColorPreview.style.backgroundColor = color;
            elFontColorPreview.setAttribute('data-color', color);
            if (objElement) {
                objElement.attrs.color = color;
                objElement.setStyle();
                objElement.zoom(objElement.scale);
            } else {
                this.defTextColor = color;
            }
        }

        const textColorPickr = Pickr.create({
            el: elFontColorPickr,
            theme: 'classic',
            comparison: false,
            useAsButton: true,
            default: this.defTextColor,
            swatches: COLOR_ITEMS,
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
        textColorPickr.on('show', () => {
            let color = this.defTextColor;
            if (objElement) {
                if (objElement.attrs.color) {
                    color = objElement.attrs.color;
                }
            }
            textColorPickr.setColor(color);
        });

        textColorPickr.on('changestop', (source, instance) => {
            applyColor(instance.getColor());
        });

        bgColorPickr.on('swatchselect', objColor => {
            applyColor(objColor);
        });


        const elBGOpacityText = temp.querySelector('.__act_bg_opacity_text');
        elBGOpacityText.textContent = (this.attrs.opacity * 100) + '%';
        const elBGOpacity = temp.querySelector('.__act_bg_opacity');
        elBGOpacity.value = this.attrs.opacity * 10;

        const opacityChange = () => {
            elBGOpacityText.textContent = (elBGOpacity.value * 10) + '%';
            let opacity = elBGOpacity.value / 10;
            this.updateAttrs({
                opacity,
                textOpacity: opacity
            }, objElement);
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
                const objElement = page.elements.add('textbox', Object.assign({
                    width: rect.width,
                    height: rect.height
                }, this.attrs), {
                    pos: {
                        x: rect.x,
                        y: rect.y
                    },
                    setActions: that => {
                        this.setActions(that);
                    }
                });

                setTimeout(() => {
                    let selection = window.getSelection();
                    let range = document.createRange();
                    range.selectNodeContents(objElement.elText);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    this.toolbar.get('mouse').click();
                }, 20);
            }
        });
    }
}

export default TextBox;