"use client";

import Link from "@/components/AppLink";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <main className="min-h-screen bg-gradient-pink flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[color:var(--brand-ink)] mb-2">
            Payment Successful!
          </h1>
          <p className="text-[color:var(--brand-muted)] mb-6">
            Thank you for subscribing to QwerPDF Premium. You now have
            unlimited access to all our PDF tools.
          </p>

          {sessionId && (
            <p className="text-xs text-[color:var(--brand-muted)] mb-6">
              Order ID: {sessionId.slice(0, 20)}...
            </p>
          )}

          <div className="space-y-3">
            <Link href="/">
              <Button className="w-full bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium h-12 rounded-lg">
                Start Editing PDFs
              </Button>
            </Link>
            <Link href="/plan">
              <Button
                variant="outline"
                className="w-full border-[color:var(--brand-line)] text-[color:var(--brand-ink)] h-12 rounded-lg"
              >
                View Subscription
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-pink flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
