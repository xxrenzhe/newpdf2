"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import { downloadBlob } from "@/lib/pdf/client";

const PDFEditor = dynamic(() => import("@/components/PDFEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  ),
});

export default function PdfAnnotateEditTool({
  file,
  onBack,
}: {
  file: File;
  onBack: () => void;
}) {
  const onSave = useCallback(
    (annotatedPdf: Blob) => {
      downloadBlob(annotatedPdf, file.name.replace(/\.[^.]+$/, "") + "-edited.pdf");
    },
    [file.name]
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <PDFEditor file={file} fileName={file.name} onSave={onSave} onClose={onBack} />
    </div>
  );
}

