"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import FileDropzone from "@/components/tools/FileDropzone";
import { deleteUpload, loadUpload } from "@/lib/uploadStore";
import { toolByKey, TOOLS } from "@/lib/tools";
import { clearPdfEditorCache, loadPdfEditorInput, loadPdfEditorOutput } from "@/lib/pdfEditorCache";

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

function ToolContent() {
  const params = useParams();
  const toolKey = params.tool as string;
  const tool = toolByKey[toolKey] ?? toolByKey.annotate;
  const searchParams = useSearchParams();

  const [files, setFiles] = useState<File[]>([]);
  const [resumeInput, setResumeInput] = useState<File | null>(null);
  const [resumeOutput, setResumeOutput] = useState<File | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const uploadId = searchParams.get("uploadId");

  useEffect(() => {
    if (!uploadId) return;
    const run = async () => {
      const loaded = await loadUpload(uploadId);
      await deleteUpload(uploadId);
      if (loaded && loaded.length > 0) setFiles(loaded);
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
    <main className="py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {/* Tool Header */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <img src={tool.icon} alt="" className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {tool.name}
            </h1>
            <p className="text-gray-600 text-lg">
              {tool.description}
            </p>
            {tool.status === "comingSoon" && (
              <div className="mt-4 inline-flex text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                Coming soon
              </div>
            )}
            <div className="mt-6">
              <Link href="/" className="text-sm text-gray-600 hover:text-[#2d85de] transition-colors inline-flex items-center gap-1">
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

          {files.length === 0 ? (
            <>
              {(toolKey === "annotate" || toolKey === "edit") && (resumeBusy || resumeInput || resumeOutput) && (
                <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900">Continue where you left off</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {resumeBusy
                          ? "Checking your browser cache..."
                          : "Your PDF stays on your device. You can resume from the last file you opened or saved."}
                      </p>
                    </div>
                    {(resumeInput || resumeOutput) && (
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
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
                          className="h-11 px-4 rounded-xl bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium"
                          onClick={() => setFiles([resumeOutput])}
                        >
                          Resume last saved PDF
                        </button>
                      )}
                      {resumeInput && (
                        <button
                          type="button"
                          className="h-11 px-4 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
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
            <div className="max-w-6xl mx-auto">
              {toolKey === "annotate" || toolKey === "edit" ? (
                <PdfEditorTool file={files[0]!} onBack={reset} />
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
                <PdfDeletePagesTool initialFile={files[0]!} />
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
                <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Coming soon</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        This tool is not implemented yet. Try Annotate, Sign, Convert, Merge, or Compress.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={reset}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
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
              <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                Other PDF Tools
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {relatedTools.map((relatedTool) => (
                  <Link
                    key={relatedTool.key}
                    href={relatedTool.href}
                    className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <img src={relatedTool.icon} alt="" className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center group-hover:text-[#2d85de] transition-colors">
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
          <div className="w-16 h-16 rounded-2xl bg-gray-200 mx-auto mb-6 animate-pulse" />
          <div className="h-10 w-48 bg-gray-200 rounded mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-64 bg-gray-200 rounded mx-auto animate-pulse" />
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
