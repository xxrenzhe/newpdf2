"use client";

export const CLIENT_AUTH_STATE_KEY = "pdf-tools-auth-state-v1";

type ClientAuthStateV1 = {
  v: 1;
  authed: boolean;
  email?: string;
  updatedAt: number;
};

function safeParse(raw: string | null): ClientAuthStateV1 | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const obj = v as Partial<ClientAuthStateV1>;
    if (obj.v !== 1) return null;
    if (typeof obj.authed !== "boolean") return null;
    if (typeof obj.updatedAt !== "number") return null;
    if (obj.email != null && typeof obj.email !== "string") return null;
    return obj as ClientAuthStateV1;
  } catch {
    return null;
  }
}

export function readClientAuthState(): ClientAuthStateV1 | null {
  if (typeof window === "undefined") return null;
  return safeParse(window.localStorage.getItem(CLIENT_AUTH_STATE_KEY));
}

export function isClientAuthed(): boolean {
  return readClientAuthState()?.authed === true;
}

export function setClientAuthed(email?: string) {
  if (typeof window === "undefined") return;
  const next: ClientAuthStateV1 = { v: 1, authed: true, updatedAt: Date.now(), email };
  window.localStorage.setItem(CLIENT_AUTH_STATE_KEY, JSON.stringify(next));
}

export function clearClientAuthed() {
  if (typeof window === "undefined") return;
  const next: ClientAuthStateV1 = { v: 1, authed: false, updatedAt: Date.now() };
  window.localStorage.setItem(CLIENT_AUTH_STATE_KEY, JSON.stringify(next));
}

export function getClientAuthStatus(): boolean | null {
  const state = readClientAuthState();
  if (!state) return null;
  return state.authed;
}
