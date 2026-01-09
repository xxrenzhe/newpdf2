"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import FileDropzone from "@/components/tools/FileDropzone";
import { deleteUpload, loadUpload } from "@/lib/uploadStore";
import { toolByKey, TOOLS } from "@/lib/tools";

const PdfAnnotateEditTool = dynamic(() => import("@/components/tools/PdfAnnotateEditTool"), { ssr: false });
const PdfCompressTool = dynamic(() => import("@/components/tools/PdfCompressTool"), { ssr: false });
const PdfConvertTool = dynamic(() => import("@/components/tools/PdfConvertTool"), { ssr: false });
const PdfMergeTool = dynamic(() => import("@/components/tools/PdfMergeTool"), { ssr: false });
const PdfSignTool = dynamic(() => import("@/components/tools/PdfSignTool"), { ssr: false });
const PdfSplitTool = dynamic(() => import("@/components/tools/PdfSplitTool"), { ssr: false });
const PdfOrganizeTool = dynamic(() => import("@/components/tools/PdfOrganizeTool"), { ssr: false });
const PdfWatermarkTool = dynamic(() => import("@/components/tools/PdfWatermarkTool"), { ssr: false });
const PdfPasswordTool = dynamic(() => import("@/components/tools/PdfPasswordTool"), { ssr: false });
const PdfUnlockTool = dynamic(() => import("@/components/tools/PdfUnlockTool"), { ssr: false });
const PdfCropTool = dynamic(() => import("@/components/tools/PdfCropTool"), { ssr: false });
const PdfRedactTool = dynamic(() => import("@/components/tools/PdfRedactTool"), { ssr: false });

export default function ToolPage() {
  const params = useParams();
  const toolKey = params.tool as string;
  const tool = toolByKey[toolKey] ?? toolByKey.annotate;
  const searchParams = useSearchParams();

  const [files, setFiles] = useState<File[]>([]);
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
    <main className="min-h-screen bg-gradient-pink">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="https://ext.same-assets.com/170935311/3497447819.svg"
                alt="Files Editor"
                className="h-8"
              />
            </Link>
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-[#2d85de] transition-colors flex items-center gap-1"
            >
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
      </header>

      <section className="py-12 md:py-20">
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
          </div>

          {files.length === 0 ? (
            <FileDropzone
              accept={accept}
              multiple={isMulti}
              onFiles={setFiles}
              title={isMulti ? "Drop files here" : "Drop your file here"}
              subtitle={toolKey === "merge" ? "Select 2 or more PDFs" : "Supported: PDF and common formats"}
            />
          ) : (
            <div className="max-w-6xl mx-auto">
              {toolKey === "annotate" || toolKey === "edit" ? (
                <PdfAnnotateEditTool file={files[0]!} onBack={reset} />
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
              ) : toolKey === "organize" || toolKey === "rotate" || toolKey === "delete" ? (
                <PdfOrganizeTool initialFile={files[0]!} />
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
      </section>

      {/* Simple Footer */}
      <footer className="py-8 border-t border-gray-100 bg-white/50">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="https://ext.same-assets.com/170935311/3497447819.svg"
                alt="Files Editor"
                className="h-6"
              />
            </Link>
            <p className="text-sm text-gray-500">
              All-in-one PDF solutions
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
