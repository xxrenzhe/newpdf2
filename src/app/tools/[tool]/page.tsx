"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "@/components/AppLink";
import dynamic from "next/dynamic";
import FileDropzone from "@/components/tools/FileDropzone";
import { deleteUpload, loadUpload } from "@/lib/uploadStore";
import { toolByKey, TOOLS } from "@/lib/tools";
import { clearPdfEditorCache, loadPdfEditorInput, loadPdfEditorOutput } from "@/lib/pdfEditorCache";
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
  // Preload the worker script used by PDF.js for faster first render.
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

function ToolContent() {
  const params = useParams();
  const toolKey = params.tool as string;
  const tool = toolByKey[toolKey] ?? toolByKey.annotate;
  const searchParams = useSearchParams();
  const isPdfEditor = toolKey === "annotate" || toolKey === "edit";

  const [files, setFiles] = useState<File[]>([]);
  const [storageWritable, setStorageWritable] = useState<boolean | null>(null);
  const [resumeInput, setResumeInput] = useState<File | null>(null);
  const [resumeOutput, setResumeOutput] = useState<File | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const uploadId = searchParams.get("uploadId");

  useEffect(() => {
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
  }, []);

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

  useEffect(() => {
    if (!uploadId) return;
    const run = async () => {
      const loaded = await loadUpload(uploadId);
      if (loaded && loaded.length > 0) setFiles(loaded);
      void deleteUpload(uploadId).catch(() => {});
    };
    void run();
  }, [uploadId]);

  const reset = useCallback(() => setFiles([]), []);
  const clearResume = useCallback(async () => {
    try {
      await clearPdfEditorCache();
    } finally {
      setResumeInput(null);
      setResumeOutput(null);
    }
  }, []);

  useEffect(() => {
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
  }, [toolKey]);

  const isMulti = toolKey === "merge" || toolKey === "convert";
  const accept = useMemo(() => {
    if (toolKey === "merge") return ".pdf,application/pdf";
    if (toolKey === "convert") return ".pdf,application/pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt";
    if (toolKey === "sign" || toolKey === "compress" || toolKey === "redact" || toolKey === "organize" || toolKey === "split" || toolKey === "password" || toolKey === "unlock" || toolKey === "watermark" || toolKey === "rotate" || toolKey === "delete" || toolKey === "crop") {
      return ".pdf,application/pdf";
    }
    return ".pdf,application/pdf";
  }, [toolKey]);

  // Get related tools (excluding current)
  const relatedTools = useMemo(() => {
    return TOOLS.filter(t => t.key !== toolKey).slice(0, 6);
  }, [toolKey]);

  return (
    <main className={isPdfEditor && files.length > 0 ? "py-4 md:py-6" : "py-12 md:py-20"}>
        <div className={isPdfEditor && files.length > 0 ? "w-full px-2 md:px-4 lg:px-6" : "container mx-auto px-4 md:px-6 lg:px-8"}>
          {/* Tool Header */}
          {!(isPdfEditor && files.length > 0) && (
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="w-16 h-16 rounded-2xl bg-[color:var(--brand-lilac)] text-primary flex items-center justify-center mx-auto mb-6 shadow-sm">
              <ToolIcon name={tool.iconName} className="w-8 h-8 stroke-[2px]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[color:var(--brand-ink)] mb-4">
              {tool.name}
            </h1>
            <p className="text-[color:var(--brand-muted)] text-lg">
              {tool.description}
            </p>
            {tool.status === "comingSoon" && (
              <div className="mt-4 inline-flex text-xs px-3 py-1 rounded-full bg-[color:var(--brand-cream)] text-[color:var(--brand-ink)]">
                Coming soon
              </div>
            )}
            <div className="mt-6">
              <Link href="/" className="text-sm text-[color:var(--brand-muted)] hover:text-primary transition-colors inline-flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                All Tools
              </Link>
            </div>
          </div>
          )}

          {storageWritable === false && (
            <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Limited browser storage</p>
              <p className="mt-1">
                Your file will still open and process normally in this tab, but we can’t save it for later. This often
                happens in Private Browsing. If you refresh or close this page, you may need to upload the file again.
              </p>
            </div>
          )}

          {files.length === 0 ? (
            <>
              {(toolKey === "annotate" || toolKey === "edit") && (resumeBusy || resumeInput || resumeOutput) && (
                <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6 mb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">Continue where you left off</h3>
                      <p className="text-sm text-[color:var(--brand-muted)] mt-1">
                        {resumeBusy
                          ? "Checking your browser cache..."
                          : "Your PDF stays on your device. You can resume from the last file you opened or saved."}
                      </p>
                    </div>
                    {(resumeInput || resumeOutput) && (
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)]"
                        onClick={() => void clearResume()}
                      >
                        Clear cache
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
                          Resume last saved PDF
                        </button>
                      )}
                      {resumeInput && (
                        <button
                          type="button"
                          className="h-11 px-4 rounded-xl border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] font-medium"
                          onClick={() => setFiles([resumeInput])}
                        >
                          Resume last opened PDF
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <FileDropzone
                accept={accept}
                multiple={isMulti}
                onFiles={setFiles}
                title={isMulti ? "Drop files here" : "Drop your file here"}
                subtitle={toolKey === "merge" ? "Select 2 or more PDFs" : "Supported: PDF and common formats"}
              />
            </>
          ) : (
            <div className={isPdfEditor ? "w-full" : "max-w-6xl mx-auto"}>
              {toolKey === "annotate" || toolKey === "edit" ? (
                <PdfEditorTool file={files[0]!} onBack={reset} onReplaceFile={(next) => setFiles([next])} />
              ) : toolKey === "sign" ? (
                <PdfSignTool initialFile={files[0]!} />
              ) : toolKey === "compress" ? (
                <PdfCompressTool initialFile={files[0]!} />
              ) : toolKey === "merge" ? (
                <PdfMergeTool initialFiles={files} />
              ) : toolKey === "convert" ? (
                <PdfConvertTool initialFiles={files} />
              ) : toolKey === "split" ? (
                <PdfSplitTool initialFile={files[0]!} />
              ) : toolKey === "organize" || toolKey === "rotate" ? (
                <PdfOrganizeTool initialFile={files[0]!} />
              ) : toolKey === "delete" ? (
                <PdfDeletePagesTool initialFile={files[0]!} onExit={reset} />
              ) : toolKey === "watermark" ? (
                <PdfWatermarkTool initialFile={files[0]!} />
              ) : toolKey === "password" ? (
                <PdfPasswordTool initialFile={files[0]!} />
              ) : toolKey === "unlock" ? (
                <PdfUnlockTool initialFile={files[0]!} />
              ) : toolKey === "crop" ? (
                <PdfCropTool initialFile={files[0]!} />
              ) : toolKey === "redact" ? (
                <PdfRedactTool initialFile={files[0]!} />
              ) : (
                <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">Coming soon</h3>
                      <p className="text-sm text-[color:var(--brand-muted)] mt-1">
                        This tool is not implemented yet. Try Annotate, Sign, Convert, Merge, or Compress.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={reset}
                      className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)]"
                    >
                      Choose another file
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Related Tools Section */}
          {files.length === 0 && (
            <div className="mt-20 max-w-5xl mx-auto">
              <h2 className="text-xl font-semibold text-[color:var(--brand-ink)] mb-6 text-center">
                Other PDF Tools
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {relatedTools.map((relatedTool) => (
                  <Link
                    key={relatedTool.key}
                    href={relatedTool.href}
                    className="flex flex-col items-center p-4 bg-white rounded-xl border border-[color:var(--brand-line)] hover:shadow-md hover:border-[color:var(--brand-line)] transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[color:var(--brand-lilac)] text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <ToolIcon name={relatedTool.iconName} className="w-5 h-5 stroke-[2px]" />
                    </div>
                    <span className="text-xs font-medium text-[color:var(--brand-ink)] text-center group-hover:text-primary transition-colors">
                      {relatedTool.name}
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

// Loading fallback component
function ToolPageLoading() {
  return (
    <main className="py-12 md:py-20">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[color:var(--brand-line)] mx-auto mb-6 animate-pulse" />
          <div className="h-10 w-48 bg-[color:var(--brand-line)] rounded mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-64 bg-[color:var(--brand-line)] rounded mx-auto animate-pulse" />
        </div>
      </div>
    </main>
  );
}

export default function ToolPage() {
  return (
    <Suspense fallback={<ToolPageLoading />}>
      <ToolContent />
    </Suspense>
  );
}
