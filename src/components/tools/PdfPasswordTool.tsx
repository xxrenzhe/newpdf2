"use client";

import { useCallback, useId, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import { downloadBlob, protectPdfWithPassword } from "@/lib/pdf/client";
import { useLanguage } from "@/components/LanguageProvider";

export default function PdfPasswordTool({ initialFile }: { initialFile?: File }) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const passwordId = useId();
  const confirmId = useId();
  const { t } = useLanguage();

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

  const strengthColors = [
    "bg-[color:var(--brand-line)]",
    "bg-[color:rgba(242,140,40,0.6)]",
    "bg-[color:var(--brand-orange)]",
    "bg-[color:rgba(91,75,183,0.7)]",
    "bg-[color:var(--brand-purple-dark)]",
  ];
  const strengthLabels = [
    t("passwordStrengthVeryWeak", "Very weak"),
    t("passwordStrengthWeak", "Weak"),
    t("passwordStrengthFair", "Fair"),
    t("passwordStrengthGood", "Good"),
    t("passwordStrengthStrong", "Strong"),
  ];

  const run = useCallback(async () => {
    if (!file || !isPdf) return;
    setError("");
    if (!password) {
      setError(t("passwordRequiredError", "Please enter a password."));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordMismatchError", "Passwords do not match."));
      return;
    }

    setBusy(true);
    try {
      const bytes = await protectPdfWithPassword(file, password);
      const outName = file.name.replace(/\.[^.]+$/, "") + "-protected.pdf";
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("protectFailed", "Failed to protect PDF"));
    } finally {
      setBusy(false);
    }
  }, [confirm, file, isPdf, password, t]);

  if (!file) {
    return (
      <FileDropzone
        accept=".pdf,application/pdf"
        onFiles={(files) => setFile(files[0] ?? null)}
        title={t("dropPdfToProtect", "Drop a PDF here to protect")}
        subtitle={t("protectSubtitle", "Add password protection to your PDF")}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[color:var(--brand-peach)] to-[color:var(--brand-lilac)] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-[color:var(--brand-purple-dark)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">
              {t("passwordProtect", "Password Protect")}
            </h3>
            <p className="text-sm text-[color:var(--brand-muted)] truncate">{file.name}</p>
          </div>
        </div>
        <button
          type="button"
          className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] text-sm flex items-center gap-2 transition-colors"
          onClick={() => setFile(null)}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {t("changeFile", "Change file")}
        </button>
      </div>

      {!isPdf && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          {t("uploadPdfOnly", "Please upload a PDF file.")}
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor={passwordId} className="block text-sm font-medium text-[color:var(--brand-ink)] mb-2">
            {t("passwordLabel", "Password")}
          </label>
          <div className="relative">
            <input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              name="pdfPassword"
              autoComplete="off"
              placeholder={t("passwordPlaceholder", "Enter password…")}
              className="w-full h-12 px-4 pr-12 rounded-xl border border-[color:var(--brand-line)] focus:border-primary focus:ring-2 focus:ring-[color:var(--brand-lilac)] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t("hidePassword", "Hide password") : t("showPassword", "Show password")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--brand-muted)] hover:text-[color:var(--brand-muted)]"
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
                      i < passwordStrength ? strengthColors[passwordStrength] : "bg-[color:var(--brand-line)]"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[color:var(--brand-muted)]">{strengthLabels[passwordStrength]}</p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor={confirmId} className="block text-sm font-medium text-[color:var(--brand-ink)] mb-2">
            {t("confirmPasswordLabel", "Confirm Password")}
          </label>
          <div className="relative">
            <input
              id={confirmId}
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              name="pdfPasswordConfirm"
              autoComplete="off"
              placeholder={t("confirmPasswordPlaceholder", "Confirm password…")}
              className={`w-full h-12 px-4 pr-12 rounded-xl border transition-colors focus:ring-2 ${
                confirm && !passwordMatch
                  ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                  : confirm && passwordMatch
                  ? "border-green-300 focus:border-green-400 focus:ring-green-100"
                  : "border-[color:var(--brand-line)] focus:border-primary focus:ring-[color:var(--brand-lilac)]"
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
        className="w-full h-12 rounded-xl bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <svg className="w-5 h-5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7-7H1m22 0h-4m-2.636-7.364l-2.828 2.828m-5.072 5.072l-2.828 2.828m12.728 0l-2.828-2.828M6.464 6.464L3.636 3.636" />
            </svg>
            {t("protecting", "Protecting…")}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            {t("protectDownload", "Protect & Download")}
          </>
        )}
      </button>

      <div className="mt-4 p-3 bg-[color:var(--brand-lilac)] border border-[color:var(--brand-line)] rounded-lg">
        <p className="text-xs text-[color:var(--brand-ink)] flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          {t(
            "passwordLocalNote",
            "This runs locally in your browser using qpdf (WebAssembly). Your password never leaves your device."
          )}
        </p>
      </div>
    </div>
  );
}
