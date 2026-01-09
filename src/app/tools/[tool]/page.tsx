"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d85de]" />
    </div>
  ),
});

const toolsData: Record<string, { title: string; description: string; icon: string }> = {
  annotate: {
    title: "Annotate PDF",
    description: "Add text, images, shapes, drawings, sticky notes, highlight and more to your PDF documents.",
    icon: "https://ext.same-assets.com/170935311/1101188712.svg",
  },
  edit: {
    title: "Edit PDF",
    description: "Edit your PDF by removing, editing, or adding text and changing fonts, colors, and more.",
    icon: "https://ext.same-assets.com/170935311/4207141155.svg",
  },
  sign: {
    title: "Sign PDF",
    description: "Apply your signature, add initials, dates, checkboxes and more to your PDF documents.",
    icon: "https://ext.same-assets.com/170935311/1168656911.svg",
  },
  convert: {
    title: "Convert Document",
    description: "Easily convert files to PDF, Word, Excel, and more formats.",
    icon: "https://ext.same-assets.com/170935311/201416504.svg",
  },
  merge: {
    title: "Merge Documents",
    description: "Combine PDFs in any order with our merger tool.",
    icon: "https://ext.same-assets.com/170935311/2061392550.svg",
  },
  compress: {
    title: "Compress PDF",
    description: "Reduce file size while optimizing for maximal PDF quality.",
    icon: "https://ext.same-assets.com/170935311/3220459703.svg",
  },
  redact: {
    title: "Redact PDF",
    description: "Permanently remove sensitive information from your PDF.",
    icon: "https://ext.same-assets.com/170935311/611706699.svg",
  },
  organize: {
    title: "Organize Pages",
    description: "Sort your PDF pages as you like. Delete or add pages as needed.",
    icon: "https://ext.same-assets.com/170935311/3060953847.svg",
  },
  split: {
    title: "Split & Extract Pages",
    description: "Split and extract PDF pages to create separate files.",
    icon: "https://ext.same-assets.com/170935311/1662545404.svg",
  },
  password: {
    title: "Password Protect",
    description: "Secure your PDFs by adding a password.",
    icon: "https://ext.same-assets.com/170935311/227026812.svg",
  },
  unlock: {
    title: "Unlock PDF",
    description: "Remove PDF passwords for full access and flexibility.",
    icon: "https://ext.same-assets.com/170935311/458112585.svg",
  },
  watermark: {
    title: "Add Watermark",
    description: "Add a watermark or text as protection to your PDF files.",
    icon: "https://ext.same-assets.com/170935311/3638955808.svg",
  },
  rotate: {
    title: "Rotate Pages",
    description: "Rotate your PDFs pages in portrait or landscape mode.",
    icon: "https://ext.same-assets.com/170935311/1224187398.svg",
  },
  delete: {
    title: "Delete Pages",
    description: "Remove one or multiple pages from your PDF.",
    icon: "https://ext.same-assets.com/170935311/4053557687.svg",
  },
  crop: {
    title: "Crop Pages",
    description: "Crop and trim your documents with our PDF cropper.",
    icon: "https://ext.same-assets.com/170935311/1066455525.svg",
  },
};

