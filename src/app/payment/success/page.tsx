"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
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

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for subscribing to Files Editor Premium. You now have
            unlimited access to all our PDF tools.
          </p>

          {sessionId && (
            <p className="text-xs text-gray-400 mb-6">
              Order ID: {sessionId.slice(0, 20)}...
            </p>
          )}

          <div className="space-y-3">
            <Link href="/">
              <Button className="w-full bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium h-12 rounded-lg">
                Start Editing PDFs
              </Button>
            </Link>
            <Link href="/plan">
              <Button
                variant="outline"
                className="w-full border-gray-200 text-gray-700 h-12 rounded-lg"
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
