import Rect from '../rect';

class Eraser extends Rect {
    init() {
        this.name = 'eraser';
        let attrs = {
            background: '#ffffff',
            opacity: 1,
            rotate: undefined,
            borderWidth: undefined,
            borderColor: undefined
        };
        if (Eraser.attrs) {
            attrs = Object.assign(attrs, Eraser.attrs);
        }
        this.setAttrs(attrs);
        //最小绘制
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = Eraser.actions;
    }
}

export default Eraser;