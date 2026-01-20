import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions).catch(() => null);

  const email = session?.user?.email ?? null;
  if (!email) redirect("/sign-in?callbackUrl=/admin");
  if (!isAdminEmail(email)) redirect("/");

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="font-semibold text-gray-900">
                Admin
              </Link>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">{email}</span>
            </div>
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Back to site
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-fit">
            <nav className="space-y-1">
              <Link
                href="/admin/users"
                className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Users
              </Link>
            </nav>
          </aside>
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </div>
  );
}

