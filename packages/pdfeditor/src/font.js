import opentype from 'opentype.js';
import { Events, PDFEvent } from './event';
import { trimSpace } from './misc';

const CHARS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 's', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'S', 'Y', 'Z', ' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '~', '!', '@', '#', '$', '%', '^', '&', '(', ')', '_', '+', '-', '=', '{', '}', '|', '[', ']', ';', "'", ':', '"', ',', '.', '/', '<', '>', '?', '*'];
const DEFAULT_LATIN_FONT_FILE = 'fonts/Lato-Regular.ttf';
const DEFAULT_LATIN_FONT_FAMILY = 'Lato';
const DEFAULT_SERIF_FONT_FILE = 'fonts/NotoSerif-Regular.ttf';
const DEFAULT_SERIF_FONT_FAMILY = 'NotoSerif';
const CJK_FONT_FILES = Object.freeze({
    sc: 'fonts/NotoSansCJKsc-Regular.otf',
    tc: 'fonts/NotoSansCJKtc-Regular.otf',
    jp: 'fonts/NotoSansCJKjp-Regular.otf',
    kr: 'fonts/NotoSansCJKkr-Regular.otf'
});
const CJK_FONT_FAMILIES = Object.freeze({
    sc: 'NotoSansCJKsc',
    tc: 'NotoSansCJKtc',
    jp: 'NotoSansCJKjp',
    kr: 'NotoSansCJKkr'
});
const CJK_FONT_FILE_SET = new Set(Object.values(CJK_FONT_FILES));
const FONT_DISPLAY_NAMES = Object.freeze({
    Lato: 'Lato',
    NotoSerif: 'Noto Serif',
    NotoSansCJKsc: 'Noto Sans CJK SC',
    NotoSansCJKtc: 'Noto Sans CJK TC',
    NotoSansCJKjp: 'Noto Sans CJK JP',
    NotoSansCJKkr: 'Noto Sans CJK KR'
});
const SAFE_FONT_FAMILIES = new Set([
    DEFAULT_LATIN_FONT_FAMILY,
    DEFAULT_SERIF_FONT_FAMILY,
    ...Object.values(CJK_FONT_FAMILIES)
]);
const SAFE_FONT_FILE_PREFIXES = ['fonts/notosans', 'fonts/notoserif'];
const SAFE_FONT_FILES = new Set([DEFAULT_LATIN_FONT_FILE]);
const BUILTIN_FONT_NAMES = new Set([
    'Helvetica',
    'Helvetica-Bold',
    'Helvetica-Oblique',
    'Helvetica-BoldOblique',
    'Times-Roman',
    'Times-Bold',
    'Times-Italic',
    'Times-BoldItalic',
    'Courier',
    'Courier-Bold',
    'Courier-Oblique',
    'Courier-BoldOblique',
    'Symbol',
    'ZapfDingbats'
]);
const FONT_NAME_ALIASES = [
    {
        test: /arial/i,
        fontFamily: DEFAULT_LATIN_FONT_FAMILY,
        fontFile: DEFAULT_LATIN_FONT_FILE
    },
    {
        test: /helvetica/i,
        fontFamily: DEFAULT_LATIN_FONT_FAMILY,
        fontFile: DEFAULT_LATIN_FONT_FILE
    },
    {
        test: /times new roman|times-roman|times roman|timesnewroman|times\b/i,
        fontFamily: DEFAULT_SERIF_FONT_FAMILY,
        fontFile: DEFAULT_SERIF_FONT_FILE
    },
    {
        test: /georgia/i,
        fontFamily: DEFAULT_SERIF_FONT_FAMILY,
        fontFile: DEFAULT_SERIF_FONT_FILE
    },
    {
        test: /simsun|songti/i,
        fontFamily: CJK_FONT_FAMILIES.sc,
        fontFile: CJK_FONT_FILES.sc
    },
    {
        test: /mingliu|pmingliu/i,
        fontFamily: CJK_FONT_FAMILIES.tc,
        fontFile: CJK_FONT_FILES.tc
    },
    {
        test: /ms gothic|ms mincho|hiragino|meiryo|yu gothic|yu mincho/i,
        fontFamily: CJK_FONT_FAMILIES.jp,
        fontFile: CJK_FONT_FILES.jp
    },
    {
        test: /malgun|gulim|dotum|batang/i,
        fontFamily: CJK_FONT_FAMILIES.kr,
        fontFile: CJK_FONT_FILES.kr
    }
];
// Include: Hangul Jamo/Compatibility/Syllables, Hiragana/Katakana, Bopomofo, CJK ideographs.
const CJK_RANGE = '[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u3040-\u30FF\u31F0-\u31FF\u3100-\u312F\u31A0-\u31BF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]';
const TRADITIONAL_CHAR_PATTERN = /[\u4F86\u570B\u9AD4\u81FA\u8207\u70BA\u6703\u9577\u9580\u9EDE\u8AAA\u9032\u5169\u8B8A\u8B93\u986F\u7E7C\u9304\u8B80\u8F49\u8F09\u7DB2\u8CC7\u8B49\u7DE8\u8A18\u7E3D\u6A19\u6E96]/;
const KANA_PATTERN = /[\u3040-\u30FF\u31F0-\u31FF\uFF66-\uFF9D]/;
const HANGUL_PATTERN = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
const BOPOMOFO_PATTERN = /[\u3100-\u312F\u31A0-\u31BF]/;

