"use client";

const brands = [
  "https://ext.same-assets.com/170935311/3959512356.png",
  "https://ext.same-assets.com/170935311/2364094864.png",
  "https://ext.same-assets.com/170935311/2448600377.png",
  "https://ext.same-assets.com/170935311/2983692322.png",
  "https://ext.same-assets.com/170935311/2317977816.png",
  "https://ext.same-assets.com/170935311/3923762797.png",
  "https://ext.same-assets.com/170935311/3953556544.png",
  "https://ext.same-assets.com/170935311/2908841443.png",
];

export default function BrandsMarquee() {
  return (
    <section className="py-8 md:py-12 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 mb-6">
        <p className="text-center text-sm text-gray-500">
          Trusted by professionals from leading companies worldwide
        </p>
      </div>
      <div className="marquee-container relative">
        {/* Gradient masks for smooth edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="marquee-content">
          {[...brands, ...brands, ...brands].map((brand, index) => (
            <img
              key={index}
              src={brand}
              alt=""
              className="h-6 md:h-8 mx-6 md:mx-10 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
