"use client";

import { clearClientAuthed, setClientAuthed } from "@/lib/clientAuthState";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function AuthStateSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.email) {
      setClientAuthed(session.user.email);
      return;
    }
    clearClientAuthed();
  }, [session?.user?.email, status]);

  return null;
}

