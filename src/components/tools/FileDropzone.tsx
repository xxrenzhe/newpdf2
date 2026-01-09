"use client";

import { useCallback, useRef, useState } from "react";

type FileDropzoneProps = {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  onFiles: (files: File[]) => void;
  title?: string;
  subtitle?: string;
};

export default function FileDropzone({
  accept,
  multiple,
  maxFiles,
  onFiles,
  title = "Drop your file here",
  subtitle = "Or choose a file from your computer",
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const emitFiles = useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list);
      const limited = typeof maxFiles === "number" ? files.slice(0, maxFiles) : files;
      if (limited.length > 0) onFiles(limited);
    },
    [maxFiles, onFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      emitFiles(e.dataTransfer.files);
    },
    [emitFiles]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      emitFiles(e.target.files);
      e.target.value = "";
    },
    [emitFiles]
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={`bg-white rounded-2xl border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? "border-[#2d85de] bg-blue-50/50 scale-[1.02] shadow-lg"
            : "border-[#2d85de]/30 hover:border-[#2d85de]/50"
        } p-10 md:p-12`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center text-center">
          {/* Upload Icon */}
          <div className={`mb-6 transition-transform duration-300 ${isDragging ? "scale-110" : ""}`}>
            <img
              src="https://ext.same-assets.com/170935311/3566732435.svg"
              alt="Upload"
              className="w-16 h-16 md:w-20 md:h-20"
            />
          </div>

          <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 mb-6">{subtitle}</p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium px-10 py-3 rounded-lg transition-all duration-200 hover:shadow-lg btn-press"
          >
            Browse files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={onChange}
            className="hidden"
          />

          {/* File size info */}
          <p className="text-xs text-gray-400 mt-6 max-w-sm">
            Up to 100 MB for PDF and up to 20 MB for DOC, DOCX, PPT, PPTX, XLS, XLSX, BMP, JPG, JPEG, GIF, PNG, or TXT
          </p>
        </div>
      </div>

      {/* Cloud upload options (disabled) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <button className="cloud-btn justify-center opacity-50 cursor-not-allowed" type="button" disabled title="Coming soon">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.076 0 10.545-4.268 10.545-10.545 0-.707-.082-1.391-.235-2.055l-10.31-.161z" fill="#4285F4"/>
          </svg>
          <span className="text-gray-500 font-medium text-sm">Google Drive</span>
        </button>
        <button className="cloud-btn justify-center opacity-50 cursor-not-allowed" type="button" disabled title="Coming soon">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0061FF">
            <path d="M12 2L6 6.5l6 4.5 6-4.5L12 2zM6 11.5L0 16l6 4.5 6-4.5-6-4.5zm12 0l-6 4.5 6 4.5 6-4.5-6-4.5zM12 14l-6 4.5L12 23l6-4.5L12 14z"/>
          </svg>
          <span className="text-gray-500 font-medium text-sm">Dropbox</span>
        </button>
        <button className="cloud-btn justify-center opacity-50 cursor-not-allowed" type="button" disabled title="Coming soon">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0078D4">
            <path d="M10.5 2.5H2.5v9h8v-9zm11 0h-8v9h8v-9zm-11 11h-8v9h8v-9zm11 0h-8v9h8v-9z"/>
          </svg>
          <span className="text-gray-500 font-medium text-sm">OneDrive</span>
        </button>
      </div>
    </div>
  );
}

