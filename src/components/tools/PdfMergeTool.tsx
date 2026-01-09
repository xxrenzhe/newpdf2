"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import FileDropzone from "./FileDropzone";
import { mergePdfs, downloadBlob } from "@/lib/pdf/client";

export default function PdfMergeTool({ initialFiles }: { initialFiles?: File[] }) {
  const [files, setFiles] = useState<File[]>(initialFiles ?? []);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const addMoreFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    setFiles(prev => [...prev, ...fileArray]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const moveFile = useCallback((from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    setFiles(prev => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(from, 1);
      newFiles.splice(to, 0, removed!);
      return newFiles;
    });
  }, [files.length]);

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
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Merge PDFs</h3>
          <p className="text-sm text-gray-500">
            {files.length} file(s) - {(totalSize / 1024 / 1024).toFixed(2)} MB total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add more
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={(e) => e.target.files && addMoreFiles(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => setFiles([])}
            className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      {!canMerge && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Please upload at least 2 PDF files.
        </div>
      )}

      <div className="space-y-2 mb-6">
        {files.map((f, index) => (
          <div
            key={`${f.name}-${f.lastModified}`}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group hover:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-[#d53b3b] text-[10px] font-bold">PDF</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 text-sm truncate">{f.name}</p>
              <p className="text-xs text-gray-500">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => moveFile(index, index - 1)}
                disabled={index === 0}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
              >
                <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveFile(index, index + 1)}
                disabled={index === files.length - 1}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
              >
                <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="p-1.5 rounded-lg hover:bg-red-50"
                title="Remove"
              >
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <span className="text-xs text-gray-400 w-6 text-center">{index + 1}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!canMerge || busy}
        onClick={merge}
        className="w-full h-12 rounded-xl bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <svg className="w-5 h-5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7-7H1m22 0h-4m-2.636-7.364l-2.828 2.828m-5.072 5.072l-2.828 2.828m12.728 0l-2.828-2.828M6.464 6.464L3.636 3.636" />
            </svg>
            Merging...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            Merge & Download
          </>
        )}
      </button>
    </div>
  );
}
