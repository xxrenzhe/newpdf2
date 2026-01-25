"use client";

import { useCallback, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { deleteUpload, loadUpload } from "@/lib/uploadStore";
import { safeRandomUUID } from "@/lib/safeRandomUUID";
import {
  type CloudPickOptions,
  type CloudProvider,
  pickDropboxFiles,
  pickGoogleDriveFiles,
  pickOneDriveFiles,
} from "@/lib/cloud/pickers";

function GoogleDriveIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.076 0 10.545-4.268 10.545-10.545 0-.707-.082-1.391-.235-2.055l-10.31-.161z"
        fill="#4285F4"
      />
    </svg>
  );
}

function DropboxIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#0061FF" aria-hidden="true">
      <path d="M12 2L6 6.5l6 4.5 6-4.5L12 2zM6 11.5L0 16l6 4.5 6-4.5-6-4.5zm12 0l-6 4.5 6 4.5 6-4.5-6-4.5zM12 14l-6 4.5L12 23l6-4.5L12 14z" />
    </svg>
  );
}

function OneDriveIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#0078D4" aria-hidden="true">
      <path d="M10.5 2.5H2.5v9h8v-9zm11 0h-8v9h8v-9zm-11 11h-8v9h8v-9zm11 0h-8v9h8v-9z" />
    </svg>
  );
}

async function pickFilesInline(provider: CloudProvider, opts: CloudPickOptions): Promise<File[]> {
  if (provider === "google-drive") return await pickGoogleDriveFiles(opts);
  if (provider === "dropbox") return await pickDropboxFiles(opts);
  return await pickOneDriveFiles(opts);
}

async function pickFilesViaPopup(provider: CloudProvider, opts: CloudPickOptions): Promise<File[]> {
  const channelId = safeRandomUUID();
  const channelName = `qwerpdf-cloud-picker:${channelId}`;
  const channel = new BroadcastChannel(channelName);

  const url = new URL("/cloud-picker", window.location.origin);
  url.searchParams.set("provider", provider);
  url.searchParams.set("channel", channelName);
  if (opts.multiple) url.searchParams.set("multiple", "1");

  const popup = window.open(url.toString(), "cloud-picker", "width=1080,height=760,noopener,noreferrer");
  if (!popup) {
    channel.close();
    throw new Error("Popup was blocked. Please allow popups and try again.");
  }

  return await new Promise<File[]>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      settled = true;
      channel.close();
    };

    const timeout = window.setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(new Error("Cloud picker timed out. Please try again."));
    }, 2 * 60 * 1000);

    const poll = window.setInterval(() => {
      if (settled) return;
      if (!popup.closed) return;
      window.clearInterval(poll);
      window.clearTimeout(timeout);
      cleanup();
      resolve([]);
    }, 400);

    channel.onmessage = (evt) => {
      if (settled) return;
      const raw = evt.data as unknown;
      if (!raw || typeof raw !== "object") return;
      if (!("type" in raw)) return;
      const data = raw as
        | { type: "cloud-picker-result"; uploadId: string }
        | { type: "cloud-picker-cancel" }
        | { type: "cloud-picker-error"; message?: string };
      if (typeof data.type !== "string") return;

      window.clearInterval(poll);
      window.clearTimeout(timeout);

      if (data.type === "cloud-picker-cancel") {
        cleanup();
        resolve([]);
        return;
      }

      if (data.type === "cloud-picker-error") {
        cleanup();
        reject(new Error(data.message || "Cloud picker failed"));
        return;
      }

      if (data.type === "cloud-picker-result" && typeof data.uploadId === "string") {
        (async () => {
          try {
            const files = (await loadUpload(data.uploadId)) || [];
            void deleteUpload(data.uploadId).catch(() => {});
            cleanup();
            resolve(files);
          } catch (err) {
            cleanup();
            reject(err instanceof Error ? err : new Error("Failed to load selected file"));
          }
        })();
      }
    };
  });
}

export default function CloudUploadOptions({
  variant,
  disabled,
  multiple,
  onFiles,
  onError,
}: {
  variant: "hero" | "dropzone";
  disabled?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  onError?: (message: string) => void;
}) {
  const { t } = useLanguage();
  const [busyProvider, setBusyProvider] = useState<CloudProvider | null>(null);

  const providers = useMemo(
    () =>
      [
        {
          id: "google-drive" as const,
          label: t("uploadFromGoogleDrive", "Upload from Google Drive"),
          icon: <GoogleDriveIcon className={variant === "hero" ? "w-6 h-6" : "w-5 h-5"} />,
        },
        {
          id: "dropbox" as const,
          label: t("uploadFromDropbox", "Upload from Dropbox"),
          icon: <DropboxIcon className={variant === "hero" ? "w-6 h-6" : "w-5 h-5"} />,
        },
        {
          id: "onedrive" as const,
          label: t("uploadFromOneDrive", "Upload from OneDrive"),
          icon: <OneDriveIcon className={variant === "hero" ? "w-6 h-6" : "w-5 h-5"} />,
        },
      ] as const,
    [t, variant]
  );

  const handlePick = useCallback(
    async (provider: CloudProvider) => {
      if (disabled || busyProvider) return;
      setBusyProvider(provider);
      try {
        const opts: CloudPickOptions = { multiple };
        const files =
          typeof window !== "undefined" && window.crossOriginIsolated
            ? await pickFilesViaPopup(provider, opts)
            : await pickFilesInline(provider, opts);
        if (files.length > 0) onFiles(files);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Cloud upload failed";
        onError?.(message);
      } finally {
        setBusyProvider(null);
      }
    },
    [busyProvider, disabled, multiple, onError, onFiles]
  );

  const gridClass =
    variant === "hero"
      ? "grid grid-cols-1 md:grid-cols-3 gap-4 mt-6"
      : "grid grid-cols-1 md:grid-cols-3 gap-3 mt-4";
  const btnBase =
    variant === "hero"
      ? "flex items-center justify-center gap-3 bg-white/80 rounded-xl px-6 py-4 border-2 border-[color:var(--brand-line)] hover:border-[color:rgba(91,75,183,0.4)] hover:shadow-md transition-all duration-300"
      : "cloud-btn justify-center";
  const labelClass =
    variant === "hero"
      ? "text-[color:var(--brand-muted)] font-medium"
      : "text-[color:var(--brand-muted)] font-medium text-sm";

  return (
    <div className={gridClass} aria-busy={Boolean(busyProvider)}>
      {providers.map((p) => {
        const isBusy = busyProvider === p.id;
        return (
          <button
            key={p.id}
            type="button"
            className={`${btnBase} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            disabled={disabled || Boolean(busyProvider)}
            onClick={() => void handlePick(p.id)}
          >
            {p.icon}
            <span className={labelClass}>{p.label}</span>
            {isBusy ? (
              <svg className="animate-spin h-4 w-4 text-[color:var(--brand-muted)]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
