"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BannerSection() {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-r from-[#e8f4fd] via-[#f0f7fd] to-[#fdf6f4] relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left Image */}
          <div className="hidden lg:block w-1/4">
            <img
              src="https://ext.same-assets.com/170935311/414827711.png"
              alt=""
              className="w-full max-w-[200px] mx-auto"
            />
          </div>

          {/* Center Content */}
          <div className="text-center flex-1">
            <p className="text-[#2d85de] font-semibold text-sm md:text-base mb-2 uppercase tracking-wide">
              PDF EDITING MADE EASY
            </p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              All the PDF tools you need, in a single platform
            </h2>
            <Link href="/sign-up">
              <Button className="bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium px-8 py-3 h-12 rounded-lg text-base">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Right Image */}
          <div className="hidden lg:block w-1/4">
            <img
              src="https://ext.same-assets.com/170935311/2898045088.png"
              alt=""
              className="w-full max-w-[200px] mx-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
