"use client";

import Link from "@/components/AppLink";
import { Button } from "@/components/ui/button";

export default function BannerSection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-r from-[#e8f4fd] via-[#f0f7fd] to-[#fdf6f4] relative overflow-hidden">
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
            <p className="text-[#2d85de] font-bold text-base md:text-lg mb-3 uppercase tracking-wider">
              PDF EDITING MADE EASY
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-8 leading-tight">
              All the PDF tools you need, in a single platform
            </h2>
            <Link href="/sign-in">
              <Button className="bg-[#2d85de] hover:bg-[#2473c4] text-white font-semibold px-10 py-4 h-14 rounded-xl text-lg shadow-lg shadow-blue-200 hover:shadow-xl transition-all duration-300">
                Get Started Free
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
