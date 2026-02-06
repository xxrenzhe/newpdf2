import { isSystemOriginTextElement } from './origin_text_state.js';

export const HISTORY_SOURCE = Object.freeze({
    USER: 'user',
    SYSTEM: 'system'
});

const resolveExplicitHistorySource = (value) => {
    if (value === HISTORY_SOURCE.USER) {
        return HISTORY_SOURCE.USER;
    }
    if (value === HISTORY_SOURCE.SYSTEM) {
        return HISTORY_SOURCE.SYSTEM;
    }
    return null;
};

export const normalizeHistorySource = (value) => {
    return resolveExplicitHistorySource(value) || HISTORY_SOURCE.USER;
};

export const resolveHistorySource = (element) => {
    const explicitSource = resolveExplicitHistorySource(element?.options?.historySource);
    if (explicitSource) {
        return explicitSource;
    }

    if (isSystemOriginTextElement(element)) {
        return HISTORY_SOURCE.SYSTEM;
    }

    return HISTORY_SOURCE.USER;
};

export const shouldTrackHistorySource = (source) => {
    return normalizeHistorySource(source) === HISTORY_SOURCE.USER;
};

export const shouldTrackElementHistory = (element) => {
    return shouldTrackHistorySource(resolveHistorySource(element));
};
