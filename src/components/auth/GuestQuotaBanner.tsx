"use client";

import { getGuestQuotaState, GUEST_QUOTA_UPDATED_EVENT } from "@/lib/guestQuota";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function GuestQuotaBanner() {
  const { data: session, status } = useSession();
  const [quota, setQuota] = useState(() => getGuestQuotaState());
  const isGuest = useMemo(() => status !== "loading" && !session, [session, status]);
  const { t } = useLanguage();

  useEffect(() => {
    const update = () => setQuota(getGuestQuotaState());
    update();
    window.addEventListener(GUEST_QUOTA_UPDATED_EVENT, update);
    window.addEventListener("focus", update);
    return () => {
      window.removeEventListener(GUEST_QUOTA_UPDATED_EVENT, update);
      window.removeEventListener("focus", update);
    };
  }, []);

  if (!isGuest) return null;

  const exhausted = quota.remaining <= 0;

  return (
    <div
      className={
        exhausted
          ? "mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start justify-between gap-4"
          : "mb-6 rounded-xl border border-[color:var(--brand-line)] bg-[color:var(--brand-lilac)] p-4 text-sm text-[color:var(--brand-ink)] flex items-start justify-between gap-4"
      }
    >
      <div className="min-w-0">
        <p className="font-medium">
          {t("guestUsage", "Guest usage: {remaining} / {limit} downloads left today")
            .replace("{remaining}", `${quota.remaining}`)
            .replace("{limit}", `${quota.limit}`)}
        </p>
        <p className="mt-1 text-xs opacity-80">
          {t(
            "guestUsageHint",
            "PDF processing stays in your browser. Sign in with Google to unlock higher free usage."
          )}
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 px-3 py-2 rounded-lg bg-primary text-white hover:bg-[color:var(--brand-purple-dark)]"
        onClick={() => void signIn("google", { callbackUrl: window.location.href })}
      >
        {t("continueWithGoogle", "Continue with Google")}
      </button>
    </div>
  );
}
