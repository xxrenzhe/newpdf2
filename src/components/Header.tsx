"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TOOLS } from "@/lib/tools";

export default function Header() {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const { data: session, status } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/assets/brand/logo.svg"
              alt="Files Editor"
              className="h-8 md:h-9"
            />
          </Link>

          {/* Right side buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            ) : session ? (
              <>
                {/* User Avatar/Menu */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#2d85de] flex items-center justify-center text-white font-medium text-sm">
                    {session.user?.email?.[0].toUpperCase() || "U"}
                  </div>
                  <span className="hidden md:inline text-sm text-gray-700">
                    {session.user?.email?.split("@")[0]}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 h-10 rounded-lg"
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                {/* Sign In Button */}
                <Link href="/app/sign-in">
                  <Button
                    variant="outline"
                    className="hidden sm:flex border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 h-10 rounded-lg"
                  >
                    Sign in
                  </Button>
                </Link>

                {/* Sign Up Button */}
                <Link href="/app/sign-up">
                  <Button className="bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium px-4 py-2 h-10 rounded-lg">
                    Sign up
                  </Button>
                </Link>
              </>
            )}

            {/* Tools Button */}
            <Sheet open={isToolsOpen} onOpenChange={setIsToolsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-3 md:px-4 py-2 h-10 rounded-lg"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-gray-600"
                  >
                    <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="10" y="1" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="1" y="10" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="10" y="10" width="5" height="5" rx="1" fill="currentColor" />
                  </svg>
                  <span className="hidden md:inline">Tools</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[400px] md:w-[500px] p-0 overflow-y-auto">
                <SheetHeader className="px-6 py-4 border-b border-gray-100">
                  <SheetTitle className="text-left text-xl font-semibold">All Tools</SheetTitle>
                </SheetHeader>
                <div className="px-4 py-4">
                  <div className="grid grid-cols-1 gap-2">
                    {TOOLS.map((tool) => (
                      <Link
                        key={tool.name}
                        href={tool.href}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                        onClick={() => setIsToolsOpen(false)}
                      >
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                          <img src={tool.icon} alt="" className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{tool.name}</h3>
                          <p className="text-sm text-gray-500">
                            {tool.description}
                            {tool.status === "comingSoon" ? " · Coming soon" : ""}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
