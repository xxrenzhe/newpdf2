import { ToolbarItemBase } from '../ToolbarItemBase';
import { sibling,CSSActive } from '../../../misc';
import Pickr from '@simonwep/pickr';
import { COLOR_ITEMS } from '../../../defines';
const textArt = 'text_art';
const textArtFont = 'text_art_font';
const fontUrl = "https://fonts.qwerpdf.com/";
const loadDom = document.querySelector('.loading_box');
const fontListBox = [];

class TextArt extends ToolbarItemBase {
    init() {
        this.name = 'textArt';
        this.textArtSelect = 'text';
        let attrs = {
            size: 30,
            color: '#4283AE',
            text: 'Your text here',
            lineHeight: null,
            lineStyle: null,
            opacity: 1,
            background: '',
            bold: false,
            italic: false,
            rotate: undefined,
            fontFamily: 'Helvetica', 
            textArtType:'one',
            fontFile: 'NotoSansCJKsc-Regular.otf',
            isGradient:'false',
            gradientType:null,
            gradientColor:null,
            gradientColorTwo:null,
            strokeColor:'#4283AE',
        };
        if (TextArt.attrs) {
            attrs = Object.assign(attrs, TextArt.attrs);
        }
        this.setAttrs(attrs);
        if (!this.attrs.lineHeight) {
            this.attrs.lineHeight = this.attrs.size;
        }
        this.isAdd = false;
        this.actions = TextArt.actions;
        this.dropdown = document.createElement('div');
        this.dropdown.setAttribute('id','dropdown_textArt');
        this.dropdown.classList.add('dropdown_box');
        this.dropdown.innerHTML = require('./popup.html')();
        var toolSignature = document.querySelector(".tool_textArt");
        toolSignature.appendChild(this.dropdown);
        const elBody = this.dropdown;
        const textArtAll = elBody.querySelectorAll("."+textArt);
        const textArtFontDom = elBody.querySelectorAll("."+textArtFont);
        const pdfMainWrapper = document.querySelector(".pdf-wrapper");
        pdfMainWrapper.addEventListener('click',()=>{
            this.dropdown.style.display = 'none';
        })
        textArtAll.forEach(el=>{
            el.addEventListener('click',()=>{
                el.classList.add('active');
                this.textArtSelect = 'text';
                this.isAdd = true;
                this.attrs.fontFamily='Helvetica', 
                this.attrs.fontFile='NotoSansCJKsc-Regular.otf',
                this.attrs.isGradient = el.getAttribute('data-gradient');
                if(this.attrs.isGradient == 'true'){
                    this.attrs.gradientColor = el.getAttribute('data-gradientColor');
                    this.attrs.gradientColorTwo = el.getAttribute('data-gradientColorTwo');
                    this.attrs.gradientType = el.getAttribute("data-gradientType");
                }else{
                    this.attrs.strokeColor = el.getAttribute('data-stroke');
                    this.attrs.color = el.getAttribute('data-color');
                }
                this.attrs.textArtType = el.getAttribute('data-type');
                var siblingDemo = sibling(el);
                for(let j = 0;j<siblingDemo.length;j++){
                    siblingDemo[j].classList.remove('active')
                }
                let readerScale = this.editor.reader.scale;
                let scale = window.devicePixelRatio || 1;
                let _element = document.createElement('div');
                _element.innerHTML = this.attrs.text;
                _element.classList.add('text_art_' +this.attrs.textArtType )
                _element.style.fontSize = this.attrs.size*readerScale**scale + 'px';
                _element.style.fontFamily = this.attrs.fontFamily;
                _element.style.color = this.attrs.color;
                _element.style.textStroke = "2px" + this.attrs.strokeColor;
                this.createFloatElement(_element);
                this.dropdown.style.display = 'none';
            })
        })

        textArtFontDom.forEach(el=>{
            el.addEventListener('click',()=>{
                this.isAdd = true;
                this.textArtSelect = 'font';
                this.attrs.color = '#000000';
                this.attrs.fontFamily = el.getAttribute('data-fontFamily');
                this.attrs.fontFile = 'art_font/'+el.getAttribute('data-fontFile');
                if(fontListBox.indexOf(fontUrl+this.attrs.fontFile) == -1){
                    loadDom.style.display = 'block';
                }
                this.initFont(fontUrl+this.attrs.fontFile,this.attrs.fontFamily);
                var siblingDemo = sibling(el);
                for(let j = 0;j<siblingDemo.length;j++){
                    siblingDemo[j].classList.remove('active')
                }
            })
        })
    }

