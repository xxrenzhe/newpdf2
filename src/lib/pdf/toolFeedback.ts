"use client";

import { toast } from "sonner";

const PASSWORD_HINT =
  "This PDF seems password protected. Please unlock it first and then try again.";
const CORRUPT_FILE_HINT =
  "This file may be damaged, encrypted, or in an unsupported PDF format.";

export function toUserFriendlyPdfError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return fallback;

  const lower = message.toLowerCase();
  if (lower.includes("password") || lower.includes("encrypted")) {
    return PASSWORD_HINT;
  }
  if (
    lower.includes("invalid pdf") ||
    lower.includes("malformed") ||
    lower.includes("corrupt") ||
    lower.includes("unexpected eof")
  ) {
    return CORRUPT_FILE_HINT;
  }

  return message;
}

export function notifyPdfToolError(error: unknown, fallback: string) {
  const message = toUserFriendlyPdfError(error, fallback);
  toast.error(message);
  return message;
}
