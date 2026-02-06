import Eraser from '../eraser';

class Radact extends Eraser {
    init() {
        this.name = 'radact';
        let attrs = {
            background: '#000000',
            opacity: 1,
            rotate: undefined,
            borderWidth: undefined,
            borderColor: undefined
        };
        if (Radact.attrs) {
            attrs = Object.assign(attrs, Radact.attrs);
        }
        this.setAttrs(attrs);
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = Radact.actions;
    }
}

export default Radact;