const FALLBACK_FONTS = Object.freeze({
    latin: 'fonts/NotoSans-latin.woff',
    latinExt: 'fonts/NotoSans-latin-ext.woff',
    greek: 'fonts/NotoSans-greek.woff',
    greekExt: 'fonts/NotoSans-greek-ext.woff',
    cyrillic: 'fonts/NotoSans-cyrillic.woff',
    cyrillicExt: 'fonts/NotoSans-cyrillic-ext.woff',
    devanagari: 'fonts/NotoSans-devanagari.woff',
    arabic: 'fonts/NotoSansArabic.woff',
    hebrew: 'fonts/NotoSansHebrew.woff',
    thai: 'fonts/NotoSansThai.woff',
    bengali: 'fonts/NotoSansBengali.woff',
    gurmukhi: 'fonts/NotoSansGurmukhi.woff',
    gujarati: 'fonts/NotoSansGujarati.woff',
    oriya: 'fonts/NotoSansOriya.woff',
    tamil: 'fonts/NotoSansTamil.woff',
    telugu: 'fonts/NotoSansTelugu.woff',
    kannada: 'fonts/NotoSansKannada.woff',
    malayalam: 'fonts/NotoSansMalayalam.woff',
    sinhala: 'fonts/NotoSansSinhala.woff',
    khmer: 'fonts/NotoSansKhmer.woff',
    lao: 'fonts/NotoSansLao.woff',
    myanmar: 'fonts/NotoSansMyanmar.woff',
    georgian: 'fonts/NotoSansGeorgian.woff',
    armenian: 'fonts/NotoSansArmenian.woff',
    ethiopic: 'fonts/NotoSansEthiopic.woff',
    tibetan: 'fonts/NotoSerifTibetan.woff',
    symbols: 'fonts/NotoSansSymbols2.woff',
    cjk: CJK_FONT_FILES.kr,
});

export class Font {
    static #cache = {};
    static #assetCache = Object.create(null);
    static #assetFetch = Object.create(null);
    static fontUrl = '';
    static fontkit = null;
    static #fallbackFont = null;
    static #complianceWarned = false;
    static CHARS = CHARS;
    static CJK_RANGE = CJK_RANGE;
    static FALLBACK_FONTS = FALLBACK_FONTS;
    static DEFAULT_LATIN_FONT_FILE = DEFAULT_LATIN_FONT_FILE;
    static DEFAULT_LATIN_FONT_FAMILY = DEFAULT_LATIN_FONT_FAMILY;
    static DEFAULT_SERIF_FONT_FILE = DEFAULT_SERIF_FONT_FILE;
    static DEFAULT_SERIF_FONT_FAMILY = DEFAULT_SERIF_FONT_FAMILY;
    static CJK_FONT_FILES = CJK_FONT_FILES;
    static CJK_FONT_FAMILIES = CJK_FONT_FAMILIES;
    static FONT_DISPLAY_NAMES = FONT_DISPLAY_NAMES;

    static get UNICODE_FONT() {
        return Font.getCjkFontFile();
    }

    static async fetchFallbackFont() {
        if (Font.#fallbackFont) {
            return Font.#fallbackFont;
        }
        const fallbackFile = Font.getFallbackSubsetFontFile();
        let url = ASSETS_URL + fallbackFile;
        Font.#fallbackFont = fetch(url).then(res => res.arrayBuffer());
        return Font.#fallbackFont;
    }

