"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getTranslation, languages, type LanguageCode } from "@/lib/i18n";

const STORAGE_KEY = "qwerpdf-lang";

type LanguageContextValue = {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  languages: typeof languages;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function normalizeLanguage(input?: string | null): LanguageCode {
  if (!input) return "en";
  const lower = input.toLowerCase();
  if (languages.some((lang) => lang.code === lower)) return lower as LanguageCode;
  const base = lower.split("-", 1)[0];
  if (languages.some((lang) => lang.code === base)) return base as LanguageCode;
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const preferred = normalizeLanguage(stored || window.navigator.language);
    setLangState(preferred);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const value = getTranslation(lang, key);
      if (value === key && fallback) return fallback;
      return value;
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      languages,
    }),
    [lang, setLang, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
