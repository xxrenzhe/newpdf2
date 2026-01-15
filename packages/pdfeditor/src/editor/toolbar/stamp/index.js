import { ToolbarItemBase } from '../ToolbarItemBase';
import Dialog from '../../../components/dialog';
import { Locale } from '../../../locale';
import Pickr from '@simonwep/pickr';

const btnOk = 'btn-ok';
const btnClosePopup = 'btn-cancel';
const roundType = 'roundType';
const rectangularType = 'rectangularType';
const rectView = 'rect_view';
const customViewBox = 'custom_view_box';
const customIpt1 = 'custom_ipt1';
const customIpt2 = 'custom_ipt2';
const customIpt3 = 'custom_ipt3';
const customText1 = 'custom_text1';
const customText2 = 'custom_text2';
const customText3 = 'custom_text3';
const rangeWidth = "rangeWidth";
const rangeHeight = "rangeHeight";
const customDemo = 'custom_demo';
const customDemoBox = 'custom_demo_box';
const rangeFontSize = 'rangeFontSize';
const rangeContentFontSize = 'rangeContentFontSize';
const colorItem = 'color-item';
const presetTtem = 'preset_item';
const uploadImgStamp = 'upload_img_stamp';
const stampPreset = "stamp_preset"

class Stamp extends ToolbarItemBase {
    init() {
        this.name = 'stamp'; 
        let attrs = {
            opacity: 1,
            lineHeight: null,
            rotate: undefined,
            width:null,
            height:null
        };
        if (Stamp.attrs) {
            attrs = Object.assign(attrs, Stamp.attrs);
        }
        this.setAttrs(attrs);
        this.stampType = 'round'; //Rectangular
        this.stampText1 = '6843912321';
        this.stampText2 = 'TEXT';
        this.stampText3 = 'QWERPDF.COM';
        this.stampWidth = 130;
        this.stampHeight = 130;
        this.stampColor = '#E23C40';
        this.stampFontSize = '12';
        this.stampContentFontSize = '30';
        this.presetUrl = '/assets/img/approved.png';
        this.floatElement = null;
        this.isPageClick = false;
        this.fontFamily='Helvetica';
        this.dialog = new Dialog({
            initOpened: false,
            width: 700,
            height: 'auto',
            body: require('./popup.html')(),
            title: Locale.get('seal_stamp')
        });
        Locale.bind(this.dialog.elBody);

        this.dropdown = document.createElement('div');
        this.dropdown.classList.add('dropdown_box');
        this.dropdown.setAttribute('id','dropdown_stamp')
        this.dropdown.innerHTML = require('./actions.html')();
        var toolStamp = document.querySelector(".tool_stamp");
        toolStamp.appendChild(this.dropdown);
        const pdfMainWrapper = document.querySelector(".pdf-wrapper");
        pdfMainWrapper.addEventListener('click',()=>{
            this.dropdown.style.display = 'none';
        })
        
        const elBody = this.dialog.elDialogBody;
        const elDropDowm =  this.dropdown;
        const uploadImgStampDom = elDropDowm.querySelector('#'+uploadImgStamp);
        const presetTtemDom = elDropDowm.querySelectorAll('.'+presetTtem);
        const stampPresetDom = elDropDowm.querySelector("."+stampPreset);
        
        const roundTypeDom = elBody.querySelector('#'+roundType);
        const rectangularTypeDom = elBody.querySelector('#'+rectangularType);
        const customViewBoxDom = elBody.querySelector('.'+customViewBox);
        const btnClosePopupDom = elBody.querySelector('.'+btnClosePopup);
        const rangeWidthDom = elBody.querySelector("#"+rangeWidth);
        const rangeHeightDom = elBody.querySelector("#"+rangeHeight);
        const customIpt1Dom = elBody.querySelector('#'+customIpt1);
        const customIpt2Dom = elBody.querySelector('#'+customIpt2);
        const customIpt3Dom = elBody.querySelector('#'+customIpt3);
        const customText1Dom = elBody.querySelector("."+customText1);
        const customText2Dom = elBody.querySelector("."+customText2);
        const customText3Dom = elBody.querySelector("."+customText3);
        const customDemoDom = elBody.querySelector("."+customDemo);
        const customDemoBoxDom = elBody.querySelector("."+customDemoBox);
        const rangeFontSizeDom = elBody.querySelector("#"+rangeFontSize);
        const colorItemDom = elBody.querySelectorAll("."+colorItem);
      
        const btnOkDom = elBody.querySelector('.'+btnOk);
        const rangeContentFontSizeDom = elBody.querySelector('#'+rangeContentFontSize);
        stampPresetDom.addEventListener('click',()=>{
            this.dropdown.style.display ='none';
            this.dialog.open();
        })

        roundTypeDom.addEventListener('change',()=>{
            if(roundTypeDom.checked){
                this.stampType = 'round';
                customViewBoxDom.classList.remove(rectView);
                this.stampWidth = 130;
                this.stampHeight = 130;
                rangeWidthDom.value = '130';
                rangeHeightDom.value ='130';
                customDemoDom.style.width = '130px';
                customDemoBoxDom.style.width = '120px';
                customDemoDom.style.height =  '130px';
                customDemoBoxDom.style.height =  '120px';
            }
        })

        rectangularTypeDom.addEventListener('change',()=>{
            if(rectangularTypeDom.checked){
                this.stampType = 'rectangular';
                customViewBoxDom.classList.add(rectView);
                this.stampWidth = 180;
                this.stampHeight = 100;
                rangeWidthDom.value = '180';
                rangeHeightDom.value = '100';
                customDemoDom.style.width = '180px';
                customDemoBoxDom.style.width = '170px';
                customDemoDom.style.height =  '100px';
                customDemoBoxDom.style.height =  '90px';
            }
        })
        customIpt1Dom.addEventListener('input',()=>{
            this.stampText1 = customIpt1Dom.value;
            customText1Dom.innerHTML = this.stampText1;
        })
        customIpt2Dom.addEventListener('input',()=>{
            this.stampText2 = customIpt2Dom.value;
            customText2Dom.innerHTML = this.stampText2;
        })
        customIpt3Dom.addEventListener('input',()=>{
            this.stampText3 = customIpt3Dom.value;
            customText3Dom.innerHTML = this.stampText3;
        })
        rangeWidthDom.addEventListener('input',()=>{
            this.stampWidth = rangeWidthDom.value;
            customDemoDom.style.width = rangeWidthDom.value + 'px';
            customDemoBoxDom.style.width =   rangeWidthDom.value - 10 + 'px';
        })
        rangeHeightDom.addEventListener('input',()=>{
            this.stampHeight = rangeHeightDom.value;
            customDemoDom.style.height = rangeHeightDom.value + 'px';
            customDemoBoxDom.style.height =   rangeHeightDom.value - 10 + 'px';
        })
        rangeFontSizeDom.addEventListener('input',()=>{
            this.stampFontSize = rangeFontSizeDom.value;
            customText1Dom.style.fontSize = rangeFontSizeDom.value + 'px';
            customText3Dom.style.fontSize = rangeFontSizeDom.value + 'px';
        })
        rangeContentFontSizeDom.addEventListener('input',()=>{
            this.stampContentFontSize = rangeContentFontSizeDom.value;
            customText2Dom.style.fontSize = rangeContentFontSizeDom.value + 'px';
        })
        colorItemDom.forEach(el=>{
            el.addEventListener('click',(e)=>{
                let color = e.currentTarget.getAttribute('data-color');
                this.stampColor = color;
                customDemoDom.style.borderColor = color;
                customDemoBoxDom.style.borderColor = color;
                customDemoBoxDom.style.color = color;
            })
        })
        presetTtemDom.forEach(el=>{
            el.addEventListener('click',(e)=>{
                this.dropdown.style.display = 'none';
                var elImg = el.querySelector('img');
                var elImgUrl = elImg.getAttribute('src');
                this.presetUrl = elImgUrl;
                this.getImageFileFromUrl(this.presetUrl,'preset.png')
            })
        })

        //上传图片
        uploadImgStampDom.addEventListener('click',e=>{
            this.dropdown.style.display = 'none';
        })
        uploadImgStampDom.addEventListener('change', e => {
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
                        if(width>150){
                            height = 150*height/width
                            width = 150;
                        }
                        this.attrs.width = width;
                        this.attrs.height = height;
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
            uploadImgStampDom.value = '';
        });
        btnClosePopupDom.addEventListener('click',()=>{
            this.dialog.close();
        })

        const elColorPickr = elBody.querySelector('.color-picker');
        const colorPickr = Pickr.create({
            el: elColorPickr,
            theme: 'classic',
            comparison: false,
            useAsButton: true,
            default: this.stampColor,
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
            colorPickr.setColor(this.stampColor);
        });
        colorPickr.on('change', color => {
            this.stampColor = color.toHEXA().toString().toLocaleLowerCase();
            customDemoDom.style.borderColor = this.stampColor;
            customDemoBoxDom.style.borderColor = this.stampColor;
            customDemoBoxDom.style.color = this.stampColor;
        });

        btnOkDom.addEventListener('click',()=>{
            this.textToCanvasSave();
        })
    }

