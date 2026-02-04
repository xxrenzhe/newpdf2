import opentype from 'opentype.js';
import { trimSpace } from './misc';

const CHARS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 's', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'S', 'Y', 'Z', ' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '~', '!', '@', '#', '$', '%', '^', '&', '(', ')', '_', '+', '-', '=', '{', '}', '|', '[', ']', ';', "'", ':', '"', ',', '.', '/', '<', '>', '?', '*'];
const UNICODE_FONT = 'unicode.ttf';
const CJK_RANGE = '[\u4E00-\u9FFF]';

export class Font {
    static #cache = {};
    static fontUrl = '';
    static fontkit = null;
    static #fallbackFont = null;
    static CHARS = CHARS;
    static UNICODE_FONT = UNICODE_FONT;
    static CJK_RANGE = CJK_RANGE;

    static async fetchFallbackFont() {
        if (Font.#fallbackFont) {
            return Font.#fallbackFont;
        }
        let url = ASSETS_URL + 'temp.otf';
        return fetch(url).then(res => res.arrayBuffer());
    }

    /**
     * 提取PDF中的字体生成子集，并添加到document.fonts
     * @param {*} arrayBuffer 
     * @param {*} objId 
     * @param {*} fallbackBuffer
     * @returns {ArrayBuffer} 
     */
    static async subset(arrayBuffer, objId, fallbackBuffer) {
        const newFont = opentype.parse(arrayBuffer);
        let familyName = newFont.getEnglishName('postScriptName');
        const fallbackFont = await opentype.parse(fallbackBuffer);
        let notdefGlyph = fallbackFont.glyphs.get(0);
        let subGlyphs = [notdefGlyph];
        for (let i in newFont.glyphs.glyphs) {
            subGlyphs.push(newFont.glyphs.glyphs[i]);
        }

        let str = '';
        CHARS.forEach(char => {
            let glyph = newFont.charToGlyph(char);
            if (!glyph.unicode) {
                str += char;
            }
        });
        subGlyphs.push(...fallbackFont.stringToGlyphs(str));

        const subsetFont = new opentype.Font({
            familyName: familyName,
            styleName: 'normal',
            unitsPerEm: newFont.unitsPerEm,
            ascender: newFont.ascender,
            descender: newFont.descender,
            glyphs: subGlyphs
        });
        const buffer = subsetFont.toArrayBuffer();
        let fontFace = new FontFace(objId, buffer);
        fontFace.load().then(font => {
            document.fonts.add(font);
        }).catch(e => {});
        return buffer;
    }

    /**
     * 根据文本拉取远程字体数据
     * @param {string} pageId
     * @param {*} text 
     * @param {*} fontFile 
     * @returns {Promise<ArrayBuffer> | Promise<null>}
     */
    static async fetchFont(pageId, text, fontFile) {
        if (!trimSpace(text)) return null;
        // const fontData = Font.getCache(pageId, fontFile);
        // if (fontData) {
        //     return fontData;
        // }
        //当文本在CJK范围内时 向服务器取字体改为unicode
        let isIncludeCJK = new RegExp(CJK_RANGE);
        if (isIncludeCJK.test(text)) {
            fontFile = UNICODE_FONT;
        }

        const url = this.fontUrl;
        const postData = new URLSearchParams({
            text: this.text2point(text),
            fontFile: fontFile
        });
        let res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: postData
        }).catch(e => {
            return {
                status: 500
            }
        });
        if (res.status != 200 || !res.ok) {
            return false;
        }

        const buffer = await res.arrayBuffer();
        Font.setCache(pageId, fontFile, buffer);
        return buffer;
    }

    /**
     * 文本转换unicode码点并排重
     * @param {*} text 
     * @returns {string}
     */
    static text2point(text) {
        //排重并排序
        text = text.split('').filter((value, index, self) => { 
            return self.indexOf(value) === index;
        }).sort().join('');
        return text.split('').map(c => 'U+'+c.charCodeAt(0).toString(16)).join(',');
    }

    static getCacheAll() {
        return Font.#cache;
    }

    static clear() {
        Font.#cache = {};
    }

    static setCache(pageId, fontFile, buffer) {
        if (!Font.#cache[pageId]) {
            Font.#cache[pageId] = Object.create(null);
        }
        Font.#cache[pageId][fontFile] = buffer;
    }

    static getCache(pageId, fontFile) {
        if (!Font.#cache[pageId]) {
            Font.#cache[pageId] = Object.create(null);
        }
        return Font.#cache[pageId][fontFile] || null;   
    }
};