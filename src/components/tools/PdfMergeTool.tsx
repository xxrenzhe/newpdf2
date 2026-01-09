"use client";

import { useCallback, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import { mergePdfs, downloadBlob } from "@/lib/pdf/client";

export default function PdfMergeTool({ initialFiles }: { initialFiles?: File[] }) {
  const [files, setFiles] = useState<File[]>(initialFiles ?? []);
  const [busy, setBusy] = useState(false);
  const canMerge = files.length >= 2 && files.every((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));

  const totalSize = useMemo(() => files.reduce((acc, f) => acc + f.size, 0), [files]);

  const merge = useCallback(async () => {
    if (!canMerge) return;
    setBusy(true);
    try {
      const bytes = await mergePdfs(files);
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), "merged.pdf");
    } finally {
      setBusy(false);
    }
  }, [canMerge, files]);

  if (files.length === 0) {
    return (
      <FileDropzone
        accept=".pdf,application/pdf"
        multiple
        onFiles={setFiles}
        title="Drop PDFs here to merge"
        subtitle="Select 2 or more PDF files"
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Merge PDFs</h3>
          <p className="text-sm text-gray-500">
            {files.length} file(s) • {(totalSize / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiles([])}
            className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={!canMerge || busy}
            onClick={merge}
            className="px-4 py-2 rounded-lg bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium disabled:opacity-50"
          >
            {busy ? "Merging..." : "Merge & Download"}
          </button>
        </div>
      </div>

      {!canMerge && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          Please upload at least 2 PDF files.
        </div>
      )}

      <ul className="divide-y divide-gray-100">
        {files.map((f) => (
          <li key={`${f.name}-${f.lastModified}`} className="py-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{f.name}</p>
              <p className="text-xs text-gray-500">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
