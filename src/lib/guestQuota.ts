"use client";

export const GUEST_QUOTA_STORAGE_KEY = "pdf-tools-guest-quota-v1";
export const GUEST_QUOTA_UPDATED_EVENT = "guest-quota-updated";

type GuestQuotaV1 = {
  v: 1;
  dayKeyUtc: string;
  downloadsUsed: number;
};

export type GuestQuotaState = {
  dayKeyUtc: string;
  limit: number;
  used: number;
  remaining: number;
};

function getUtcDayKey(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getLimit(): number {
  if (process.env.NEXT_PUBLIC_E2E === "1") return 1_000_000;
  const raw = process.env.NEXT_PUBLIC_GUEST_DAILY_DOWNLOAD_LIMIT;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(n) && n > 0) return n;
  return 3;
}

function safeParse(raw: string | null): GuestQuotaV1 | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const obj = v as Partial<GuestQuotaV1>;
    if (obj.v !== 1) return null;
    if (typeof obj.dayKeyUtc !== "string") return null;
    if (typeof obj.downloadsUsed !== "number") return null;
    return obj as GuestQuotaV1;
  } catch {
    return null;
  }
}

function readRaw(): GuestQuotaV1 | null {
  if (typeof window === "undefined") return null;
  return safeParse(window.localStorage.getItem(GUEST_QUOTA_STORAGE_KEY));
}

function writeRaw(v: GuestQuotaV1) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_QUOTA_STORAGE_KEY, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent<GuestQuotaState>(GUEST_QUOTA_UPDATED_EVENT, { detail: getGuestQuotaState() }));
}

export function getGuestQuotaState(): GuestQuotaState {
  const limit = getLimit();
  const today = getUtcDayKey();
  const raw = readRaw();
  const used = raw?.dayKeyUtc === today ? Math.max(0, raw.downloadsUsed) : 0;
  const remaining = Math.max(0, limit - used);
  return { dayKeyUtc: today, limit, used, remaining };
}

export function consumeGuestDownload(count = 1): GuestQuotaState {
  const today = getUtcDayKey();
  const raw = readRaw();
  const currentUsed = raw?.dayKeyUtc === today ? Math.max(0, raw.downloadsUsed) : 0;
  const nextUsed = currentUsed + Math.max(1, Math.floor(count));
  writeRaw({ v: 1, dayKeyUtc: today, downloadsUsed: nextUsed });
  return getGuestQuotaState();
}
