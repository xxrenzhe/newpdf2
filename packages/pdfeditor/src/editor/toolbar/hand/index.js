import { ToolbarItemBase } from '../ToolbarItemBase';

const MOUSEDOWN_CLASS = '__cursor_hand_mousedown';

let eventTypes = {
    down: 'mousedown',
    up: 'mouseup',
    move: 'mousemove'
};
try {
    document.createEvent('TouchEvent');
    eventTypes = {
        down: 'touchstart',
        up: 'touchend',
        move: 'touchmove'
    };
} catch (e) {}


class Hand extends ToolbarItemBase {
    init() {
        this.name = 'hand';

        const moveEvent = (e) => {
            return this.onMove(e);
        }
        this.reader.mainBox.addEventListener(eventTypes.down, e => {
            if (this.status) {
                this.reader.mainBox.classList.add(MOUSEDOWN_CLASS);
                this.downPos = {
                    left: this.reader.parentElement.scrollLeft,
                    top: this.reader.parentElement.scrollTop,
                    x: e.clientX,
                    y: e.clientY
                };
                this.reader.mainBox.addEventListener(eventTypes.move, moveEvent);
            }
        });

        this.reader.mainBox.addEventListener('click', () => {
            if (this.status) {
                this.reader.mainBox.classList.remove(MOUSEDOWN_CLASS);
            }
            this.reader.mainBox.removeEventListener(eventTypes.move, moveEvent);
        });
    }

    onMove(e) {
        const dx = e.clientX - this.downPos.x;
        const dy = e.clientY - this.downPos.y;
        this.reader.parentElement.scrollTop = this.downPos.top - dy;
        this.reader.parentElement.scrollLeft = this.downPos.left - dx;
    }
}

export default Hand;