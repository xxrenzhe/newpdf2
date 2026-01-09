"use client";

import { useState } from "react";

const advantages = [
  {
    id: 0,
    title: "PDF editing made easy",
    description: "Edit your PDFs effortlessly with our intuitive tools. Add text, images, annotations, or even e-signatures, all in just a few clicks.",
    icon: (
      <svg className="w-7 h-7 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    id: 1,
    title: "100% safe and secure",
    description: "Your documents and privacy are always safe. We use encryption for file transfers and automatic deletion after processing.",
    icon: (
      <svg className="w-7 h-7 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 2,
    title: "Fast & easy online conversion",
    description: "Quickly convert your files to formats like Word, PDF, Excel, PNG, JPG, and more. It's quick, easy, and only takes a few seconds.",
    icon: (
      <svg className="w-7 h-7 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="M9 15l3 3 3-3" />
      </svg>
    ),
  },
  {
    id: 3,
    title: "No software installation",
    description: "No need for downloads or browser extensions. Our PDF editor and converter are fully web-based, requiring only an internet connection.",
    icon: (
      <svg className="w-7 h-7 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

export default function AdvantagesSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-4xl mx-auto mb-16 md:mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            The ultimate solution to edit and manage PDF documents
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to work with PDFs, all in one place
          </p>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-7xl mx-auto">
          {/* Left side - Preview Image */}
          <div className="order-2 lg:order-1">
            <div className="relative bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 rounded-3xl p-10 flex items-center justify-center min-h-[450px] overflow-hidden shadow-xl">
              {/* Decorative elements */}
              <div className="absolute top-6 left-6 w-24 h-24 bg-blue-200/50 rounded-full blur-2xl" />
              <div className="absolute bottom-6 right-6 w-36 h-36 bg-purple-200/50 rounded-full blur-2xl" />

              {/* Main preview card */}
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">PDF</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Document.pdf</p>
                    <p className="text-sm text-gray-500">2.4 MB</p>
                  </div>
                  <div className="ml-auto">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="h-3 bg-gray-100 rounded-full w-full" />
                  <div className="h-3 bg-gray-100 rounded-full w-4/5" />
                  <div className="h-3 bg-gray-100 rounded-full w-3/5" />
                  <div className="h-3 bg-gray-100 rounded-full w-full" />
                  <div className="h-3 bg-gray-100 rounded-full w-2/3" />
                </div>
                <div className="flex gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center hover:bg-blue-200 transition-colors cursor-pointer">
                      <svg className="w-5 h-5 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute bottom-8 right-8 bg-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-base font-semibold text-gray-700">Processing complete</span>
              </div>
            </div>
          </div>

          {/* Right side - Features list */}
          <div className="order-1 lg:order-2 space-y-4">
            {advantages.map((advantage, index) => (
              <button
                key={advantage.id}
                onClick={() => setActiveIndex(index)}
                className={`w-full text-left p-6 md:p-7 rounded-2xl transition-all duration-300 ${
                  activeIndex === index
                    ? "bg-white shadow-xl border-2 border-blue-100"
                    : "bg-transparent hover:bg-white/70 border-2 border-transparent"
                }`}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    activeIndex === index ? "bg-blue-100 scale-110" : "bg-gray-100"
                  }`}>
                    {advantage.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-xl mb-2 transition-colors ${
                      activeIndex === index ? "text-gray-900" : "text-gray-700"
                    }`}>
                      {advantage.title}
                    </h3>
                    <div className={`overflow-hidden transition-all duration-300 ${
                      activeIndex === index ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                    }`}>
                      <p className="text-gray-600 text-base leading-relaxed">
                        {advantage.description}
                      </p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-300 ${activeIndex === index ? "rotate-180" : ""}`}>
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
