"use client";

import { useState } from "react";
import Link from "@/components/AppLink";
import { TOOLS, TOOL_CATEGORIES, getToolsByCategory, type ToolCategory } from "@/lib/tools";
import { ToolIcon } from "@/lib/toolIcons";
import { ChevronRight, Monitor } from "lucide-react";

// Colors for better visibility and theme handling - Muted styling
const categoryStyles: Record<ToolCategory, string> = {
  all: "bg-slate-50 border-slate-200 text-slate-600 group-hover:bg-slate-100 group-hover:border-slate-300",
  edit: "bg-indigo-50 border-indigo-200 text-indigo-600 group-hover:bg-indigo-100 group-hover:border-indigo-300",
  convert: "bg-orange-50 border-orange-200 text-orange-600 group-hover:bg-orange-100 group-hover:border-orange-300",
  organize: "bg-teal-50 border-teal-200 text-teal-600 group-hover:bg-teal-100 group-hover:border-teal-300",
  security: "bg-rose-50 border-rose-200 text-rose-600 group-hover:bg-rose-100 group-hover:border-rose-300",
};

export default function ToolsGrid() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("all");
  const filteredTools = getToolsByCategory(activeCategory);

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white" id="tools">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-semibold mb-4 border border-indigo-100">
            <Monitor className="w-4 h-4" />
            <span>Core Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            All PDF Tools You Need
          </h2>
          <p className="text-gray-600 text-lg md:text-xl leading-relaxed">
            Choose from our comprehensive suite of <span className="font-semibold text-primary">{TOOLS.length}+</span> powerful tools designed to make your PDF workflows seamless.
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
                  inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-base font-medium
                  transition-all duration-300 ease-in-out border
                  ${activeCategory === category.key
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-indigo-500/20 transform -translate-y-0.5"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900"
                  }
                `}
              >
                <ToolIcon name={category.icon} className="w-5 h-5" />
                <span>{category.label}</span>
                {category.key !== "all" && (
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full font-bold
                    ${activeCategory === category.key
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500"
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
                    tool-card group relative bg-white border border-gray-100 rounded-2xl p-6 
                    hover:shadow-xl hover:shadow-gray-200/50 hover:border-indigo-100 
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
                      <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors">
                        {tool.name}
                      </h3>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transform -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">
                      {tool.description}
                    </p>
                  </div>

                  {tool.status === "comingSoon" && (
                    <span className="absolute top-4 right-4 inline-flex text-[10px] uppercase tracking-wider px-2 py-1 rounded-md bg-amber-50 text-amber-600 font-bold border border-amber-100">
                      Soon
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
              className="inline-flex items-center gap-2 text-primary hover:text-indigo-700 font-semibold text-lg transition-colors group"
            >
              <span>View all {TOOLS.length} tools</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
