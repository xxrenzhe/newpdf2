import Dialog from './index';

class DialogConfirm extends Dialog {
    constructor(options) {
        super(options);
        this.elDialogBody.classList.add('__dialog_confirm');
        let btnClass = this.options.btnClass || '';

        this.elContainer = document.createElement('div');
        this.elContainer.className = '__dialog_confirm_buttons';
        this.elYes = document.createElement('button');
        this.elYes.textContent = this.options.yes || 'Yes';
        this.elYes.className = '__dialog_confirm_btn __dialog_confirm_yes ' + btnClass;
        this.elYes.addEventListener('click', e => {
            if (typeof(this.options.onYes) == 'function') {
                this.options.onYes(this);
            }
            this.close();
        });

        this.elNo = document.createElement('button');
        this.elNo.textContent = this.options.no || 'No';
        this.elNo.className = '__dialog_confirm_btn __dialog_confirm_no ' + btnClass;
        this.elNo.addEventListener('click', e => {
            if (typeof(this.options.onNo) == 'function') {
                this.options.onNo(this);
            }
            this.close();
        });

        this.elContainer.appendChild(this.elYes);
        this.elContainer.appendChild(this.elNo);
        this.setBody(this.elContainer);
    }
}

export default DialogConfirm;