    textToCanvasSave(){
        let scale = window.devicePixelRatio || 1;
        const elBodyTwo = this.dialog.elDialogBody;
        const customText2DomTwo = elBodyTwo.querySelector("."+customText2).offsetHeight;
        let fontSize = this.stampFontSize * scale;
        let ContentFontSize = this.stampContentFontSize*scale;
        var texts = this.stampText1 + "\n" + this.stampText2 + '\n' + this.stampText3;
        let lines = texts.split(/[\n\f\r\u000B]/);
        let canvas = document.createElement('canvas');
        canvas.width = this.stampWidth*scale;
        canvas.height = this.stampHeight*scale;
        let ctx = canvas.getContext('2d');
        ctx.fillStyle = this.stampColor;
        if(this.stampType == 'round'){
            if(this.stampWidth == this.stampHeight){
                ctx.lineWidth=2;
                ctx.strokeStyle=this.stampColor;
                ctx.beginPath();
                ctx.arc(this.stampWidth/2,this.stampHeight/2,this.stampWidth/2 - 2,0,2*Math.PI);
                ctx.stroke();
                ctx.lineWidth=1;
                ctx.arc(this.stampWidth/2 ,this.stampHeight/2 ,this.stampWidth/2 - 5,0,2*Math.PI);
                ctx.stroke();
            }else{
                var radiusX = (this.stampWidth/2 > this.stampHeight/2)?this.stampWidth/2:this.stampHeight/2;
                var radiusY = (this.stampWidth/2 > this.stampHeight/2)?this.stampHeight/2:this.stampWidth/2;
                if(this.stampWidth/2 > this.stampHeight/2){
                    ctx.beginPath();
                    ctx.strokeStyle=this.stampColor;
                    ctx.lineWidth=2;
    
                    ctx.ellipse(this.stampWidth/2, this.stampHeight/2,radiusX - 2, radiusY - 2,  Math.PI/180, 0, 2*Math.PI);
                    ctx.stroke();
    
                    ctx.lineWidth=1;
                    ctx.ellipse(this.stampWidth/2, this.stampHeight/2, radiusX - 5, radiusY - 5,  Math.PI/180, 0, 2*Math.PI);
                    ctx.stroke();
                }else{
                    ctx.beginPath();
                    ctx.strokeStyle=this.stampColor;
                    ctx.lineWidth=2;
    
                    ctx.ellipse(this.stampWidth/2, this.stampHeight/2, radiusY - 2, radiusX - 2, Math.PI/180, 0, 2*Math.PI);
                    ctx.stroke();
    
                    ctx.lineWidth=1;
                    ctx.ellipse(this.stampWidth/2, this.stampHeight/2, radiusY - 5, radiusX - 5,  Math.PI/180, 0, 2*Math.PI);
                    ctx.stroke();
                }
            }
        }else{
            ctx.strokeStyle=this.stampColor;  
            ctx.lineWidth= 3;  
            ctx.strokeRect(0,0,this.stampWidth,this.stampHeight);  

            ctx.strokeStyle=this.stampColor;
            ctx.lineWidth= 1;
            ctx.strokeRect(4,4,this.stampWidth - 8,this.stampHeight - 8); 
        }
        var y = canvas.height/2
        var linehight = ContentFontSize/2;
        for (let i = 0; i < lines.length; i++) {
            ctx.textBaseline = "middle";
            if(i == 0){
                y = canvas.height/2 - customText2DomTwo*scale + linehight;
                ctx.font ='bold '+fontSize + 'px ' + this.fontFamily ;
            }
            if(i == 1){
                y = canvas.height/2;
                ctx.font = 'bold '+ContentFontSize + 'px ' + this.fontFamily ;
            }else if(i == 2){
                y = canvas.height/2 + customText2DomTwo*scale - linehight;
                ctx.font = 'bold '+ fontSize + 'px ' + this.fontFamily ;
            }
            var textWidth = ctx.measureText(lines[i]).width;
            var x = canvas.width/2 - textWidth/2;
            ctx.fillText(lines[i], x, y, canvas.width);
        }
        this.image = new Image();
        this.imageType = 'image/png';
        this.arrayBuffer = canvas.toDataURL('image/png', 1);
        this.image.src = this.arrayBuffer;
        this.image.style.width = '100%';
        this.image.style.height = '100%';
        this.attrs.width = this.stampWidth*scale;
        this.attrs.height = this.stampHeight*scale;
        let _element = this.image.cloneNode();
        _element.style.width = this.stampWidth*scale + 'px';
        _element.style.height = this.stampHeight*scale + 'px';
        this.createFloatElement(_element);
        this.dialog.close();
        
    }

