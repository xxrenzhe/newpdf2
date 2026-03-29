export type PdfDownloadMessage = {
  type: "pdf-download";
  blob: Blob;
  editorSessionId?: string;
  requestId?: string;
};
export type PdfLoadedMessage = {
  type: "pdf-loaded";
  pageCount?: number;
  loadToken?: number;
  editorSessionId?: string;
};
export type PdfRenderCompleteMessage = {
  type: "pdf-render-complete";
  loadToken?: number;
  editorSessionId?: string;
};
export type PdfProgressMessage = {
  type: "pdf-progress";
  loaded: number;
  total?: number;
  loadToken?: number;
  editorSessionId?: string;
};
export type PdfPasswordErrorMessage = {
  type: "pdf-password-error";
  loadToken?: number;
  editorSessionId?: string;
};
export type PdfErrorMessage = {
  type: "pdf-error";
  message?: string;
  loadToken?: number;
  editorSessionId?: string;
  requestId?: string;
};
export type PdfExternalEmbedBlockedMessage = {
  type: "pdf-external-embed-blocked";
  count?: number;
  origins?: string[];
  loadToken?: number;
  editorSessionId?: string;
};
export type PdfFontFallbackMessage = {
  type: "pdf-font-fallback";
  count?: number;
  fonts?: string[];
  editorSessionId?: string;
  requestId?: string;
};
export type PdfLoadCancelledMessage = {
  type: "pdf-load-cancelled";
  loadToken?: number;
  editorSessionId?: string;
};
export type PdfOpenToolMessage = { type: "open-tool"; tool?: string; editorSessionId?: string };
export type PdfEditorReadyMessage = { type: "pdf-editor-ready"; editorSessionId?: string };
export type PdfSaveProgressMessage = {
  type: "pdf-save-progress";
  phase: string;
  editorSessionId?: string;
  requestId?: string;
};
export type HealthCheckAckMessage = { type: "health-check-ack"; editorSessionId?: string };
export type PdfDirtyStateMessage = {
  type: "pdf-dirty-state";
  isDirty: boolean;
  editorSessionId?: string;
};

export type PdfEditorMessage =
  | PdfDownloadMessage
  | PdfLoadedMessage
  | PdfRenderCompleteMessage
  | PdfProgressMessage
  | PdfPasswordErrorMessage
  | PdfErrorMessage
  | PdfExternalEmbedBlockedMessage
  | PdfFontFallbackMessage
  | PdfLoadCancelledMessage
  | PdfOpenToolMessage
  | PdfEditorReadyMessage
  | PdfSaveProgressMessage
  | HealthCheckAckMessage
  | PdfDirtyStateMessage;

function getMessageRecord(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function parseLoadToken(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function parseEditorMessage(value: unknown): PdfEditorMessage | null {
  const record = getMessageRecord(value);
  if (!record || typeof record.type !== "string") return null;

  const loadToken = parseLoadToken(record.loadToken);
  const editorSessionId = parseOptionalString(record.editorSessionId);
  const requestId = parseOptionalString(record.requestId);

  switch (record.type) {
    case "pdf-download": {
      if (!(record.blob instanceof Blob)) return null;
      return { type: "pdf-download", blob: record.blob, editorSessionId, requestId };
    }
    case "pdf-loaded":
      return {
        type: "pdf-loaded",
        pageCount: typeof record.pageCount === "number" ? record.pageCount : undefined,
        loadToken,
        editorSessionId,
      };
    case "pdf-render-complete":
      return { type: "pdf-render-complete", loadToken, editorSessionId };
    case "pdf-progress": {
      if (typeof record.loaded !== "number" || !Number.isFinite(record.loaded)) return null;
      const total = typeof record.total === "number" && Number.isFinite(record.total) ? record.total : undefined;
      return { type: "pdf-progress", loaded: record.loaded, total, loadToken, editorSessionId };
    }
    case "pdf-password-error":
      return { type: "pdf-password-error", loadToken, editorSessionId };
    case "pdf-error":
      return {
        type: "pdf-error",
        message: typeof record.message === "string" ? record.message : undefined,
        loadToken,
        editorSessionId,
        requestId,
      };
    case "pdf-external-embed-blocked":
      return {
        type: "pdf-external-embed-blocked",
        count: typeof record.count === "number" && Number.isFinite(record.count) ? record.count : undefined,
        origins: Array.isArray(record.origins)
          ? record.origins.filter((origin): origin is string => typeof origin === "string")
          : undefined,
        loadToken,
        editorSessionId,
      };
    case "pdf-font-fallback":
      return {
        type: "pdf-font-fallback",
        count: typeof record.count === "number" && Number.isFinite(record.count) ? record.count : undefined,
        fonts: Array.isArray(record.fonts)
          ? record.fonts.filter((font): font is string => typeof font === "string")
          : undefined,
        editorSessionId,
        requestId,
      };
    case "pdf-load-cancelled":
      return { type: "pdf-load-cancelled", loadToken, editorSessionId };
    case "open-tool":
      return {
        type: "open-tool",
        tool: typeof record.tool === "string" ? record.tool : undefined,
        editorSessionId,
      };
    case "pdf-editor-ready":
      return { type: "pdf-editor-ready", editorSessionId };
    case "pdf-save-progress":
      return {
        type: "pdf-save-progress",
        phase: typeof record.phase === "string" ? record.phase : "",
        editorSessionId,
        requestId,
      };
    case "health-check-ack":
      return { type: "health-check-ack", editorSessionId };
    case "pdf-dirty-state":
      return {
        type: "pdf-dirty-state",
        isDirty: typeof record.isDirty === "boolean" ? record.isDirty : false,
        editorSessionId,
      };
    default:
      return null;
  }
}

export function matchesLoadToken(loadToken: number | undefined, expectedToken: number) {
  if (typeof loadToken !== "number") return true;
  return loadToken === expectedToken;
}

export function matchesEditorSessionId(editorSessionId: string | undefined, expectedSessionId: string) {
  return editorSessionId === expectedSessionId;
}

export function matchesRequestId(requestId: string | undefined, expectedRequestId: string | null) {
  if (!expectedRequestId) return false;
  return requestId === expectedRequestId;
}

export function buildTrustedOrigin(src: string, baseHref?: string) {
  try {
    return new URL(src, baseHref ?? (typeof window !== "undefined" ? window.location.href : "http://localhost")).origin;
  } catch {
    return null;
  }
}

export function shouldPauseHealthChecks(visibilityState: string, busy: boolean) {
  return visibilityState !== "visible" || busy;
}

export function hasHealthCheckTimedOut(lastActivityAt: number, now: number, timeoutMs: number) {
  return now - lastActivityAt >= timeoutMs;
}
