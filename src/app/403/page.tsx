import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access Forbidden",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-orange-500 dark:text-orange-400 mb-4">
          403
        </div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Access Forbidden
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          This website cannot be embedded in external frames or iframes. Please
          visit us directly.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}
