import regeneratorRuntime from "@babel/runtime/regenerator";
import fontkit from "@pdf-lib/fontkit";
import { degrees, type PDFDocument, type PDFPage, type PDFFont, type RGB } from "pdf-lib";

type GlobalWithRegenerator = typeof globalThis & { regeneratorRuntime?: unknown };
const globalWithRegenerator = globalThis as GlobalWithRegenerator;
if (!globalWithRegenerator.regeneratorRuntime) {
  globalWithRegenerator.regeneratorRuntime = regeneratorRuntime;
}

const FONT_BASE_URL = "/pdfeditor/assets/fonts/";

const FONT_URLS = {
  latin: `${FONT_BASE_URL}NotoSans-latin.woff`,
  latinExt: `${FONT_BASE_URL}NotoSans-latin-ext.woff`,
  greek: `${FONT_BASE_URL}NotoSans-greek.woff`,
  greekExt: `${FONT_BASE_URL}NotoSans-greek-ext.woff`,
  cyrillic: `${FONT_BASE_URL}NotoSans-cyrillic.woff`,
  cyrillicExt: `${FONT_BASE_URL}NotoSans-cyrillic-ext.woff`,
  devanagari: `${FONT_BASE_URL}NotoSans-devanagari.woff`,
  arabic: `${FONT_BASE_URL}NotoSansArabic.woff`,
  hebrew: `${FONT_BASE_URL}NotoSansHebrew.woff`,
  thai: `${FONT_BASE_URL}NotoSansThai.woff`,
  bengali: `${FONT_BASE_URL}NotoSansBengali.woff`,
  gurmukhi: `${FONT_BASE_URL}NotoSansGurmukhi.woff`,
  gujarati: `${FONT_BASE_URL}NotoSansGujarati.woff`,
  oriya: `${FONT_BASE_URL}NotoSansOriya.woff`,
  tamil: `${FONT_BASE_URL}NotoSansTamil.woff`,
  telugu: `${FONT_BASE_URL}NotoSansTelugu.woff`,
  kannada: `${FONT_BASE_URL}NotoSansKannada.woff`,
  malayalam: `${FONT_BASE_URL}NotoSansMalayalam.woff`,
  sinhala: `${FONT_BASE_URL}NotoSansSinhala.woff`,
  khmer: `${FONT_BASE_URL}NotoSansKhmer.woff`,
  lao: `${FONT_BASE_URL}NotoSansLao.woff`,
  myanmar: `${FONT_BASE_URL}NotoSansMyanmar.woff`,
  georgian: `${FONT_BASE_URL}NotoSansGeorgian.woff`,
  armenian: `${FONT_BASE_URL}NotoSansArmenian.woff`,
  ethiopic: `${FONT_BASE_URL}NotoSansEthiopic.woff`,
  tibetan: `${FONT_BASE_URL}NotoSerifTibetan.woff`,
  symbols: `${FONT_BASE_URL}NotoSansSymbols2.woff`,
  cjkSc: `${FONT_BASE_URL}NotoSansCJKsc-Regular.otf`,
  cjkTc: `${FONT_BASE_URL}NotoSansCJKtc-Regular.otf`,
  cjkJp: `${FONT_BASE_URL}NotoSansCJKjp-Regular.otf`,
  cjkKr: `${FONT_BASE_URL}NotoSansCJKkr-Regular.otf`,
} as const;

const LOCALE_CODE =
  typeof navigator !== "undefined" && navigator.language
    ? navigator.language.toLowerCase()
    : "en";

function getCjkFontUrl(locale = LOCALE_CODE) {
  const normalized = locale.replace("_", "-").toLowerCase();
  if (normalized.startsWith("ja")) return FONT_URLS.cjkJp;
  if (normalized.startsWith("ko")) return FONT_URLS.cjkKr;
  if (normalized.startsWith("zh")) {
    if (normalized.includes("hant") || normalized.includes("-tw") || normalized.includes("-hk") || normalized.includes("-mo")) {
      return FONT_URLS.cjkTc;
    }
    return FONT_URLS.cjkSc;
  }
  return FONT_URLS.cjkSc;
}

