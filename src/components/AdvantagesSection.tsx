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
    gradient: "from-blue-100 via-indigo-50 to-purple-100",
    badge: "Editing complete",
    badgeColor: "bg-green-500",
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
    gradient: "from-emerald-100 via-teal-50 to-cyan-100",
    badge: "256-bit encrypted",
    badgeColor: "bg-emerald-500",
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
    gradient: "from-amber-100 via-orange-50 to-yellow-100",
    badge: "Converted in 2s",
    badgeColor: "bg-amber-500",
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
    gradient: "from-violet-100 via-purple-50 to-fuchsia-100",
    badge: "Works everywhere",
    badgeColor: "bg-violet-500",
  },
];

// Preview card content for each advantage
const PreviewCards = {
  // Edit PDF preview
  0: (
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
        <div className="h-3 bg-blue-100 rounded-full w-3/5" />
        <div className="h-3 bg-gray-100 rounded-full w-full" />
        <div className="h-3 bg-gray-100 rounded-full w-2/3" />
      </div>
      <div className="flex gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
          </svg>
        </div>
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </div>
      </div>
    </div>
  ),
  // Security preview
  1: (
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10">
      <div className="flex items-center justify-center mb-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
      </div>
      <div className="text-center mb-6">
        <h4 className="text-xl font-bold text-gray-900 mb-2">Your files are protected</h4>
        <p className="text-gray-500 text-sm">End-to-end encryption enabled</p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
          <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-gray-700 font-medium">SSL/TLS encryption</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
          <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-gray-700 font-medium">Auto-delete after 1 hour</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
          <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-gray-700 font-medium">No data stored on servers</span>
        </div>
      </div>
    </div>
  ),
  // Conversion preview
  2: (
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-sm font-bold">PDF</span>
          </div>
          <div className="text-gray-400">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">DOCX</span>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 font-medium">Converting...</span>
          <span className="text-amber-600 font-bold">100%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full w-full" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {["PDF", "DOC", "XLS", "PPT", "JPG", "PNG", "TXT", "CSV"].map((format) => (
          <div key={format} className="p-2 bg-gray-50 rounded-lg text-center">
            <span className="text-xs font-bold text-gray-600">{format}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  // Web-based preview
  3: (
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10">
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <div className="w-48 h-32 bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="w-44 h-28 bg-gradient-to-br from-blue-50 to-indigo-100 rounded flex items-center justify-center">
              <svg className="w-12 h-12 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-gray-700 rounded-full" />
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-600 rounded-full" />
        </div>
      </div>
      <div className="text-center mb-4">
        <h4 className="text-xl font-bold text-gray-900 mb-2">Works on any device</h4>
        <p className="text-gray-500 text-sm">No downloads required</p>
      </div>
      <div className="flex justify-center gap-6">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <span className="text-xs text-gray-500">Desktop</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <span className="text-xs text-gray-500">Mobile</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
              <circle cx="12" cy="18" r="1" />
            </svg>
          </div>
          <span className="text-xs text-gray-500">Tablet</span>
        </div>
      </div>
    </div>
  ),
};

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
            <div className={`relative bg-gradient-to-br ${advantages[activeIndex].gradient} rounded-3xl p-10 flex items-center justify-center min-h-[450px] overflow-hidden shadow-xl transition-all duration-500`}>
              {/* Decorative elements */}
              <div className="absolute top-6 left-6 w-24 h-24 bg-white/30 rounded-full blur-2xl" />
              <div className="absolute bottom-6 right-6 w-36 h-36 bg-white/30 rounded-full blur-2xl" />

              {/* Dynamic preview card based on active index */}
              <div className="transition-all duration-300">
                {PreviewCards[activeIndex as keyof typeof PreviewCards]}
              </div>

              {/* Floating badge */}
              <div className="absolute bottom-8 right-8 bg-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-3">
                <div className={`w-3 h-3 ${advantages[activeIndex].badgeColor} rounded-full animate-pulse`} />
                <span className="text-base font-semibold text-gray-700">{advantages[activeIndex].badge}</span>
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
