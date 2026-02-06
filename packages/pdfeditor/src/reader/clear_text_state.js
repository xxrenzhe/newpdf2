const toIndex = (value) => {
    const idx = Number.parseInt(value, 10);
    if (!Number.isFinite(idx) || idx < 0) {
        return null;
    }
    return idx;
};

export const normalizeClearTextIndices = (indices) => {
    if (!Array.isArray(indices) || indices.length === 0) {
        return [];
    }

    const normalized = [];
    const handled = new Set();
    for (const value of indices) {
        const idx = toIndex(value);
        if (idx === null || handled.has(idx)) {
            continue;
        }
        handled.add(idx);
        normalized.push(idx);
    }
    return normalized;
};

export const markClearTextIndices = ({ indices, textContentItems, clearTextIndexCounts }) => {
    if (!Array.isArray(textContentItems) || !clearTextIndexCounts) {
        return [];
    }

    const normalized = normalizeClearTextIndices(indices);
    const accepted = [];
    normalized.forEach((idx) => {
        if (!textContentItems[idx]) {
            return;
        }
        accepted.push(idx);
        const count = clearTextIndexCounts[idx] || 0;
        clearTextIndexCounts[idx] = count + 1;
    });

    return accepted;
};

export const restoreClearTextIndices = ({ indices, clearTextIndexCounts }) => {
    if (!clearTextIndexCounts) {
        return [];
    }

    const normalized = normalizeClearTextIndices(indices);
    const restored = [];
    normalized.forEach((idx) => {
        const count = clearTextIndexCounts[idx] || 0;
        if (count <= 1) {
            delete clearTextIndexCounts[idx];
            restored.push(idx);
            return;
        }
        clearTextIndexCounts[idx] = count - 1;
    });

    return restored;
};

export const collectClearTextItems = ({ clearTextIndexCounts, textContentItems, fallbackItems = [] }) => {
    if (!clearTextIndexCounts) {
        return Array.isArray(fallbackItems) ? fallbackItems : [];
    }

    const indices = Object.keys(clearTextIndexCounts)
        .map((key) => Number.parseInt(key, 10))
        .filter((idx) => Number.isFinite(idx) && idx >= 0 && (clearTextIndexCounts[idx] || 0) > 0)
        .sort((a, b) => a - b);

    if (indices.length === 0) {
        return [];
    }

    if (!Array.isArray(textContentItems) || textContentItems.length === 0) {
        return Array.isArray(fallbackItems) ? fallbackItems : [];
    }

    return indices
        .map((idx) => textContentItems[idx])
        .filter((item) => !!item);
};
