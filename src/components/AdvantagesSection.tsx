"use client";

import { useMemo, useState } from "react";
import { FilePenLine, FileUp, Monitor, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const advantages = [
  {
    id: 0,
    titleKey: "pdfEditingMadeEasy",
    title: "PDF editing made easy",
    descriptionKey: "pdfEditingMadeEasyDesc",
    description: "Edit your PDFs effortlessly with our intuitive tools. Add text, images, annotations, or even e-signatures, all in just a few clicks.",
    icon: <FilePenLine className="w-7 h-7 text-primary" />,
    gradient: "from-[color:var(--brand-peach)] via-[color:var(--brand-lilac)] to-white",
    badgeKey: "editingComplete",
    badge: "Editing complete",
    badgeColor: "bg-secondary",
  },
  {
    id: 1,
    titleKey: "safeAndSecure",
    title: "100% safe and secure",
    descriptionKey: "safeAndSecureDesc",
    description: "Your documents and privacy are always safe. We use encryption for file transfers and automatic deletion after processing.",
    icon: <ShieldCheck className="w-7 h-7 text-primary" />,
    gradient: "from-[color:var(--brand-lilac)] via-white to-[color:var(--brand-cream)]",
    badgeKey: "encrypted256Bit",
    badge: "256-bit encrypted",
    badgeColor: "bg-primary",
  },
  {
    id: 2,
    titleKey: "fastAndEasy",
    title: "Fast & easy online conversion",
    descriptionKey: "fastAndEasyDesc",
    description: "Quickly convert your files to formats like Word, PDF, Excel, PNG, JPG, and more. It's quick, easy, and only takes a few seconds.",
    icon: <FileUp className="w-7 h-7 text-primary" />,
    gradient: "from-[color:var(--brand-peach)] via-white to-[color:var(--brand-lilac)]",
    badgeKey: "convertedInSeconds",
    badge: "Converted in 2s",
    badgeColor: "bg-secondary",
  },
  {
    id: 3,
    titleKey: "noSoftware",
    title: "No software installation",
    descriptionKey: "noSoftwareDesc",
    description: "No need for downloads or browser extensions. Our PDF editor and converter are fully web-based, requiring only an internet connection.",
    icon: <Monitor className="w-7 h-7 text-primary" />,
    gradient: "from-[color:var(--brand-lilac)] via-[color:var(--brand-peach)] to-white",
    badgeKey: "worksEverywhere",
    badge: "Works everywhere",
    badgeColor: "bg-primary",
  },
];

// Preview card content for each advantage
const buildPreviewCards = (t: (key: string, fallback?: string) => string) => ({
  // Edit PDF preview
  0: (
    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md relative z-10">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-white text-sm font-bold">PDF</span>
        </div>
        <div>
          <p className="font-bold text-[color:var(--brand-ink)] text-base sm:text-lg">
            {t("sampleDocumentName", "Document.pdf")}
          </p>
          <p className="text-sm text-[color:var(--brand-muted)]">
            {t("sampleDocumentSize", "2.4 MB")}
          </p>
        </div>
        <div className="ml-auto">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>
      </div>
      <div className="space-y-3 mb-6">
        <div className="h-3 bg-[color:var(--brand-cream)] rounded-full w-full" />
        <div className="h-3 bg-[color:var(--brand-cream)] rounded-full w-4/5" />
        <div className="h-3 bg-[color:var(--brand-lilac)] rounded-full w-3/5" />
        <div className="h-3 bg-[color:var(--brand-cream)] rounded-full w-full" />
        <div className="h-3 bg-[color:var(--brand-cream)] rounded-full w-2/3" />
      </div>
      <div className="flex gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[color:var(--brand-lilac)] rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[color:var(--brand-lilac)] rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
          </svg>
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[color:var(--brand-lilac)] rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </div>
      </div>
    </div>
  ),
  // Security preview
  1: (
    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md relative z-10">
      <div className="flex items-center justify-center mb-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[color:var(--brand-peach)] rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
      </div>
      <div className="text-center mb-6">
        <h4 className="text-lg sm:text-xl font-bold text-[color:var(--brand-ink)] mb-2">
          {t("filesProtectedTitle", "Your files are protected")}
        </h4>
        <p className="text-[color:var(--brand-muted)] text-sm">
          {t("filesProtectedSubtitle", "End-to-end encryption enabled")}
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-[color:var(--brand-lilac)] rounded-xl">
          <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-[color:var(--brand-ink)] font-medium">
            {t("sslEncryption", "SSL/TLS encryption")}
          </span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-[color:var(--brand-lilac)] rounded-xl">
          <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-[color:var(--brand-ink)] font-medium">
            {t("autoDeleteAfterHour", "Auto-delete after 1 hour")}
          </span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-[color:var(--brand-lilac)] rounded-xl">
          <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-[color:var(--brand-ink)] font-medium">
            {t("noDataStored", "No data stored on servers")}
          </span>
        </div>
      </div>
    </div>
  ),
  // Conversion preview
  2: (
    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md relative z-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-sm font-bold">PDF</span>
          </div>
          <div className="text-[color:var(--brand-muted)]">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">DOCX</span>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[color:var(--brand-muted)] font-medium">
            {t("converting", "Converting…")}
          </span>
          <span className="text-secondary font-bold">100%</span>
        </div>
        <div className="h-3 bg-[color:var(--brand-cream)] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-secondary to-[color:var(--brand-orange-dark)] rounded-full w-full" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {["PDF", "DOC", "XLS", "PPT", "JPG", "PNG", "TXT", "CSV"].map((format) => (
          <div key={format} className="p-2 bg-[color:var(--brand-cream)] rounded-lg text-center">
            <span className="text-xs font-bold text-[color:var(--brand-muted)]">{format}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  // Web-based preview
  3: (
    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md relative z-10">
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <div className="w-40 h-28 sm:w-48 sm:h-32 bg-[color:var(--brand-ink)] rounded-lg flex items-center justify-center">
            <div className="w-36 h-24 sm:w-44 sm:h-28 bg-gradient-to-br from-[color:var(--brand-peach)] to-[color:var(--brand-lilac)] rounded flex items-center justify-center">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-[color:var(--brand-muted)] rounded-full" />
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-1 bg-[color:rgba(106,95,132,0.7)] rounded-full" />
        </div>
      </div>
      <div className="text-center mb-4">
        <h4 className="text-lg sm:text-xl font-bold text-[color:var(--brand-ink)] mb-2">
          {t("worksOnAnyDevice", "Works on any device")}
        </h4>
        <p className="text-[color:var(--brand-muted)] text-sm">
          {t("noDownloadsRequired", "No downloads required")}
        </p>
      </div>
      <div className="flex justify-center gap-6">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[color:var(--brand-lilac)] rounded-xl flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <span className="text-xs text-[color:var(--brand-muted)]">
            {t("desktop", "Desktop")}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[color:var(--brand-lilac)] rounded-xl flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <span className="text-xs text-[color:var(--brand-muted)]">
            {t("mobile", "Mobile")}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[color:var(--brand-lilac)] rounded-xl flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
              <circle cx="12" cy="18" r="1" />
            </svg>
          </div>
          <span className="text-xs text-[color:var(--brand-muted)]">
            {t("tablet", "Tablet")}
          </span>
        </div>
      </div>
    </div>
  ),
});

export default function AdvantagesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useLanguage();
  const previewCards = useMemo(() => buildPreviewCards(t), [t]);

  return (
    <section className="pt-8 sm:pt-10 md:pt-12 pb-10 sm:pb-12 md:pb-16 bg-gradient-to-b from-white to-[color:var(--brand-cream)]">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-12 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[color:var(--brand-ink)] mb-4 sm:mb-6 leading-tight">
            {t("advantagesTitle", "The ultimate solution to edit and manage PDF documents")}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-[color:var(--brand-muted)]">
            {t("advantagesSubtitleAlt", "Everything you need to work with PDFs, all in one place")}
          </p>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-20 items-center max-w-7xl mx-auto">
          {/* Left side - Preview Image */}
          <div className="order-2 lg:order-1">
            <div className={`relative bg-gradient-to-br ${advantages[activeIndex].gradient} rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col min-h-[360px] sm:min-h-[420px] md:min-h-[450px] overflow-hidden shadow-xl transition-[background-color,box-shadow] duration-500`}>
              {/* Decorative elements */}
              <div className="absolute top-6 left-6 w-24 h-24 bg-white/40 rounded-full blur-2xl" />
              <div className="absolute bottom-6 right-6 w-36 h-36 bg-white/40 rounded-full blur-2xl" />

              {/* Dynamic preview card based on active index */}
              <div className="relative z-10 flex-1 flex items-center justify-center">
                <div className="transition-opacity duration-300">
                  {previewCards[activeIndex as keyof typeof previewCards]}
                </div>
              </div>

              {/* Floating badge */}
              <div className="relative z-10 mt-6 flex justify-end">
                <div className="bg-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-3">
                  <div className={`w-3 h-3 ${advantages[activeIndex].badgeColor} rounded-full animate-pulse`} />
                  <span className="text-base font-semibold text-[color:var(--brand-ink)]">
                    {t(advantages[activeIndex].badgeKey, advantages[activeIndex].badge)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Features list */}
          <div className="order-1 lg:order-2 space-y-4">
            {advantages.map((advantage, index) => (
              <button
                key={advantage.id}
                onClick={() => setActiveIndex(index)}
                className={`w-full text-left p-5 sm:p-6 md:p-7 rounded-2xl transition-[background-color,border-color,box-shadow] duration-300 ${
                  activeIndex === index
                    ? "bg-white shadow-xl border-2 border-[color:var(--brand-line)]"
                    : "bg-transparent hover:bg-white/80 border-2 border-transparent"
                }`}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                    activeIndex === index ? "bg-[color:var(--brand-lilac)] shadow-md" : "bg-[color:var(--brand-cream)]"
                  }`}>
                    <div className={`transition-transform duration-300 ${activeIndex === index ? "scale-110" : "scale-100"}`}>
                      {advantage.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg sm:text-xl mb-2 transition-colors ${
                      activeIndex === index ? "text-[color:var(--brand-ink)]" : "text-[color:var(--brand-muted)]"
                    }`}>
                      {t(advantage.titleKey, advantage.title)}
                    </h3>
                    <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
                      activeIndex === index ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                    }`}>
                      <p className="text-[color:var(--brand-muted)] text-base leading-relaxed">
                        {t(advantage.descriptionKey, advantage.description)}
                      </p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-300 ${activeIndex === index ? "rotate-180" : ""}`}>
                    <svg className="w-5 h-5 text-[color:var(--brand-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
