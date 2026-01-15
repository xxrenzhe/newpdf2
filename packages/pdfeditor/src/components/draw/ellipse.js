import Rect from './rect';

class Ellipse extends Rect {
    onDown(e) {
        super.onDown(e);
        this.box.style.borderRadius = '50%';
    }
}

export default Ellipse;