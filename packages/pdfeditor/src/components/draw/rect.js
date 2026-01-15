import Base from './base';

class Rect extends Base {
    constructor(options) {
        super(options);
        this.options = Object.assign({
            background: 'transparent',
            borderStyle: 'dashed',
            borderWidth: '1px',
            borderColor: '#0078D5',
            keep: false,
            opacity: 1
        }, this.options);
        this.background = this.options.background;
        this.opacity = this.options.opacity;
        this.borderStyle = this.options.borderStyle;
        this.borderWidth = this.options.borderWidth;
        this.borderColor = this.options.borderColor;
    }

    onDown(e) {
        // if (!this.options.keep) {
        //     this.container.querySelectorAll('.__draw_rect').forEach(el => el.remove());
        // }

        this.box = document.createElement('div');
        this.box.classList.add('__draw_rect');
        this.box.style.position = 'absolute';
        this.box.style.left = this.firstPos.x + 'px';
        this.box.style.top = this.firstPos.y + 'px';
        this.box.style.background = this.background;
        this.box.style.border = this.border;
        this.box.style.borderStyle = this.borderStyle;
        this.box.style.borderWidth = this.borderWidth;
        this.box.style.borderColor = this.borderColor;
        this.box.style.opacity = this.opacity;
        this.container.appendChild(this.box);
    }

    onMove(e) {
        let pos = this.getPos(e);
        let left = this.firstPos.x;
        let top = this.firstPos.y;
        let width = pos.x - this.firstPos.x;
        let height = pos.y - this.firstPos.y;
        if (pos.x < this.firstPos.x) {
            width = this.firstPos.x - pos.x;
            left = pos.x;
        }
        
        if (pos.y < this.firstPos.y) {
            height = this.firstPos.y - pos.y;
            top = pos.y;
        }
        this.box.style.width = width + 'px';
        this.box.style.height = height + 'px';
        this.box.style.left = left + 'px';
        this.box.style.top = top + 'px';
    }

    onUp(e) {
        let res = [
            this.rect
        ];
        if (!this.options.keep) {
            this.box.remove();
            return res;
        }
        res.push(this.box);
        return res;
    }
}

export default Rect;