    static getLocaleCode() {
        const langCode = typeof LANG_CODE !== 'undefined' && LANG_CODE
            ? String(LANG_CODE).toLowerCase()
            : '';
        if (langCode && langCode !== 'en') {
            return langCode;
        }
        if (typeof navigator !== 'undefined' && navigator.language) {
            return navigator.language.toLowerCase();
        }
        return langCode || 'en';
    }

    static #normalizeLocale(locale) {
        return String(locale || '').replace('_', '-').toLowerCase();
    }

    static #isCjkLocale(locale) {
        const normalized = Font.#normalizeLocale(locale);
        return normalized.startsWith('zh') || normalized.startsWith('ja') || normalized.startsWith('ko');
    }

    static getCjkVariant(locale = Font.getLocaleCode()) {
        const normalized = Font.#normalizeLocale(locale);
        if (normalized.startsWith('ja')) return 'jp';
        if (normalized.startsWith('ko')) return 'kr';
        if (normalized.startsWith('zh')) {
            if (normalized.includes('hant') || normalized.includes('-tw') || normalized.includes('-hk') || normalized.includes('-mo')) {
                return 'tc';
            }
            return 'sc';
        }
        return 'sc';
    }

    static getCjkVariantForText(text, locale = Font.getLocaleCode()) {
        const sample = String(text || '');
        if (sample) {
            if (KANA_PATTERN.test(sample)) return 'jp';
            if (HANGUL_PATTERN.test(sample)) return 'kr';
            if (BOPOMOFO_PATTERN.test(sample) || TRADITIONAL_CHAR_PATTERN.test(sample)) return 'tc';
        }
        return Font.getCjkVariant(locale);
    }

    static getCjkFontFile(locale = Font.getLocaleCode()) {
        const variant = Font.getCjkVariant(locale);
        return CJK_FONT_FILES[variant] || CJK_FONT_FILES.sc;
    }

    static getCjkFontFileForText(text, locale = Font.getLocaleCode()) {
        const variant = Font.getCjkVariantForText(text, locale);
        return CJK_FONT_FILES[variant] || CJK_FONT_FILES.sc;
    }

    static getCjkFontFamily(locale = Font.getLocaleCode()) {
        const variant = Font.getCjkVariant(locale);
        return CJK_FONT_FAMILIES[variant] || CJK_FONT_FAMILIES.sc;
    }

    static getCjkFontFamilyForText(text, locale = Font.getLocaleCode()) {
        const variant = Font.getCjkVariantForText(text, locale);
        return CJK_FONT_FAMILIES[variant] || CJK_FONT_FAMILIES.sc;
    }

    static getFontDisplayName(fontFamily) {
        if (fontFamily && FONT_DISPLAY_NAMES[fontFamily]) {
            return FONT_DISPLAY_NAMES[fontFamily];
        }
        return fontFamily || '';
    }

    static getFallbackSubsetFontFile() {
        return DEFAULT_LATIN_FONT_FILE;
    }

    static hasCjk(text) {
        if (!text) return false;
        return new RegExp(CJK_RANGE).test(String(text));
    }

    static getDefaultFont() {
        const locale = Font.getLocaleCode();
        if (Font.#isCjkLocale(locale)) {
            const family = Font.getCjkFontFamily(locale);
            return {
                fontFamily: family,
                fontFile: Font.getFontFileForFamily(family),
                showName: Font.getFontDisplayName(family)
            };
        }
        return {
            fontFamily: DEFAULT_LATIN_FONT_FAMILY,
            fontFile: DEFAULT_LATIN_FONT_FILE,
            showName: FONT_DISPLAY_NAMES[DEFAULT_LATIN_FONT_FAMILY]
        };
    }

    static getDefaultFontForText(text) {
        if (Font.hasCjk(text)) {
            const family = Font.getCjkFontFamilyForText(text);
            return {
                fontFamily: family,
                fontFile: Font.getCjkFontFileForText(text),
                showName: Font.getFontDisplayName(family)
            };
        }
        return Font.getDefaultFont();
    }

    static getFontFileForFamily(fontFamily) {
        switch (fontFamily) {
            case DEFAULT_LATIN_FONT_FAMILY:
                return DEFAULT_LATIN_FONT_FILE;
            case DEFAULT_SERIF_FONT_FAMILY:
                return DEFAULT_SERIF_FONT_FILE;
            case CJK_FONT_FAMILIES.sc:
                return CJK_FONT_FILES.sc;
            case CJK_FONT_FAMILIES.tc:
                return CJK_FONT_FILES.tc;
            case CJK_FONT_FAMILIES.jp:
                return CJK_FONT_FILES.jp;
            case CJK_FONT_FAMILIES.kr:
                return CJK_FONT_FILES.kr;
            default:
                return null;
        }
    }

    static isBuiltinFontName(fontName) {
        return BUILTIN_FONT_NAMES.has(String(fontName || ''));
    }

    static isSafeFontFile(fontFile) {
        if (!fontFile) return false;
        const value = String(fontFile);
        if (Font.isBuiltinFontName(value)) return true;
        if (SAFE_FONT_FILES.has(value)) return true;
        const lower = value.toLowerCase();
        return SAFE_FONT_FILE_PREFIXES.some(prefix => lower.startsWith(prefix));
    }

    static isCjkFontFile(fontFile) {
        return CJK_FONT_FILE_SET.has(String(fontFile || ''));
    }

    static isSafeFontFamily(fontFamily) {
        return SAFE_FONT_FAMILIES.has(String(fontFamily || ''));
    }

    static #findAlias(name) {
        const normalized = String(name || '');
        if (!normalized) return null;
        for (const alias of FONT_NAME_ALIASES) {
            if (alias.test.test(normalized)) {
                return alias;
            }
        }
        return null;
    }

    static normalizeFontFamily(fontFamily, fontName, text) {
        const family = String(fontFamily || '');
        if (Font.isSafeFontFamily(family)) {
            return family;
        }
        const alias = Font.#findAlias(fontName || family);
        if (alias) {
            return alias.fontFamily;
        }
        return Font.getDefaultFontForText(text).fontFamily;
    }

    static normalizeFontFile(fontFile, fontFamily, text, fontName) {
        if (Font.isSafeFontFile(fontFile)) {
            return fontFile;
        }
        const alias = Font.#findAlias(fontName || fontFamily || fontFile);
        if (alias) {
            return alias.fontFile;
        }
        const mapped = Font.getFontFileForFamily(fontFamily);
        if (mapped) {
            return mapped;
        }
        return Font.getDefaultFontForText(text).fontFile;
    }

    static resolveSafeFont({ fontFamily, fontFile, fontName, text }) {
        const originalFamily = fontFamily;
        const originalFile = fontFile;
        const safeFamily = Font.normalizeFontFamily(fontFamily, fontName, text);
        const safeFile = Font.normalizeFontFile(fontFile, safeFamily, text, fontName);
        const showName = Font.getFontDisplayName(safeFamily);
        const replaced = safeFamily !== originalFamily || safeFile !== originalFile;
        if (replaced) {
            Font.#warnComplianceOnce();
        }
        return {
            fontFamily: safeFamily,
            fontFile: safeFile,
            showName,
            replaced
        };
    }

    static getUiFontList() {
        if (typeof fontList === 'undefined' || !Array.isArray(fontList)) {
            return [];
        }
        return fontList.filter(font => !font.hidden);
    }

    static #warnComplianceOnce() {
        if (Font.#complianceWarned) return;
        Font.#complianceWarned = true;
        const message = Font.getComplianceMessage();
        try {
            PDFEvent.dispatch(Events.FONT_WARNING, { message });
        } catch (e) {
            console.warn(message);
        }
    }

    static getComplianceMessage() {
        const locale = Font.getLocaleCode();
        if (locale.startsWith('zh')) {
            return '检测到部分字体未获明确授权，已自动替换为安全字体；导出时可能对受影响文本进行栅格化。';
        }
        return 'Some fonts are unsupported or unlicensed. They were replaced with safe fonts, and affected text may be rasterized on export.';
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

        const cached = Font.getCache(pageId, fontFile);
        if (cached) return cached;

        // Cross-page cache for static asset fonts (avoid re-downloading huge fonts per page).
        if (Font.#assetCache[fontFile]) {
            Font.setCache(pageId, fontFile, Font.#assetCache[fontFile]);
            return Font.#assetCache[fontFile];
        }

        // Offline mode: load the font file from same-origin assets.
        // `Font.fontUrl` is expected to be `ASSETS_URL` (e.g. "/pdfeditor/assets/").
        const baseUrl = this.fontUrl || (typeof ASSETS_URL !== 'undefined' ? ASSETS_URL : '');
        if (!baseUrl) return false;

        const url = baseUrl.endsWith('/') ? baseUrl + fontFile : baseUrl + '/' + fontFile;

        if (!Font.#assetFetch[fontFile]) {
            Font.#assetFetch[fontFile] = fetch(url)
                .then(res => (res.ok ? res.arrayBuffer() : false))
                .then(buffer => {
                    if (buffer) {
                        Font.#assetCache[fontFile] = buffer;
                    }
                    return buffer;
                })
                .catch(() => false)
                .finally(() => {
                    delete Font.#assetFetch[fontFile];
                });
        }

        const buffer = await Font.#assetFetch[fontFile];
        if (!buffer) return false;

        Font.setCache(pageId, fontFile, buffer);
        return buffer;
    }

    static #inRange(codePoint, start, end) {
        return codePoint >= start && codePoint <= end;
    }

    static #isBasicLatin(codePoint) {
        return Font.#inRange(codePoint, 0x0000, 0x007f);
    }

    static #isLatin1Supplement(codePoint) {
        return Font.#inRange(codePoint, 0x0080, 0x00ff);
    }

    static #isLatinExtended(codePoint) {
        return (
            Font.#inRange(codePoint, 0x0100, 0x02af) ||
            Font.#inRange(codePoint, 0x1e00, 0x1eff) ||
            Font.#inRange(codePoint, 0x2c60, 0x2c7f) ||
            Font.#inRange(codePoint, 0xa720, 0xa7ff)
        );
    }

    static #isGreek(codePoint) {
        return Font.#inRange(codePoint, 0x0370, 0x03ff);
    }

    static #isGreekExtended(codePoint) {
        return Font.#inRange(codePoint, 0x1f00, 0x1fff);
    }

    static #isCyrillic(codePoint) {
        return Font.#inRange(codePoint, 0x0400, 0x04ff);
    }

    static #isCyrillicExtended(codePoint) {
        return (
            Font.#inRange(codePoint, 0x0500, 0x052f) ||
            Font.#inRange(codePoint, 0x2de0, 0x2dff) ||
            Font.#inRange(codePoint, 0xa640, 0xa69f) ||
            Font.#inRange(codePoint, 0x1c80, 0x1c8f)
        );
    }

    static #isCJK(codePoint) {
        return (
            // Hangul
            Font.#inRange(codePoint, 0x1100, 0x11ff) ||
            Font.#inRange(codePoint, 0x3130, 0x318f) ||
            Font.#inRange(codePoint, 0xac00, 0xd7af) ||
            // Hiragana / Katakana
            Font.#inRange(codePoint, 0x3040, 0x30ff) ||
            Font.#inRange(codePoint, 0x31f0, 0x31ff) ||
            // CJK punctuation / compatibility / fullwidth
            Font.#inRange(codePoint, 0x3000, 0x303f) ||
            Font.#inRange(codePoint, 0x2e80, 0x2eff) ||
            Font.#inRange(codePoint, 0x2f00, 0x2fdf) ||
            Font.#inRange(codePoint, 0x31c0, 0x31ef) ||
            Font.#inRange(codePoint, 0x3200, 0x32ff) ||
            Font.#inRange(codePoint, 0x3300, 0x33ff) ||
            Font.#inRange(codePoint, 0xfe10, 0xfe1f) ||
            Font.#inRange(codePoint, 0xfe30, 0xfe4f) ||
            Font.#inRange(codePoint, 0xff00, 0xffef) ||
            // Bopomofo
            Font.#inRange(codePoint, 0x3100, 0x312f) ||
            Font.#inRange(codePoint, 0x31a0, 0x31bf) ||
            // CJK ideographs
            Font.#inRange(codePoint, 0x3400, 0x4dbf) ||
            Font.#inRange(codePoint, 0x4e00, 0x9fff) ||
            Font.#inRange(codePoint, 0xf900, 0xfaff) ||
            // Extensions (astral)
            Font.#inRange(codePoint, 0x20000, 0x2ebef) ||
            Font.#inRange(codePoint, 0x2f800, 0x2fa1f)
        );
    }

    static #isArabic(codePoint) {
        return (
            Font.#inRange(codePoint, 0x0600, 0x06ff) ||
            Font.#inRange(codePoint, 0x0750, 0x077f) ||
            Font.#inRange(codePoint, 0x08a0, 0x08ff) ||
            Font.#inRange(codePoint, 0xfb50, 0xfdff) ||
            Font.#inRange(codePoint, 0xfe70, 0xfeff) ||
            Font.#inRange(codePoint, 0x1ee00, 0x1eeff)
        );
    }

    static #isHebrew(codePoint) {
        return Font.#inRange(codePoint, 0x0590, 0x05ff) || Font.#inRange(codePoint, 0xfb1d, 0xfb4f);
    }

    static #isDevanagari(codePoint) {
        return Font.#inRange(codePoint, 0x0900, 0x097f) || Font.#inRange(codePoint, 0xa8e0, 0xa8ff);
    }

    static #isBengali(codePoint) {
        return Font.#inRange(codePoint, 0x0980, 0x09ff);
    }

    static #isGurmukhi(codePoint) {
        return Font.#inRange(codePoint, 0x0a00, 0x0a7f);
    }

    static #isGujarati(codePoint) {
        return Font.#inRange(codePoint, 0x0a80, 0x0aff);
    }

    static #isOriya(codePoint) {
        return Font.#inRange(codePoint, 0x0b00, 0x0b7f);
    }

    static #isTamil(codePoint) {
        return Font.#inRange(codePoint, 0x0b80, 0x0bff);
    }

    static #isTelugu(codePoint) {
        return Font.#inRange(codePoint, 0x0c00, 0x0c7f);
    }

    static #isKannada(codePoint) {
        return Font.#inRange(codePoint, 0x0c80, 0x0cff);
    }

    static #isMalayalam(codePoint) {
        return Font.#inRange(codePoint, 0x0d00, 0x0d7f);
    }

    static #isSinhala(codePoint) {
        return Font.#inRange(codePoint, 0x0d80, 0x0dff);
    }

    static #isThai(codePoint) {
        return Font.#inRange(codePoint, 0x0e00, 0x0e7f);
    }

    static #isLao(codePoint) {
        return Font.#inRange(codePoint, 0x0e80, 0x0eff);
    }

    static #isTibetan(codePoint) {
        return Font.#inRange(codePoint, 0x0f00, 0x0fff);
    }

    static #isMyanmar(codePoint) {
        return Font.#inRange(codePoint, 0x1000, 0x109f) || Font.#inRange(codePoint, 0xa9e0, 0xa9ff);
    }

    static #isKhmer(codePoint) {
        return Font.#inRange(codePoint, 0x1780, 0x17ff) || Font.#inRange(codePoint, 0x19e0, 0x19ff);
    }

    static #isGeorgian(codePoint) {
        return (
            Font.#inRange(codePoint, 0x10a0, 0x10ff) ||
            Font.#inRange(codePoint, 0x2d00, 0x2d2f) ||
            Font.#inRange(codePoint, 0x1c90, 0x1cbf)
        );
    }

    static #isArmenian(codePoint) {
        return Font.#inRange(codePoint, 0x0530, 0x058f) || Font.#inRange(codePoint, 0xfb13, 0xfb17);
    }

    static #isEthiopic(codePoint) {
        return (
            Font.#inRange(codePoint, 0x1200, 0x137f) ||
            Font.#inRange(codePoint, 0x1380, 0x139f) ||
            Font.#inRange(codePoint, 0x2d80, 0x2ddf) ||
            Font.#inRange(codePoint, 0xab00, 0xab2f)
        );
    }

    static #isCombiningMark(codePoint) {
        return (
            Font.#inRange(codePoint, 0x0300, 0x036f) ||
            Font.#inRange(codePoint, 0x1ab0, 0x1aff) ||
            Font.#inRange(codePoint, 0x1dc0, 0x1dff) ||
            Font.#inRange(codePoint, 0x20d0, 0x20ff) ||
            Font.#inRange(codePoint, 0xfe20, 0xfe2f)
        );
    }

    static #isVariationSelector(codePoint) {
        return Font.#inRange(codePoint, 0xfe00, 0xfe0f) || Font.#inRange(codePoint, 0xe0100, 0xe01ef);
    }

    static #isCommonTextPunctuation(codePoint) {
        return (
            Font.#inRange(codePoint, 0x2000, 0x206f) || // General Punctuation
            Font.#inRange(codePoint, 0x20a0, 0x20cf) || // Currency Symbols
            Font.#inRange(codePoint, 0x2100, 0x214f) // Letterlike Symbols
        );
    }

    static getFontFileForCodePoint(codePoint, preferredFontFile, cjkFontFile) {
        if (Font.#isCJK(codePoint)) {
            if (cjkFontFile) return cjkFontFile;
            if (Font.isCjkFontFile(preferredFontFile)) return preferredFontFile;
            return Font.getCjkFontFile();
        }
        if (Font.#isArabic(codePoint)) return FALLBACK_FONTS.arabic;
        if (Font.#isHebrew(codePoint)) return FALLBACK_FONTS.hebrew;
        if (Font.#isDevanagari(codePoint)) return FALLBACK_FONTS.devanagari;
        if (Font.#isBengali(codePoint)) return FALLBACK_FONTS.bengali;
        if (Font.#isGurmukhi(codePoint)) return FALLBACK_FONTS.gurmukhi;
        if (Font.#isGujarati(codePoint)) return FALLBACK_FONTS.gujarati;
        if (Font.#isOriya(codePoint)) return FALLBACK_FONTS.oriya;
        if (Font.#isTamil(codePoint)) return FALLBACK_FONTS.tamil;
        if (Font.#isTelugu(codePoint)) return FALLBACK_FONTS.telugu;
        if (Font.#isKannada(codePoint)) return FALLBACK_FONTS.kannada;
        if (Font.#isMalayalam(codePoint)) return FALLBACK_FONTS.malayalam;
        if (Font.#isSinhala(codePoint)) return FALLBACK_FONTS.sinhala;
        if (Font.#isThai(codePoint)) return FALLBACK_FONTS.thai;
        if (Font.#isLao(codePoint)) return FALLBACK_FONTS.lao;
        if (Font.#isKhmer(codePoint)) return FALLBACK_FONTS.khmer;
        if (Font.#isMyanmar(codePoint)) return FALLBACK_FONTS.myanmar;
        if (Font.#isGeorgian(codePoint)) return FALLBACK_FONTS.georgian;
        if (Font.#isArmenian(codePoint)) return FALLBACK_FONTS.armenian;
        if (Font.#isEthiopic(codePoint)) return FALLBACK_FONTS.ethiopic;
        if (Font.#isTibetan(codePoint)) return FALLBACK_FONTS.tibetan;
        if (Font.#isCyrillic(codePoint)) return FALLBACK_FONTS.cyrillic;
        if (Font.#isCyrillicExtended(codePoint)) return FALLBACK_FONTS.cyrillicExt;
        if (Font.#isGreek(codePoint)) return FALLBACK_FONTS.greek;
        if (Font.#isGreekExtended(codePoint)) return FALLBACK_FONTS.greekExt;
        if (Font.#isLatinExtended(codePoint)) return FALLBACK_FONTS.latinExt;
        if (Font.#isCommonTextPunctuation(codePoint)) return preferredFontFile || FALLBACK_FONTS.latin;
        if (Font.#isBasicLatin(codePoint) || Font.#isLatin1Supplement(codePoint)) {
            return preferredFontFile || FALLBACK_FONTS.latin;
        }
        return FALLBACK_FONTS.symbols;
    }

    static splitTextByFont(text, preferredFontFile) {
        const safePreferred = Font.normalizeFontFile(preferredFontFile, null, text);
        const cjkFontFile = Font.hasCjk(text) ? Font.getCjkFontFileForText(text) : null;
        const runs = [];
        let currentFontFile = null;
        let currentText = '';

        const flush = () => {
            if (!currentText) return;
            runs.push({ text: currentText, fontFile: currentFontFile || (safePreferred || FALLBACK_FONTS.latin) });
            currentText = '';
        };

        for (const ch of String(text || '')) {
            const codePoint = ch.codePointAt(0);
            if (codePoint == null) continue;
            // Keep combining marks/variation selectors with the previous run.
            if (Font.#isCombiningMark(codePoint) || Font.#isVariationSelector(codePoint) || codePoint === 0x200d) {
                if (!currentText) {
                    currentFontFile = safePreferred || FALLBACK_FONTS.latin;
                }
                currentText += ch;
                continue;
            }

            const nextFontFile = Font.getFontFileForCodePoint(codePoint, safePreferred, cjkFontFile);
            if (currentFontFile && nextFontFile !== currentFontFile) {
                flush();
            }
            currentFontFile = nextFontFile;
            currentText += ch;
        }

        flush();
        return runs;
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
        // Keep `#assetCache` across documents to avoid refetching static fonts.
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
