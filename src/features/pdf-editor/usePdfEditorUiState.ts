"use client";

import { useMemo } from "react";

type TranslateFn = (key: string, fallback: string) => string;

type UsePdfEditorUiStateOptions = {
  variant: "card" | "shell";
  actionsPosition: "inline" | "top-right";
  busy: boolean;
  pdfLoaded: boolean;
  loadCancelled: boolean;
  iframeReady: boolean;
  t: TranslateFn;
};

const TITLE_CLASS_NAME = "min-w-0 flex items-center gap-3 w-full sm:w-auto";
const ACTIONS_CLASS_NAME = "flex flex-wrap items-center gap-2 w-full sm:w-auto sm:flex-nowrap sm:justify-end";
const SECONDARY_ACTION_TOP_RIGHT_CLASS_NAME =
  "inline-flex items-center justify-center h-9 px-3 text-xs rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] whitespace-nowrap sm:h-10 sm:px-4 sm:text-sm";
const SECONDARY_ACTION_INLINE_CLASS_NAME =
  "inline-flex items-center justify-center h-10 px-4 text-xs rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] whitespace-nowrap sm:h-11 sm:px-5 sm:text-sm";
const PRIMARY_ACTION_TOP_RIGHT_CLASS_NAME =
  "inline-flex items-center justify-center h-9 px-3 text-xs rounded-lg bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 whitespace-nowrap sm:h-10 sm:px-4 sm:text-sm";
const PRIMARY_ACTION_INLINE_CLASS_NAME =
  "inline-flex items-center justify-center h-10 px-4 text-xs rounded-lg bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 whitespace-nowrap sm:h-11 sm:px-5 sm:text-sm";

export function usePdfEditorUiState({
  variant,
  actionsPosition,
  busy,
  pdfLoaded,
  loadCancelled,
  iframeReady,
  t,
}: UsePdfEditorUiStateOptions) {
  const shellClassName = useMemo(
    () =>
      variant === "shell"
        ? "bg-white overflow-hidden flex flex-col h-screen h-[100dvh]"
        : "bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm overflow-hidden",
    [variant]
  );

  const viewerClassName = useMemo(() => {
    const viewerShellClassName =
      variant === "shell"
        ? "flex-1 min-h-0 bg-white"
        : "h-[75vh] min-h-[560px] bg-white";
    return actionsPosition === "top-right" ? `${viewerShellClassName} pt-2` : viewerShellClassName;
  }, [actionsPosition, variant]);

  const headerClassName = useMemo(
    () =>
      actionsPosition === "top-right"
        ? "flex flex-col gap-3 px-4 py-3 min-h-[64px] bg-white/80 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6"
        : "flex flex-col gap-4 px-4 py-4 min-h-[72px] border-b border-[color:var(--brand-line)] bg-white/80 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5",
    [actionsPosition]
  );

  const secondaryActionClassName = useMemo(
    () =>
      actionsPosition === "top-right"
        ? SECONDARY_ACTION_TOP_RIGHT_CLASS_NAME
        : SECONDARY_ACTION_INLINE_CLASS_NAME,
    [actionsPosition]
  );

  const primaryActionClassName = useMemo(
    () =>
      actionsPosition === "top-right"
        ? PRIMARY_ACTION_TOP_RIGHT_CLASS_NAME
        : PRIMARY_ACTION_INLINE_CLASS_NAME,
    [actionsPosition]
  );

  const statusText = useMemo(() => {
    if (busy) {
      return t("statusWorking", "Working…");
    }
    if (pdfLoaded) {
      return t("statusReady", "Ready");
    }
    if (loadCancelled) {
      return t("statusCanceled", "Canceled");
    }
    if (iframeReady) {
      return t("statusWaiting", "Waiting…");
    }
    return t("statusLoading", "Loading…");
  }, [busy, iframeReady, loadCancelled, pdfLoaded, t]);

  return {
    shellClassName,
    viewerClassName,
    headerClassName,
    titleClassName: TITLE_CLASS_NAME,
    actionsClassName: ACTIONS_CLASS_NAME,
    secondaryActionClassName,
    primaryActionClassName,
    statusText,
  };
}
