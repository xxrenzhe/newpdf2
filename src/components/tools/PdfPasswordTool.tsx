"use client";

import { useCallback, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import { downloadBlob, protectPdfWithPassword } from "@/lib/pdf/client";

export default function PdfPasswordTool({ initialFile }: { initialFile?: File }) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isPdf = useMemo(
    () => !!file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")),
    [file]
  );

  const passwordMatch = password === confirm;
  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  }, [password]);

  const strengthColors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"];
  const strengthLabels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

  const run = useCallback(async () => {
    if (!file || !isPdf) return;
    setError("");
    if (!password) {
      setError("Please enter a password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const bytes = await protectPdfWithPassword(file, password);
      const outName = file.name.replace(/\.[^.]+$/, "") + "-protected.pdf";
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to protect PDF");
    } finally {
      setBusy(false);
    }
  }, [confirm, file, isPdf, password]);

  if (!file) {
    return <FileDropzone accept=".pdf,application/pdf" onFiles={(files) => setFile(files[0] ?? null)} title="Drop a PDF here to protect" subtitle="Add password protection to your PDF" />;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">Password Protect</h3>
            <p className="text-sm text-gray-500 truncate">{file.name}</p>
          </div>
        </div>
        <button
          type="button"
          className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-2 transition-colors"
          onClick={() => setFile(null)}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Change file
        </button>
      </div>

      {!isPdf && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          Please upload a PDF file.
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 focus:border-[#2d85de] focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showPassword ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>
          </div>
          {password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < passwordStrength ? strengthColors[passwordStrength] : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">{strengthLabels[passwordStrength]}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password..."
              className={`w-full h-12 px-4 pr-12 rounded-xl border transition-all focus:ring-2 ${
                confirm && !passwordMatch
                  ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                  : confirm && passwordMatch
                  ? "border-green-300 focus:border-green-400 focus:ring-green-100"
                  : "border-gray-200 focus:border-[#2d85de] focus:ring-blue-100"
              }`}
            />
            {confirm && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {passwordMatch ? (
                  <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!isPdf || busy || !password || !passwordMatch}
        onClick={run}
        className="w-full h-12 rounded-xl bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <svg className="w-5 h-5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7-7H1m22 0h-4m-2.636-7.364l-2.828 2.828m-5.072 5.072l-2.828 2.828m12.728 0l-2.828-2.828M6.464 6.464L3.636 3.636" />
            </svg>
            Protecting...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Protect & Download
          </>
        )}
      </button>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-xs text-blue-700 flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          This runs locally in your browser using qpdf (WebAssembly). Your password never leaves your device.
        </p>
      </div>
    </div>
  );
}