export default function ToolPage() {
  const params = useParams();
  const toolKey = params.tool as string;
  const tool = toolsData[toolKey] || toolsData.annotate;

  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setUploadedFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-pink">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="https://ext.same-assets.com/170935311/3497447819.svg"
                alt="Files Editor"
                className="h-8"
              />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/sign-in">
                <Button variant="outline" className="border-gray-200 text-gray-700">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button className="bg-[#2d85de] hover:bg-[#2473c4] text-white">
                  Sign up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {/* Tool Header */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
              <img src={tool.icon} alt="" className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {tool.title}
            </h1>
            <p className="text-gray-600">
              {tool.description}
            </p>
          </div>

          {/* Upload Area */}
          {!uploadedFile ? (
            <div className="max-w-2xl mx-auto">
              <div
                className={`bg-white rounded-2xl border-2 border-dashed ${
                  isDragging ? "border-[#2d85de] bg-blue-50/50" : "border-[#2d85de]/30"
                } p-12 transition-all duration-200`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center text-center">
                  <img
                    src="https://ext.same-assets.com/170935311/3566732435.svg"
                    alt="Upload"
                    className="w-16 h-16 mb-6"
                  />
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Drop your file here
                  </h3>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="inline-flex items-center justify-center bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium px-10 py-3 rounded-lg transition-colors cursor-pointer">
                      Browse files
                    </span>
                  </label>
                  <p className="text-sm text-gray-500 mt-4 max-w-md">
                    Up to 100 MB for PDF and up to 20 MB for DOC, DOCX, PPT, PPTX, XLS, XLSX, BMP, JPG, JPEG, GIF, PNG, or TXT
                  </p>
                </div>
              </div>

              {/* Cloud upload options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <button className="cloud-btn justify-center">
                  <img src="https://ext.same-assets.com/170935311/437873749.svg" alt="Google Drive" className="w-6 h-6" />
                  <span className="text-gray-700 font-medium text-sm">Upload from Google Drive</span>
                </button>
                <button className="cloud-btn justify-center">
                  <img src="https://ext.same-assets.com/170935311/1099840161.svg" alt="Dropbox" className="w-6 h-6" />
                  <span className="text-gray-700 font-medium text-sm">Upload from Dropbox</span>
                </button>
                <button className="cloud-btn justify-center">
                  <img src="https://ext.same-assets.com/170935311/2987597602.svg" alt="OneDrive" className="w-6 h-6" />
                  <span className="text-gray-700 font-medium text-sm">Upload from OneDrive</span>
                </button>
              </div>
            </div>
          ) : (
            /* Editor Interface */
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Editor Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="font-medium text-gray-900">{uploadedFile.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-gray-200">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </Button>
                    <Button className="bg-[#2d85de] hover:bg-[#2473c4] text-white">
                      Save Changes
                    </Button>
                  </div>
                </div>

                {/* Editor Body */}
                <div className="flex">
                  {/* Sidebar Tools */}
                  <div className="w-16 bg-gray-50 border-r border-gray-100 py-4 flex flex-col items-center gap-4">
                    <button className="w-10 h-10 rounded-lg bg-[#2d85de] text-white flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                    <button className="w-10 h-10 rounded-lg hover:bg-gray-200 text-gray-600 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                    <button className="w-10 h-10 rounded-lg hover:bg-gray-200 text-gray-600 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      </svg>
                    </button>
                    <button className="w-10 h-10 rounded-lg hover:bg-gray-200 text-gray-600 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <button className="w-10 h-10 rounded-lg hover:bg-gray-200 text-gray-600 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    </button>
                  </div>

                  {/* Document Preview */}
                  <div className="flex-1 min-h-[600px] bg-gray-100">
                    {uploadedFile.type === "application/pdf" ? (
                      <PDFViewer file={uploadedFile} />
                    ) : (
                      <div className="flex items-center justify-center h-full p-8">
                        <div className="bg-white shadow-lg rounded-lg w-full max-w-2xl aspect-[8.5/11] flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                              <polyline points="10 9 9 9 8 9" />
                            </svg>
                            <p className="font-medium">Document Preview</p>
                            <p className="text-sm mt-2">{uploadedFile.name}</p>
                            <p className="text-xs mt-1 text-gray-300">
                              PDF preview available for .pdf files
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Panel */}
                  <div className="w-64 bg-gray-50 border-l border-gray-100 p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Properties</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-500">File Name</label>
                        <p className="text-sm font-medium text-gray-900 truncate">{uploadedFile.name}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">File Size</label>
                        <p className="text-sm font-medium text-gray-900">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Type</label>
                        <p className="text-sm font-medium text-gray-900">{uploadedFile.type || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
