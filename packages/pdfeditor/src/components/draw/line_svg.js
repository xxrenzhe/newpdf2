import Base from './base';
import { path } from 'd3-path';

class Line extends Base {
    constructor(options) {
        super(options);
        this.options = Object.assign({
            lineWidth: 2,
            lineColor: '#000000',
            lineCap: 'round', //butt
            //直线
            straightLine: false,
            canvasWidth: null,
            canvasHeight: null,
            // opacity: 1,
            style: null
        }, this.options);
        this.beginPoint = {};
        this.points = [];
        this.boxRect = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: 0,
            height: 0
        };
        this.lineWidth = this.options.lineWidth;
        this.lineColor = this.options.lineColor;
        this.lineCap = this.options.lineCap;
        this.straightLine = this.options.straightLine;
        // this.opacity = this.options.opacity;
    }

    onDown(e) {
        this.initCanvas();
        this.container.appendChild(this.canvas);
        //this.ctx.lineJoin = 'round';
        this.ctx.lineCap = this.lineCap;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.strokeStyle = this.lineColor;
        let pos = this.getPos(e);
        this.beginPoint = pos;
        this.points.push(pos);
        if (!this.boxRect.left) {
            this.boxRect.left = pos.x;
        }
        if (!this.boxRect.top) {
            this.boxRect.top = pos.y;
        }
        this.d3Path = path();
    }

    onMove(e) {
        let pos = this.getPos(e);
        this.points.push(pos);
        if (this.straightLine) {
            this.drawStraightLine(this.beginPoint, pos);
        } else {
            this.flushBoxRect(pos);
            if (this.points.length > 3) {
                const lastTwoPoints = this.points.slice(-2);
                const controlPoint = lastTwoPoints[0];
                const endPoint = {
                    x: (lastTwoPoints[0].x + lastTwoPoints[1].x) / 2,
                    y: (lastTwoPoints[0].y + lastTwoPoints[1].y) / 2,
                }
                this.drawLine(this.beginPoint, controlPoint, endPoint);
                this.beginPoint = endPoint;
            }
        }
    }

    onUp(e) {
        let pos = this.getPos(e);
        this.points.push(pos);

        if (this.straightLine) {
            this.flushStraightLineRect(pos);
            this.drawStraightLine(this.beginPoint, pos);

            this.d3Path.moveTo(this.beginPoint.x, this.beginPoint.y);
            this.d3Path.lineTo(pos.x, pos.y);
        } else {
            this.flushBoxRect(pos);
            if (this.points.length > 3) {
                const lastTwoPoints = this.points.slice(-2);
                const controlPoint = lastTwoPoints[0];
                const endPoint = lastTwoPoints[1];
                this.drawLine(this.beginPoint, controlPoint, endPoint);
            }
        }
        this.beginPoint = null;
        this.points = [];

        let sx = Math.max(0, this.boxRect.left - this.lineWidth);
        let sy = Math.max(0, this.boxRect.top - this.lineWidth);
        let sw = this.boxRect.width + this.lineWidth * 2;
        let sh = this.boxRect.height + this.lineWidth * 2;
        let imageData = this.ctx.getImageData(sx, sy, sw, sh);

        //测试矩形边界
        // this.ctx.strokeRect(sx, sy, sw, sh);

        let canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        let ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        // const dataURL = canvas.toDataURL('image/png', 1);
        const dataURL = this.d3Path.toString();
        // <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 1200">
        //     <path stroke-opacity="0.5" stroke="black" stroke-width="10" stroke-linecap="round" d="M159,88L457,347">
        // </svg>
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

    drawLine(beginPoint, controlPoint, endPoint) {
        // this.ctx.globalAlpha = this.opacity;
        this.ctx.beginPath();
        this.ctx.moveTo(beginPoint.x, beginPoint.y);
        this.ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);
        this.ctx.stroke();
        this.ctx.closePath();

        this.d3Path.moveTo(beginPoint.x, beginPoint.y);
        this.d3Path.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);
    }

    //绘制直线
    drawStraightLine(beginPoint, endPoint) {
        // this.ctx.globalAlpha = this.opacity;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.beginPath();
        this.ctx.moveTo(beginPoint.x, beginPoint.y);
        this.ctx.lineTo(endPoint.x, endPoint.y);
        this.ctx.stroke();
        this.ctx.closePath();
    }

    //刷新绘制在canvas中元素的矩形边界
    flushBoxRect(pos) {
        if (pos.x < this.boxRect.left) {
            this.boxRect.left = pos.x;
        }
        if (pos.x > this.boxRect.right) {
            this.boxRect.right = pos.x;
        }
        if (pos.y < this.boxRect.top) {
            this.boxRect.top = pos.y;
        }
        if (pos.y > this.boxRect.bottom) {
            this.boxRect.bottom = pos.y;
        }
        this.boxRect.width = this.boxRect.right - this.boxRect.left;
        this.boxRect.height = this.boxRect.bottom - this.boxRect.top;
        return this.boxRect;
    }
    
    flushStraightLineRect(pos) {
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
        this.boxRect.width = this.boxRect.right - this.boxRect.left;
        this.boxRect.height = this.boxRect.bottom - this.boxRect.top;
        return this.boxRect;
    }
}

export default Line;