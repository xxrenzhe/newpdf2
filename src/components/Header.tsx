"use client";

import Link from "@/components/AppLink";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TOOLS } from "@/lib/tools";
import { ToolIcon } from "@/lib/toolIcons";
import { useLanguage } from "@/components/LanguageProvider";

export default function Header() {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const { data: session, status } = useSession();
  const { t } = useLanguage();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[color:rgba(255,247,238,0.8)] backdrop-blur-md border-b border-[color:var(--brand-line)]">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 md:h-28">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="QwerPDF"
              width={982}
              height={167}
              className="h-6 md:h-7 w-auto"
            />
          </Link>

          {/* Right side buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-[color:var(--brand-cream)] animate-pulse" />
            ) : session ? (
              <>
                {/* User Avatar/Menu */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm">
                    {session.user?.email?.[0].toUpperCase() || "U"}
                  </div>
                  <span className="hidden md:inline text-sm text-[color:var(--brand-ink)]">
                    {session.user?.email?.split("@")[0]}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-lilac)] font-medium px-4 py-2 h-10 rounded-lg"
                >
                  {t("signOut", "Sign out")}
                </Button>
              </>
            ) : (
              <>
                <Link href="/app/sign-in">
                  <Button className="bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium px-4 py-2 h-10 rounded-lg">
                    {t("continueWithGoogle", "Continue with Google")}
                  </Button>
                </Link>
              </>
            )}

            {/* Tools Button */}
            <Sheet open={isToolsOpen} onOpenChange={setIsToolsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  aria-label="Tools"
                  className="flex items-center gap-2 border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-peach)] font-medium px-3 md:px-4 py-2 h-10 rounded-lg"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-[color:var(--brand-muted)]"
                  >
                    <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="10" y="1" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="1" y="10" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="10" y="10" width="5" height="5" rx="1" fill="currentColor" />
                  </svg>
                  <span className="hidden md:inline">{t("tools", "Tools")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[400px] md:w-[500px] p-0 overflow-y-auto">
                <SheetHeader className="px-6 py-4 border-b border-[color:var(--brand-line)]">
                  <SheetTitle className="text-left text-xl font-semibold">{t("allTools", "All Tools")}</SheetTitle>
                  <SheetDescription className="sr-only">
                    {t("toolsMenuDescription", "Browse all PDF tools")}
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 py-4">
                  <div className="grid grid-cols-1 gap-2">
                    {TOOLS.map((tool) => (
                      <Link
                        key={tool.name}
                        href={tool.href}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-[color:rgba(255,241,223,0.6)] transition-colors"
                        onClick={() => setIsToolsOpen(false)}
                      >
                        <div className="w-12 h-12 rounded-xl bg-[color:var(--brand-lilac)] text-primary flex items-center justify-center">
                          <ToolIcon name={tool.iconName} className="w-6 h-6 stroke-[2px]" />
                        </div>
                        <div>
                          <h3 className="font-medium text-[color:var(--brand-ink)]">
                            {t(tool.nameKey, tool.name)}
                          </h3>
                          <p className="text-sm text-[color:var(--brand-muted)]">
                            {t(tool.descriptionKey, tool.description)}
                            {tool.status === "comingSoon" ? ` · ${t("comingSoon", "Coming soon")}` : ""}
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