export type PreparedRun = { text: string; font: PDFFont };
export type PreparedLine = { runs: PreparedRun[]; width: number };

function inRange(codePoint: number, start: number, end: number) {
  return codePoint >= start && codePoint <= end;
}

function isBasicLatin(codePoint: number) {
  return inRange(codePoint, 0x0000, 0x007f);
}

function isLatin1Supplement(codePoint: number) {
  return inRange(codePoint, 0x0080, 0x00ff);
}

function isLatinExtended(codePoint: number) {
  return (
    inRange(codePoint, 0x0100, 0x02af) ||
    inRange(codePoint, 0x1e00, 0x1eff) ||
    inRange(codePoint, 0x2c60, 0x2c7f) ||
    inRange(codePoint, 0xa720, 0xa7ff)
  );
}

function isGreek(codePoint: number) {
  return inRange(codePoint, 0x0370, 0x03ff);
}

function isGreekExtended(codePoint: number) {
  return inRange(codePoint, 0x1f00, 0x1fff);
}

function isCyrillic(codePoint: number) {
  return inRange(codePoint, 0x0400, 0x04ff);
}

function isCyrillicExtended(codePoint: number) {
  return inRange(codePoint, 0x0500, 0x052f) || inRange(codePoint, 0x2de0, 0x2dff) || inRange(codePoint, 0xa640, 0xa69f) || inRange(codePoint, 0x1c80, 0x1c8f);
}

function isCJK(codePoint: number) {
  return (
    inRange(codePoint, 0x1100, 0x11ff) ||
    inRange(codePoint, 0x3130, 0x318f) ||
    inRange(codePoint, 0xac00, 0xd7af) ||
    inRange(codePoint, 0x3040, 0x30ff) ||
    inRange(codePoint, 0x31f0, 0x31ff) ||
    inRange(codePoint, 0x3000, 0x303f) ||
    inRange(codePoint, 0x2e80, 0x2eff) ||
    inRange(codePoint, 0x2f00, 0x2fdf) ||
    inRange(codePoint, 0x31c0, 0x31ef) ||
    inRange(codePoint, 0x3200, 0x32ff) ||
    inRange(codePoint, 0x3300, 0x33ff) ||
    inRange(codePoint, 0xfe10, 0xfe1f) ||
    inRange(codePoint, 0xfe30, 0xfe4f) ||
    inRange(codePoint, 0xff00, 0xffef) ||
    inRange(codePoint, 0x3100, 0x312f) ||
    inRange(codePoint, 0x31a0, 0x31bf) ||
    inRange(codePoint, 0x3400, 0x4dbf) ||
    inRange(codePoint, 0x4e00, 0x9fff) ||
    inRange(codePoint, 0xf900, 0xfaff) ||
    inRange(codePoint, 0x20000, 0x2ebef) ||
    inRange(codePoint, 0x2f800, 0x2fa1f)
  );
}

function isArabic(codePoint: number) {
  return inRange(codePoint, 0x0600, 0x06ff) || inRange(codePoint, 0x0750, 0x077f) || inRange(codePoint, 0x08a0, 0x08ff) || inRange(codePoint, 0xfb50, 0xfdff) || inRange(codePoint, 0xfe70, 0xfeff) || inRange(codePoint, 0x1ee00, 0x1eeff);
}

function isHebrew(codePoint: number) {
  return inRange(codePoint, 0x0590, 0x05ff) || inRange(codePoint, 0xfb1d, 0xfb4f);
}

function isDevanagari(codePoint: number) {
  return inRange(codePoint, 0x0900, 0x097f) || inRange(codePoint, 0xa8e0, 0xa8ff);
}

function isBengali(codePoint: number) {
  return inRange(codePoint, 0x0980, 0x09ff);
}

function isGurmukhi(codePoint: number) {
  return inRange(codePoint, 0x0a00, 0x0a7f);
}

function isGujarati(codePoint: number) {
  return inRange(codePoint, 0x0a80, 0x0aff);
}

function isOriya(codePoint: number) {
  return inRange(codePoint, 0x0b00, 0x0b7f);
}

