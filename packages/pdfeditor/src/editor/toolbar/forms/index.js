import { ToolbarItemBase } from '../ToolbarItemBase';
import Dialog from '../../../components/dialog';


class Forms extends ToolbarItemBase {
    init() {
        this.name = 'forms';
        this.attrs = {
            opacity: 1,
            rotate: undefined
        };
        this.image = null;
        this.floatElement = null;
        this.isPageClick = false;
        this.isSetActions = false;
        this.zIndex = 1;
    }

    initActions(objElement) {
        const temp = document.createElement('div');
        temp.innerHTML = require('./actions.phtml')();

        const elNo = temp.querySelector('.forms_no');
        elNo.addEventListener('click', () => {
            this.__setzIndex();
            this._loadImg('forms_1.png').then(image => {
                image.elementType = 'svgPath';
                image.viewboxW = 200;
                image.viewboxH = 200;
                image.path = 'M100,85.8l82.6-82.6c9.4-9.4,23.5,4.7,14.1,14.1l-82.6,82.6l82.8,82.8c9.4,9.4-4.7,23.5-14.1,14.1L100,114l-82.8,82.8c-9.4,9.4-23.5-4.7-14.1-14.1l82.8-82.8L3.3,17.3C-6.1,7.9,8-6.2,17.4,3.2L100,85.8L100,85.8z';
            });
        });

        const elYes = temp.querySelector('.forms_yes');
        elYes.addEventListener('click', () => {
            this.__setzIndex();
            this._loadImg('forms_2.png').then(image => {
                image.elementType = 'svgPath';
                image.viewboxW = 305;
                image.viewboxH = 199.5;
                image.path = 'M287.2,3.1c4-4.1,10.6-4.2,14.7-0.2c4.1,4,4.2,10.6,0.2,14.7l0,0L127.9,196.3c-3.8,3.9-10,4.2-14.2,0.6L3.7,102.6c-4.4-3.7-5-10.2-1.3-14.6c3.7-4.4,10.2-5,14.6-1.3c0.1,0.1,0.2,0.1,0.2,0.2l102.6,88.1L287.2,3.1L287.2,3.1z';
            });
        });

        const elPoint = temp.querySelector('.forms_point');
        elPoint.addEventListener('click', () => {
            this.__setzIndex();
            this._loadImg('forms_3.png').then(image => {
                image.elementType = 'svgPath';
                image.viewboxW = 200;
                image.viewboxH = 200;
                image.path = 'M50,100c0,27.6,22.4,50,50,50s50-22.4,50-50s-22.4-50-50-50S50,72.4,50,100z';
            });
        });

        const elCheckbox = temp.querySelector('.forms_checkbox');
        elCheckbox.addEventListener('click', e => {
            this._bindCheckbox(e.currentTarget);
        });

        const elRadioGroup = temp.querySelector('.forms_radiogroup');
        elRadioGroup.addEventListener('click', e => {
            this._bindRadioGroup(e.currentTarget);
        });

        const elTextField = temp.querySelector('.forms_textfield');
        elTextField.addEventListener('click', e => {
            this._bindTextField(e.currentTarget);
        });

        const elDropdown = temp.querySelector('.forms_dropdown');
        elDropdown.addEventListener('click', e => {
            this._bindDropdown(e.currentTarget);
        });

        const elSign = temp.querySelector('.forms_sign');
        elSign.addEventListener('click', e => {
            this.toolbar.get('signature').click();
        });

        

        const elDate = document.querySelector('.forms_date');
        elDate.addEventListener('click', e => {
            this._bindTextField(e.currentTarget);
        });

        const elFormsWrapper = document.querySelector('#forms_wrapper');
        elFormsWrapper.querySelectorAll('.forms_checkbox').forEach(elCheckbox => {
            elCheckbox.addEventListener('click', e => {
                this._bindCheckbox(e.currentTarget);
            });
        });
        
        elFormsWrapper.querySelectorAll('.forms_radiogroup').forEach(elRadioGroup => {
            elRadioGroup.addEventListener('click', e => {
                this._bindRadioGroup(e.currentTarget);
            });
        });
        
        
        elFormsWrapper.querySelectorAll('.forms_textfield').forEach(elTextField => {
            elTextField.addEventListener('click', e => {
                this._bindTextField(e.currentTarget);
            });
        });
        
        elFormsWrapper.querySelectorAll('.forms_dropdown').forEach(elDropdown => {
            elDropdown.addEventListener('click', e => {
                this._bindDropdown(e.currentTarget);
            });
        });

        elFormsWrapper.querySelectorAll('.forms_sign').forEach(elSign => {
            elSign.addEventListener('click', e => {
                this.toolbar.get('signature').click();
            });
        });


        let elActions = [];
        for (let elChild of temp.children) {
            elActions.push(elChild);
        }

        const _setting = document.createElement('div');
        _setting.innerHTML = require('./setting.phtml')();
        this.settingActions = _setting.firstElementChild;
        this.settingActions.addEventListener('click', e => {
            let body = '';
            if (objElement.dataType == 'dropdown') {
                body = require('./dropdown_setting.phtml')();
            }
            console.log(objElement);
            new Dialog({
                initOpened: true,
                width: 500,
                height: 300,
                body: body,
                animate: '',
                closeRemove: true,
                onOpen: that => {
                    if (objElement.dataType == 'dropdown') {
                        let elTextarea = that.elDialogBody.querySelector('textarea');
                        let options = [];
                        for (let option of objElement.elChild.options) {
                            options.push(option.value);
                        }
                        elTextarea.value = options.join('\n');
                    } 
                },
                onClose: that => {
                    if (objElement.dataType == 'dropdown') {
                        let elTextarea = that.elDialogBody.querySelector('textarea');
                        objElement.elChild.options.length = 0;
                        elTextarea.value.split('\n').forEach(val => {
                            if (val.trim() == '') return;
                            let elOption = document.createElement('option');
                            elOption.value = val;
                            elOption.text = val;
                            objElement.elChild.appendChild(elOption);
                        });
                    }
                }
            });
        });
        return elActions;
    }

