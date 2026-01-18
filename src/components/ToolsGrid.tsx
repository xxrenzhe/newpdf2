"use client";

import { useState } from "react";
import Link from "@/components/AppLink";
import { TOOLS, TOOL_CATEGORIES, getToolsByCategory, type ToolCategory } from "@/lib/tools";

// Category icons - larger size for better visibility
const CategoryIcons = {
  grid: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  edit: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  convert: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18v-6" />
      <path d="M9 15l3 3 3-3" />
    </svg>
  ),
  organize: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  ),
  security: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
};

// Stronger background colors for better visibility
const categoryColors: Record<ToolCategory, string> = {
  all: "bg-slate-100",
  edit: "bg-blue-100",
  convert: "bg-emerald-100",
  organize: "bg-violet-100",
  security: "bg-amber-100",
};

const categoryHoverColors: Record<ToolCategory, string> = {
  all: "group-hover:bg-slate-200",
  edit: "group-hover:bg-blue-200",
  convert: "group-hover:bg-emerald-200",
  organize: "group-hover:bg-violet-200",
  security: "group-hover:bg-amber-200",
};

// Border colors for cards
const categoryBorderColors: Record<ToolCategory, string> = {
  all: "hover:border-slate-300",
  edit: "hover:border-blue-300",
  convert: "hover:border-emerald-300",
  organize: "hover:border-violet-300",
  security: "hover:border-amber-300",
};

export default function ToolsGrid() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("all");
  const filteredTools = getToolsByCategory(activeCategory);

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white" id="tools">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-5">
            All PDF Tools You Need
          </h2>
          <p className="text-gray-600 text-lg md:text-xl">
            Choose from our comprehensive suite of <span className="font-semibold text-[#2d85de]">{TOOLS.length}+</span> powerful PDF editing tools
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {TOOL_CATEGORIES.map((category) => (
            <button
              key={category.key}
              onClick={() => setActiveCategory(category.key)}
              className={`
                inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-base font-semibold
                transition-all duration-300
                ${activeCategory === category.key
                  ? "bg-[#2d85de] text-white shadow-lg shadow-blue-300/50 scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm border border-gray-200"
                }
              `}
            >
              {CategoryIcons[category.icon as keyof typeof CategoryIcons]}
              <span>{category.label}</span>
              {category.key !== "all" && (
                <span className={`
                  text-sm px-2 py-0.5 rounded-full font-bold
                  ${activeCategory === category.key
                    ? "bg-white/25 text-white"
                    : "bg-gray-100 text-gray-600"
                  }
                `}>
                  {getToolsByCategory(category.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool, index) => {
              const bgClass = categoryColors[tool.category];
              const hoverBgClass = categoryHoverColors[tool.category];
              const borderClass = categoryBorderColors[tool.category];
              return (
                <Link
                  key={tool.key}
                  href={tool.href}
                  className={`tool-card group bg-white border-2 border-gray-100 rounded-2xl p-7 ${borderClass} hover:shadow-2xl transition-all duration-300 animate-fade-in`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-16 h-16 rounded-2xl ${bgClass} ${hoverBgClass} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      <img src={tool.icon} alt="" className="w-9 h-9" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-1">
                      <div className="w-10 h-10 rounded-full bg-[#2d85de] flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3 text-xl group-hover:text-[#2d85de] transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                    {tool.description}
                  </p>
                  {tool.status === "comingSoon" && (
                    <span className="inline-flex mt-4 text-sm px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                      Coming soon
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* View All Link */}
        {activeCategory !== "all" && (
          <div className="text-center mt-12">
            <button
              onClick={() => setActiveCategory("all")}
              className="inline-flex items-center gap-2 text-[#2d85de] hover:text-[#2473c4] font-semibold text-lg transition-colors"
            >
              <span>View all {TOOLS.length} tools</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
