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

export const shouldBreakTextRun = (textItem, nextTextItem) => {
    if (!textItem || !nextTextItem) {
        return true;
    }

    if (textItem.color !== nextTextItem.color) {
        return true;
    }

    if (hasRotationDrift(textItem, nextTextItem)) {
        return true;
    }

    const vertical = isVerticalTextRun(textItem);
    if (vertical !== isVerticalTextRun(nextTextItem)) {
        return true;
    }

    const pos1 = getRunAxisPosition(textItem, vertical);
    const pos2 = getRunAxisPosition(nextTextItem, vertical);
    if (pos1 !== null && pos2 !== null) {
        const threshold = getAxisBreakThreshold(textItem, nextTextItem, vertical);
        if (Math.abs(pos2 - pos1) > threshold) {
            return true;
        }
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

    return hasDimensionDrift(textItem, nextTextItem, 'width');
};
