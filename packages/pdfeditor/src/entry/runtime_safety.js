const TOUCH_GESTURE_LOCK_TOOLS = new Set(['line', 'draw', 'eraser']);

export const TOUCH_GESTURE_LOCK_CLASS = 'pdf-touch-gesture-lock';

export const normalizeToolName = (toolName) => {
    return toolName === 'redact' ? 'radact' : toolName;
};

export const shouldLockTouchGestures = (toolName) => {
    return TOUCH_GESTURE_LOCK_TOOLS.has(normalizeToolName(toolName));
};

export const getErrorMessage = (error) => {
    if (typeof error === 'string' && error.trim()) {
        return error.trim();
    }
    if (error && typeof error === 'object') {
        if (typeof error.message === 'string' && error.message.trim()) {
            return error.message.trim();
        }
        try {
            const serialized = JSON.stringify(error);
            if (serialized && serialized !== '{}') {
                return serialized;
            }
        } catch (err) {
            // ignore
        }
    }
    return null;
};
