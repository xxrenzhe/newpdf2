"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { saveUpload } from "@/lib/uploadStore";
import { pickDropboxFiles, pickGoogleDriveFiles, pickOneDriveFiles, type CloudProvider } from "@/lib/cloud/pickers";

type PickerState =
  | { status: "idle" }
  | { status: "running"; message: string }
  | { status: "error"; message: string }
  | { status: "done" };

async function pick(provider: CloudProvider, multiple: boolean): Promise<File[]> {
  const opts = { multiple };
  if (provider === "google-drive") return await pickGoogleDriveFiles(opts);
  if (provider === "dropbox") return await pickDropboxFiles(opts);
  return await pickOneDriveFiles(opts);
}

export default function CloudPickerClient({
  provider,
  channel,
  multiple,
}: {
  provider: CloudProvider;
  channel: string;
  multiple: boolean;
}) {
  const [state, setState] = useState<PickerState>({ status: "idle" });

  const title = useMemo(() => {
    if (provider === "google-drive") return "Google Drive";
    if (provider === "dropbox") return "Dropbox";
    return "OneDrive";
  }, [provider]);

  const post = useCallback(
    (message: { type: string; [key: string]: unknown }) => {
      if (!channel) return;
      const bc = new BroadcastChannel(channel);
      bc.postMessage(message);
      bc.close();
    },
    [channel]
  );

  const start = useCallback(async () => {
    if (!channel) {
      setState({ status: "error", message: "Missing channel. Please close this window and try again." });
      return;
    }

    setState({ status: "running", message: `Opening ${title} picker…` });
    try {
      const files = await pick(provider, multiple);
      if (!files || files.length === 0) {
        post({ type: "cloud-picker-cancel" });
        setState({ status: "done" });
        window.close();
        return;
      }

      setState({ status: "running", message: "Preparing file…" });
      const uploadId = await saveUpload(files);
      post({ type: "cloud-picker-result", uploadId });
      setState({ status: "done" });
      window.close();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cloud picker failed";
      post({ type: "cloud-picker-error", message });
      setState({ status: "error", message });
    }
  }, [channel, multiple, post, provider, title]);

  useEffect(() => {
    void start();
  }, [start]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-pink p-6">
      <div className="w-full max-w-md rounded-2xl bg-white border border-[color:var(--brand-line)] shadow-xl p-6">
        <h1 className="text-xl font-semibold text-[color:var(--brand-ink)]">{title}</h1>

        {state.status === "running" ? (
          <div className="mt-4 flex items-center gap-3 text-[color:var(--brand-muted)]">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{state.message}</span>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="mt-4">
            <p className="text-sm text-red-600">{state.message}</p>
            <button
              type="button"
              className="mt-4 h-10 px-4 rounded-xl bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium"
              onClick={() => void start()}
            >
              Try again
            </button>
          </div>
        ) : null}

        <p className="mt-6 text-xs text-[color:var(--brand-muted)]">
          This window will close automatically after you pick a file.
        </p>
      </div>
    </main>
  );
}

