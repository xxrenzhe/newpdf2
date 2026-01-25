export const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];

export type TranslationMessages = Record<string, string>;

const LOCALE_LOADERS: Record<LanguageCode, () => Promise<TranslationMessages>> = {
  en: () => import("./i18n-locales/en.json").then((m) => m.default),
  es: () => import("./i18n-locales/es.json").then((m) => m.default),
  fr: () => import("./i18n-locales/fr.json").then((m) => m.default),
  de: () => import("./i18n-locales/de.json").then((m) => m.default),
  pt: () => import("./i18n-locales/pt.json").then((m) => m.default),
  it: () => import("./i18n-locales/it.json").then((m) => m.default),
  zh: () => import("./i18n-locales/zh.json").then((m) => m.default),
  ja: () => import("./i18n-locales/ja.json").then((m) => m.default),
  ko: () => import("./i18n-locales/ko.json").then((m) => m.default),
};

const messagesCache = new Map<LanguageCode, Promise<TranslationMessages>>();

export async function loadTranslationMessages(lang: LanguageCode): Promise<TranslationMessages> {
  const cached = messagesCache.get(lang);
  if (cached) return cached;

  const promise = LOCALE_LOADERS[lang]()
    .then((messages) => messages ?? {})
    .catch(() => ({}));

  messagesCache.set(lang, promise);
  return promise;
}

