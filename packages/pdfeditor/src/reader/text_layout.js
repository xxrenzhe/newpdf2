const DEFAULT_ROTATION = 0;

const getTransform = (textItem) => {
    if (!textItem || !Array.isArray(textItem.transform) || textItem.transform.length < 2) {
        return null;
    }
    return textItem.transform;
};

const normalizeDegree = (degree) => {
    let value = degree;
    while (value > 180) {
        value -= 360;
    }
    while (value <= -180) {
        value += 360;
    }
    return value;
};

const isFiniteNumber = (value) => Number.isFinite(value);

const toFiniteOrZero = (value) => {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return value;
};

const getDimensionThreshold = (textItem, nextTextItem, key) => {
    const current = toFiniteOrZero(textItem?.[key]);
    const next = toFiniteOrZero(nextTextItem?.[key]);
    return Math.max(1, Math.max(current, next) * 0.45);
};

const hasDimensionDrift = (textItem, nextTextItem, key) => {
    const current = toFiniteOrZero(textItem?.[key]);
    const next = toFiniteOrZero(nextTextItem?.[key]);
    const threshold = getDimensionThreshold(textItem, nextTextItem, key);
    return Math.abs(next - current) > threshold;
};

export const getTextRotation = (textItem) => {
    const transform = getTransform(textItem);
    if (!transform) {
        return DEFAULT_ROTATION;
    }
    const a = transform[0];
    const b = transform[1];
    if (!isFiniteNumber(a) || !isFiniteNumber(b)) {
        return DEFAULT_ROTATION;
    }
    const radian = Math.atan2(b, a);
    const degree = radian * 180 / Math.PI;
    if (!isFiniteNumber(degree)) {
        return DEFAULT_ROTATION;
    }
    return normalizeDegree(Math.round(degree * 100) / 100);
};

export const isVerticalTextRun = (textItem) => {
    const transform = getTransform(textItem);
    if (!transform) {
        return false;
    }
    const a = transform[0];
    const b = transform[1];
    if (!isFiniteNumber(a) || !isFiniteNumber(b)) {
        return false;
    }
    return Math.abs(b) > Math.abs(a) * 1.2;
};

const getRunAxisPosition = (textItem, isVertical) => {
    const transform = getTransform(textItem);
    if (!transform) {
        return null;
    }
    const pos = isVertical ? transform[4] : transform[5];
    return isFiniteNumber(pos) ? pos : null;
};

const getAxisBreakThreshold = (textItem, nextTextItem, isVertical) => {
    const majorSize = isVertical
        ? Math.max(textItem.width || 0, nextTextItem.width || 0)
        : Math.max(textItem.height || 0, nextTextItem.height || 0);
    return Math.max(1, majorSize * 0.6);
};

const hasRotationDrift = (textItem, nextTextItem) => {
    const currentRotation = getTextRotation(textItem);
    const nextRotation = getTextRotation(nextTextItem);
    const drift = Math.abs(nextRotation - currentRotation);
    const normalizedDrift = drift > 180 ? 360 - drift : drift;
    return normalizedDrift > 8;
};


export const getRunReadGap = (textItem, nextTextItem, isVertical) => {
    const transform1 = getTransform(textItem);
    const transform2 = getTransform(nextTextItem);
    if (!transform1 || !transform2) {
        return 0;
    }
    if (isVertical) {
        // Vertical reading: normally top-to-bottom
        // The Y position is transform[5]
        const y1 = transform1[5];
        const y2 = transform2[5];
        // The text height is textItem.height
        // distance from end of textItem to start of nextTextItem
        return y1 < y2 ? y2 - (y1 + (textItem.height || 0)) : y1 - (y2 + (nextTextItem.height || 0));
    } else {
        // Horizontal reading: normally left-to-right
        // The X position is transform[4]
        const x1 = transform1[4];
        const x2 = transform2[4];
        // The text width is textItem.width
        return x1 < x2 ? x2 - (x1 + (textItem.width || 0)) : x1 - (x2 + (nextTextItem.width || 0));
    }
};

const hasLargeReadGap = (textItem, nextTextItem, isVertical) => {
    const gap = getRunReadGap(textItem, nextTextItem, isVertical);
    const size = isVertical ? textItem.width : textItem.height;
    // If the gap is significantly larger than the font size (e.g. 1.5x height), break the run
    const threshold = Math.max(8, (size || 0) * 1.5);
    return gap > threshold;
};


