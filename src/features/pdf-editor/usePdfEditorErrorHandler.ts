"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

type Setter<T> = Dispatch<SetStateAction<T>>;
type TranslateFn = (key: string, fallback: string) => string;

type UsePdfEditorErrorHandlerOptions = {
  t: TranslateFn;
  blockedNavigationMessage: string;
  iframeReady: boolean;
  editorBooted: boolean;
  pdfLoaded: boolean;
  abortActiveLoad: (options?: { markCancelled?: boolean; clearError?: boolean }) => void;
  setBusy: Setter<boolean>;
  setError: Setter<string>;
  setExternalEmbedWarning: Setter<string>;
};

export function usePdfEditorErrorHandler({
  t,
  blockedNavigationMessage,
  iframeReady,
  editorBooted,
  pdfLoaded,
  abortActiveLoad,
  setBusy,
  setError,
  setExternalEmbedWarning,
}: UsePdfEditorErrorHandlerOptions) {
  return useCallback(
    (message: string) => {
      if (message === blockedNavigationMessage && (iframeReady || editorBooted)) {
        setExternalEmbedWarning(
          t(
            "pdfNavigationBlocked",
            "A link in this PDF tried to open a new page. We blocked it to keep you in the editor."
          )
        );
        return;
      }

      if (!pdfLoaded) {
        abortActiveLoad();
      } else {
        setBusy(false);
      }
      setError(message);
    },
    [
      abortActiveLoad,
      blockedNavigationMessage,
      editorBooted,
      iframeReady,
      pdfLoaded,
      setBusy,
      setError,
      setExternalEmbedWarning,
      t,
    ]
  );
}
