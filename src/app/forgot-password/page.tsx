"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState("en");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Reset password for:", email);
  };

  return (
    <main className="min-h-screen auth-gradient">
      {/* Header */}
      <header className="py-4 px-6">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="https://ext.same-assets.com/170935311/198227732.svg"
              alt="Files Editor"
              className="h-8"
            />
          </Link>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px] bg-transparent border-none">
              <SelectValue />
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

      {/* Reset Password Form */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 relative">
          {/* Close button */}
          <Link
            href="/sign-in"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset password</h1>
            <p className="text-gray-500 text-sm">
              Enter your email address and we'll send reset instructions.
            </p>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-12 rounded-lg border-gray-200"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={!email}
              className="w-full bg-[#7fbbf7] hover:bg-[#2d85de] disabled:bg-[#b8d9fb] text-white font-medium h-12 rounded-lg transition-colors"
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
