function browserLangCode() {
    let langCode = (navigator.language || navigator.userLanguage).toLowerCase();
    langCode = langCode.replace('_', '-').toLowerCase();
    return langCode;
}

const Locale = {
    langCode: '',
    messages: {},
    bind(parent) {
        if (!parent) {
            parent = document;
        }
        let elList = parent.querySelectorAll('[data-locale]');
        for (let i = 0; i < elList.length; i++) {
            let el = elList[i];
            let key = el.getAttribute('data-locale');
            let msg = Locale.get(key);
            let attrs = el.getAttribute('data-locale-attrs');
            if (attrs) {
                attrs.split(',').forEach(attr => {
                    el.setAttribute(attr, msg);
                });
            } else {
                if (!key) {
                    let text = el.innerText;
                    msg = text.replace(/\{\{([\w]+)\}\}/g, (match, key) => {
                        return Locale.get(key);
                    });
                }
                el.innerText = msg;
            }
        }
    },

    get(key, placeholders) {
        let content = Locale.messages[key];
        if (!content) {
            return key;
        }
        if (placeholders) {
            for (let key in placeholders) {
                content = content.replace(new RegExp('%'+ key +'%', 'g'), placeholders[key]);
            }
        }
        return content;
    },

    async load(langCode) {
        return import(BASE_PATH + '/assets/locale/' + langCode +'.json').then(({default: messages}) => {
            Locale.messages = messages;
            Locale.bind();
            return messages;
        }).catch(e => {});
    }
};

Locale.langCode = LANG_CODE;
Locale.messages = LANG_MESSAGES;

export { Locale };