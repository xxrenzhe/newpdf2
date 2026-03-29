const toFiniteNumber = (value) => {
    const parsed = Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeRect = (rect) => {
    if (!rect || typeof rect !== 'object') {
        return null;
    }

    const left = toFiniteNumber(rect.left ?? rect.x);
    const top = toFiniteNumber(rect.top ?? rect.y);
    const width = toFiniteNumber(rect.width);
    const height = toFiniteNumber(rect.height);
    if ([left, top, width, height].some((value) => value === null)) {
        return null;
    }

    return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height
    };
};

export const rectsIntersect = (rectA, rectB) => {
    const a = normalizeRect(rectA);
    const b = normalizeRect(rectB);
    if (!a || !b) {
        return false;
    }

    return a.left < b.right
        && a.right > b.left
        && a.top < b.bottom
        && a.bottom > b.top;
};

export const getElementViewportRect = (element) => {
    const el = element?.el;
    const left = toFiniteNumber(el?.style?.left);
    const top = toFiniteNumber(el?.style?.top);
    const width = toFiniteNumber(el?.style?.width);
    const height = toFiniteNumber(el?.style?.height);
    if ([left, top, width, height].every((value) => value !== null)) {
        return normalizeRect({
            left,
            top,
            width,
            height
        });
    }

    const scale = Number.isFinite(element?.scale) ? element.scale : 1;
    const actualRect = element?.actualRect;
    if (!actualRect) {
        return null;
    }

    return normalizeRect({
        left: toFiniteNumber(actualRect.x) * scale,
        top: toFiniteNumber(actualRect.y) * scale,
        width: toFiniteNumber(actualRect.width) * scale,
        height: toFiniteNumber(actualRect.height) * scale
    });
};

export const collectIntersectingElements = ({
    items,
    rect,
    ignoreTypes = ['eraseMask'],
    ignoreIds = []
} = {}) => {
    const targetRect = normalizeRect(rect);
    if (!targetRect || !items || typeof items !== 'object') {
        return [];
    }

    const ignoredIds = new Set(ignoreIds.map((id) => String(id)));
    const ignoredTypes = new Set(ignoreTypes.map((type) => String(type)));

    return Object.values(items).filter((element) => {
        if (!element || ignoredIds.has(String(element.id))) {
            return false;
        }
        if (ignoredTypes.has(String(element.dataType))) {
            return false;
        }
        return rectsIntersect(targetRect, getElementViewportRect(element));
    });
};
