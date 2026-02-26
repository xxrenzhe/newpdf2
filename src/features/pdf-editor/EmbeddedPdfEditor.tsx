"use client";

import { type RefObject, useMemo, useRef } from "react";

type EmbeddedPdfEditorProps = {
  iframeRef: RefObject<HTMLIFrameElement>;
  lang?: string | null;
  buildId?: string | null;
  onReady?: () => void;
  onError?: (message: string) => void;
};

function buildEditorSrc(lang?: string | null, buildId?: string | null) {
  const params = new URLSearchParams();
  if (lang) params.set("lang", lang);
  if (buildId) params.set("v", buildId);
  const query = params.toString();
  return query ? `/pdfeditor/index.html?${query}` : "/pdfeditor/index.html";
}

export default function EmbeddedPdfEditor({
  iframeRef,
  lang,
  buildId,
  onReady,
  onError,
}: EmbeddedPdfEditorProps) {
  const src = useMemo(() => buildEditorSrc(lang, buildId), [lang, buildId]);
  const readyRef = useRef(false);
  const blockedRef = useRef(false);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title="PDF editor"
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin"
      onLoad={() => {
        const frame = iframeRef.current;
        if (!frame) return;

        try {
          const href = frame.contentWindow?.location.href ?? "";
          const url = new URL(href, window.location.href);
          console.log("Iframe href:", href);
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
            frame.src = src;
            return;
          }
        } catch {
          if (!blockedRef.current) {
            blockedRef.current = true;
            onError?.("Editor navigation was blocked and reloaded.");
          }
          readyRef.current = false;
          frame.src = src;
          return;
        }

        if (readyRef.current) return;
        blockedRef.current = false;
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
