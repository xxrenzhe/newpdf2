"use client";

export type CloudProvider = "google-drive" | "dropbox" | "onedrive";

export type CloudPickOptions = {
  multiple?: boolean;
};

type DropboxChooserFile = { name: string; link: string };
type OneDrivePickedFile = { name?: string } & Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type GapiLike = {
  load: (
    name: string,
    opts: {
      callback: () => void;
      onerror?: () => void;
    }
  ) => void;
};

type GoogleTokenClient = { requestAccessToken: (opts?: { prompt?: string }) => void };

type GoogleOauth2Like = {
  initTokenClient: (opts: {
    client_id: string;
    scope: string;
    callback: (resp: { access_token?: string; error?: string }) => void;
  }) => GoogleTokenClient;
};

type GooglePickerBuilderLike = {
  setDeveloperKey: (key: string) => GooglePickerBuilderLike;
  setOAuthToken: (token: string) => GooglePickerBuilderLike;
  setOrigin: (origin: string) => GooglePickerBuilderLike;
  addView: (view: unknown) => GooglePickerBuilderLike;
  setCallback: (cb: (data: unknown) => void) => GooglePickerBuilderLike;
  enableFeature: (feature: unknown) => GooglePickerBuilderLike;
  build: () => { setVisible: (visible: boolean) => void };
};

type GooglePickerLike = {
  Action: { CANCEL: unknown; PICKED: unknown };
  Feature: { MULTISELECT_ENABLED: unknown };
  ViewId: { DOCS: unknown };
  DocsView: new (viewId: unknown) => {
    setIncludeFolders: (value: boolean) => void;
    setSelectFolderEnabled: (value: boolean) => void;
  };
  PickerBuilder: new () => GooglePickerBuilderLike;
};

type GoogleLike = {
  accounts?: { oauth2?: GoogleOauth2Like };
  picker?: GooglePickerLike;
};

declare global {
  interface Window {
    Dropbox?: { choose?: (opts: Record<string, unknown>) => void };
    OneDrive?: { open?: (opts: Record<string, unknown>) => void };
    google?: unknown;
    gapi?: unknown;
  }
}

const scriptPromises = new Map<string, Promise<void>>();

function loadScriptOnce(
  src: string,
  opts?: { id?: string; attrs?: Record<string, string> }
): Promise<void> {
  const cached = scriptPromises.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      opts?.id ? `script#${CSS.escape(opts.id)}` : `script[src=\"${src}\"]`
    );
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load script: ${src}`)),
        { once: true }
      );
      return;
    }

    const el = document.createElement("script");
    if (opts?.id) el.id = opts.id;
    el.src = src;
    el.async = true;
    if (opts?.attrs) {
      for (const [k, v] of Object.entries(opts.attrs)) {
        el.setAttribute(k, v);
      }
    }
    el.addEventListener("load", () => {
      el.dataset.loaded = "true";
      resolve();
    });
    el.addEventListener("error", () => reject(new Error(`Failed to load script: ${src}`)));
    document.head.appendChild(el);
  });

  scriptPromises.set(src, promise);
  return promise;
}

function guessMimeTypeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lower.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

async function fetchBlobViaProxy(url: string): Promise<Blob> {
  const res = await fetch("/api/cloud/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error || "Cloud download failed");
  }
  return await res.blob();
}

async function fetchBlobWithFallback(url: string): Promise<Blob> {
  try {
    const res = await fetch(url, { credentials: "omit", cache: "no-store" });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    return await res.blob();
  } catch {
    return await fetchBlobViaProxy(url);
  }
}

export async function downloadFileFromUrl(url: string, filename: string): Promise<File> {
  const blob = await fetchBlobWithFallback(url);
  const type = blob.type || guessMimeTypeFromName(filename);
  return new File([blob], filename, { type, lastModified: Date.now() });
}

async function loadGooglePicker(): Promise<void> {
  await loadScriptOnce("https://accounts.google.com/gsi/client", { id: "google-gsi" });
  await loadScriptOnce("https://apis.google.com/js/api.js", { id: "google-api" });

  const gapi = window.gapi as unknown as GapiLike | undefined;
  if (!gapi?.load) throw new Error("Google API client failed to load");

  await new Promise<void>((resolve, reject) => {
    let done = false;
    const timeout = window.setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error("Google Picker load timed out"));
    }, 10_000);

    gapi.load("picker", {
      callback: () => {
        if (done) return;
        done = true;
        window.clearTimeout(timeout);
        resolve();
      },
      onerror: () => {
        if (done) return;
        done = true;
        window.clearTimeout(timeout);
        reject(new Error("Google Picker failed to load"));
      },
    });
  });
}

async function requestGoogleAccessToken(clientId: string): Promise<string> {
  const google = window.google as unknown as GoogleLike | undefined;
  const oauth2 = google?.accounts?.oauth2;
  if (!oauth2?.initTokenClient) throw new Error("Google Identity Services is not available");

  return await new Promise<string>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (resp: { access_token?: string; error?: string }) => {
        if (resp?.access_token) resolve(resp.access_token);
        else reject(new Error(resp?.error || "Failed to get Google access token"));
      },
    });

    tokenClient.requestAccessToken({ prompt: "" });
  });
}

async function downloadGoogleDriveFile(args: {
  accessToken: string;
  id: string;
  name: string;
  mimeType?: string;
}): Promise<File> {
  const isGoogleDoc = Boolean(args.mimeType?.startsWith("application/vnd.google-apps"));
  const url = isGoogleDoc
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(args.id)}/export?mimeType=application/pdf`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(args.id)}?alt=media`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${args.accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google Drive download failed (${res.status})`);
  const blob = await res.blob();

  const baseName = args.name || "document";
  const filename = isGoogleDoc && !baseName.toLowerCase().endsWith(".pdf") ? `${baseName}.pdf` : baseName;
  const type = blob.type || (isGoogleDoc ? "application/pdf" : guessMimeTypeFromName(filename));
  return new File([blob], filename, { type, lastModified: Date.now() });
}

