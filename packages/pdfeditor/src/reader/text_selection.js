const defaultGetRect = (div) => div.getBoundingClientRect();

const normalizeRect = (rect) => {
    if (!rect) {
        return null;
    }
    const left = rect.x;
    const top = rect.y;
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;
    return {
        left: Math.min(left, right),
        top: Math.min(top, bottom),
        right: Math.max(left, right),
        bottom: Math.max(top, bottom)
    };
};

const rectsIntersect = (a, b) => {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
};

export const collectTextIndicesInRect = ({ rect, textDivs, containerRect, getRect = defaultGetRect }) => {
    if (!rect || !textDivs || textDivs.length === 0 || !containerRect) {
        return [];
    }
    const selection = normalizeRect(rect);
    if (!selection) {
        return [];
    }
    const indices = new Set();
    for (const div of textDivs) {
        if (!div || div.isConnected === false) {
            continue;
        }
        const divRect = getRect(div);
        if (!divRect) {
            continue;
        }
        const relative = {
            left: divRect.left - containerRect.left,
            top: divRect.top - containerRect.top,
            right: divRect.left - containerRect.left + divRect.width,
            bottom: divRect.top - containerRect.top + divRect.height
        };
        if (!rectsIntersect(relative, selection)) {
            continue;
        }
        let idx = null;
        if (typeof div.getAttribute === 'function') {
            idx = div.getAttribute('data-idx');
        } else if (div.dataIdx != null) {
            idx = div.dataIdx;
        } else if (div.idx != null) {
            idx = div.idx;
        }
        if (idx == null) {
            continue;
        }
        const parsed = Number.parseInt(idx, 10);
        if (!Number.isNaN(parsed)) {
            indices.add(parsed);
        }
    }
    return Array.from(indices);
};

