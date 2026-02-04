import { ToolbarItemBase } from '../ToolbarItemBase';

class Image extends ToolbarItemBase {
    init() {
        this.name = 'image';
        let attrs = {
            opacity: 1,
            width:null,
            height:null,
            rotate: undefined
        };
        if (Image.attrs) {
            attrs = Object.assign(attrs, Image.attrs);
        }
        this.setAttrs(attrs);
        this.actions = Image.actions;
        this.image = null;
        this.imageType = null;
        this.floatElement = null;
        this.arrayBuffer = null;
        this.isPageClick = false;
        this.zIndex = 1;


        this.elFile = document.createElement('input');
        this.elFile.setAttribute('type', 'file');
        this.elFile.setAttribute('accept', 'image/jpeg,image/png');
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
                    });
                });
                this.image.src = URL.createObjectURL(file);
                this.image.style.width = '100%';
                this.image.style.height = '100%';
            }
            this.elFile.value = '';
        });
    }

    onClick(e) {
        this.elFile.click();
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

    // initAfter() {
    //     this.btnImage = this.container.querySelector('.__pdf_add_image_input');
    //     this.btnImage.addEventListener('change', e => {
    //         let file = e.target.files[0];
    //         if (file) {
    //             let image = new window.Image();
    //             image.addEventListener('load', () => {
    //                 URL.revokeObjectURL(file);
    //                 const fileReader = new FileReader();
    //                 fileReader.readAsArrayBuffer(file);
    //                 fileReader.addEventListener('loadend', async e => {
    //                     let pageNum = this.reader.pdfDocument.pageActive;
    //                     let page = this.editor.pdfDocument.getPage(pageNum);
    //                     page.elements.add('image', {
    //                         image: image,
    //                         imageType: file.type,
    //                         opacity: this.attrs.opacity,
    //                         arrayBuffer: e.target.result,
    //                         rotate: this.attrs.rotate
    //                     }, {
    //                         setActions: that => {
    //                             this.setActions(that);
    //                         }
    //                     });
    //                 });
    //             });
    //             image.src = URL.createObjectURL(file);
    //             image.style.width = '100%';
    //             image.style.height = '100%';
    //         }
    //         this.btnImage.value = '';
    //     });
    // }
}

export default Image;