"use client";

import { Toaster } from "sonner";

export default function GlobalToaster() {
  return (
    <Toaster
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        duration: 5000,
      }}
    />
  );
}
