export function createLoadTokenTracker(maxTracked = 24) {
    const limit = Number.isFinite(maxTracked) && maxTracked > 0 ? Math.floor(maxTracked) : 24;
    const tracked = new Map();

    const remember = (loadId, token) => {
        if (typeof loadId !== 'number' || !Number.isFinite(loadId)) return;
        if (typeof token !== 'number' || !Number.isFinite(token)) return;
        tracked.set(loadId, token);
        if (tracked.size > limit) {
            const first = tracked.keys().next();
            if (!first.done) {
                tracked.delete(first.value);
            }
        }
    };

    const resolve = (loadId, fallbackToken) => {
        if (typeof loadId !== 'number' || !Number.isFinite(loadId)) {
            return fallbackToken;
        }

        const token = tracked.get(loadId);
        if (typeof token === 'number' && Number.isFinite(token)) {
            return token;
        }

        if (typeof fallbackToken === 'number' && Number.isFinite(fallbackToken)) {
            remember(loadId, fallbackToken);
        }

        return fallbackToken;
    };

    const reset = () => {
        tracked.clear();
    };

    return {
        remember,
        resolve,
        reset,
        size: () => tracked.size
    };
}

export function toArrayBuffer(value) {
    if (value instanceof ArrayBuffer) {
        return value;
    }
    if (!ArrayBuffer.isView(value)) {
        return null;
    }
    const view = value;
    const start = view.byteOffset || 0;
    const end = start + view.byteLength;
    return view.buffer.slice(start, end);
}
