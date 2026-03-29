export const escapeRegExp = (value) => {
    return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const createMatcher = (query, caseSensitive, globalMatch) => {
    const normalizedQuery = String(query ?? '');
    if (!normalizedQuery) {
        return null;
    }
    const flags = caseSensitive ? (globalMatch ? 'g' : '') : (globalMatch ? 'ig' : 'i');
    return new RegExp(escapeRegExp(normalizedQuery), flags);
};

export const countTextMatches = (text, query, caseSensitive = false) => {
    const matcher = createMatcher(query, caseSensitive, true);
    if (!matcher) {
        return 0;
    }

    const source = String(text ?? '');
    const matches = source.match(matcher);
    return Array.isArray(matches) ? matches.length : 0;
};

export const replaceTextMatches = (
    text,
    query,
    replacement,
    {
        caseSensitive = false,
        replaceAll = false
    } = {}
) => {
    const source = String(text ?? '');
    const target = String(query ?? '');
    if (!target) {
        return {
            text: source,
            count: 0
        };
    }

    const matcher = createMatcher(target, caseSensitive, replaceAll);
    if (!matcher) {
        return {
            text: source,
            count: 0
        };
    }

    let count = 0;
    const nextText = source.replace(matcher, () => {
        count += 1;
        return String(replacement ?? '');
    });

    return {
        text: nextText,
        count
    };
};
