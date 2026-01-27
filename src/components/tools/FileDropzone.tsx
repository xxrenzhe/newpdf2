"use client";

import { useCallback, useId, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import CloudUploadOptions from "@/components/CloudUploadOptions";
import {
  validateFileType,
  validatePdfStructure,
  validateFileSize as validateFileSizeSecurity,
  type FileValidationResult,
  type PdfValidationResult,
} from "@/lib/security/fileValidation";

// 文件大小限制常量
const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100MB for PDF
const MAX_OTHER_SIZE = 20 * 1024 * 1024; // 20MB for other files

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFileSizeBasic(file: File, t: (key: string, fallback?: string) => string): { valid: boolean; error?: string } {
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

// 验证类型
type ValidationLevel = "basic" | "standard" | "strict";

interface FileValidationOptions {
  level?: ValidationLevel;
  validateMagicBytes?: boolean;
  validatePdfStructure?: boolean;
}

type FileDropzoneProps = {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // 自定义最大文件大小（可选）
  onFiles: (files: File[]) => void;
  title?: string;
  subtitle?: string;
  validation?: FileValidationOptions; // 新增：文件验证选项
};

export default function FileDropzone({
  accept,
  multiple,
  maxFiles,
  maxSize,
  onFiles,
  title,
  subtitle,
  validation = { level: "basic" }, // 默认使用 basic 级别，避免误报影响用户
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const { t } = useLanguage();
  const resolvedTitle = title ?? t("dropFileHere", "Drop your file here");
  const resolvedSubtitle = subtitle ?? t("dropzoneSubtitle", "Or choose a file from your computer");

  // 增强的文件验证函数
  const validateFile = useCallback(
    async (
      file: File
    ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. 基础大小验证
      if (maxSize) {
        if (file.size > maxSize) {
          errors.push(
            t("fileTooLarge", 'File "{name}" ({size}) exceeds the {limit} limit.')
              .replace("{name}", file.name)
              .replace("{size}", formatFileSize(file.size))
              .replace("{limit}", formatFileSize(maxSize))
          );
        }
      } else {
        const result = validateFileSizeBasic(file, t);
        if (!result.valid && result.error) {
          errors.push(result.error);
        }
      }

      // 2. 魔数验证 (standard 或 strict 级别)
      if (validation.level !== "basic" && validation.validateMagicBytes !== false) {
        try {
          const typeResult = await validateFileType(file);
          if (!typeResult.valid && typeResult.error) {
            if (validation.level === "strict") {
              errors.push(
                t("invalidFileType", 'File "{name}" has invalid content type.')
                  .replace("{name}", file.name) + ` (${typeResult.error})`
              );
            } else {
              warnings.push(`${file.name}: ${typeResult.error}`);
            }
          }
        } catch {
          // 验证失败不阻止上传
          warnings.push(`${file.name}: Unable to verify file type`);
        }
      }

      // 3. PDF 结构验证 (仅 PDF 文件)
      if (
        (validation.level === "strict" || validation.validatePdfStructure) &&
        (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
      ) {
        try {
          const pdfResult = await validatePdfStructure(file);
          if (!pdfResult.valid && pdfResult.error) {
            if (validation.level === "strict") {
              errors.push(
                t("invalidPdf", 'File "{name}" is not a valid PDF.')
                  .replace("{name}", file.name) + ` (${pdfResult.error})`
              );
            } else {
              warnings.push(`${file.name}: ${pdfResult.error}`);
            }
          }
        } catch {
          warnings.push(`${file.name}: Unable to verify PDF structure`);
        }
      }

      return { valid: errors.length === 0, errors, warnings };
    },
    [maxSize, t, validation]
  );

  const emitFiles = useCallback(
    async (list: FileList | File[]) => {
      const files = Array.from(list);
      const limited = typeof maxFiles === "number" ? files.slice(0, maxFiles) : files;

      setIsValidating(true);
      const allErrors: string[] = [];
      const allWarnings: string[] = [];
      const validFiles: File[] = [];

      // 并行验证所有文件
      const results = await Promise.all(limited.map((file) => validateFile(file)));

      for (let i = 0; i < limited.length; i++) {
        const file = limited[i]!;
        const result = results[i]!;

        if (result.valid) {
          validFiles.push(file);
        }
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
      }

      setIsValidating(false);

      // 显示错误
      if (allErrors.length > 0) {
        setError(allErrors.join(" "));
        setTimeout(() => setError(null), 5000);
      } else if (allWarnings.length > 0) {
        // 警告不阻止上传，但显示提示
        console.warn("File validation warnings:", allWarnings);
        setError(null);
      } else {
        setError(null);
      }

      if (validFiles.length > 0) onFiles(validFiles);
    },
    [maxFiles, onFiles, validateFile]
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
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in" role="status" aria-live="polite">
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
            aria-label={t("dismissError", "Dismiss error")}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div
        className={`bg-white rounded-2xl border-2 border-dashed transition-[border-color,background-color,transform,box-shadow] duration-300 ${
          isDragging
            ? "border-primary bg-[color:rgba(242,236,255,0.5)] scale-[1.02] shadow-lg"
            : "border-primary/30 hover:border-primary/50"
        } p-6 sm:p-8 md:p-10`}
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
              width={80}
              height={80}
              className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20"
            />
          </div>

          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-[color:var(--brand-ink)] mb-2">{resolvedTitle}</h3>
          <p className="text-sm sm:text-base text-[color:var(--brand-muted)] mb-6">{resolvedSubtitle}</p>

          {isValidating ? (
            <div className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-600 font-medium px-10 py-3 rounded-lg">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{t("validatingFiles", "Validating files…")}</span>
            </div>
          ) : (
            <label
            htmlFor={inputId}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              inputRef.current?.click();
            }}
            className="inline-flex items-center justify-center bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium px-6 sm:px-10 py-3 rounded-lg transition-[background-color,box-shadow,transform] duration-200 hover:shadow-lg btn-press w-full sm:w-auto text-sm sm:text-base"
          >
            Browse files
          </label>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            name="fileUpload"
            accept={accept}
            multiple={multiple}
            onChange={onChange}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />

          {/* File size info */}
          <p className="text-xs sm:text-sm text-[color:var(--brand-muted)] mt-6 max-w-sm">
            Up to 100 MB for PDF and up to 20 MB for DOC, DOCX, PPT, PPTX, XLS, XLSX, BMP, JPG, JPEG, GIF, PNG, or TXT
          </p>
        </div>
      </div>

      <CloudUploadOptions
        variant="dropzone"
        disabled={isValidating}
        multiple={multiple}
        onFiles={(files) => void emitFiles(files)}
        onError={(message) => {
          setError(message);
          setTimeout(() => setError(null), 5000);
        }}
      />
    </div>
  );
}
