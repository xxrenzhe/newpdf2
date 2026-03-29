"use client";

import { clearClientAuthed, setClientAuthed } from "@/lib/clientAuthState";
import type { Session } from "next-auth";
import { getSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type UseClientSessionOptions = {
  refetchOnWindowFocus?: boolean;
};

type UseClientSessionResult = {
  data: Session | null;
  status: SessionStatus;
  refresh: () => Promise<Session | null>;
};

export function useClientSession(options: UseClientSessionOptions = {}): UseClientSessionResult {
  const { refetchOnWindowFocus = true } = options;
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applySession = useCallback((next: Session | null) => {
    if (!mountedRef.current) return;
    setSession(next);
    if (next?.user?.email) {
      setStatus("authenticated");
      setClientAuthed(next.user.email);
      return;
    }
    setStatus("unauthenticated");
    clearClientAuthed();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await getSession();
      applySession(next);
      return next;
    } catch {
      applySession(null);
      return null;
    }
  }, [applySession]);

  useEffect(() => {
    setStatus("loading");
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!refetchOnWindowFocus) return;
    const handleFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetchOnWindowFocus, refresh]);

  return { data: session, status, refresh };
}
