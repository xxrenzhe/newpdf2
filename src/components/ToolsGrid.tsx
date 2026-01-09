"use client";

import Link from "next/link";
import { TOOLS } from "@/lib/tools";

const colors = [
  "bg-orange-50",
  "bg-blue-50",
  "bg-indigo-50",
  "bg-green-50",
  "bg-purple-50",
  "bg-teal-50",
  "bg-red-50",
  "bg-cyan-50",
  "bg-yellow-50",
  "bg-emerald-50",
  "bg-lime-50",
  "bg-sky-50",
  "bg-pink-50",
  "bg-rose-50",
  "bg-amber-50",
];

export default function ToolsGrid() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((tool, index) => {
            const bgClass = colors[index % colors.length] ?? colors[0]!;
            return (
            <Link
              key={index}
              href={tool.href}
              className="tool-card group bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center`}>
                  <img src={tool.icon} alt="" className="w-6 h-6" />
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">{tool.name}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{tool.description}</p>
              {tool.status === "comingSoon" && (
                <span className="inline-flex mt-3 text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  Coming soon
                </span>
              )}
            </Link>
          )})}
        </div>
      </div>
    </section>
  );
}
