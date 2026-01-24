"use client";

import Link from "@/components/AppLink";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageProvider";

export default function BannerSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 md:py-28 bg-gradient-to-r from-[color:var(--brand-peach)] via-white to-[color:var(--brand-lilac)] relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          {/* Left Image */}
          <div className="hidden lg:block w-1/4">
            <img
              src="/assets/same-assets/414827711.png"
              alt=""
              className="w-full max-w-[240px] mx-auto"
            />
          </div>

          {/* Center Content */}
          <div className="text-center flex-1 py-6">
            <p className="text-secondary font-bold text-base md:text-lg mb-3 uppercase tracking-wider">
              {t("bannerTitle", "PDF EDITING MADE EASY")}
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[color:var(--brand-ink)] mb-8 leading-tight">
              {t("bannerSubtitle", "All the PDF tools you need, in a single platform")}
            </h2>
            <Link href="/app/sign-in">
              <Button className="bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-semibold px-10 py-4 h-14 rounded-xl text-lg shadow-lg shadow-[rgba(91,75,183,0.25)] hover:shadow-xl transition-all duration-300">
                {t("getStartedFree", "Get Started Free")}
              </Button>
            </Link>
          </div>

          {/* Right Image */}
          <div className="hidden lg:block w-1/4">
            <img
              src="/assets/same-assets/2898045088.png"
              alt=""
              className="w-full max-w-[240px] mx-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
