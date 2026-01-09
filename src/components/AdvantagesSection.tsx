"use client";

import { useState } from "react";

const advantages = [
  {
    id: 0,
    title: "PDF editing made easy",
    description: "Edit your PDFs effortlessly with our intuitive tools. Add text, images, annotations, or even e-signatures, all in just a few clicks.",
    icon: (
      <svg className="w-6 h-6 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    preview: "https://ext.same-assets.com/170935311/414827711.png",
  },
  {
    id: 1,
    title: "100% safe and secure",
    description: "Files Editor keeps your documents and privacy safe. You can boost security with features like file password encryption, encrypted storage, and more.",
    icon: (
      <svg className="w-6 h-6 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    preview: "https://ext.same-assets.com/170935311/2898045088.png",
  },
  {
    id: 2,
    title: "Fast & easy online conversion",
    description: "Quickly convert your files to formats like Word, PDF, Excel, PNG, JPG, and more. Its quick, easy, and only takes a few seconds.",
    icon: (
      <svg className="w-6 h-6 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="M9 15l3 3 3-3" />
      </svg>
    ),
    preview: "https://ext.same-assets.com/170935311/414827711.png",
  },
  {
    id: 3,
    title: "No software installation required",
    description: "With Files Editor, there's no need for downloads or browser extensions. Our PDF editor and converter are fully web-based, requiring only an internet connection to get started.",
    icon: (
      <svg className="w-6 h-6 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    preview: "https://ext.same-assets.com/170935311/2898045088.png",
  },
];

export default function AdvantagesSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-white to-[#f8fafb]">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            The ultimate solution to edit and manage PDF documents with ease
          </h2>
          <p className="text-gray-500">
            Files Editor meets all requirements to edit and manage PDF document!
          </p>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left side - Preview Image */}
          <div className="order-2 lg:order-1">
            <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 flex items-center justify-center min-h-[400px] overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-20 h-20 bg-blue-100/50 rounded-full blur-xl" />
              <div className="absolute bottom-4 right-4 w-32 h-32 bg-purple-100/50 rounded-full blur-xl" />

              {/* Main preview card */}
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative z-10 transform transition-all duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#d53b3b] rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">PDF</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Document.pdf</p>
                    <p className="text-xs text-gray-500">2.4 MB</p>
                  </div>
                  <div className="ml-auto">
                    <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-100 rounded-full w-full animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded-full w-4/5" />
                  <div className="h-3 bg-gray-100 rounded-full w-3/5" />
                  <div className="h-3 bg-gray-100 rounded-full w-full" />
                  <div className="h-3 bg-gray-100 rounded-full w-2/3" />
                </div>
                <div className="mt-6 flex gap-2">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer">
                    <svg className="w-4 h-4 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer">
                    <svg className="w-4 h-4 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer">
                    <svg className="w-4 h-4 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer">
                    <svg className="w-4 h-4 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute bottom-6 right-6 bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-700">Processing complete</span>
              </div>
            </div>
          </div>

          {/* Right side - Features list */}
          <div className="order-1 lg:order-2 space-y-3">
            {advantages.map((advantage, index) => (
              <button
                key={advantage.id}
                onClick={() => setActiveIndex(index)}
                className={`w-full text-left p-6 rounded-2xl transition-all duration-300 ${
                  activeIndex === index
                    ? "bg-white shadow-lg border border-gray-100"
                    : "bg-transparent hover:bg-white/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    activeIndex === index ? "bg-blue-50 scale-110" : "bg-gray-100"
                  }`}>
                    {advantage.icon}
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-2 transition-colors ${
                      activeIndex === index ? "text-gray-900" : "text-gray-700"
                    }`}>
                      {advantage.title}
                    </h3>
                    <div className={`overflow-hidden transition-all duration-300 ${
                      activeIndex === index ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                    }`}>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {advantage.description}
                      </p>
                    </div>
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