function isTamil(codePoint: number) {
  return inRange(codePoint, 0x0b80, 0x0bff);
}

function isTelugu(codePoint: number) {
  return inRange(codePoint, 0x0c00, 0x0c7f);
}

function isKannada(codePoint: number) {
  return inRange(codePoint, 0x0c80, 0x0cff);
}

function isMalayalam(codePoint: number) {
  return inRange(codePoint, 0x0d00, 0x0d7f);
}

function isSinhala(codePoint: number) {
  return inRange(codePoint, 0x0d80, 0x0dff);
}

function isThai(codePoint: number) {
  return inRange(codePoint, 0x0e00, 0x0e7f);
}

function isLao(codePoint: number) {
  return inRange(codePoint, 0x0e80, 0x0eff);
}

function isTibetan(codePoint: number) {
  return inRange(codePoint, 0x0f00, 0x0fff);
}

function isMyanmar(codePoint: number) {
  return inRange(codePoint, 0x1000, 0x109f) || inRange(codePoint, 0xa9e0, 0xa9ff);
}

function isKhmer(codePoint: number) {
  return inRange(codePoint, 0x1780, 0x17ff) || inRange(codePoint, 0x19e0, 0x19ff);
}

function isGeorgian(codePoint: number) {
  return inRange(codePoint, 0x10a0, 0x10ff) || inRange(codePoint, 0x2d00, 0x2d2f) || inRange(codePoint, 0x1c90, 0x1cbf);
}

function isArmenian(codePoint: number) {
  return inRange(codePoint, 0x0530, 0x058f) || inRange(codePoint, 0xfb13, 0xfb17);
}

function isEthiopic(codePoint: number) {
  return inRange(codePoint, 0x1200, 0x137f) || inRange(codePoint, 0x1380, 0x139f) || inRange(codePoint, 0x2d80, 0x2ddf) || inRange(codePoint, 0xab00, 0xab2f);
}

function isCombiningMark(codePoint: number) {
  return inRange(codePoint, 0x0300, 0x036f) || inRange(codePoint, 0x1ab0, 0x1aff) || inRange(codePoint, 0x1dc0, 0x1dff) || inRange(codePoint, 0x20d0, 0x20ff) || inRange(codePoint, 0xfe20, 0xfe2f);
}

function isVariationSelector(codePoint: number) {
  return inRange(codePoint, 0xfe00, 0xfe0f) || inRange(codePoint, 0xe0100, 0xe01ef);
}

function isCommonTextPunctuation(codePoint: number) {
  return inRange(codePoint, 0x2000, 0x206f) || inRange(codePoint, 0x20a0, 0x20cf) || inRange(codePoint, 0x2100, 0x214f);
}

function fontUrlForCodePoint(codePoint: number) {
  if (isCJK(codePoint)) return getCjkFontUrl();
  if (isArabic(codePoint)) return FONT_URLS.arabic;
  if (isHebrew(codePoint)) return FONT_URLS.hebrew;
  if (isDevanagari(codePoint)) return FONT_URLS.devanagari;
  if (isBengali(codePoint)) return FONT_URLS.bengali;
  if (isGurmukhi(codePoint)) return FONT_URLS.gurmukhi;
  if (isGujarati(codePoint)) return FONT_URLS.gujarati;
  if (isOriya(codePoint)) return FONT_URLS.oriya;
  if (isTamil(codePoint)) return FONT_URLS.tamil;
  if (isTelugu(codePoint)) return FONT_URLS.telugu;
  if (isKannada(codePoint)) return FONT_URLS.kannada;
  if (isMalayalam(codePoint)) return FONT_URLS.malayalam;
  if (isSinhala(codePoint)) return FONT_URLS.sinhala;
  if (isThai(codePoint)) return FONT_URLS.thai;
  if (isLao(codePoint)) return FONT_URLS.lao;
  if (isKhmer(codePoint)) return FONT_URLS.khmer;
  if (isMyanmar(codePoint)) return FONT_URLS.myanmar;
  if (isGeorgian(codePoint)) return FONT_URLS.georgian;
  if (isArmenian(codePoint)) return FONT_URLS.armenian;
  if (isEthiopic(codePoint)) return FONT_URLS.ethiopic;
  if (isTibetan(codePoint)) return FONT_URLS.tibetan;
  if (isCyrillic(codePoint)) return FONT_URLS.cyrillic;
  if (isCyrillicExtended(codePoint)) return FONT_URLS.cyrillicExt;
  if (isGreek(codePoint)) return FONT_URLS.greek;
  if (isGreekExtended(codePoint)) return FONT_URLS.greekExt;
  if (isLatinExtended(codePoint)) return FONT_URLS.latinExt;
  if (isCommonTextPunctuation(codePoint)) return FONT_URLS.latin;
  if (isBasicLatin(codePoint) || isLatin1Supplement(codePoint)) return FONT_URLS.latin;
  return FONT_URLS.symbols;
}

