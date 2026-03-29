const toPageNum = (value) => {
    const pageNum = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(pageNum) || pageNum < 1) {
        return null;
    }
    return pageNum;
};

const normalizeOriginTextIndices = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }

    const indices = [];
    value.forEach((rawIdx) => {
        const idx = Number.parseInt(String(rawIdx), 10);
        if (!Number.isFinite(idx) || idx < 0 || indices.indexOf(idx) > -1) {
            return;
        }
        indices.push(idx);
    });
    return indices;
};

const normalizeOriginTextPartIdx = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    return String(value);
};

const ORIGIN_TEXT_STATE_APPLIED_KEY = '__originTextStateApplied';

export const ORIGIN_TEXT_REMOVE_STRATEGY = Object.freeze({
    PRESERVE: 'preserve',
    RESTORE: 'restore'
});

const resolveReaderPage = (element, originPageNum, fallbackReaderPage = null) => {
    const pages = element?.page?.reader?.pdfDocument?.pages;
    if (originPageNum !== null && Array.isArray(pages)) {
        const matched = pages.find((page) => page?.pageNum === originPageNum);
        if (matched) {
            return matched;
        }
    }

    const elementReaderPage = element?.page?.readerPage;
    if (elementReaderPage) {
        return elementReaderPage;
    }

    return fallbackReaderPage || null;
};

const getOriginTextState = (element, fallbackReaderPage = null) => {
    const originTextIndices = normalizeOriginTextIndices(element?.attrs?.originTextIndices);
    const originTextPartIdx = normalizeOriginTextPartIdx(element?.attrs?.originTextPartIdx);
    const fallbackPageNum = fallbackReaderPage?.pageNum ?? element?.page?.pageNum ?? null;
    const originPageNum = toPageNum(element?.attrs?.originPageNum ?? fallbackPageNum);
    const readerPage = resolveReaderPage(element, originPageNum, fallbackReaderPage);

    return {
        readerPage,
        originTextIndices,
        originTextPartIdx,
        hasOriginState: originTextIndices.length > 0 || originTextPartIdx !== null
    };
};

export const applyOriginTextState = (element, shouldClear, fallbackReaderPage = null) => {
    const { readerPage, originTextIndices, originTextPartIdx, hasOriginState } = getOriginTextState(
        element,
        fallbackReaderPage
    );

    if (!readerPage || !hasOriginState) {
        return false;
    }

    if (shouldClear) {
        if (originTextIndices.length > 0 && typeof readerPage.markClearTextsByIndices === 'function') {
            readerPage.markClearTextsByIndices(originTextIndices);
        }
        if (originTextPartIdx !== null && typeof readerPage.lockConvertedTextPart === 'function') {
            readerPage.lockConvertedTextPart(originTextPartIdx);
        }
        return true;
    }

    if (originTextIndices.length > 0 && typeof readerPage.restoreClearTexts === 'function') {
        readerPage.restoreClearTexts(originTextIndices);
    }
    if (originTextPartIdx !== null && typeof readerPage.releaseConvertedTextPart === 'function') {
        readerPage.releaseConvertedTextPart(originTextPartIdx);
    }
    return true;
};

export const hasAppliedOriginTextState = (element) => {
    return !!element?.options?.[ORIGIN_TEXT_STATE_APPLIED_KEY];
};

export const markOriginTextStateApplied = (element, isApplied = true) => {
    if (!element) {
        return false;
    }

    if (!element.options || typeof element.options !== 'object') {
        element.options = {};
    }

    if (isApplied) {
        element.options[ORIGIN_TEXT_STATE_APPLIED_KEY] = true;
    } else {
        delete element.options[ORIGIN_TEXT_STATE_APPLIED_KEY];
    }

    return true;
};

export const syncOriginTextState = (element, shouldClear, fallbackReaderPage = null, options = {}) => {
    const force = options?.force === true;
    const isApplied = hasAppliedOriginTextState(element);

    if (shouldClear) {
        if (isApplied && !force) {
            return true;
        }

        const applied = applyOriginTextState(element, true, fallbackReaderPage);
        if (applied) {
            markOriginTextStateApplied(element, true);
        }
        return applied;
    }

    if (!isApplied && !force) {
        return true;
    }

    const restored = applyOriginTextState(element, false, fallbackReaderPage);
    if (restored) {
        markOriginTextStateApplied(element, false);
    }
    return restored;
};

export const isSystemOriginTextElement = (element) => {
    return !!element?.options?.oriText;
};
