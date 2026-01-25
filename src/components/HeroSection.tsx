"use client";

import { useRef, useState, useCallback, useId, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createGuestDocument } from "@/lib/guestDocumentStore";
import { toolKeyFromChosenTool } from "@/lib/filesEditorCompat";
import { useLanguage } from "@/components/LanguageProvider";

export default function HeroSection() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    router.prefetch("/edit");
  }, [router]);

  const openWithFiles = useCallback(async (files: FileList | File[]) => {
    if (isPreparing) return;
    setUploadError(null);
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const first = fileArray[0];
    const name = first.name.toLowerCase();
    const isPdf = first.type === "application/pdf" || name.endsWith(".pdf");
    const isImage = first.type.startsWith("image/") || /\.(png|jpg|jpeg|gif|bmp|webp)$/.test(name);
    const chosenTool = isPdf ? "edit-pdf" : isImage ? "convert" : "convert";
    const toolKey = toolKeyFromChosenTool(chosenTool);
    try {
      setIsPreparing(true);
      const documentId = await createGuestDocument(toolKey, fileArray);
      const base = `/edit/${encodeURIComponent(documentId)}`;
      const target = chosenTool === "edit-pdf" ? base : `${base}/${encodeURIComponent(chosenTool)}`;
      startTransition(() => {
        router.push(target);
      });
    } catch (err) {
      console.error("Failed to create guest document", err);
      setIsPreparing(false);
      setUploadError(
        t(
          "uploadErrorFallback",
          "Could not start the editor in this browser. Please try Chrome or disable Private Browsing."
        )
      );
    }
  }, [isPreparing, router, startTransition, t]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isPreparing) return;
    setIsDragging(true);
  }, [isPreparing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isPreparing) return;
    setIsDragging(false);
    void openWithFiles(e.dataTransfer.files);
  }, [isPreparing, openWithFiles]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isPreparing) return;
      if (!e.target.files || e.target.files.length === 0) return;
      void openWithFiles(e.target.files);
      e.target.value = "";
    },
    [isPreparing, openWithFiles]
  );

  const isBusy = isPreparing || isPending;

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-pink -z-10" />

      {/* Blur effects */}
      <div className="blur-blue top-10 left-10 opacity-60" />
      <div className="blur-pink bottom-20 right-20 opacity-50" />
      <div className="absolute -top-24 right-10 h-48 w-48 rounded-full bg-[color:var(--brand-peach)] opacity-70 blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20 lg:py-28">
        {/* Title */}
        <div className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-[color:var(--brand-ink)] mb-6 leading-tight tracking-tight">
            {t("heroTitle", "All-in-One Online PDF Editor")}
          </h1>
          <p className="text-xl md:text-2xl text-[color:var(--brand-muted)] max-w-2xl mx-auto leading-relaxed">
            {t("heroSubtitle", "Easily edit, convert and sign PDFs. Fast, simple and secure.")}
          </p>
        </div>

        {/* Upload Card */}
        <div className="max-w-3xl mx-auto">
          <div
            aria-busy={isBusy}
            className={`bg-white/90 rounded-3xl border-2 border-dashed shadow-xl ${
              isDragging && !isBusy
                ? "border-primary bg-[color:rgba(242,236,255,0.4)] scale-[1.02]"
                : "border-[color:var(--brand-line)] hover:border-primary/50"
            } ${isBusy ? "pointer-events-none opacity-80" : ""} p-10 md:p-14 transition-all duration-300`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center text-center">
              {/* Upload Icon */}
              <div className={`mb-8 transition-transform duration-300 ${isDragging ? "scale-110" : ""}`}>
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-[color:var(--brand-lilac)] flex items-center justify-center">
                  <svg className="w-12 h-12 md:w-14 md:h-14 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
              </div>

              {/* Drop text */}
              <h3 className="text-2xl md:text-3xl font-bold text-[color:var(--brand-ink)] mb-3">
                {t("dropFileHere", "Drop your file here")}
              </h3>
              <p className="text-lg text-[color:var(--brand-muted)] mb-8">
                {t("browseFilesHint", "or click to browse from your computer")}
              </p>

              {/* Browse button */}
              <div className="mb-6">
                <input
                  id={fileInputId}
                  type="file"
                  className="sr-only"
                  aria-hidden="true"
                  tabIndex={-1}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp,.txt"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  disabled={isBusy}
                />
                {isBusy ? (
                  <div className="inline-flex items-center justify-center gap-3 bg-[color:var(--brand-cream)] text-[color:var(--brand-ink)] font-semibold px-12 py-4 h-14 rounded-xl text-lg">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{t("loadingPleaseWait", "Loading, please wait...")}</span>
                  </div>
                ) : (
                  <Button
                    asChild
                    className="bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-semibold px-12 py-4 h-14 rounded-xl text-lg shadow-lg shadow-[rgba(91,75,183,0.25)] hover:shadow-[rgba(91,75,183,0.35)] transition-all duration-300"
                  >
                    <label
                      htmlFor={fileInputId}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }}
                    >
                      {t("browseFiles", "Browse files")}
                    </label>
                  </Button>
                )}
              </div>

              {/* File size info */}
              <p className="text-base text-[color:var(--brand-muted)] max-w-lg">
                {t(
                  "uploadLimit",
                  "Up to 100 MB for PDF and up to 20 MB for DOC, DOCX, PPT, PPTX, XLS, XLSX, BMP, JPG, JPEG, GIF, PNG, or TXT"
                )}
              </p>
              {uploadError ? (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {uploadError}
                </p>
              ) : null}
            </div>
          </div>

          {/* Cloud upload options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <button className="flex items-center justify-center gap-3 bg-white/80 rounded-xl px-6 py-4 border-2 border-[color:var(--brand-line)] hover:border-[color:rgba(91,75,183,0.4)] hover:shadow-md transition-all duration-300 opacity-60 cursor-not-allowed" type="button" disabled title={t("comingSoon", "Coming soon")}>
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.076 0 10.545-4.268 10.545-10.545 0-.707-.082-1.391-.235-2.055l-10.31-.161z" fill="#4285F4"/>
              </svg>
              <span className="text-[color:var(--brand-muted)] font-medium">
                {t("uploadFromGoogleDrive", "Upload from Google Drive")}
              </span>
            </button>
            <button className="flex items-center justify-center gap-3 bg-white/80 rounded-xl px-6 py-4 border-2 border-[color:var(--brand-line)] hover:border-[color:rgba(91,75,183,0.4)] hover:shadow-md transition-all duration-300 opacity-60 cursor-not-allowed" type="button" disabled title={t("comingSoon", "Coming soon")}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0061FF">
                <path d="M12 2L6 6.5l6 4.5 6-4.5L12 2zM6 11.5L0 16l6 4.5 6-4.5-6-4.5zm12 0l-6 4.5 6 4.5 6-4.5-6-4.5zM12 14l-6 4.5L12 23l6-4.5L12 14z"/>
              </svg>
              <span className="text-[color:var(--brand-muted)] font-medium">
                {t("uploadFromDropbox", "Upload from Dropbox")}
              </span>
            </button>
            <button className="flex items-center justify-center gap-3 bg-white/80 rounded-xl px-6 py-4 border-2 border-[color:var(--brand-line)] hover:border-[color:rgba(91,75,183,0.4)] hover:shadow-md transition-all duration-300 opacity-60 cursor-not-allowed" type="button" disabled title={t("comingSoon", "Coming soon")}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0078D4">
                <path d="M10.5 2.5H2.5v9h8v-9zm11 0h-8v9h8v-9zm-11 11h-8v9h8v-9zm11 0h-8v9h8v-9z"/>
              </svg>
              <span className="text-[color:var(--brand-muted)] font-medium">
                {t("uploadFromOneDrive", "Upload from OneDrive")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