    initActions(objElement) {
        const temp = document.createElement('div');
        temp.innerHTML = require('./actions.phtml')();

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
        const elFontColor = temp.querySelector('.font_color');
        const elFontColorApply = elFontColor.querySelector('.color-icon');
        const elFontColorPickr = elFontColor.querySelector('.arrow');
        const elFontColorPreview = elFontColor.querySelector('.color_preview');
        elFontColorPreview.setAttribute('data-color', this.attrs.color);
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
                this.attrs.color = color;
            }
        }

        const textColorPickr = Pickr.create({
            el: elFontColorPickr,
            theme: 'classic',
            comparison: false,
            useAsButton: true,
            default: this.attrs.color,
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
            let color = this.attrs.color;
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

        textColorPickr.on('swatchselect', objColor => {
            applyColor(objColor);
        });

        let elActions = [];
        for (let elChild of temp.children) {
            elActions.push(elChild);
        }
        return elActions;     
    }

    pageClick(e) {
        if (e.data.evt.button != 0) {
            return;
        }
        if(!this.isAdd ) return;
        const readerPage = e.data.page;
        const page = this.editor.pdfDocument.getPage(readerPage.pageNum);
        this.offset = this.getOffset(readerPage.elDrawLayer);
        var objElement = "";
        if(this.textArtSelect == 'text'){
             objElement = page.elements.add('textArt', this.attrs, {
                pos: this.getPos(e.data.evt),
                setActions: that => {
                    this.setActions(that);
                }
            });
        }else if(this.textArtSelect == 'font'){
            objElement = page.elements.add('text', this.attrs, {
                pos: this.getPos(e.data.evt),
                setActions: that => {
                    this.setActions(that);
                }
            });
        }

        setTimeout(() => {
            let selection = window.getSelection();
            let range = document.createRange();
            range.selectNodeContents(objElement.elText);
            selection.removeAllRanges();
            selection.addRange(range);
        }, 20);
      
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

    onClick() {
        setTimeout(()=>{
            this.dropdown.style.display = 'block';
        },100)
    }

    initFont(fontFile,fontFamily) {
        if(fontListBox.indexOf(fontFile) == -1){
            fontListBox.push(fontFile);
            let fontList= [
                {
                    fontUrl: fontFile,
                    fontFamily: fontFamily,
                }
            ];
            let code = fontList.reduce((accumulator, currentValue) => {
                return accumulator + `@font-face { font-family: ${currentValue.fontFamily};src: url('${currentValue.fontUrl}'); }`;
            }, "");
            var style = document.createElement("style");
            style.type = "text/css";
            style.rel = "stylesheet";
            style.appendChild(document.createTextNode(code));
            var head = document.getElementsByTagName("head")[0];
            head.appendChild(style);
    
            //判断字体是否加载成功
            if (window.FontFace) {
                var newfontFile = new FontFace(fontFamily, 'url('+fontFile+')');
                newfontFile.load().then( ()=> {
                    loadDom.style.display = 'none';
                    setTimeout(()=>{
                            
                            let scale = window.devicePixelRatio || 1;
                            let _element = document.createElement('div');
                            let readerScale = this.editor.reader.scale;
                            _element.innerHTML = this.attrs.text;
                            _element.style.fontSize = this.attrs.size*readerScale*scale + 'px';
                            _element.style.fontFamily = this.attrs.fontFamily;
                            _element.style.color = this.attrs.color;
                            this.createFloatElement(_element);
                            this.dropdown.style.display = 'none';
                    },100)
                },  (err)=>{
                    loadDom.style.display = 'none';
                    this.attrs.fontFamily= 'Helvetica';
                    this.attrs.fontFile='NotoSansCJKsc-Regular.otf';
                    let _element = document.createElement('div');
                    let readerScale = this.editor.reader.scale;
                    let scale = window.devicePixelRatio || 1;
                    _element.innerHTML = this.attrs.text;
                    _element.style.fontSize = this.attrs.size*readerScale*scale + 'px';
                    _element.style.fontFamily = this.attrs.fontFamily;
                    _element.style.color = this.attrs.color;
                    this.createFloatElement(_element);
                    this.dropdown.style.display = 'none';
                });
            }   
        }else{
            let scale = window.devicePixelRatio || 1;
            let _element = document.createElement('div');
            let readerScale = this.editor.reader.scale;
            _element.innerHTML = this.attrs.text;
            _element.style.fontSize = this.attrs.size*readerScale*scale + 'px';
            _element.style.fontFamily = this.attrs.fontFamily;
            _element.style.color = this.attrs.color;
            this.createFloatElement(_element);
            this.dropdown.style.display = 'none';
        }
    }
}

export default TextArt;