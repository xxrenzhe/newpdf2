import Rect from '../rect';

class Radact extends Rect {
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
        //最小绘制
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = Radact.actions;
    }
}

export default Radact;