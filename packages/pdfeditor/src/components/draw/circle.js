import Ellipse from './ellipse';

class Circle extends Ellipse {
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
        this.box.style.height = width + 'px';
        this.box.style.left = left + 'px';
        this.box.style.top = top + 'px';
    }
}

export default Circle;