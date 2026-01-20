"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import AuthStateSync from "@/components/auth/AuthStateSync";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <AuthStateSync />
      {children}
    </SessionProvider>
  );
}
