export type ToolStatus = "ready" | "comingSoon";

export type ToolCategory = "all" | "edit" | "convert" | "organize" | "security";

export type ToolDefinition = {
  key: string;
  name: string;
  description: string;
  href: string;
  icon: string;
  status: ToolStatus;
  category: ToolCategory;
};

export const TOOL_CATEGORIES: { key: ToolCategory; label: string; icon: string }[] = [
  { key: "all", label: "All Tools", icon: "grid" },
  { key: "edit", label: "Edit & Sign", icon: "edit" },
  { key: "convert", label: "Convert", icon: "convert" },
  { key: "organize", label: "Organize", icon: "organize" },
  { key: "security", label: "Security", icon: "security" },
];

export const TOOLS: ToolDefinition[] = [
  // Edit & Sign tools
  {
    key: "annotate",
    name: "Annotate PDF",
    description: "Add text, shapes, drawings, highlights, and more.",
    href: "/app/guest/document?chosenTool=annotate",
    icon: "/assets/icons/tools/annotate.svg",
    status: "ready",
    category: "edit",
  },
  {
    key: "edit",
    name: "Edit PDF",
    description: "Overlay edits with text, shapes, and annotations.",
    href: "/app/guest/document?chosenTool=edit-pdf",
    icon: "/assets/icons/tools/edit.svg",
    status: "ready",
    category: "edit",
  },
  {
    key: "sign",
    name: "Sign PDF",
    description: "Draw and apply your signature to a PDF.",
    href: "/app/guest/document?chosenTool=sign",
    icon: "/assets/icons/tools/sign.svg",
    status: "ready",
    category: "edit",
  },
  {
    key: "redact",
    name: "Redact PDF",
    description: "Permanently remove sensitive information (rasterize-based).",
    href: "/app/guest/document?chosenTool=redact",
    icon: "/assets/icons/tools/redact.svg",
    status: "ready",
    category: "edit",
  },
  {
    key: "watermark",
    name: "Add Watermark",
    description: "Add a text watermark to all pages.",
    href: "/app/guest/document?chosenTool=watermark",
    icon: "/assets/icons/tools/watermark.svg",
    status: "ready",
    category: "edit",
  },

  // Convert tools
  {
    key: "convert",
    name: "Convert Document",
    description: "Convert PDF ↔ images/text, images → PDF, Office → PDF.",
    href: "/app/guest/document?chosenTool=convert",
    icon: "/assets/icons/tools/convert.svg",
    status: "ready",
    category: "convert",
  },
  {
    key: "compress",
    name: "Compress PDF",
    description: "Reduce file size (rasterize-based compression).",
    href: "/app/guest/document?chosenTool=compress",
    icon: "/assets/icons/tools/compress.svg",
    status: "ready",
    category: "convert",
  },
  {
    key: "merge",
    name: "Merge Documents",
    description: "Combine multiple PDFs into one.",
    href: "/app/guest/document?chosenTool=merge",
    icon: "/assets/icons/tools/merge.svg",
    status: "ready",
    category: "convert",
  },

  // Organize tools
  {
    key: "split",
    name: "Split & Extract Pages",
    description: "Split into PDFs or extract specific pages.",
    href: "/app/guest/document?chosenTool=split-extract-pages",
    icon: "/assets/icons/tools/split.svg",
    status: "ready",
    category: "organize",
  },
  {
    key: "organize",
    name: "Organize Pages",
    description: "Reorder, rotate, delete, and export pages.",
    href: "/app/guest/document?chosenTool=organize",
    icon: "/assets/icons/tools/organize.svg",
    status: "ready",
    category: "organize",
  },
  {
    key: "rotate",
    name: "Rotate Pages",
    description: "Rotate pages (uses Organize Pages).",
    href: "/app/guest/document?chosenTool=rotate-pages",
    icon: "/assets/icons/tools/rotate.svg",
    status: "ready",
    category: "organize",
  },
  {
    key: "delete",
    name: "Delete Pages",
    description: "Delete pages from PDFs by page order.",
    href: "/app/guest/document?chosenTool=delete-pages",
    icon: "/assets/icons/tools/delete.svg",
    status: "ready",
    category: "organize",
  },
  {
    key: "crop",
    name: "Crop Pages",
    description: "Crop pages by margins.",
    href: "/app/guest/document?chosenTool=crop",
    icon: "/assets/icons/tools/crop.svg",
    status: "ready",
    category: "organize",
  },

  // Security tools
  {
    key: "password",
    name: "Password Protect",
    description: "Encrypt a PDF with a password.",
    href: "/app/guest/document?chosenTool=password-protect",
    icon: "/assets/icons/tools/password.svg",
    status: "ready",
    category: "security",
  },
  {
    key: "unlock",
    name: "Unlock PDF",
    description: "Remove PDF passwords (requires password).",
    href: "/app/guest/document?chosenTool=unlock",
    icon: "/assets/icons/tools/unlock.svg",
    status: "ready",
    category: "security",
  },
];

export const toolByKey: Record<string, ToolDefinition> = Object.fromEntries(
  TOOLS.map((t) => [t.key, t])
);

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  if (category === "all") return TOOLS;
  return TOOLS.filter((t) => t.category === category);
}