export async function pickGoogleDriveFiles(opts: CloudPickOptions = {}): Promise<File[]> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!clientId || !apiKey) {
    throw new Error("Google Drive is not configured (NEXT_PUBLIC_GOOGLE_CLIENT_ID / NEXT_PUBLIC_GOOGLE_API_KEY)");
  }

  await loadGooglePicker();
  const accessToken = await requestGoogleAccessToken(clientId);

  const google = window.google as unknown as GoogleLike | undefined;
  const picker = google?.picker;
  if (!picker) throw new Error("Google Picker is not available");

  const picked = await new Promise<Array<{ id: string; name: string; mimeType?: string }>>((resolve, reject) => {
    const view = new picker.DocsView(picker.ViewId.DOCS);
    view.setIncludeFolders(false);
    view.setSelectFolderEnabled(false);

    const builder = new picker.PickerBuilder()
      .setDeveloperKey(apiKey)
      .setOAuthToken(accessToken)
      .setOrigin(window.location.origin)
      .addView(view)
      .setCallback((raw: unknown) => {
        if (!isRecord(raw)) return;
        const action = raw.action;
        if (action === picker.Action.CANCEL) return resolve([]);
        if (action !== picker.Action.PICKED) return;

        const docsRaw = raw.docs;
        const docs = Array.isArray(docsRaw) ? docsRaw : [];
        const out: Array<{ id: string; name: string; mimeType?: string }> = [];
        for (const entry of docs) {
          if (!isRecord(entry)) continue;
          const id = typeof entry.id === "string" ? entry.id : String(entry.id || "");
          if (!id) continue;
          const name = typeof entry.name === "string" ? entry.name : "document";
          const mimeType = typeof entry.mimeType === "string" ? entry.mimeType : undefined;
          out.push({ id, name, mimeType });
        }
        resolve(out);
      });

    if (opts.multiple) {
      builder.enableFeature(picker.Feature.MULTISELECT_ENABLED);
    }

    try {
      const picker = builder.build();
      picker.setVisible(true);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Failed to open Google Picker"));
    }
  });

  return await Promise.all(picked.map((doc) => downloadGoogleDriveFile({ accessToken, ...doc })));
}

export async function pickDropboxFiles(opts: CloudPickOptions = {}): Promise<File[]> {
  const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
  if (!appKey) {
    throw new Error("Dropbox is not configured (NEXT_PUBLIC_DROPBOX_APP_KEY)");
  }

  await loadScriptOnce("https://www.dropbox.com/static/api/2/dropins.js", {
    id: "dropbox-dropins",
    attrs: { "data-app-key": appKey },
  });

  const Dropbox = window.Dropbox;
  if (!Dropbox?.choose) throw new Error("Dropbox Chooser is not available");

  const selected = await new Promise<DropboxChooserFile[]>((resolve, reject) => {
    Dropbox.choose?.({
      linkType: "direct",
      multiselect: Boolean(opts.multiple),
      success: (files: DropboxChooserFile[]) => resolve(files || []),
      cancel: () => resolve([]),
      error: (err: unknown) => reject(err instanceof Error ? err : new Error("Dropbox chooser failed")),
    });
  });

  return await Promise.all(selected.map((f) => downloadFileFromUrl(f.link, f.name)));
}

export async function pickOneDriveFiles(opts: CloudPickOptions = {}): Promise<File[]> {
  const clientId = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID;
  if (!clientId) {
    throw new Error("OneDrive is not configured (NEXT_PUBLIC_ONEDRIVE_CLIENT_ID)");
  }

  await loadScriptOnce("https://js.live.net/v7.2/OneDrive.js", { id: "onedrive-sdk" });

  const OneDrive = window.OneDrive;
  if (!OneDrive?.open) throw new Error("OneDrive picker is not available");

  const redirectUri =
    process.env.NEXT_PUBLIC_ONEDRIVE_REDIRECT_URI || `${window.location.origin}/onedrive-redirect`;

  const result = await new Promise<unknown>((resolve, reject) => {
    OneDrive.open?.({
      clientId,
      action: "download",
      multiSelect: Boolean(opts.multiple),
      openInNewWindow: true,
      advanced: { redirectUri },
      success: (files: unknown) => resolve(files),
      cancel: () => resolve(null),
      error: (err: unknown) => reject(err instanceof Error ? err : new Error("OneDrive picker failed")),
    });
  });

  if (!result) return [];

  const rawItems = (() => {
    if (!isRecord(result)) return [];
    const value = result.value;
    if (Array.isArray(value)) return value;
    const files = result.files;
    if (Array.isArray(files)) return files;
    return [];
  })();

  const items: OneDrivePickedFile[] = rawItems.filter(isRecord) as OneDrivePickedFile[];

  const toDownload = items
    .map((item) => {
      const name = typeof item.name === "string" ? item.name : "document";
      const graphUrl = item["@microsoft.graph.downloadUrl"];
      const downloadUrl = item.downloadUrl;
      const url =
        (typeof graphUrl === "string" && graphUrl) ||
        (typeof downloadUrl === "string" && downloadUrl) ||
        "";
      return { name, url };
    })
    .filter((f) => f.url);

  return await Promise.all(toDownload.map((f) => downloadFileFromUrl(f.url, f.name)));
}
