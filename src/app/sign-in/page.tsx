"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "@/components/AppLink";
import { useSearchParams } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/components/LanguageProvider";

function SignInInner() {
  const { lang, setLang, languages, t } = useLanguage();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<Awaited<ReturnType<typeof getProviders>>>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    void (async () => {
      const providers = await getProviders();
      setAvailableProviders(providers);
    })();
  }, []);

  const googleConfigured = useMemo(() => Boolean(availableProviders?.google), [availableProviders]);

  const callbackUrl = useMemo(() => searchParams.get("callbackUrl") || "/", [searchParams]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      if (!googleConfigured) throw new Error("Google sign-in is not configured.");
      await signIn("google", { callbackUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen auth-gradient">
      {/* Header */}
      <header className="py-4 px-6">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="QwerPDF"
              className="h-6 md:h-7 w-auto"
            />
          </Link>
          <Select value={lang} onValueChange={(value) => setLang(value as typeof lang)}>
            <SelectTrigger className="w-[140px] bg-transparent border-none">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[color:var(--brand-muted)]">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {languages.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Sign In Form */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-10 md:p-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-[color:var(--brand-ink)] mb-3">
              {t("signIn", "Sign in")}
            </h1>
            <p className="text-[color:var(--brand-muted)] text-lg">
              {t("signInSubtitle", "Continue with Google to unlock higher free usage.")}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-base">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-14 rounded-xl border-2 border-[color:var(--brand-line)] text-[color:var(--brand-ink)] font-semibold text-base hover:bg-[color:var(--brand-cream)]"
              onClick={() => void handleGoogleSignIn()}
              disabled={loading || !googleConfigured}
            >
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                <path
                  d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.076 0 10.545-4.268 10.545-10.545 0-.707-.082-1.391-.235-2.055l-10.31-.161z"
                  fill="#4285F4"
                />
              </svg>
              {t("continueWithGoogle", "Continue with Google")}
            </Button>

            {!googleConfigured && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
                {t("googleNotConfigured", "Google sign-in is not configured on this environment.")}
              </div>
            )}

            <div className="text-center text-sm text-[color:var(--brand-muted)]">
              {t("preferNotToSignIn", "Prefer not to sign in?")}{" "}
              <Link href="/tools/annotate" className="text-primary hover:underline font-medium">
                {t("continueAsGuest", "Continue as guest")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="min-h-screen auth-gradient" />}>
      <SignInInner />
    </Suspense>
  );
}