    getImageFileFromUrl(url, imageName) {
        var blob = null;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.setRequestHeader('Accept', 'image/png');
        xhr.responseType = "blob";
        xhr.onload = () => {
            blob = xhr.response;
            this.imageType = 'image/png';
            let imgFile = new File([blob], imageName, { type: 'image/png' });
            this.isPageClick = false;
            this.image = new window.Image();
            this.image.addEventListener('load', () => {
                URL.revokeObjectURL(imgFile);
                const fileReader = new FileReader();
                fileReader.readAsArrayBuffer(imgFile);
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
                    if(width>150){
                        height = 150*height/width
                        width = 150;
                    }
                    this.attrs.width = width;
                    this.attrs.height = height;
                    let _element = this.image.cloneNode();
                    _element.style.width = width + 'px';
                    _element.style.height = height + 'px';
                    this.createFloatElement(_element);
                    this.dialog.close();
                });
            })
            this.image.src = URL.createObjectURL(imgFile);
            this.image.style.width = '100%';
            this.image.style.height = '100%';
        };
        xhr.send();
    }


    onClick() {
        this.dropdown.style.display = 'block';
    }
    
    pageClick(e) {
        if(this.floatElement == null){
            return;
        }
        if (e.data.evt.button != 0) {
            return;
        }
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
            width:this.attrs.width,
            height:this.attrs.height,
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

export default Stamp;