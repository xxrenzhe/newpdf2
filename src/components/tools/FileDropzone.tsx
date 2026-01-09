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
        className={`bg-white rounded-2xl border-2 border-dashed ${
          isDragging ? "border-[#2d85de] bg-blue-50/50" : "border-[#2d85de]/30"
        } p-12 transition-all duration-200`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center text-center">
          <img
            src="https://ext.same-assets.com/170935311/3566732435.svg"
            alt="Upload"
            className="w-16 h-16 mb-6"
          />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 mb-6">{subtitle}</p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium px-10 py-3 rounded-lg transition-colors"
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
        </div>
      </div>
    </div>
  );
}

