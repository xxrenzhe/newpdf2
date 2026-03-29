"use client";

import { type RefObject, useMemo, useRef } from "react";

const DEFAULT_BLOCKED_NAVIGATION_RELOAD_LIMIT = 2;

type EmbeddedPdfEditorProps = {
  iframeRef: RefObject<HTMLIFrameElement>;
  src?: string;
  lang?: string | null;
  buildId?: string | null;
  onReady?: () => void;
  onError?: (message: string) => void;
  blockedNavigationReloadLimit?: number;
};

export function buildEditorSrc(lang?: string | null, buildId?: string | null) {
  const params = new URLSearchParams();
  if (lang) params.set("lang", lang);
  if (buildId) params.set("v", buildId);
  const query = params.toString();
  return query ? `/pdfeditor/index.html?${query}` : "/pdfeditor/index.html";
}

export default function EmbeddedPdfEditor({
  iframeRef,
  src: providedSrc,
  lang,
  buildId,
  onReady,
  onError,
  blockedNavigationReloadLimit = DEFAULT_BLOCKED_NAVIGATION_RELOAD_LIMIT,
}: EmbeddedPdfEditorProps) {
  const src = useMemo(() => providedSrc ?? buildEditorSrc(lang, buildId), [buildId, lang, providedSrc]);
  const readyRef = useRef(false);
  const blockedRef = useRef(false);
  const blockedReloadCountRef = useRef(0);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title="PDF Editor"
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin"
      onLoad={() => {
        const frame = iframeRef.current;
        if (!frame) return;

        try {
          const href = frame.contentWindow?.location.href ?? "";
          const url = new URL(href, window.location.href);
          const isEditorPath =
            url.origin === window.location.origin &&
            (url.pathname === "/pdfeditor" ||
              url.pathname === "/pdfeditor/" ||
              url.pathname === "/pdfeditor/index.html");

          if (!isEditorPath) {
            if (!blockedRef.current) {
              blockedRef.current = true;
              onError?.("Editor navigation was blocked and reloaded.");
            }
            readyRef.current = false;
            if (blockedReloadCountRef.current >= blockedNavigationReloadLimit) {
              return;
            }
            blockedReloadCountRef.current += 1;
            frame.src = src;
            return;
          }
        } catch {
          if (!blockedRef.current) {
            blockedRef.current = true;
            onError?.("Editor navigation was blocked and reloaded.");
          }
          readyRef.current = false;
          if (blockedReloadCountRef.current >= blockedNavigationReloadLimit) {
            return;
          }
          blockedReloadCountRef.current += 1;
          frame.src = src;
          return;
        }

        if (readyRef.current) return;
        blockedRef.current = false;
        blockedReloadCountRef.current = 0;
        readyRef.current = true;
        onReady?.();
      }}
      onError={() => {
        if (readyRef.current) return;
        onError?.("Failed to load the editor iframe.");
      }}
    />
  );
}
