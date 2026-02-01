"use client";

import dynamic from "next/dynamic";
import Link from "@/components/AppLink";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FileDropzone from "@/components/tools/FileDropzone";
import { toolByKey, TOOLS } from "@/lib/tools";
import { deleteUpload, loadUpload } from "@/lib/uploadStore";
import { clearPdfEditorCache, loadPdfEditorInput, loadPdfEditorOutput } from "@/lib/pdfEditorCache";
import { createGuestDocument, loadGuestDocument, updateGuestDocumentFiles, updateGuestDocumentTool } from "@/lib/guestDocumentStore";
import { chosenToolFromToolKey, displayToolKeyFromChosenTool, pdfEditorInitialTool, toolKeyFromChosenTool } from "@/lib/filesEditorCompat";
import { useLanguage } from "@/components/LanguageProvider";
import { isIndexedDbWritable } from "@/lib/indexedDbSupport";
import { ToolIcon } from "@/lib/toolIcons";

const PdfEditorTool = dynamic(() => import("@/features/pdf-editor/PdfEditorTool"), { ssr: false });
const PdfCompressTool = dynamic(() => import("@/components/tools/PdfCompressTool"), { ssr: false });
const PdfConvertTool = dynamic(() => import("@/components/tools/PdfConvertTool"), { ssr: false });
const PdfMergeTool = dynamic(() => import("@/components/tools/PdfMergeTool"), { ssr: false });
const PdfSignTool = dynamic(() => import("@/components/tools/PdfSignTool"), { ssr: false });
const PdfSplitTool = dynamic(() => import("@/components/tools/PdfSplitTool"), { ssr: false });
const PdfOrganizeTool = dynamic(() => import("@/components/tools/PdfOrganizeTool"), { ssr: false });
const PdfDeletePagesTool = dynamic(() => import("@/features/delete-pages/PdfDeletePagesTool"), { ssr: false });
const PdfWatermarkTool = dynamic(() => import("@/components/tools/PdfWatermarkTool"), { ssr: false });
const PdfPasswordTool = dynamic(() => import("@/components/tools/PdfPasswordTool"), { ssr: false });
const PdfUnlockTool = dynamic(() => import("@/components/tools/PdfUnlockTool"), { ssr: false });
const PdfCropTool = dynamic(() => import("@/components/tools/PdfCropTool"), { ssr: false });
const PdfRedactTool = dynamic(() => import("@/components/tools/PdfRedactTool"), { ssr: false });

const prefetched = new Set<string>();

const EDITOR_MORE_TOOL_KEYS = new Set([
  "redact",
  "convert",
  "merge",
  "compress",
]);

function prefetchResource(
  href: string,
  as?: string,
  opts?: {
    rel?: "prefetch" | "preload";
    priority?: "low" | "high" | "auto";
  }
) {
  if (!href) return;
  if (!href.startsWith("/pdfeditor/")) return;
  if (prefetched.has(href)) return;
  prefetched.add(href);

  const link = document.createElement("link");
  link.rel = opts?.rel ?? "prefetch";
  link.href = href;
  if (as) link.as = as;
  link.setAttribute("fetchpriority", opts?.priority ?? "low");
  document.head.appendChild(link);
}

async function prefetchPdfEditor(signal?: AbortSignal) {
  prefetchResource("/pdfeditor/assets/js/pdfjs/pdf.worker.min.js", "script", { rel: "preload", priority: "high" });

  const res = await fetch("/pdfeditor/index.html", { signal }).catch(() => null);
  if (!res?.ok) return;
  const html = await res.text().catch(() => "");
  if (!html) return;

  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const el of Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'))) {
    const href = el.getAttribute("href");
    if (href) prefetchResource(href, "style", { rel: "preload", priority: "high" });
  }
  for (const el of Array.from(doc.querySelectorAll<HTMLScriptElement>("script[src]"))) {
    const src = el.getAttribute("src");
    if (src) prefetchResource(src, "script", { rel: "preload", priority: "high" });
  }
}

export interface UnifiedToolPageProps {
  /** Guest mode: shows login prompts, uses query param URLs */
  isGuest?: boolean;
  /** UI variant for editor layout (guest vs tools shell) */
  editorUiVariant?: "guest" | "tool";
  /** Tool key from route param (logged-in mode) */
  toolKey?: string;
  /** Chosen tool from query param (guest mode) */
  chosenTool?: string | null;
  /** Document ID from query param (guest mode) */
  documentId?: string | null;
  /** Upload ID from query param (logged-in mode) */
  uploadId?: string | null;
}