    setActions(objElement) {
        if (['svgPath', 'checkbox', 'textField', 'radioGroup'].indexOf(this.image.elementType) < 0) {
            this.initActions(objElement);
            objElement.elActions.appendChild(this.settingActions);
        }
        super.setActions(objElement);
    }

    _loadImg(imageName) {
        this.isPageClick = false;
        return fetch(ASSETS_URL + 'img/' + imageName)
            .then(res => res.arrayBuffer())
            .then(arrayBuffer => {
                const blob = new Blob([arrayBuffer], {
                    type: 'image/png'
                });
                this.image = new window.Image();
                this.image.addEventListener('load', () => {
                    URL.revokeObjectURL(blob);
                    let pageNum = this.reader.pdfDocument.pageActive;
                    let page = this.reader.pdfDocument.getPage(pageNum);
                    this.arrayBuffer = arrayBuffer;
                    
                    const viewport = {
                        width: parseInt(page.elContainer.style.width),
                        height: parseInt(page.elContainer.style.height)
                    };
                    
                    let scaleWidth = (viewport.width * 0.35);
                    let width = parseInt((this.image.width > scaleWidth ? scaleWidth : this.image.width));
                    let height = (parseInt(this.image.width) != width ? parseInt(this.image.height * (width / this.image.width)) : this.image.height);
                    let _element = this.image.cloneNode();
                    _element.style.width = width + 'px';
                    _element.style.height = height + 'px';
                    this.createFloatElement(_element);
                });
                this.image.src = URL.createObjectURL(blob);
                this.image.style.width = '100%';
                this.image.style.height = '100%';
                return this.image;
            });
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

    onClick() {
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
        let options = {
            pos: {
                x: x,
                y: y
            },
            setActions: that => {
                this.setActions(that);
            }
        };
        switch (this.image.elementType) {
            case 'svgPath':
                page.elements.add('svgPath', {
                    viewboxW: this.image.viewboxW,
                    viewboxH: this.image.viewboxH,
                    width: 25,
                    height: 25,
                    borderWidth: 2,
                    opacity: this.attrs.opacity,
                    color: '#000000',
                    path: this.image.path
                }, options);
                break;
            case 'checkbox':
                page.elements.add('checkbox', {
                    width: 25,
                    height: 25,
                    borderWidth: 1,
                    checkbox: this.image
                }, options);
                break;
            case 'radioGroup':
                page.elements.add('radioGroup', {
                    width: 25,
                    height: 25,
                    borderWidth: 1,
                    radio: this.image
                }, options);
                break;
            case 'textField':
                page.elements.add('textField', {
                    width: 150,
                    height: 25,
                    borderWidth: 1,
                    borderColor: '#bbbbbb',
                    input: this.image
                }, options);
                break;
            case 'dropdown':
                page.elements.add('dropdown', {
                    width: 100,
                    height: 25,
                    borderWidth: 1,
                    select: this.image
                }, options);
                break;
        }
        this.reset();
        readerPage.elDrawLayer.style.zIndex = '';
    }

    reset() {
        window.removeEventListener('mousemove', this.evtMousemove);
        this.floatElement?.remove();
        this.image = null;
        this.floatElement = null;
    }

    _bindCheckbox(el) {
        this.__setzIndex();
        this.isPageClick = false;
        this.image = document.createElement('input');
        this.image.setAttribute('type', 'checkbox');
        this.image.elementType = 'checkbox';
        let _element = this.image.cloneNode();
        _element.style.width = '25px';
        _element.style.height= '25px';
        this.createFloatElement(_element);
        // this._loadImg('forms_4.png').then(image => {
        //     image.elementType = 'checkbox';
        // });
    }

    _bindRadioGroup(el) {
        this.__setzIndex();
        this.isPageClick = false;
        this.image = document.createElement('input');
        this.image.setAttribute('type', 'radio');
        this.image.elementType = 'radioGroup';
        let _element = this.image.cloneNode();
        _element.style.width = '25px';
        _element.style.height= '25px';
        this.createFloatElement(_element);
        // this._loadImg('forms_5.png').then(image => {
        //     image.elementType = 'radioGroup';
        // });
    }

    _bindTextField(el) {
        this.__setzIndex();
        this.isPageClick = false;
        this.image = document.createElement('input');
        this.image.setAttribute('type', 'text');
        this.image.elementType = 'textField';
        
        let value = el.getAttribute('data-value');
        this.image.value = value;

        let _element = this.image.cloneNode();
        _element.style.width = '150px';
        _element.style.height= '25px';
        this.createFloatElement(_element);
        // this._loadImg('forms_6.png').then(image => {
        //     image.elementType = 'textField';
        // });
    }

    _bindDropdown(el) {
        this.__setzIndex();
        this.isPageClick = false;
        this.image = document.createElement('select');
        this.image.setAttribute('type', 'text');

        let options = ['Option1', 'Option2', 'Option3'];
        if (el.getAttribute('data-value')) {
            options = el.getAttribute('data-value').split('|');
        }
        for (let idx in options) {
            let elOption = document.createElement('option');
            elOption.value = options[idx];
            elOption.text = options[idx];
            this.image.appendChild(elOption);
        }
        

        this.image.elementType = 'dropdown';
        let _element = this.image.cloneNode();
        _element.style.width = '170px';
        _element.style.height= '35px';
        _element.style.background= 'rgba(207,216,246,.7)';
        this.createFloatElement(_element);
        // this._loadImg('forms_7.png').then(image => {
        //     image.elementType = 'dropdown';
        // });
    }
}

export default Forms;