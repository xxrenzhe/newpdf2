import Rect from '../rect';

class Highlight extends Rect {
    init() {
        this.name = 'highlight';
        let attrs = {
            background: '#fff000',
            opacity: 0.3,
            rotate: undefined,
            borderWidth: undefined,
            borderColor: undefined
        };
        if (Highlight.attrs) {
            attrs = Object.assign(attrs, Highlight.attrs);
        }
        this.setAttrs(attrs);
        //最小绘制
        this.minWidth = 13;
        this.minHeight = 13;
        this.actions = Highlight.actions;
    }
}

export default Highlight;