import Base from "./base";

class Arrow extends Base {
    constructor(options) {
        super(options);
        this.options = Object.assign({
            // size: 2,
            lineWidth: 2,
            color: '#ff0000',
            canvasWidth: null,
            canvasHeight: null,
            style: null
        }, this.options);
        this.beginPoint = {};
        this.endPoint = {};
        this.boxRect = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: 0,
            height: 0
        };
        this.color = this.options.color;
        // this.size = this.options.size;
        this.lineWidth = this.options.lineWidth;

        this.edgeLen = 50;
        this.angle = 25;
        this.arrowAngle = 0;
        this.polygonVertex = [];
    }

    //设置箭头大小
    arrowSize() {
        let x = this.endPoint.x - this.beginPoint.x,
            y = this.endPoint.y - this.beginPoint.y,
            length = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));

        if (length < 250) {
            this.edgeLen = this.edgeLen / 2;
            this.angle = this.angle / 2;
        } else if (length < 500) {
            this.edgeLen = this.edgeLen * length / 500;
            this.angle = this.angle * length / 500;
        }
    }

    //返回以起点与X轴之间的夹角角度值
    getRadian() {
        this.edgeLen = 50;
        this.angle = 25;
        this.arrowSize();
        return Math.atan2(this.endPoint.y - this.beginPoint.y, this.endPoint.x - this.beginPoint.x) / Math.PI * 180;
    }

    //获得箭头底边两个点
    arrowCoord() {
        this.polygonVertex[0] = this.beginPoint.x;
        this.polygonVertex[1] = this.beginPoint.y;
        this.polygonVertex[6] = this.endPoint.x;
        this.polygonVertex[7] = this.endPoint.y;
        this.arrowAngle = this.getRadian();
        this.polygonVertex[8] = this.endPoint.x - this.edgeLen * Math.cos(Math.PI / 180 * (this.arrowAngle + this.angle));
        this.polygonVertex[9] = this.endPoint.y - this.edgeLen * Math.sin(Math.PI / 180 * (this.arrowAngle + this.angle));
        this.polygonVertex[4] = this.endPoint.x - this.edgeLen * Math.cos(Math.PI / 180 * (this.arrowAngle - this.angle));
        this.polygonVertex[5] = this.endPoint.y - this.edgeLen * Math.sin(Math.PI / 180 * (this.arrowAngle - this.angle));
    }

    //获取另两个底边侧面点
    sideCoord() {
        let midpoint = {};
        midpoint.x = (this.polygonVertex[4] + this.polygonVertex[8]) / 2;
        midpoint.y = (this.polygonVertex[5] + this.polygonVertex[9]) / 2;
        this.polygonVertex[2] = (this.polygonVertex[4] + midpoint.x) / 2;
        this.polygonVertex[3] = (this.polygonVertex[5] + midpoint.y) / 2;
        this.polygonVertex[10] = (this.polygonVertex[8] + midpoint.x) / 2;
        this.polygonVertex[11] = (this.polygonVertex[9] + midpoint.y) / 2;
    }

    //画箭头
    drawArrow() {
        this.arrowCoord();
        this.sideCoord();

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.beginPath();
        this.ctx.moveTo(this.polygonVertex[0], this.polygonVertex[1]);
        this.ctx.lineTo(this.polygonVertex[2], this.polygonVertex[3]);
        this.ctx.lineTo(this.polygonVertex[4], this.polygonVertex[5]);
        this.ctx.lineTo(this.polygonVertex[6], this.polygonVertex[7]);
        this.ctx.lineTo(this.polygonVertex[8], this.polygonVertex[9]);
        this.ctx.lineTo(this.polygonVertex[10], this.polygonVertex[11]);
        this.ctx.closePath();
        this.ctx.fill();
    }

    onDown(e) {
        this.initCanvas();
        this.container.appendChild(this.canvas);
        this.ctx.fillStyle = this.color;
        let pos = this.getPos(e);
        this.beginPoint = pos;
        if (!this.boxRect.left) {
            this.boxRect.left = pos.x;
        }
        if (!this.boxRect.top) {
            this.boxRect.top = pos.y;
        }
    }

    onMove(e) {
        this.endPoint = this.getPos(e);
        this.drawArrow();
    }

    onUp(e) {
        this.endPoint = this.getPos(e);
        this.flushBoxRect(this.endPoint);
        this.drawArrow();
        this.beginPoint = null;
        this.endPoint = null;

        let sx = Math.max(0, this.boxRect.left - this.lineWidth);
        let sy = Math.max(0, this.boxRect.top - this.lineWidth);
        let sw = this.boxRect.width + this.lineWidth * 2;
        let sh = this.boxRect.height + this.lineWidth * 2;
        let imageData = this.ctx.getImageData(sx, sy, sw, sh);

        let canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        let ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        let dataURL = canvas.toDataURL('image/png', 1);
        canvas.remove();
        return [
            {
                x: sx,
                y: sy,
                width: sw,
                height: sh
            },
            dataURL
        ];
    }

    initCanvas() {
        if (this.canvas) {
            return;
        }
        this.canvas = document.createElement('canvas');
        this.canvas.classList.add('__draw_canvas');
        if (this.options.style) {
            for (let k in this.options.style) {
                this.canvas.style.setProperty(k, this.options.style[k]);
            }
        }
        let rect = this.container.getBoundingClientRect();
        let width = this.options.canvasWidth ? this.options.canvasWidth : rect.width;
        let height = this.options.canvasHidth ? this.options.canvasHidth : rect.height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
    }

    clearCanvas() {
        this.canvas.width = this.canvas.width;
        this.boxRect = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: 0,
            height: 0
        };
    }

    //刷新绘制在canvas中元素的矩形边界
    flushBoxRect(pos) {
        if (pos.x < this.boxRect.left) {
            this.boxRect.right = this.boxRect.left;
            this.boxRect.left = pos.x;
        } else {
            this.boxRect.right = pos.x;
        }
        if (pos.y < this.boxRect.top) {
            this.boxRect.bottom = this.boxRect.top;
            this.boxRect.top = pos.y;
        } else {
            this.boxRect.bottom = pos.y;
        }

        let arrowAngle = Math.abs(this.arrowAngle);
        if ((arrowAngle >= 0 && arrowAngle <= 20) || (arrowAngle >= 170 && arrowAngle <= 180)) {
            let top_bottom = 0;
            if (this.polygonVertex[5] > this.polygonVertex[7]) {
                top_bottom = this.polygonVertex[5] - this.polygonVertex[7];
            } else {
                top_bottom = this.polygonVertex[7] - this.polygonVertex[5];
            }
            this.boxRect.top -= top_bottom;
            this.boxRect.bottom += top_bottom;
        } else if (arrowAngle >= 80 && arrowAngle <= 100) {
            let left_right = 0;
            if (this.polygonVertex[4] > this.polygonVertex[6]) {
                left_right = this.polygonVertex[4] - this.polygonVertex[6];
            } else {
                left_right = this.polygonVertex[6] - this.polygonVertex[4];
            }
            this.boxRect.left -= left_right;
            this.boxRect.right += left_right;
        }
        this.boxRect.width = this.boxRect.right - this.boxRect.left;
        this.boxRect.height = this.boxRect.bottom - this.boxRect.top;
        return this.boxRect;
    }
}


export default Arrow;