"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

const ASSET_ATTR = "data-pdfeditor-asset";

type EditorAssets = {
  templateHtml: string;
  styleLinks: string[];
  inlineStyles: string[];
  scripts: string[];
};

type EmbeddedPdfEditorProps = {
  containerRef: RefObject<HTMLDivElement>;
  lang?: string | null;
  buildId?: string | null;
  onReady?: () => void;
  onError?: (message: string) => void;
};

function parseEditorHtml(html: string): EditorAssets {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const styleLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
    .map((node) => node.getAttribute("href"))
    .filter((href): href is string => Boolean(href));

  const inlineStyles = Array.from(doc.querySelectorAll("style"))
    .map((node) => node.textContent ?? "")
    .filter((text) => text.trim().length > 0);

  const scripts = Array.from(doc.querySelectorAll("script[src]"))
    .map((node) => node.getAttribute("src"))
    .filter((src): src is string => Boolean(src));

  doc.querySelectorAll("script").forEach((node) => node.remove());

  return {
    templateHtml: doc.body.innerHTML,
    styleLinks,
    inlineStyles,
    scripts,
  };
}

function removeInjectedAssets() {
  document.querySelectorAll(`[${ASSET_ATTR}="embedded"]`).forEach((node) => node.remove());
}

function loadStyles(styleLinks: string[], inlineStyles: string[]) {
  const head = document.head;

  styleLinks.forEach((href) => {
    const existing = head.querySelector(`link[rel="stylesheet"][href="${href}"]`);
    if (existing) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute(ASSET_ATTR, "embedded");
    head.appendChild(link);
  });

  if (inlineStyles.length > 0) {
    const style = document.createElement("style");
    style.textContent = inlineStyles.join("\n");
    style.setAttribute(ASSET_ATTR, "embedded");
    head.appendChild(style);
  }
}

function loadScripts(scripts: string[]) {
  const body = document.body;
  return scripts.reduce<Promise<void>>((chain, src) => {
    return chain.then(
      () =>
        new Promise<void>((resolve, reject) => {
          const existing = body.querySelector(`script[src="${src}"]`);
          if (existing) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = src;
          script.defer = true;
          script.setAttribute(ASSET_ATTR, "embedded");
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load ${src}`));
          body.appendChild(script);
        })
    );
  }, Promise.resolve());
}

export default function EmbeddedPdfEditor({
  containerRef,
  lang,
  buildId,
  onReady,
  onError,
}: EmbeddedPdfEditorProps) {
  const [assets, setAssets] = useState<EditorAssets | null>(null);
  const [templateHtml, setTemplateHtml] = useState<string>("");
  const readyRef = useRef(false);

  useEffect(() => {
    let active = true;
    const url = buildId ? `/pdfeditor/index.html?v=${buildId}` : "/pdfeditor/index.html";

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load editor template (${res.status})`);
        return res.text();
      })
      .then((html) => {
        if (!active) return;
        const parsed = parseEditorHtml(html);
        setAssets(parsed);
        setTemplateHtml(parsed.templateHtml);
      })
      .catch((err: Error) => {
        if (!active) return;
        onError?.(err.message);
      });

    return () => {
      active = false;
    };
  }, [buildId, onError]);

  useEffect(() => {
    if (!assets) return;
    const embedParams = (window as typeof window & { __PDFEDITOR_EMBED_PARAMS__?: Record<string, string> })
      .__PDFEDITOR_EMBED_PARAMS__;

    if (lang) {
      (window as typeof window & { __PDFEDITOR_EMBED_PARAMS__?: Record<string, string> })
        .__PDFEDITOR_EMBED_PARAMS__ = {
        ...(embedParams ?? {}),
        lang,
      };
    }

    document.documentElement.classList.add("embed");
    loadStyles(assets.styleLinks, assets.inlineStyles);

    loadScripts(assets.scripts)
      .then(() => {
        if (readyRef.current) return;
        readyRef.current = true;
        onReady?.();
      })
      .catch((err: Error) => {
        onError?.(err.message);
      });

    return () => {
      document.documentElement.classList.remove("embed");
      if (lang) {
        const nextParams = { ...(window as typeof window & { __PDFEDITOR_EMBED_PARAMS__?: Record<string, string> })
          .__PDFEDITOR_EMBED_PARAMS__ };
        if (nextParams) {
          delete nextParams.lang;
          if (Object.keys(nextParams).length === 0) {
            delete (window as typeof window & { __PDFEDITOR_EMBED_PARAMS__?: Record<string, string> })
              .__PDFEDITOR_EMBED_PARAMS__;
          } else {
            (window as typeof window & { __PDFEDITOR_EMBED_PARAMS__?: Record<string, string> })
              .__PDFEDITOR_EMBED_PARAMS__ = nextParams;
          }
        }
      }
      removeInjectedAssets();
      readyRef.current = false;
    };
  }, [assets, lang, onReady, onError]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      data-pdfeditor-embedded
      dangerouslySetInnerHTML={{ __html: templateHtml }}
    />
  );
}
