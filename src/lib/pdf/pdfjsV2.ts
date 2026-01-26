"use client";

import * as pdfjs from "pdfjs-dist-v2/legacy/build/pdf";

let configured = false;

export function configurePdfJsWorkerV2() {
  if (configured) return;
  configured = true;

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist-v2/legacy/build/pdf.worker.min.js",
    import.meta.url
  ).toString();
}

export { pdfjs };
