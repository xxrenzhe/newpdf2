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

      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
        {/* Title */}
        <div className="text-center max-w-4xl mx-auto mb-10 md:mb-14">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 md:mb-6 leading-tight">
            All-in-One Online PDF Editor
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Easily edit, convert and sign PDFs. Fast, simple and secure.
          </p>
        </div>

        {/* Upload Card */}
        <div className="max-w-3xl mx-auto">
          <div
            className={`bg-white rounded-2xl border-2 border-dashed ${
              isDragging ? "border-[#2d85de] bg-blue-50/50" : "border-[#2d85de]/30"
            } p-8 md:p-12 transition-all duration-200`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center text-center">
              {/* Upload Icon */}
              <div className="mb-6 relative">
                <img
                  src="https://ext.same-assets.com/170935311/3566732435.svg"
                  alt="Upload"
                  className="w-16 h-16 md:w-20 md:h-20"
                />
              </div>

              {/* Drop text */}
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
                Drop your file here
              </h3>

              {/* Browse button */}
              <label className="mb-4">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp,.txt"
                  onChange={handleFileSelect}
                />
                <Button className="bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium px-10 py-3 h-12 rounded-lg text-base">
                  Browse files
                </Button>
              </label>

              {/* File size info */}
              <p className="text-sm text-gray-500 max-w-md">
                Up to 100 MB for PDF and up to 20 MB for DOC, DOCX, PPT, PPTX, XLS, XLSX, BMP, JPG, JPEG, GIF, PNG, or TXT
              </p>
            </div>
          </div>

          {/* Cloud upload options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <button className="cloud-btn justify-center" type="button" disabled title="Coming soon">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.076 0 10.545-4.268 10.545-10.545 0-.707-.082-1.391-.235-2.055l-10.31-.161z" fill="#4285F4"/>
                <path d="M3.545 7.59l3.167 2.323c.792-2.283 2.887-3.913 5.378-3.913 1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2c-3.79 0-7.08 2.137-8.74 5.271l-.26.319z" fill="#EA4335"/>
                <path d="M12.545 24c2.653 0 4.922-.853 6.572-2.318l-3.033-2.491c-.85.569-1.943.904-3.223.904-2.798 0-5.18-1.873-6.032-4.397l-3.174 2.45C5.348 21.326 8.656 24 12.545 24z" fill="#34A853"/>
                <path d="M22.09 10.639H12.545v3.821h5.445c-.236.818-.658 1.506-1.186 2.055l3.033 2.491c1.788-1.653 2.817-4.086 2.817-6.915 0-.707-.082-1.391-.235-2.055l-.329.603z" fill="#FBBC05"/>
              </svg>
              <span className="text-gray-700 font-medium text-sm">Upload from Google Drive</span>
            </button>
            <button className="cloud-btn justify-center" type="button" disabled title="Coming soon">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0061FF">
                <path d="M12 2L6 6.5l6 4.5 6-4.5L12 2zM6 11.5L0 16l6 4.5 6-4.5-6-4.5zm12 0l-6 4.5 6 4.5 6-4.5-6-4.5zM12 14l-6 4.5L12 23l6-4.5L12 14z"/>
              </svg>
              <span className="text-gray-700 font-medium text-sm">Upload from Dropbox</span>
            </button>
            <button className="cloud-btn justify-center" type="button" disabled title="Coming soon">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0078D4">
                <path d="M10.5 2.5H2.5v9h8v-9zm11 0h-8v9h8v-9zm-11 11h-8v9h8v-9zm11 0h-8v9h8v-9z"/>
              </svg>
              <span className="text-gray-700 font-medium text-sm">Upload from OneDrive</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
