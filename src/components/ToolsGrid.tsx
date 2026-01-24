"use client";

import { useState } from "react";
import Link from "@/components/AppLink";
import { TOOLS, TOOL_CATEGORIES, getToolsByCategory, type ToolCategory } from "@/lib/tools";
import { ToolIcon } from "@/lib/toolIcons";
import { ChevronRight, Monitor } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Colors for better visibility and theme handling - Muted styling
const categoryStyles: Record<ToolCategory, string> = {
  all: "bg-white/70 border-[color:var(--brand-line)] text-[color:var(--brand-muted)] group-hover:bg-white",
  edit: "bg-[color:var(--brand-lilac)] border-[color:rgba(91,75,183,0.3)] text-primary group-hover:bg-[color:var(--brand-peach)]",
  convert: "bg-[color:var(--brand-peach)] border-[color:rgba(242,140,40,0.4)] text-secondary group-hover:bg-[color:var(--brand-lilac)]",
  organize: "bg-[color:var(--brand-cream)] border-[color:rgba(91,75,183,0.2)] text-primary group-hover:bg-[color:var(--brand-lilac)]",
  security: "bg-[color:var(--brand-peach)] border-[color:rgba(242,140,40,0.3)] text-secondary group-hover:bg-[color:var(--brand-cream)]",
};

export default function ToolsGrid() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("all");
  const filteredTools = getToolsByCategory(activeCategory);
  const { t } = useLanguage();

  return (
    <section className="py-20 bg-gradient-to-b from-[color:var(--brand-cream)] to-white" id="tools">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--brand-lilac)] text-primary text-sm font-semibold mb-4 border border-[color:var(--brand-line)]">
            <Monitor className="w-4 h-4" />
            <span>{t("coreFeatures", "Core Features")}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[color:var(--brand-ink)] mb-6 tracking-tight">
            {t("allPdfToolsTitle", "All PDF Tools You Need")}
          </h2>
          <p className="text-[color:var(--brand-muted)] text-lg md:text-xl leading-relaxed">
            {t(
              "allPdfToolsSubtitle",
              "Choose from our comprehensive suite of {count}+ powerful tools designed to make your PDF workflows seamless."
            ).replace("{count}", `${TOOLS.length}`)}
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {TOOL_CATEGORIES.map((category) => {
            return (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={`
                  inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-base font-semibold
                  transition-all duration-300 ease-in-out border
                  ${activeCategory === category.key
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-[rgba(91,75,183,0.25)] transform -translate-y-0.5"
                    : "bg-white/80 text-[color:var(--brand-muted)] border-[color:var(--brand-line)] hover:bg-white hover:border-[color:rgba(91,75,183,0.3)] hover:text-[color:var(--brand-ink)]"
                  }
                `}
              >
                <ToolIcon name={category.icon} className="w-5 h-5" />
                <span>{t(category.labelKey, category.label)}</span>
                {category.key !== "all" && (
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full font-bold
                    ${activeCategory === category.key
                      ? "bg-white/20 text-white"
                      : "bg-[color:var(--brand-cream)] text-[color:var(--brand-muted)]"
                    }
                  `}>
                    {getToolsByCategory(category.key).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tools Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTools.map((tool, index) => {
              const categoryStyle = categoryStyles[tool.category];

              return (
                <Link
                  key={tool.key}
                  href={tool.href}
                  className={`
                    tool-card group relative bg-white border border-[color:var(--brand-line)] rounded-2xl p-6 
                    hover:shadow-xl hover:border-[color:rgba(91,75,183,0.2)]
                    transition-all duration-300 animate-fade-in flex flex-col items-start
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center mb-5
                    transition-all duration-300 group-hover:scale-110 group-hover:rotate-3
                    border ${categoryStyle}
                  `}>
                    <ToolIcon name={tool.iconName} className="w-6 h-6 stroke-[2px]" />
                  </div>

                  <div className="flex-1 w-full">
                  <div className="flex items-center justify-between w-full mb-2">
                    <h3 className="font-bold text-[color:var(--brand-ink)] text-lg group-hover:text-primary transition-colors">
                      {t(tool.nameKey, tool.name)}
                    </h3>
                    <ChevronRight className="w-5 h-5 text-[color:var(--brand-line)] group-hover:text-primary transform -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                  <p className="text-sm text-[color:var(--brand-muted)] leading-relaxed font-medium">
                    {t(tool.descriptionKey, tool.description)}
                  </p>
                </div>

                  {tool.status === "comingSoon" && (
                    <span className="absolute top-4 right-4 inline-flex text-[10px] uppercase tracking-wider px-2 py-1 rounded-md bg-amber-50 text-amber-600 font-bold border border-amber-100">
                      {t("comingSoonShort", "Soon")}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* View All Link */}
        {activeCategory !== "all" && (
          <div className="text-center mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setActiveCategory("all")}
              className="inline-flex items-center gap-2 text-primary hover:text-[color:var(--brand-purple-dark)] font-semibold text-lg transition-colors group"
            >
              <span>
                {t("viewAllTools", "View all {count} tools").replace("{count}", `${TOOLS.length}`)}
              </span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
