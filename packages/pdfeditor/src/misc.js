import { SCALE, VIEW_MODE } from "./defines";

//计算滚轮方向
function normalizeWheelEventDirection(evt) {
    let delta = Math.hypot(evt.deltaX, evt.deltaY);
    const angle = Math.atan2(evt.deltaY, evt.deltaX);

    if (-0.25 * Math.PI < angle && angle < 0.75 * Math.PI) {
        delta = -delta;
    }


    // const MOUSE_DOM_DELTA_PIXEL_MODE = 0;
    // const MOUSE_DOM_DELTA_LINE_MODE = 1;
    // const MOUSE_PIXELS_PER_LINE = 30;
    // const MOUSE_LINES_PER_PAGE = 30;

    // if (evt.deltaMode === MOUSE_DOM_DELTA_PIXEL_MODE) {
    //     delta /= MOUSE_PIXELS_PER_LINE * MOUSE_LINES_PER_PAGE;
    // } else if (evt.deltaMode === MOUSE_DOM_DELTA_LINE_MODE) {
    //     delta /= MOUSE_LINES_PER_PAGE;
    // }
    return delta;
}

function createId(prefix, num) {
    let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    let usort_id = [];
    let radix = chars.length;
    let len = num || 36;
    usort_id[0] = prefix || 'pi_';
    for (let i = 1; i < len; i++) usort_id[i] = chars[0 | Math.random() * radix];
    return usort_id.join('');
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        let r = parseInt(result[1], 16);
        let g = parseInt(result[2], 16);
        let b = parseInt(result[3], 16);
        //return r + "," + g + "," + b;
        return [ r, g, b ];
    }
    return null;
}

function mergeDeep(target, source) {
    for (let key in source) {
        let val = source[key];
        if (val === null || val instanceof Node) {
            target[key] = val;
            continue;
        }
        if (typeof(val) == 'object' && !Array.isArray(val)) {
            target[key] = mergeDeep(target[key], val);
        } else {
            target[key] = val;
        }
    }
    return target;
}

async function embedImage(pdfDocument, imageType, arrayBuffer) {
    let embedImage = null;
    try {
        if (imageType == 'image/png') {
            embedImage = await pdfDocument.embedPng(arrayBuffer);
        } else {
            embedImage = await pdfDocument.embedJpg(arrayBuffer);
        }
    } catch (e) {
        imageType = imageType == 'image/png' ? 'image/jpeg' : 'image/png';
        try {
            if (imageType == 'image/png') {
                embedImage = await pdfDocument.embedPng(arrayBuffer);
            } else {
                embedImage = await pdfDocument.embedJpg(arrayBuffer);
            }
        } catch (e) {
            // throw 'Picture embedding failed!';
            return false;
        }
    }
    return embedImage;
}

function sibling( elem ) {
    var r = [];
    var n = elem.parentNode.firstChild;
    for ( ; n; n = n.nextSibling ) {
        if ( n.nodeType === 1 && n !== elem ) {
            r.push( n );
        }
    }
     
    return r;
}

// function measureText(text, font) {
//     const canvas = document.createElement('canvas');
//     const ctx = canvas.getContext('2d');
//     ctx.font = font;
//     const metrics = ctx.measureText(text);
//     return {
//         width: metrics.width,
//         height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
//         ascent: metrics.actualBoundingBoxAscent,
//         descent: metrics.actualBoundingBoxDescent
//     }
// }

function genTextImage(options) {
    const rect = measureText(options.text, options.font);
    const lineWidth = options.thickness || 0;
    const canvas = document.createElement('canvas');
    canvas.width = rect.width + 5;
    canvas.height = rect.height + lineWidth * 2;
    const ctx = canvas.getContext('2d');

    // ctx.fillStyle = '#fff000';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = options.font;
    ctx.fillStyle = options.color;
    ctx.fillText(options.text, 0, rect.ascent);

    if (options.underline) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - lineWidth);
        ctx.lineTo(canvas.width, canvas.height - lineWidth);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.stroke();
    }
    return canvas;
}

function getPixelColor(context, x, y) {
    let imageData = context.getImageData(x, y, 1, 1);
    // let canvas = document.createElement('canvas');
    // canvas.width = imageData.width;
    // canvas.height = imageData.height;
    // let ctx = canvas.getContext('2d');
    // ctx.putImageData(imageData, 0, 0);
    // canvas.toBlob(blob => {
    //     window.open(URL.createObjectURL(blob));
    // });
    let pixel = imageData.data;
    let r = pixel[0];
    let g = pixel[1];
    let b = pixel[2];
    let a = pixel[3] / 255;
    a = Math.round(a * 100) / 100;
    let rgbaColor = "rgba(" + r + "," + g + "," + b + "," + a + ")";
    return rgbaColor;
}

function trimSpace(text) {
    if (typeof (text) != 'string') return text;
    return text.replace(/^\s+|\s+$/g, '');
}

