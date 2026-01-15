/*
PDFEvent.on('test', (e, sendResponse) => {
    console.log(e);
    sendRes('aaaaa');
});

PDFEvent.dispatch('test', 21, (xx) => {
    console.log(xx);
});
 */
export const Events = {
    ERROR: 'error',
    PASSWORD_ERROR: 'password_error',
    READER_INIT: 'reader_init',
    SET_SCALE: 'set_scale',
    PAGE_ZOOM: 'page_zoom',
    PAGE_ACTIVE: 'page_active',
    PAGE_RENDERED: 'page_rendered',
    PAGE_DOWN: 'page_down',
    PAGE_ADD: 'page_add',
    PAGE_REMOVE: 'page_remove',
    TOOLBAR_INIT: 'toolbar_init',

    HISTORY_CHANGE: 'history_change',
    HISTORY_PUSH: 'history_push',
    HISTORY_REMOVE: 'history_remove',

    CONVERT_TO_ELEMENT: 'convert_to_element',

    ELEMENT_CREATE: 'element_create',
    ELEMENT_ACTIVE: 'element_active',
    ELEMENT_REMOVE: 'element_remove',
    ELEMENT_BLUR: 'element_blur',
    ELEMENT_UPDATE_BEFORE: 'element_update_before',
    ELEMENT_UPDATE_AFTER: 'element_update_after',
    ELEMENT_UP: 'element_up',
    ELEMENT_MOVE_START: 'elemenr_move_start',
    ELEMENT_MOVE: 'element_move',
    ELEMENT_DOWN: 'element_down',
    ELEMENT_RENDERD: 'element_rendered',
    ELEMENT_RESIZE_START: 'element_resize_start',
    ELEMENT_RESIZING: 'element_resizing',
    ELEMENT_RESIZE_END: 'element_resize_end',

    //工具栏图标点击时
    TOOLBAR_ITEM_CLICK: 'toolbar_item_click',
    //工具栏图标激活时（多次点击不会重复发送事件）
    TOOLBAR_ITEM_ACTIVE: 'toolbar_item_active',
    //工具栏图标失去焦点时
    TOOLBAR_ITEM_BLUR: 'toolbar_item_blur',
    //工具栏属性点击时
    TOOLBAR_ITEM_OPTION_CLICK: 'toolbar_item_option_click',

    SAVE_BEFORE: 'save_before',
    SAVE: 'save',
    SAVE_AFTER: 'save_after',
    DOWNLOAD: 'download'
};

const _ONCE = '_#once#_';
export class PDFEvent {
    static #events = Object.create(null);

    static on(type, func, once) {
        if (type instanceof Array) {
            type.forEach(evtType => {
                this.#bind(evtType, func, once);
            });
        } else {
            this.#bind(type, func, once);
        }
    }

    static trigger(type, data, sendResponse) {
        this.dispatch(type, data, sendResponse);
    }

    static dispatch(type, data, sendResponse) {
        [_ONCE, ''].forEach(prefix => {
            let _type = prefix + type;
            if (this.#events[_type]) {
                this.#events[_type].forEach(func => {
                    func({
                        type: type,
                        data
                    }, res => {
                        if (typeof(sendResponse) == 'function') {
                            sendResponse(res);
                        }
                    });

                    if (_ONCE == prefix) {
                        this.unbind(_type, func);
                    }
                });
            }
        });
    }

    static unbind(type, func) {
        if (!func) {
            delete this.#events[type];
        } else if (this.#events[type]) {
            this.#events[type].forEach((_func, i) => {
                if (func === _func) {
                    this.#events[type].splice(i, 1);
                }
            });
        }
    }

    static #bind(type, func, once) {
        type = once ? _ONCE + type : type;
        if (!this.#events[type]) {
            this.#events[type] = [];
        }
        this.#events[type].push(func);
    }
};