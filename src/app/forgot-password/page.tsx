"use client";

import Link from "@/components/AppLink";
import { Button } from "@/components/ui/button";
import { getProviders, signIn } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

export default function ForgotPasswordPage() {
  const [providers, setProviders] = useState<Awaited<ReturnType<typeof getProviders>>>(null);
  const googleConfigured = useMemo(() => Boolean(providers?.google), [providers]);

  useEffect(() => {
    void getProviders().then(setProviders);
  }, []);

  return (
    <main className="min-h-screen auth-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Password reset</h1>
        <p className="text-gray-600 text-sm mb-6">
          Password reset isn’t available because this app only supports Google one‑click sign‑in.
        </p>

        <Button
          variant="outline"
          className="w-full h-12 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-base hover:bg-gray-50"
          disabled={!googleConfigured}
          onClick={() => void signIn("google", { callbackUrl: "/" })}
        >
          Continue with Google
        </Button>

        {!googleConfigured && (
          <div className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
            Google sign-in is not configured on this environment.
          </div>
        )}

        <div className="mt-6 text-center text-sm">
          <Link href="/sign-in" className="text-[#2d85de] hover:underline font-medium">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

