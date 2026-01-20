"use client";

import dynamic from "next/dynamic";
import Link from "@/components/AppLink";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FileDropzone from "@/components/tools/FileDropzone";
import GuestQuotaBanner from "@/components/auth/GuestQuotaBanner";
import { toolByKey } from "@/lib/tools";
import { createGuestDocument, loadGuestDocument, updateGuestDocumentFiles, updateGuestDocumentTool } from "@/lib/guestDocumentStore";
import { chosenToolFromToolKey, displayToolKeyFromChosenTool, pdfEditorInitialTool, toolKeyFromChosenTool } from "@/lib/filesEditorCompat";

const PdfEditorTool = dynamic(() => import("@/features/pdf-editor/PdfEditorTool"), { ssr: false });
const PdfCompressTool = dynamic(() => import("@/components/tools/PdfCompressTool"), { ssr: false });
const PdfConvertTool = dynamic(() => import("@/components/tools/PdfConvertTool"), { ssr: false });
const PdfMergeTool = dynamic(() => import("@/components/tools/PdfMergeTool"), { ssr: false });
const PdfSplitTool = dynamic(() => import("@/components/tools/PdfSplitTool"), { ssr: false });
const PdfOrganizeTool = dynamic(() => import("@/components/tools/PdfOrganizeTool"), { ssr: false });
const PdfWatermarkTool = dynamic(() => import("@/components/tools/PdfWatermarkTool"), { ssr: false });
const PdfPasswordTool = dynamic(() => import("@/components/tools/PdfPasswordTool"), { ssr: false });
const PdfUnlockTool = dynamic(() => import("@/components/tools/PdfUnlockTool"), { ssr: false });
const PdfCropTool = dynamic(() => import("@/components/tools/PdfCropTool"), { ssr: false });
const PdfRedactTool = dynamic(() => import("@/components/tools/PdfRedactTool"), { ssr: false });

const TOOL_SWITCHER: { chosenTool: string; label: string }[] = [
  { chosenTool: "annotate", label: "Annotate" },
  { chosenTool: "edit-pdf", label: "Edit PDF" },
  { chosenTool: "sign", label: "Sign" },
  { chosenTool: "redact", label: "Redact" },
  { chosenTool: "watermark", label: "Watermark" },
  { chosenTool: "delete-pages", label: "Delete Pages" },
  { chosenTool: "convert", label: "Convert" },
  { chosenTool: "merge", label: "Merge" },
  { chosenTool: "compress", label: "Compress" },
];

