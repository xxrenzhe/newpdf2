"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page } from "react-pdf";
import dynamic from "next/dynamic";
import AnnotationToolbar from "./AnnotationToolbar";
import type { AnnotationTool } from "./PDFAnnotationCanvas";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { configurePdfJsWorker } from "@/lib/pdf/pdfjs";
import { applyAnnotationOverlays, downloadBlob } from "@/lib/pdf/client";

// Dynamically import annotation canvas
const PDFAnnotationCanvas = dynamic(() => import("./PDFAnnotationCanvas"), {
  ssr: false,
});

interface PDFEditorProps {
  file: File | string;
  fileName: string;
  onSave?: (annotatedPdf: Blob) => void;
  onClose?: () => void;
}

export default function PDFEditor({ file, fileName, onSave, onClose }: PDFEditorProps) {
  configurePdfJsWorker();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [pageDimensions, setPageDimensions] = useState({ width: 612, height: 792 });

  // Annotation state
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [activeColor, setActiveColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [annotations, setAnnotations] = useState<Record<number, string>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  }, []);

  const onPageLoadSuccess = useCallback((page: { width: number; height: number }) => {
    setPageDimensions({ width: page.width, height: page.height });
  }, []);

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages));
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1);

  const handleAnnotationsChange = useCallback((annotationJson: string) => {
    setAnnotations((prev) => ({
      ...prev,
      [pageNumber]: annotationJson,
    }));
  }, [pageNumber]);

  const handleClearAnnotations = useCallback(() => {
    setAnnotations((prev) => {
      const newAnnotations = { ...prev };
      delete newAnnotations[pageNumber];
      return newAnnotations;
    });
  }, [pageNumber]);

  const handleExport = useCallback(async () => {
    if (!(file instanceof File)) return null;
    const hasAny = Object.values(annotations).some((v) => v && v !== "{}");
    if (!hasAny) return new Uint8Array(await file.arrayBuffer());
    return applyAnnotationOverlays(file, annotations, pageDimensions);
  }, [annotations, file, pageDimensions]);

  const handleDownload = useCallback(async () => {
    if (!(file instanceof File)) return;
    const bytes = await handleExport();
    if (!bytes) return;
    downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), fileName || "document.pdf");
  }, [file, fileName, handleExport]);

  const handleSave = useCallback(async () => {
    if (!(file instanceof File)) return;
    const bytes = await handleExport();
    if (!bytes) return;
    onSave?.(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }));
  }, [file, handleExport, onSave]);

  const viewWidth = pageDimensions.width * scale;
  const viewHeight = pageDimensions.height * scale;

  return (
    <div className="flex h-full bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Annotation Toolbar */}
      <AnnotationToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        strokeWidth={strokeWidth}
        onToolChange={setActiveTool}
        onColorChange={setActiveColor}
        onStrokeWidthChange={setStrokeWidth}
        onClear={handleClearAnnotations}
      />

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#d53b3b] rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">PDF</span>
              </div>
              <span className="font-medium text-gray-900 truncate max-w-[200px]">
                {fileName}
              </span>
            </div>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-sm text-gray-600 min-w-[80px] text-center">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              title="Zoom Out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <button
              onClick={resetZoom}
              className="text-sm text-gray-600 min-w-[50px] text-center hover:bg-gray-200 px-2 py-1 rounded"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              title="Zoom In"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-[#2d85de] hover:bg-[#2473c4] text-white rounded-lg font-medium text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save
            </button>
          </div>
        </div>

        {/* PDF Viewer with Annotation Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-200 flex items-start justify-center p-8"
        >
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d85de]" />
            </div>
          )}

          <div className="bg-white shadow-lg" style={{ width: viewWidth, height: viewHeight }}>
            <div
              className="relative origin-top-left"
              style={{
                width: pageDimensions.width,
                height: pageDimensions.height,
                transform: `scale(${scale})`,
              }}
            >
              <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={null}>
                <Page
                  pageNumber={pageNumber}
                  scale={1}
                  onLoadSuccess={onPageLoadSuccess}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>

              <div className="absolute inset-0" style={{ width: pageDimensions.width, height: pageDimensions.height }}>
                <PDFAnnotationCanvas
                  key={pageNumber}
                  width={pageDimensions.width}
                  height={pageDimensions.height}
                  activeTool={activeTool}
                  activeColor={activeColor}
                  strokeWidth={strokeWidth}
                  initialAnnotationsJson={annotations[pageNumber]}
                  onAnnotationsChange={handleAnnotationsChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>
              Tool: <span className="font-medium text-gray-700 capitalize">{activeTool}</span>
            </span>
            <span>
              Color: <span className="inline-block w-3 h-3 rounded-full align-middle ml-1" style={{ backgroundColor: activeColor }} />
            </span>
          </div>
          <div>
            {Object.keys(annotations).length > 0 && (
              <span className="text-green-600">
                Annotations on {Object.keys(annotations).length} page(s)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
