"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { saveUpload } from "@/lib/uploadStore";

export default function HeroSection() {
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  const openWithFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    const id = await saveUpload(fileArray);

    const first = fileArray[0];
    const name = first.name.toLowerCase();
    const isPdf = first.type === "application/pdf" || name.endsWith(".pdf");
    const isImage = first.type.startsWith("image/") || /\.(png|jpg|jpeg|gif|bmp|webp)$/.test(name);
    const tool = isPdf ? "edit" : isImage ? "convert" : "convert";

    router.push(`/tools/${tool}?uploadId=${encodeURIComponent(id)}`);
  }, [router]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    void openWithFiles(e.dataTransfer.files);
  }, [openWithFiles]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      void openWithFiles(e.target.files);
      e.target.value = "";
    },
    [openWithFiles]
  );

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-pink -z-10" />

      {/* Blur effects */}
      <div className="blur-blue top-10 left-10 opacity-50" />
      <div className="blur-pink bottom-20 right-20 opacity-40" />

      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20 lg:py-28">
        {/* Title */}
        <div className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
            All-in-One Online PDF Editor
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Easily edit, convert and sign PDFs. Fast, simple and secure.
          </p>
        </div>

        {/* Upload Card */}
        <div className="max-w-3xl mx-auto">
          <div
            className={`bg-white rounded-3xl border-2 border-dashed shadow-xl ${
              isDragging
                ? "border-[#2d85de] bg-blue-50/50 scale-[1.02]"
                : "border-gray-300 hover:border-[#2d85de]/50"
            } p-10 md:p-14 transition-all duration-300`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center text-center">
              {/* Upload Icon */}
              <div className={`mb-8 transition-transform duration-300 ${isDragging ? "scale-110" : ""}`}>
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="w-12 h-12 md:w-14 md:h-14 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
              </div>

              {/* Drop text */}
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Drop your file here
              </h3>
              <p className="text-lg text-gray-500 mb-8">
                or click to browse from your computer
              </p>

              {/* Browse button */}
              <label className="mb-6 cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp,.txt"
                  onChange={handleFileSelect}
                />
                <Button className="bg-[#2d85de] hover:bg-[#2473c4] text-white font-semibold px-12 py-4 h-14 rounded-xl text-lg shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all duration-300">
                  Browse files
                </Button>
              </label>

              {/* File size info */}
              <p className="text-base text-gray-500 max-w-lg">
                Up to <span className="font-semibold text-gray-700">100 MB</span> for PDF and up to <span className="font-semibold text-gray-700">20 MB</span> for DOC, DOCX, PPT, PPTX, XLS, XLSX, images, or TXT
              </p>
            </div>
          </div>

          {/* Cloud upload options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <button className="flex items-center justify-center gap-3 bg-white rounded-xl px-6 py-4 border-2 border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300 opacity-60 cursor-not-allowed" type="button" disabled title="Coming soon">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.076 0 10.545-4.268 10.545-10.545 0-.707-.082-1.391-.235-2.055l-10.31-.161z" fill="#4285F4"/>
              </svg>
              <span className="text-gray-600 font-medium">Google Drive</span>
            </button>
            <button className="flex items-center justify-center gap-3 bg-white rounded-xl px-6 py-4 border-2 border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300 opacity-60 cursor-not-allowed" type="button" disabled title="Coming soon">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0061FF">
                <path d="M12 2L6 6.5l6 4.5 6-4.5L12 2zM6 11.5L0 16l6 4.5 6-4.5-6-4.5zm12 0l-6 4.5 6 4.5 6-4.5-6-4.5zM12 14l-6 4.5L12 23l6-4.5L12 14z"/>
              </svg>
              <span className="text-gray-600 font-medium">Dropbox</span>
            </button>
            <button className="flex items-center justify-center gap-3 bg-white rounded-xl px-6 py-4 border-2 border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300 opacity-60 cursor-not-allowed" type="button" disabled title="Coming soon">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0078D4">
                <path d="M10.5 2.5H2.5v9h8v-9zm11 0h-8v9h8v-9zm-11 11h-8v9h8v-9zm11 0h-8v9h8v-9z"/>
              </svg>
              <span className="text-gray-600 font-medium">OneDrive</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