export default function UnifiedToolPage({
  isGuest = false,
  editorUiVariant,
  toolKey: propToolKey,
  chosenTool,
  documentId,
  uploadId,
}: UnifiedToolPageProps) {
  const router = useRouter();
  const { t } = useLanguage();

  // Determine tool key based on mode
  const toolKey = useMemo(() => {
    if (isGuest && chosenTool) {
      return toolKeyFromChosenTool(chosenTool);
    }
    return propToolKey ?? "annotate";
  }, [isGuest, chosenTool, propToolKey]);

  const displayToolKey = useMemo(() => {
    if (isGuest && chosenTool) {
      return displayToolKeyFromChosenTool(chosenTool, toolKey);
    }
    return toolKey;
  }, [isGuest, chosenTool, toolKey]);

  const tool = toolByKey[displayToolKey] ?? toolByKey.annotate;
  const isPdfEditor = toolKey === "annotate" || toolKey === "edit";
  const uiVariant = editorUiVariant ?? (isGuest ? "guest" : "tool");
  const useGuestUi = uiVariant === "guest";

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(Boolean(isGuest && documentId));
  const [missing, setMissing] = useState(false);
  const [storageWritable, setStorageWritable] = useState<boolean | null>(null);
  const [resumeInput, setResumeInput] = useState<File | null>(null);
  const [resumeOutput, setResumeOutput] = useState<File | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);

  const isMulti = toolKey === "merge" || toolKey === "convert";
  const accept = useMemo(() => {
    if (toolKey === "merge") return ".pdf,application/pdf";
    if (toolKey === "convert") return ".pdf,application/pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt";
    return ".pdf,application/pdf";
  }, [toolKey]);

  // Navigation helper for guest mode
  const goGuest = useCallback(
    (nextChosenTool: string, nextDocumentId?: string) => {
      if (!nextDocumentId) {
        router.replace("/edit");
        return;
      }
      const base = `/edit/${encodeURIComponent(nextDocumentId)}`;
      const next =
        nextChosenTool === "edit-pdf" ? base : `${base}/${encodeURIComponent(nextChosenTool)}`;
      router.replace(next);
    },
    [router]
  );

  // Check IndexedDB writability (logged-in mode)
  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    void isIndexedDbWritable()
      .then((ok) => {
        if (cancelled) return;
        setStorageWritable(ok);
      })
      .catch(() => {
        if (cancelled) return;
        setStorageWritable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isGuest]);

  // Prefetch PDF editor resources
  useEffect(() => {
    if (!isPdfEditor) return;
    const controller = new AbortController();
    let idleHandle: number | null = null;
    let usedIdleCallback = false;

    const schedule = () => {
      const w = window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
        cancelIdleCallback?: (handle: number) => void;
      };
      if (typeof w.requestIdleCallback === "function") {
        idleHandle = w.requestIdleCallback(() => void prefetchPdfEditor(controller.signal), { timeout: 2500 });
        usedIdleCallback = true;
        return;
      }
      idleHandle = window.setTimeout(() => void prefetchPdfEditor(controller.signal), 200);
    };

    schedule();
    return () => {
      controller.abort();
      if (idleHandle !== null) {
        if (usedIdleCallback) {
          const w = window as unknown as { cancelIdleCallback?: (handle: number) => void };
          w.cancelIdleCallback?.(idleHandle);
        } else {
          window.clearTimeout(idleHandle);
        }
      }
    };
  }, [isPdfEditor]);

  // Load files from upload store (logged-in mode)
  useEffect(() => {
    if (isGuest || !uploadId) return;
    const run = async () => {
      const loaded = await loadUpload(uploadId);
      if (loaded && loaded.length > 0) setFiles(loaded);
      void deleteUpload(uploadId).catch(() => {});
    };
    void run();
  }, [isGuest, uploadId]);

  // Load files from guest document store (guest mode)
  useEffect(() => {
    if (!isGuest || !documentId) {
      if (isGuest) {
        setFiles([]);
        setMissing(false);
        setLoading(false);
      }
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const loaded = await loadGuestDocument(documentId);
      if (cancelled) return;
      if (!loaded) {
        setFiles([]);
        setMissing(true);
        setLoading(false);
        return;
      }
      setFiles(loaded.files);
      setMissing(false);
      setLoading(false);
      await updateGuestDocumentTool(documentId, toolKey).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [isGuest, documentId, toolKey]);

  // Load resume state (logged-in mode only)
  useEffect(() => {
    if (isGuest) return;
    if (toolKey !== "annotate" && toolKey !== "edit") {
      setResumeInput(null);
      setResumeOutput(null);
      return;
    }

    let cancelled = false;
    setResumeBusy(true);
    void (async () => {
      const [input, output] = await Promise.all([
        loadPdfEditorInput().catch(() => null),
        loadPdfEditorOutput().catch(() => null),
      ]);
      if (cancelled) return;
      setResumeInput(input);
      setResumeOutput(output);
    })().finally(() => {
      if (!cancelled) setResumeBusy(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isGuest, toolKey]);

  const reset = useCallback(() => setFiles([]), []);

  const clearResume = useCallback(async () => {
    try {
      await clearPdfEditorCache();
    } finally {
      setResumeInput(null);
      setResumeOutput(null);
    }
  }, []);

  // File handler for guest mode
  const onFilesGuest = useCallback(
    async (nextFiles: File[]) => {
      if (!nextFiles.length) return;
      if (!documentId) {
        const id = await createGuestDocument(toolKey, nextFiles);
        setFiles(nextFiles);
        goGuest(chosenToolFromToolKey(toolKey), id);
        return;
      }
      await updateGuestDocumentFiles(documentId, nextFiles).catch(() => {});
      setFiles(nextFiles);
    },
    [documentId, goGuest, toolKey]
  );

  // Tool switch handler for guest mode
  const onSwitchToolGuest = useCallback(
    (nextChosenTool: string) => {
      const nextKey = toolKeyFromChosenTool(nextChosenTool);
      if (documentId) void updateGuestDocumentTool(documentId, nextKey).catch(() => {});
      goGuest(nextChosenTool, documentId ?? undefined);
    },
    [documentId, goGuest]
  );

  const handleEditorToolShortcut = useCallback(
    (nextToolKey: string) => {
      if (!EDITOR_MORE_TOOL_KEYS.has(nextToolKey)) return;
      const toolDef = toolByKey[nextToolKey];
      if (!toolDef) return;
      if (isGuest) {
        onSwitchToolGuest(chosenToolFromToolKey(toolDef.key));
        return;
      }
      router.push(toolDef.href);
    },
    [isGuest, onSwitchToolGuest, router]
  );

  // Related tools (logged-in mode only)
  const relatedTools = useMemo(() => {
    if (isGuest) return [];
    return TOOLS.filter(t => t.key !== toolKey).slice(0, 6);
  }, [isGuest, toolKey]);

  const showEditor = isGuest ? Boolean(documentId && files.length > 0) : files.length > 0;
  const editorFile = files[0] ?? null;

  // Render tool component
  const renderTool = () => {
    if (toolKey === "annotate" || toolKey === "edit") {
      return (
        <PdfEditorTool
          file={files[0]!}
          onBack={isGuest ? () => goGuest(chosenToolFromToolKey(toolKey)) : reset}
          onReplaceFile={(next) => isGuest ? void onFilesGuest([next]) : setFiles([next])}
          variant={isGuest ? "shell" : undefined}
          showChangeFile={isGuest ? false : undefined}
          initialTool={isGuest ? pdfEditorInitialTool(chosenTool) : undefined}
          showBrand={isGuest ? true : undefined}
          onOpenTool={handleEditorToolShortcut}
          actionsPosition={isGuest ? "top-right" : undefined}
        />
      );
    }
    if (toolKey === "sign") return <PdfSignTool initialFile={files[0]!} />;
    if (toolKey === "compress") return <PdfCompressTool initialFile={files[0]!} />;
    if (toolKey === "merge") return <PdfMergeTool initialFiles={files} />;
    if (toolKey === "convert") return <PdfConvertTool initialFiles={files} />;
    if (toolKey === "split") return <PdfSplitTool initialFile={files[0]!} />;
    if (toolKey === "organize" || toolKey === "rotate") return <PdfOrganizeTool initialFile={files[0]!} />;
    if (toolKey === "delete") return <PdfDeletePagesTool initialFile={files[0]!} onExit={reset} />;
    if (toolKey === "watermark") return <PdfWatermarkTool initialFile={files[0]!} />;
    if (toolKey === "password") return <PdfPasswordTool initialFile={files[0]!} />;
    if (toolKey === "unlock") return <PdfUnlockTool initialFile={files[0]!} />;
    if (toolKey === "crop") return <PdfCropTool initialFile={files[0]!} />;
    if (toolKey === "redact") return <PdfRedactTool initialFile={files[0]!} />;

    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">
              {t("comingSoon", "Coming soon")}
            </h3>
            <p className="text-sm text-[color:var(--brand-muted)] mt-1">
              {t(
                "toolNotImplemented",
                "This tool is not implemented yet. Try Annotate, Sign, Convert, Merge, or Compress."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)]"
          >
            {t("chooseAnotherFile", "Choose another file")}
          </button>
        </div>
      </div>
    );
  };

  // Guest mode header
  const guestHeader = useGuestUi && (!showEditor || !isPdfEditor) ? (
    <header className="sticky top-0 z-40 bg-white border-b border-[color:var(--brand-line)]">
      <div className="h-16 sm:h-20 md:h-24 px-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="QwerPDF" width={982} height={167} className="h-5 sm:h-6 md:h-7 w-auto" />
        </Link>
        <div className="flex-1 min-w-0">
          {showEditor && editorFile ? (
            <p className="text-sm font-medium text-[color:var(--brand-ink)] truncate">{editorFile.name}</p>
          ) : (
            <p className="text-sm font-medium text-[color:var(--brand-ink)] truncate">
              {t("uploadDocument", "Upload Document")}
            </p>
          )}
        </div>
        <Link href="/app/sign-in" className="text-sm px-3 py-2 rounded-lg bg-primary text-white hover:bg-[color:var(--brand-purple-dark)] hidden sm:inline">
          {t("continueWithGoogle", "Continue with Google")}
        </Link>
      </div>
    </header>
  ) : null;

  return (
    <main
      className={
        useGuestUi
          ? "min-h-screen bg-white"
          : isPdfEditor && files.length > 0
            ? "py-4 sm:py-6"
            : "py-6 sm:py-8 md:py-12"
      }
    >
      {guestHeader}

      <div className={
        useGuestUi
          ? (showEditor && isPdfEditor ? "p-0" : showEditor ? "py-3 sm:py-4 px-2 md:px-4 lg:px-6" : "py-8 sm:py-12 px-4")
          : (isPdfEditor && files.length > 0 ? "w-full px-2 md:px-4 lg:px-6" : "container mx-auto px-4 md:px-6 lg:px-8")
      }>
        {/* Tool Header - only when not showing editor */}
        {!showEditor && !useGuestUi && (
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[color:var(--brand-lilac)] text-primary flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm">
              <ToolIcon name={tool.iconName} className="w-8 h-8 stroke-[2px]" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[color:var(--brand-ink)] mb-3 sm:mb-4">
              {t(tool.nameKey, tool.name)}
            </h1>
            <p className="text-[color:var(--brand-muted)] text-base sm:text-lg">
              {t(tool.descriptionKey, tool.description)}
            </p>
            {tool.status === "comingSoon" && (
              <div className="mt-4 inline-flex text-xs px-3 py-1 rounded-full bg-[color:var(--brand-cream)] text-[color:var(--brand-ink)]">
                {t("comingSoon", "Coming soon")}
              </div>
            )}
            <div className="mt-4">
              <Link href="/" className="text-sm text-[color:var(--brand-muted)] hover:text-primary transition-colors inline-flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                {t("allTools", "All Tools")}
              </Link>
            </div>
          </div>
        )}

        {/* Tool Header - guest mode */}
        {!useGuestUi ? null : !documentId && (
          <div className="max-w-2xl mx-auto text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[color:var(--brand-ink)] mb-3">
              {t(tool.nameKey, tool.name)}
            </h1>
            <p className="text-[color:var(--brand-muted)] text-base sm:text-lg">
              {t(tool.descriptionKey, tool.description)}
            </p>
          </div>
        )}

        {/* Storage warning - logged-in mode only */}
        {!isGuest && storageWritable === false && (
          <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">{t("limitedBrowserStorage", "Limited browser storage")}</p>
            <p className="mt-1">
              {t(
                "limitedBrowserStorageDesc",
                "Your file will still open and process normally in this tab, but we can't save it for later. This often happens in Private Browsing. If you refresh or close this page, you may need to upload the file again."
              )}
            </p>
          </div>
        )}

        {/* Missing document warning - guest mode */}
        {isGuest && missing && (
          <div className="max-w-2xl mx-auto mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t(
              "guestDocMissing",
              "This document isn't available on this device anymore. Upload a file to start again."
            )}
          </div>
        )}

        {/* Loading state - guest mode */}
        {isGuest && documentId && loading && files.length === 0 ? (
          <div className="max-w-3xl mx-auto">
            <div className="h-[70vh] rounded-2xl border border-[color:var(--brand-line)] bg-[color:var(--brand-cream)] animate-pulse" />
          </div>
        ) : !showEditor ? (
          <>
            {/* Resume section - logged-in mode only */}
            {!isGuest && (toolKey === "annotate" || toolKey === "edit") && (resumeBusy || resumeInput || resumeOutput) && (
              <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-5 sm:p-6 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">
                      {t("continueWhereLeftOff", "Continue where you left off")}
                    </h3>
                    <p className="text-sm text-[color:var(--brand-muted)] mt-1">
                      {resumeBusy
                        ? t("checkingBrowserCache", "Checking your browser cache…")
                        : t(
                          "resumeFromCache",
                          "Your PDF stays on your device. You can resume from the last file you opened or saved."
                        )}
                    </p>
                  </div>
                  {(resumeInput || resumeOutput) && (
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)]"
                      onClick={() => void clearResume()}
                    >
                      {t("clearCache", "Clear cache")}
                    </button>
                  )}
                </div>

                {!resumeBusy && (resumeInput || resumeOutput) && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    {resumeOutput && (
                      <button
                        type="button"
                        className="h-11 px-4 rounded-xl bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium"
                        onClick={() => setFiles([resumeOutput])}
                      >
                        {t("resumeLastSaved", "Resume last saved PDF")}
                      </button>
                    )}
                    {resumeInput && (
                      <button
                        type="button"
                        className="h-11 px-4 rounded-xl border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] font-medium"
                        onClick={() => setFiles([resumeInput])}
                      >
                        {t("resumeLastOpened", "Resume last opened PDF")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="max-w-3xl mx-auto">
              <FileDropzone
                accept={accept}
                multiple={isMulti}
                onFiles={isGuest ? (f) => void onFilesGuest(f) : setFiles}
                title={isMulti ? t("dropFilesHere", "Drop files here") : t("dropFileHere", "Drop your file here")}
                subtitle={toolKey === "merge"
                  ? t("mergeSelectMultiple", "Select 2 or more PDFs")
                  : t("dropzoneSupportedFormats", "Supported: PDF and common formats")}
              />
            </div>
          </>
        ) : (
          <div className={isPdfEditor ? "w-full" : "max-w-6xl mx-auto"}>
            {renderTool()}
          </div>
        )}

        {/* Related Tools Section - logged-in mode only */}
        {!isGuest && files.length === 0 && relatedTools.length > 0 && (
          <div className="mt-20 max-w-5xl mx-auto">
            <h2 className="text-xl font-semibold text-[color:var(--brand-ink)] mb-6 text-center">
              {t("otherPdfTools", "Other PDF Tools")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {relatedTools.map((relatedTool) => (
                <Link
                  key={relatedTool.key}
                  href={relatedTool.href}
                  className="flex flex-col items-center p-3 sm:p-4 bg-white rounded-xl border border-[color:var(--brand-line)] hover:shadow-md hover:border-[color:var(--brand-line)] transition-[border-color,box-shadow] group"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[color:var(--brand-lilac)] text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <ToolIcon name={relatedTool.iconName} className="w-5 h-5 stroke-[2px]" />
                  </div>
                  <span className="text-xs font-medium text-[color:var(--brand-ink)] text-center group-hover:text-primary transition-colors">
                    {t(relatedTool.nameKey, relatedTool.name)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
