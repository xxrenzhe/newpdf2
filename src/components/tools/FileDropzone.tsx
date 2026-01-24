"use client";

import { useCallback, useId, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

// 文件大小限制常量
const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100MB for PDF
const MAX_OTHER_SIZE = 20 * 1024 * 1024; // 20MB for other files

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFileSize(file: File, t: (key: string, fallback?: string) => string): { valid: boolean; error?: string } {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const maxSize = isPdf ? MAX_PDF_SIZE : MAX_OTHER_SIZE;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: t(
        "fileTooLarge",
        'File "{name}" ({size}) exceeds the {limit} limit.'
      )
        .replace("{name}", file.name)
        .replace("{size}", formatFileSize(file.size))
        .replace("{limit}", isPdf ? "100MB" : "20MB"),
    };
  }
  return { valid: true };
}

type FileDropzoneProps = {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // 自定义最大文件大小（可选）
  onFiles: (files: File[]) => void;
  title?: string;
  subtitle?: string;
};

export default function FileDropzone({
  accept,
  multiple,
  maxFiles,
  maxSize,
  onFiles,
  title,
  subtitle,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const { t } = useLanguage();
  const resolvedTitle = title ?? t("dropFileHere", "Drop your file here");
  const resolvedSubtitle = subtitle ?? t("dropzoneSubtitle", "Or choose a file from your computer");

  const emitFiles = useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list);
      const limited = typeof maxFiles === "number" ? files.slice(0, maxFiles) : files;

      // 验证文件大小
      const errors: string[] = [];
      const validFiles: File[] = [];

      for (const file of limited) {
        // 如果提供了自定义 maxSize，使用它；否则使用默认验证
        if (maxSize) {
          if (file.size > maxSize) {
            errors.push(
              t(
                "fileTooLarge",
                'File "{name}" ({size}) exceeds the {limit} limit.'
              )
                .replace("{name}", file.name)
                .replace("{size}", formatFileSize(file.size))
                .replace("{limit}", formatFileSize(maxSize))
            );
          } else {
            validFiles.push(file);
          }
        } else {
          const result = validateFileSize(file, t);
          if (result.valid) {
            validFiles.push(file);
          } else if (result.error) {
            errors.push(result.error);
          }
        }
      }

      if (errors.length > 0) {
        setError(errors.join(" "));
        // 3秒后清除错误
        setTimeout(() => setError(null), 5000);
      } else {
        setError(null);
      }

      if (validFiles.length > 0) onFiles(validFiles);
    },
    [maxFiles, maxSize, onFiles, t]
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
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">File too large</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div
        className={`bg-white rounded-2xl border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? "border-primary bg-[color:rgba(242,236,255,0.5)] scale-[1.02] shadow-lg"
            : "border-primary/30 hover:border-primary/50"
        } p-10 md:p-12`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center text-center">
          {/* Upload Icon */}
          <div className={`mb-6 transition-transform duration-300 ${isDragging ? "scale-110" : ""}`}>
            <img
              src="/assets/icons/upload.svg"
              alt="Upload"
              className="w-16 h-16 md:w-20 md:h-20"
            />
          </div>

          <h3 className="text-xl md:text-2xl font-semibold text-[color:var(--brand-ink)] mb-2">{resolvedTitle}</h3>
          <p className="text-sm text-[color:var(--brand-muted)] mb-6">{resolvedSubtitle}</p>

          <label
            htmlFor={inputId}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              inputRef.current?.click();
            }}
            className="inline-flex items-center justify-center bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium px-10 py-3 rounded-lg transition-all duration-200 hover:shadow-lg btn-press"
          >
            Browse files
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={onChange}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />

          {/* File size info */}
          <p className="text-xs text-[color:var(--brand-muted)] mt-6 max-w-sm">
            Up to 100 MB for PDF and up to 20 MB for DOC, DOCX, PPT, PPTX, XLS, XLSX, BMP, JPG, JPEG, GIF, PNG, or TXT
          </p>
        </div>
      </div>

      {/* Cloud upload options (disabled) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <button className="cloud-btn justify-center opacity-50 cursor-not-allowed" type="button" disabled title={t("comingSoon", "Coming soon")}>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.076 0 10.545-4.268 10.545-10.545 0-.707-.082-1.391-.235-2.055l-10.31-.161z" fill="#4285F4"/>
          </svg>
          <span className="text-[color:var(--brand-muted)] font-medium text-sm">Google Drive</span>
        </button>
        <button className="cloud-btn justify-center opacity-50 cursor-not-allowed" type="button" disabled title={t("comingSoon", "Coming soon")}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0061FF">
            <path d="M12 2L6 6.5l6 4.5 6-4.5L12 2zM6 11.5L0 16l6 4.5 6-4.5-6-4.5zm12 0l-6 4.5 6 4.5 6-4.5-6-4.5zM12 14l-6 4.5L12 23l6-4.5L12 14z"/>
          </svg>
          <span className="text-[color:var(--brand-muted)] font-medium text-sm">Dropbox</span>
        </button>
        <button className="cloud-btn justify-center opacity-50 cursor-not-allowed" type="button" disabled title={t("comingSoon", "Coming soon")}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0078D4">
            <path d="M10.5 2.5H2.5v9h8v-9zm11 0h-8v9h8v-9zm-11 11h-8v9h8v-9zm11 0h-8v9h8v-9z"/>
          </svg>
          <span className="text-[color:var(--brand-muted)] font-medium text-sm">OneDrive</span>
        </button>
      </div>
    </div>
  );
}
