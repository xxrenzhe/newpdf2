"use client";

import { useEffect, useRef } from "react";
import { configurePdfJsWorkerV2, pdfjs } from "@/lib/pdf/pdfjsV2";

type PdfRedactPreviewProps = {
  file: File;
  pageNumber: number;
  onDocumentLoadSuccess: ({ numPages }: { numPages: number }) => void;
  onPageLoadSuccess: (page: { width: number; height: number }) => void;
};

export default function PdfRedactPreview({
  file,
  pageNumber,
  onDocumentLoadSuccess,
  onPageLoadSuccess,
}: PdfRedactPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastFileKeyRef = useRef<string>("");

  useEffect(() => {
    let canceled = false;
    let loadingTask: { promise: Promise<pdfjs.PDFDocumentProxy>; destroy?: () => Promise<void> } | null = null;
    let renderTask: { cancel?: () => void; promise?: Promise<void> } | null = null;
    let docProxy: { destroy?: () => Promise<void> } | null = null;

    const render = async () => {
      configurePdfJsWorkerV2();
      const data = new Uint8Array(await file.arrayBuffer());
      if (canceled) return;

      loadingTask = pdfjs.getDocument({
        data,
        disableWorker: true,
      } as unknown as Parameters<typeof pdfjs.getDocument>[0]) as {
        promise: Promise<pdfjs.PDFDocumentProxy>;
        destroy?: () => Promise<void>;
      };
      const doc = await loadingTask.promise;
      docProxy = doc as { destroy?: () => Promise<void> };
      if (canceled) return;

      const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
      if (lastFileKeyRef.current !== fileKey) {
        lastFileKeyRef.current = fileKey;
        onDocumentLoadSuccess({ numPages: doc.numPages });
      }

      const targetPage = Math.min(Math.max(pageNumber, 1), Math.max(1, doc.numPages));
      const page = await doc.getPage(targetPage);
      if (canceled) return;

      const viewport = page.getViewport({ scale: 1 });
      onPageLoadSuccess({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas 2D context unavailable");

      renderTask = page.render({
        canvasContext: context,
        canvas,
        viewport,
      }) as unknown as { cancel?: () => void; promise?: Promise<void> };
      await renderTask.promise;

      (page as { cleanup?: () => void }).cleanup?.();
    };

    void render().catch(() => {
      // Keep tool shell alive if preview render fails; export path has its own PDF renderer.
    });

    return () => {
      canceled = true;
      renderTask?.cancel?.();
      void loadingTask?.destroy?.();
      void docProxy?.destroy?.();
    };
  }, [file, pageNumber, onDocumentLoadSuccess, onPageLoadSuccess]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
