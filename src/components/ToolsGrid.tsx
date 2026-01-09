"use client";

import Link from "next/link";

const tools = [
  {
    name: "Annotate PDF",
    description: "Add text, images, shapes, drawings, sticky notes, highlight and more.",
    href: "/tools/annotate",
    color: "bg-orange-50",
    iconColor: "text-orange-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    name: "Edit PDF",
    description: "Edit your PDF by removing, editing, or adding text and changing fonts, colors, and more.",
    href: "/tools/edit",
    color: "bg-blue-50",
    iconColor: "text-blue-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    name: "Sign PDF",
    description: "Apply your signature, add initials, dates, checkboxes and more.",
    href: "/tools/sign",
    color: "bg-indigo-50",
    iconColor: "text-indigo-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    ),
  },
  {
    name: "Convert Document",
    description: "Easily convert files to PDF, Word, Excel, and more.",
    href: "/tools/convert",
    color: "bg-green-50",
    iconColor: "text-green-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="M9 15l3 3 3-3" />
      </svg>
    ),
  },
  {
    name: "Merge Documents",
    description: "Combine PDFs in any order with our merger tool.",
    href: "/tools/merge",
    color: "bg-purple-50",
    iconColor: "text-purple-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="8" height="12" rx="1" />
        <rect x="14" y="6" width="8" height="12" rx="1" />
        <path d="M10 12h4" />
      </svg>
    ),
  },
  {
    name: "Compress PDF",
    description: "Reduce file size while optimizing for maximal PDF quality.",
    href: "/tools/compress",
    color: "bg-teal-50",
    iconColor: "text-teal-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="M9 15l3-3 3 3" />
      </svg>
    ),
  },
  {
    name: "Redact PDF",
    description: "Permanently remove sensitive information from your PDF.",
    href: "/tools/redact",
    color: "bg-red-50",
    iconColor: "text-red-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    ),
  },
  {
    name: "Organize Pages",
    description: "Sort your PDF pages as you like. Delete or add pages as needed.",
    href: "/tools/organize",
    color: "bg-cyan-50",
    iconColor: "text-cyan-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="6" height="8" rx="1" />
        <rect x="3" y="13" width="6" height="8" rx="1" />
        <rect x="15" y="3" width="6" height="8" rx="1" />
        <rect x="15" y="13" width="6" height="8" rx="1" />
      </svg>
    ),
  },
  {
    name: "Split & Extract Pages",
    description: "Split and extract PDF pages to create separate files.",
    href: "/tools/split",
    color: "bg-yellow-50",
    iconColor: "text-yellow-600",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M12 2v20" />
      </svg>
    ),
  },
  {
    name: "Password Protect",
    description: "Secure your PDFs by adding a password.",
    href: "/tools/password",
    color: "bg-emerald-50",
    iconColor: "text-emerald-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    name: "Unlock PDF",
    description: "Remove PDF passwords for full access and flexibility.",
    href: "/tools/unlock",
    color: "bg-lime-50",
    iconColor: "text-lime-600",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
    ),
  },
  {
    name: "Add Watermark",
    description: "Add a watermark or text as protection to your PDF files.",
    href: "/tools/watermark",
    color: "bg-sky-50",
    iconColor: "text-sky-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    name: "Rotate Pages",
    description: "Rotate your PDFs pages in portrait or landscape mode.",
    href: "/tools/rotate",
    color: "bg-pink-50",
    iconColor: "text-pink-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 4v6h-6" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    ),
  },
  {
    name: "Delete Pages",
    description: "Remove one or multiple pages from your PDF.",
    href: "/tools/delete",
    color: "bg-rose-50",
    iconColor: "text-rose-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    ),
  },
  {
    name: "Crop Pages",
    description: "Crop and trim your documents with our PDF cropper.",
    href: "/tools/crop",
    color: "bg-amber-50",
    iconColor: "text-amber-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" />
        <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" />
      </svg>
    ),
  },
];

export default function ToolsGrid() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool, index) => (
            <Link
              key={index}
              href={tool.href}
              className="tool-card group bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center ${tool.iconColor}`}>
                  {tool.icon}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">{tool.name}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{tool.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