function splitLineIntoFontUrls(line: string) {
  const runs: Array<{ text: string; fontUrl: string }> = [];
  let currentFontUrl: string | null = null;
  let currentText = "";

  const flush = () => {
    if (!currentText) return;
    runs.push({ text: currentText, fontUrl: currentFontUrl || FONT_URLS.latin });
    currentText = "";
  };

  for (const ch of line) {
    const codePoint = ch.codePointAt(0);
    if (codePoint == null) continue;

    if (isCombiningMark(codePoint) || isVariationSelector(codePoint) || codePoint === 0x200d) {
      if (!currentText) currentFontUrl = FONT_URLS.latin;
      currentText += ch;
      continue;
    }

    const nextFontUrl = fontUrlForCodePoint(codePoint);
    if (currentFontUrl && nextFontUrl !== currentFontUrl) flush();
    currentFontUrl = nextFontUrl;
    currentText += ch;
  }

  flush();
  return runs;
}

async function embedFontFromUrl(pdf: PDFDocument, fontCache: Map<string, PDFFont>, url: string) {
  const cached = fontCache.get(url);
  if (cached) return cached;

  pdf.registerFontkit(fontkit);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch font: ${url}`);
  const bytes = await res.arrayBuffer();

  const font = await pdf.embedFont(bytes, { subset: true }).catch(() => pdf.embedFont(bytes));
  fontCache.set(url, font);
  return font;
}

export async function prepareTextLinesWithFallback(
  pdf: PDFDocument,
  fontCache: Map<string, PDFFont>,
  text: string,
  fontSize: number
): Promise<PreparedLine[]> {
  const lines = String(text || "").split(/[\n\f\r\u000B]/);
  const prepared: PreparedLine[] = [];

  for (const line of lines) {
    const runs = splitLineIntoFontUrls(line);
    const preparedRuns: PreparedRun[] = [];
    let width = 0;

    for (const run of runs) {
      let font: PDFFont;
      try {
        font = await embedFontFromUrl(pdf, fontCache, run.fontUrl);
      } catch {
        font = await embedFontFromUrl(pdf, fontCache, FONT_URLS.symbols);
      }

      preparedRuns.push({ text: run.text, font });
      width += font.widthOfTextAtSize(run.text, fontSize);
    }

    prepared.push({ runs: preparedRuns, width });
  }

  return prepared;
}

export function drawPreparedTextLines(
  page: PDFPage,
  lines: PreparedLine[],
  opts: {
    x: number;
    y: number;
    fontSize: number;
    lineHeight: number;
    color: RGB;
    opacity: number;
    rotationDegrees: number;
  }
) {
  const angleRad = (opts.rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const rotate = degrees(opts.rotationDegrees);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineX = opts.x + sin * opts.lineHeight * i;
    const lineY = opts.y - cos * opts.lineHeight * i;
    let cursorX = lineX;
    let cursorY = lineY;

    for (const run of line.runs) {
      page.drawText(run.text, {
        x: cursorX,
        y: cursorY,
        size: opts.fontSize,
        font: run.font,
        color: opts.color,
        opacity: opts.opacity,
        rotate,
      });

      const advance = run.font.widthOfTextAtSize(run.text, opts.fontSize);
      cursorX += cos * advance;
      cursorY += sin * advance;
    }
  }
}
