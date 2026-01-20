"use client";

import { getGuestQuotaState, GUEST_QUOTA_UPDATED_EVENT } from "@/lib/guestQuota";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

export default function GuestQuotaBanner() {
  const { data: session, status } = useSession();
  const [quota, setQuota] = useState(() => getGuestQuotaState());
  const isGuest = useMemo(() => status !== "loading" && !session, [session, status]);

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
          : "mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 flex items-start justify-between gap-4"
      }
    >
      <div className="min-w-0">
        <p className="font-medium">
          Guest usage: {quota.remaining} / {quota.limit} downloads left today
        </p>
        <p className="mt-1 text-xs opacity-80">
          PDF processing stays in your browser. Sign in with Google to unlock higher free usage.
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 px-3 py-2 rounded-lg bg-[#2d85de] text-white hover:bg-[#2473c4]"
        onClick={() => void signIn("google", { callbackUrl: window.location.href })}
      >
        Continue with Google
      </button>
    </div>
  );
}
