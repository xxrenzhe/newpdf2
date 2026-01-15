import Arrow from '../arrow';
import CircleStroke from '../circle_stroke';
import EllipseStroke from '../ellipse_stroke';
import Line from '../line';
import RectStroke from '../rect_stroke';
import { ToolbarItemBase } from '../ToolbarItemBase';

class Shapes extends ToolbarItemBase {
    init() {
        this.name = 'shapes';
        this.drawRect = null;
        this.drawCircle = null;
        this.drawLine = null;
        this.drawEllipse = null;
        this.drawArrow = null;
    }

    initActions(objElement) {
        const temp = document.createElement('div');
        temp.innerHTML = require('./actions.phtml')();

        const elRect = temp.querySelector('.draw_rect');
        elRect.addEventListener('click', () => {
            if (!this.drawRect) {
                this.drawRect = new RectStroke(this.toolbar);
            }
            this.drawRect.click();
        });


        const elCircle = temp.querySelector('.draw_circle');
        elCircle.addEventListener('click', () => {
            if (!this.drawCircle) {
                this.drawCircle = new CircleStroke(this.toolbar);
            }
            this.drawCircle.click();
        });


        const elLine = temp.querySelector('.draw_line');
        elLine.addEventListener('click', () => {
            if (!this.drawLine) {
                this.drawLine = new Line(this.toolbar);
                this.drawLine.attrs.straightLine = true;
            }
            this.drawLine.click();
        });


        const elEllipse = temp.querySelector('.draw_ellipse');
        elEllipse.addEventListener('click', () => {
            if (!this.drawEllipse) {
                this.drawEllipse = new EllipseStroke(this.toolbar);
            }
            this.drawEllipse.click();
        });

        const elArrow = temp.querySelector('.draw_arrow');
        elArrow.addEventListener('click', () => {
            if (!this.drawArrow) {
                this.drawArrow = new Arrow(this.toolbar);
            }
            this.drawArrow.click();
        });


        let elActions = [];
        for (let elChild of temp.children) {
            elActions.push(elChild);
        }
        return elActions;
    }
}

export default Shapes;