"use client";

import { useCallback } from "react";
import type { RefObject } from "react";

type UsePdfEditorDomOptions = {
  editorFrameRef: RefObject<HTMLIFrameElement | null>;
};

export function usePdfEditorDom({ editorFrameRef }: UsePdfEditorDomOptions) {
  const getEditorDocument = useCallback(() => {
    try {
      return editorFrameRef.current?.contentDocument ?? null;
    } catch {
      return null;
    }
  }, [editorFrameRef]);

  const detectEditorBooted = useCallback(() => {
    const doc = getEditorDocument();
    if (!doc) return false;
    return Boolean(doc.querySelector("#pdf-main"));
  }, [getEditorDocument]);

  const injectMobileOverrides = useCallback(() => {
    const doc = getEditorDocument();
    if (!doc) return;
    doc.documentElement.classList.add("embed");
    doc.body?.classList.add("embed");
  }, [getEditorDocument]);

  return {
    detectEditorBooted,
    injectMobileOverrides,
  };
}
