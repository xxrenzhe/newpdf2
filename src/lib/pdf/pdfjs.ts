"use client";

import { pdfjs } from "react-pdf";

let configured = false;

export function configurePdfJsWorker() {
  if (configured) return;
  configured = true;

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

export { pdfjs };