const getRunLineGap = (textItem, nextTextItem, isVertical) => {
    const transform1 = getTransform(textItem);
    const transform2 = getTransform(nextTextItem);
    if (!transform1 || !transform2) return 0;
    if (isVertical) {
        // Vertical reading: the X position defines the column
        return transform1[4] - transform2[4]; // Next column moves left
    } else {
        // Horizontal reading: the Y position defines the line
        return transform1[5] - transform2[5]; // Next line moves down (Y decreases in PDF coords)
    }
};

export const shouldBreakTextRun = (textItem, nextTextItem) => {
    if (!textItem || !nextTextItem) return true;

    // [KISS Optimization] 段落与字体强一致性：颜色不同绝对截断
    if (textItem.color !== nextTextItem.color) return true;

    if (hasRotationDrift(textItem, nextTextItem)) return true;

    const vertical = isVerticalTextRun(textItem);
    if (vertical !== isVerticalTextRun(nextTextItem)) return true;

    const pos1 = getRunAxisPosition(textItem, vertical);
    const pos2 = getRunAxisPosition(nextTextItem, vertical);
    
    // [KISS Optimization] 智能多行段落合并 (Heuristic Multi-line Clustering)
    if (pos1 !== null && pos2 !== null) {
        const axisDrift = Math.abs(pos2 - pos1);
        const threshold = getAxisBreakThreshold(textItem, nextTextItem, vertical);
        
        if (axisDrift > threshold) {
            // It might be a new line! Let's check line gap
            const lineGap = getRunLineGap(textItem, nextTextItem, vertical);
            const size = vertical ? textItem.width : textItem.height;
            // A typical line gap is roughly 1.0x to 1.8x the font size
            if (lineGap > (size * 0.8) && lineGap < (size * 2.2)) {
                // Furthermore, the next item should jump back (carriage return)
                const readGap = getRunReadGap(textItem, nextTextItem, vertical);
                // readGap is calculated as if they were on the same line. 
                // A carriage return means the next item's start is far behind the current item's end.
                if (readGap < -(size * 2)) {
                    // It's a valid new line within the same paragraph! Don't break.
                    // But wait, are they using the same font size?
                    if (!hasDimensionDrift(textItem, nextTextItem, vertical ? 'width' : 'height')) {
                        return false; 
                    }
                }
            }
            return true; // Not a valid new line, break it.
        }
    }

    if (hasLargeReadGap(textItem, nextTextItem, vertical)) {
        return true;
    }



    if (!vertical) {
        const currentHeight = toFiniteOrZero(textItem.height);
        const nextHeight = toFiniteOrZero(nextTextItem.height);

        if (currentHeight === 0 && nextHeight > 0) {
            const threshold = Math.max(8, nextHeight * 0.6);
            return (textItem.width || 0) > threshold;
        }

        if (nextHeight === 0) {
            const height = Math.max(currentHeight, nextHeight);
            const threshold = Math.max(8, height * 0.6);
            return (nextTextItem.width || 0) > threshold;
        }

        // [KISS Optimization] 公式符号/角标智能融合识别：若物理字间距极小，容忍字体大小/高度的突变（不强行截断），从而保持整个公式和大小混排文字在一个编辑框内
        const gap = getRunReadGap(textItem, nextTextItem, vertical);
        const maxH = Math.max(currentHeight, nextHeight);
        if (gap < (maxH * 0.4)) {
            return false;
        }

        return hasDimensionDrift(textItem, nextTextItem, 'height');
    }

    const currentWidth = toFiniteOrZero(textItem.width);
    const nextWidth = toFiniteOrZero(nextTextItem.width);

    if (currentWidth === 0 && nextWidth > 0) {
        const threshold = Math.max(8, nextWidth * 0.6);
        return (textItem.height || 0) > threshold;
    }

    if (nextWidth === 0) {
        const width = Math.max(currentWidth, nextWidth);
        const threshold = Math.max(8, width * 0.6);
        return (nextTextItem.height || 0) > threshold;
    }

    const gapWidth = getRunReadGap(textItem, nextTextItem, vertical);
    const maxW = Math.max(currentWidth, nextWidth);
    if (gapWidth < (maxW * 0.4)) {
        return false;
    }

    return hasDimensionDrift(textItem, nextTextItem, 'width');
};
