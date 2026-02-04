"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

const ASSET_ATTR = "data-pdfeditor-asset";
const ROOT_ID = "pdf-editor-root";

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

type ListenerRecord = {
  target: EventTarget;
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
};

type GlobalTracker = {
  restore: () => void;
  cleanup: () => void;
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

function createGlobalTracker(): GlobalTracker {
  const listeners: ListenerRecord[] = [];
  const timeouts: number[] = [];
  const intervals: number[] = [];
  const rafs: number[] = [];

  const originalWindowAdd = window.addEventListener.bind(window);
  const originalDocumentAdd = document.addEventListener.bind(document);
  const originalSetTimeout = window.setTimeout.bind(window);
  const originalSetInterval = window.setInterval.bind(window);
  const originalRequestAnimationFrame =
    typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame.bind(window) : undefined;
  const originalCancelAnimationFrame =
    typeof window.cancelAnimationFrame === "function" ? window.cancelAnimationFrame.bind(window) : undefined;

  const trackedWindowAdd: typeof window.addEventListener = (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => {
    listeners.push({ target: window, type, listener, options });
    return originalWindowAdd.call(window, type, listener, options);
  };
  window.addEventListener = trackedWindowAdd;

  const trackedDocumentAdd: typeof document.addEventListener = (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => {
    listeners.push({ target: document, type, listener, options });
    return originalDocumentAdd(type, listener, options);
  };
  document.addEventListener = trackedDocumentAdd;

  window.setTimeout = ((...args: Parameters<typeof window.setTimeout>) => {
    const id = originalSetTimeout(...args);
    timeouts.push(id);
    return id;
  }) as typeof window.setTimeout;

  window.setInterval = ((...args: Parameters<typeof window.setInterval>) => {
    const id = originalSetInterval(...args);
    intervals.push(id);
    return id;
  }) as typeof window.setInterval;

  if (originalRequestAnimationFrame && originalCancelAnimationFrame) {
    window.requestAnimationFrame = ((callback) => {
      const id = originalRequestAnimationFrame(callback);
      rafs.push(id);
      return id;
    }) as typeof window.requestAnimationFrame;
  }

  const restore = () => {
    window.addEventListener = originalWindowAdd;
    document.addEventListener = originalDocumentAdd;
    window.setTimeout = originalSetTimeout;
    window.setInterval = originalSetInterval;
    if (originalRequestAnimationFrame && originalCancelAnimationFrame) {
      window.requestAnimationFrame = originalRequestAnimationFrame;
    }
  };

  const cleanup = () => {
    listeners.forEach(({ target, type, listener, options }) => {
      target.removeEventListener(type, listener, options);
    });
    timeouts.forEach((id) => window.clearTimeout(id));
    intervals.forEach((id) => window.clearInterval(id));
    if (originalCancelAnimationFrame) {
      rafs.forEach((id) => originalCancelAnimationFrame(id));
    }
  };

  return { restore, cleanup };
}

function mirrorBodyAttributes(root: HTMLElement) {
  const attributes = ["data-pdfjsprinting"];
  const sync = () => {
    attributes.forEach((attr) => {
      const value = document.body.getAttribute(attr);
      if (value === null) {
        root.removeAttribute(attr);
      } else {
        root.setAttribute(attr, value);
      }
    });
  };

  sync();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        sync();
        break;
      }
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: attributes });

  return () => {
    observer.disconnect();
    attributes.forEach((attr) => root.removeAttribute(attr));
  };
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
  const trackerRef = useRef<GlobalTracker | null>(null);

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
    const root = containerRef.current;
    if (!root) return;
    const embedParams = (window as typeof window & { __PDFEDITOR_EMBED_PARAMS__?: Record<string, string> })
      .__PDFEDITOR_EMBED_PARAMS__;

    if (lang) {
      (window as typeof window & { __PDFEDITOR_EMBED_PARAMS__?: Record<string, string> })
        .__PDFEDITOR_EMBED_PARAMS__ = {
        ...(embedParams ?? {}),
        lang,
      };
    }

    root.classList.add("embed");
    loadStyles(assets.styleLinks, assets.inlineStyles);

    const mirrorCleanup = mirrorBodyAttributes(root);
    const tracker = createGlobalTracker();
    trackerRef.current = tracker;

    loadScripts(assets.scripts)
      .then(() => {
        tracker.restore();
        if (readyRef.current) return;
        readyRef.current = true;
        onReady?.();
      })
      .catch((err: Error) => {
        tracker.restore();
        onError?.(err.message);
      });

    return () => {
      root.classList.remove("embed");
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
      mirrorCleanup();
      trackerRef.current?.restore();
      trackerRef.current?.cleanup();
      trackerRef.current = null;
      removeInjectedAssets();
      readyRef.current = false;
    };
  }, [assets, containerRef, lang, onReady, onError]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      id={ROOT_ID}
      data-pdfeditor-embedded
      dangerouslySetInnerHTML={{ __html: templateHtml }}
    />
  );
}