function computeScale(viewMode, pdfWidth, pdfHeight, elWrapper, outputScale) {
    let scale = parseFloat(viewMode);
    if (scale > 0) {
        return scale;
    } else {
        const offsetWidth = elWrapper.clientWidth;
        const offsetHeight = elWrapper.clientHeight;
        const cssInfo = getComputedStyle(elWrapper);
        const hPadding = parseInt(cssInfo.paddingLeft) + parseInt(cssInfo.paddingRight);
        const vPadding = parseInt(cssInfo.paddingTop) + parseInt(cssInfo.paddingBottom);

        const scrollWidth = elWrapper.offsetWidth - elWrapper.clientWidth;
        const pageWidthScale = Math.min(SCALE.MAX, ((offsetWidth - hPadding - scrollWidth) / pdfWidth / outputScale));
        const pageHeightScale = ((offsetHeight - vPadding) / pdfHeight / outputScale);
        const horizontalScale = pdfWidth <= pdfHeight ? pageWidthScale : Math.min(pageHeightScale, pageWidthScale);
        const pageAutoScale = Math.min(SCALE.AUTO_MAX, horizontalScale);

        switch (viewMode) {
            case VIEW_MODE.AUTO_ZOOM:
                scale = pageAutoScale;
                break;
            case VIEW_MODE.FIT_PAGE:
                scale = pageHeightScale;
                break;
            case VIEW_MODE.FIT_WIDTH:
                scale = pageWidthScale;
                break;
            case VIEW_MODE.ACTUAL_SIZE:
                scale = 1;
                break;
            case VIEW_MODE.VIEW_2PAGE:
                scale = pageWidthScale / 3.5;
        }
    }
    return parseFloat(scale.toFixed(2));
}

function elSliderToggle(el, className, showDisplayValue) {
    if (!showDisplayValue) {
        showDisplayValue = 'block';
    }
    const classList = el.classList;
    let status = false;
    if (classList.contains(className)) {
        elSliderHide(el, className);
    } else {
        status = true;
        elSliderShow(el, className, showDisplayValue);
    }
    return status;
}

function elSliderShow(el, className, showDisplayValue) {
    if (!showDisplayValue) {
        showDisplayValue = 'block';
    }
    const classList = el.classList;
    el.style.display = showDisplayValue;
    el.offsetWidth;
    classList.add(className);
}

function elSliderHide(el, className) {
    const classList = el.classList;
    classList.remove(className);
    setTimeout(() => {
        el.style.display = 'none';
    }, 300);
}

function CSSActive(elements, element, className) {
    if (!className) {
        className = 'active';
    }
    let status = false;
    if (Array.isArray(elements)) {
        elements.forEach(el => {
            if (el == element) {
                status = el.classList.contains(className);
                if (status) {
                    el.classList.remove(className);
                } else {
                    el.classList.add(className);
                }
            } else {
                el.classList.remove(className);
            }
        });
    } else {
        status = elements.classList.contains(className);
        if (status) {
            elements.classList.remove(className);
        } else {
            elements.classList.add(className);
        }
    }
    return status;
}

function getPosCenterPointRotation(x, y, width, height, deg) {
    // let toDegree = function (radians) {
    //     return radians * (180 / Math.PI);
    // }
    let toRadians = function (degree) {
        return degree * (Math.PI / 180);
    };

    let centerX = width / 2;
    let centerY = height / 2;
    // Diagonal angle
    let diagRadians = Math.atan(width / height);
    // let diagAngle = toDegree(diagRadians);
    // Half Length diagonal
    let diagHalfLength = Math.sqrt(Math.pow(height, 2) + Math.pow(width, 2)) / 2;

    // Center coordinates of rotated rectangle.
    let rotatedCenterX = Math.sin(diagRadians + toRadians(deg)) * diagHalfLength;
    let rotatedCenterY = Math.cos(diagRadians + toRadians(deg)) * diagHalfLength;
    let offsetX = centerX - rotatedCenterX;
    let offsetY = centerY - rotatedCenterY;
    return {
        x: x + offsetX,
        y: y - offsetY
    }
}

function getUrlParam(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) return decodeURI(r[2]);//unescape(r[2]);
    return null;
}

function downloadLoad(percent){
    let _percent = 314 * (percent / 100)+ ', ' + 314,
    elSvg = document.querySelector('._loadingv2'),
    elProgress = elSvg.querySelector(".progress"),
    elProgressText = elSvg.querySelector('.progress-text');
    if(elProgress){
        elProgress.style.strokeDasharray = _percent;
        if(percent > 100){
            percent = 100
        }
        elProgressText.textContent = parseInt(percent) + '%';
    }
}

export {
    normalizeWheelEventDirection,
    createId,
    rgbToHex,
    hexToRgb,
    mergeDeep,
    embedImage,
    computeScale,
    // measureText,
    genTextImage,
    getPixelColor,
    trimSpace,
    elSliderToggle,
    elSliderShow,
    elSliderHide,
    CSSActive,
    getPosCenterPointRotation,
    getUrlParam,
    sibling,
    downloadLoad,
};