export default function GuestDocumentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const documentId = searchParams.get("documentId");
  const chosenTool = searchParams.get("chosenTool");

  const toolKey = useMemo(() => toolKeyFromChosenTool(chosenTool), [chosenTool]);
  const displayToolKey = useMemo(() => displayToolKeyFromChosenTool(chosenTool, toolKey), [chosenTool, toolKey]);
  const toolDef = toolByKey[displayToolKey] ?? toolByKey.annotate;

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(Boolean(documentId));
  const [missing, setMissing] = useState(false);

  const accept = useMemo(() => {
    if (toolKey === "merge") return ".pdf,application/pdf";
    if (toolKey === "convert") return ".pdf,application/pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt";
    return ".pdf,application/pdf";
  }, [toolKey]);

  const isMulti = toolKey === "merge" || toolKey === "convert";

  const go = useCallback(
    (nextChosenTool: string, nextDocumentId?: string) => {
      const qs = new URLSearchParams();
      qs.set("chosenTool", nextChosenTool);
      if (nextDocumentId) qs.set("documentId", nextDocumentId);
      router.replace(`/app/guest/document?${qs.toString()}`);
    },
    [router]
  );

  useEffect(() => {
    if (!documentId) {
      setFiles([]);
      setMissing(false);
      setLoading(false);
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
  }, [documentId, toolKey]);

  const onFiles = useCallback(
    async (nextFiles: File[]) => {
      if (!nextFiles.length) return;
      if (!documentId) {
        const id = await createGuestDocument(toolKey, nextFiles);
        setFiles(nextFiles);
        go(chosenToolFromToolKey(toolKey), id);
        return;
      }
      await updateGuestDocumentFiles(documentId, nextFiles).catch(() => {});
      setFiles(nextFiles);
    },
    [documentId, go, toolKey]
  );

  const onSwitchTool = useCallback(
    (nextChosenTool: string) => {
      const nextKey = toolKeyFromChosenTool(nextChosenTool);
      if (documentId) void updateGuestDocumentTool(documentId, nextKey).catch(() => {});
      go(nextChosenTool, documentId ?? undefined);
    },
    [documentId, go]
  );

  const showEditor = Boolean(documentId && files.length > 0);
  const editorFile = files[0] ?? null;
  const isPdfEditor = toolKey === "annotate" || toolKey === "edit";

  const switcher = useMemo(() => {
    if (!documentId) return null;
    const activeChosenTool = chosenTool ?? chosenToolFromToolKey(toolKey);
    return (
      <div className="flex items-center gap-2 overflow-x-auto">
        {TOOL_SWITCHER.map((t) => {
          const active = activeChosenTool === t.chosenTool;
          return (
            <button
              key={t.chosenTool}
              type="button"
              onClick={() => onSwitchTool(t.chosenTool)}
              className={
                active
                  ? "shrink-0 px-3 py-2 rounded-lg bg-blue-50 text-[#2d85de] border border-blue-100 text-sm font-medium"
                  : "shrink-0 px-3 py-2 rounded-lg bg-white text-gray-700 border border-gray-200 text-sm hover:bg-gray-50"
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
    );
  }, [chosenTool, documentId, onSwitchTool, toolKey]);

  return (
    <main className="min-h-screen bg-white">
      {!showEditor || !isPdfEditor ? (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="h-14 px-4 flex items-center gap-3">
            <Link href="/en" className="flex items-center gap-2">
              <img src="/assets/brand/logo.svg" alt="Files Editor" className="h-7" />
            </Link>
            <div className="flex-1 min-w-0">
              {showEditor && editorFile ? (
                <p className="text-sm font-medium text-gray-900 truncate">{editorFile.name}</p>
              ) : (
                <p className="text-sm font-medium text-gray-900 truncate">Upload Document</p>
              )}
            </div>
            <Link href="/app/sign-in" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:inline">
              Sign in
            </Link>
            <Link href="/app/sign-in" className="text-sm px-3 py-2 rounded-lg bg-[#2d85de] text-white hover:bg-[#2473c4] hidden sm:inline">
              Continue with Google
            </Link>
          </div>
          {documentId ? <div className="px-3 py-2 border-t border-gray-100">{switcher}</div> : null}
        </header>
      ) : null}

      <div className={showEditor && isPdfEditor ? "p-0" : showEditor ? "py-4 px-2 md:px-4 lg:px-6" : "py-12 px-4"}>
        <div className={showEditor && isPdfEditor ? "p-4" : "max-w-3xl mx-auto"}>
          <GuestQuotaBanner />
        </div>
        {!documentId && (
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{toolDef.name}</h1>
            <p className="text-gray-600">{toolDef.description}</p>
          </div>
        )}

        {missing && (
          <div className="max-w-2xl mx-auto mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This document isn’t available on this device anymore. Upload a file to start again.
          </div>
        )}

        {documentId && loading && files.length === 0 ? (
          <div className="max-w-3xl mx-auto">
            <div className="h-[70vh] rounded-2xl border border-gray-100 bg-gray-50 animate-pulse" />
          </div>
        ) : !showEditor ? (
          <div className="max-w-3xl mx-auto">
            <FileDropzone
              accept={accept}
              multiple={isMulti}
              onFiles={(f) => void onFiles(f)}
              title="Drop your file here"
              subtitle="Supported: PDF and common formats"
            />
          </div>
        ) : (
          <div className="w-full">
            {toolKey === "annotate" || toolKey === "edit" ? (
              <PdfEditorTool
                file={files[0]!}
                onBack={() => go(chosenToolFromToolKey(toolKey))}
                onReplaceFile={(next) => void onFiles([next])}
                onConvert={() => onSwitchTool("convert")}
                variant="shell"
                showChangeFile={false}
                initialTool={pdfEditorInitialTool(chosenTool)}
                showBrand
                toolSwitcher={switcher}
                actionsPosition="top-right"
              />
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
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Tool not available</h2>
                <p className="text-sm text-gray-600">This tool isn’t implemented in the guest workspace yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
