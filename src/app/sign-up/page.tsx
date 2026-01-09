"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
];

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<Awaited<ReturnType<typeof getProviders>>>(null);
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const providers = await getProviders();
      setAvailableProviders(providers);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Register the user
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Auto sign in after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignUp = async (provider: string) => {
    setLoading(true);
    try {
      if (!availableProviders?.[provider]) {
        setError("This sign-in method is not configured.");
        return;
      }
      await signIn(provider, { callbackUrl: "/" });
    } catch (err) {
      setError("An error occurred. Please try again.");
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
              src="https://ext.same-assets.com/170935311/3497447819.svg"
              alt="Files Editor"
              className="h-8"
            />
          </Link>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px] bg-transparent border-none">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Sign Up Form */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-10 md:p-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Sign up</h1>
            <p className="text-gray-600 text-lg">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-[#2d85de] hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-base">
              {error}
            </div>
          )}

          {/* Social Sign Up */}
          <div className="space-y-4 mb-8">
            {!!availableProviders?.google && (
              <Button
                variant="outline"
                className="w-full h-14 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-base hover:bg-gray-50"
                onClick={() => handleSocialSignUp("google")}
                disabled={loading}
              >
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.076 0 10.545-4.268 10.545-10.545 0-.707-.082-1.391-.235-2.055l-10.31-.161z" fill="#4285F4"/>
                </svg>
                Continue with Google
              </Button>
            )}
            {!!availableProviders?.facebook && (
              <Button
                variant="outline"
                className="w-full h-14 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-base hover:bg-gray-50"
                onClick={() => handleSocialSignUp("facebook")}
                disabled={loading}
              >
                <svg className="w-6 h-6 mr-3 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continue with Facebook
              </Button>
            )}
          </div>

          {/* Separator */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-base text-gray-500">Or, sign up with your email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <Input
                type="email"
                placeholder="Enter your email here"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 pl-14 rounded-xl border-2 border-gray-200 text-base"
                required
              />
            </div>

            <div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <circle cx="12" cy="16" r="1" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password here"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 pl-14 pr-14 rounded-xl border-2 border-gray-200 text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                The password must consist of at least 4 characters
              </p>
            </div>

            <Button
              type="submit"
              disabled={!email || password.length < 4 || loading}
              className="w-full bg-[#2d85de] hover:bg-[#2473c4] disabled:bg-[#b8d9fb] text-white font-semibold h-14 rounded-xl text-lg transition-all shadow-lg shadow-blue-200"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </Button>

            <p className="text-sm text-gray-500 text-center leading-relaxed">
              By creating an account, you confirm that you have read and agree to our{" "}
              <Link href="/terms-and-conditions" className="text-[#2d85de] hover:underline font-medium">
                Terms & Conditions
              </Link>{" "}
              and the{" "}
              <Link href="/privacy-policy" className="text-[#2d85de] hover:underline font-medium">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
