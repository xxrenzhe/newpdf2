/// <reference lib="webworker" />

type MergeWorkerRequest = {
  type: "merge";
  jobId: number;
  files: { name: string; bytes: ArrayBuffer }[];
};

type MergeWorkerProgress = {
  type: "merge-progress";
  jobId: number;
  current: number;
  total: number;
};

type MergeWorkerResult = {
  type: "merge-result";
  jobId: number;
  bytes: ArrayBuffer;
};

type MergeWorkerError = {
  type: "merge-error";
  jobId: number;
  message: string;
};

let pdfLibPromise: Promise<typeof import("pdf-lib")> | null = null;

function isMergeWorkerRequest(value: unknown): value is MergeWorkerRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  if (payload.type !== "merge" || typeof payload.jobId !== "number" || !Array.isArray(payload.files)) return false;
  return payload.files.every((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return typeof record.name === "string" && record.bytes instanceof ArrayBuffer;
  });
}

async function loadPdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = import("pdf-lib");
  }
  return pdfLibPromise;
}

function postProgress(message: MergeWorkerProgress) {
  self.postMessage(message);
}

function postResult(message: MergeWorkerResult) {
  self.postMessage(message, [message.bytes]);
}

function postError(message: MergeWorkerError) {
  self.postMessage(message);
}

async function handleMergeRequest(request: MergeWorkerRequest) {
  const { PDFDocument } = await loadPdfLib();
  const merged = await PDFDocument.create();
  const total = request.files.length;

  for (let index = 0; index < total; index++) {
    const sourceFile = request.files[index];
    const doc = await PDFDocument.load(sourceFile.bytes);
    const copiedPages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of copiedPages) {
      merged.addPage(page);
    }
    postProgress({
      type: "merge-progress",
      jobId: request.jobId,
      current: index + 1,
      total,
    });
  }

  const bytes = await merged.save();
  const transfer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  postResult({
    type: "merge-result",
    jobId: request.jobId,
    bytes: transfer,
  });
}

self.onmessage = (evt: MessageEvent<unknown>) => {
  if (!isMergeWorkerRequest(evt.data)) return;
  const request = evt.data;
  void handleMergeRequest(request).catch((error: unknown) => {
    const message = error instanceof Error && error.message ? error.message : "Failed to merge PDFs";
    postError({
      type: "merge-error",
      jobId: request.jobId,
      message,
    });
  });
};

export {};
