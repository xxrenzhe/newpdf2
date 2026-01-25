"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";

const brands = [
  { src: "/assets/same-assets/3959512356.png", width: 232, height: 66 },
  { src: "/assets/same-assets/2364094864.png", width: 220, height: 56 },
  { src: "/assets/same-assets/2448600377.png", width: 212, height: 62 },
  { src: "/assets/same-assets/2983692322.png", width: 226, height: 48 },
  { src: "/assets/same-assets/2317977816.png", width: 232, height: 30 },
  { src: "/assets/same-assets/3923762797.png", width: 220, height: 60 },
  { src: "/assets/same-assets/3953556544.png", width: 226, height: 60 },
  { src: "/assets/same-assets/2908841443.png", width: 216, height: 46 },
];

export default function BrandsMarquee() {
  const { t } = useLanguage();
  const marqueeBrands = useMemo(() => [...brands, ...brands, ...brands], []);

  return (
    <section className="py-8 md:py-12 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 mb-6">
        <p className="text-center text-sm text-[color:var(--brand-muted)]">
          {t("trustedBy", "Trusted by professionals from leading companies worldwide")}
        </p>
      </div>
      <div className="marquee-container relative">
        {/* Gradient masks for smooth edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="marquee-content">
          {marqueeBrands.map((brand, index) => (
            <img
              key={index}
              src={brand.src}
              alt=""
              width={brand.width}
              height={brand.height}
              loading="lazy"
              className="h-6 md:h-8 mx-6 md:mx-10 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-[opacity,filter] duration-300"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
