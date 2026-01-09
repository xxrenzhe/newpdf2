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
    href: "/tools/annotate",
    icon: "https://ext.same-assets.com/170935311/1101188712.svg",
    status: "ready",
    category: "edit",
  },
  {
    key: "edit",
    name: "Edit PDF",
    description: "Overlay edits with text, shapes, and annotations.",
    href: "/tools/edit",
    icon: "https://ext.same-assets.com/170935311/4207141155.svg",
    status: "ready",
    category: "edit",
  },
  {
    key: "sign",
    name: "Sign PDF",
    description: "Draw and apply your signature to a PDF.",
    href: "/tools/sign",
    icon: "https://ext.same-assets.com/170935311/1168656911.svg",
    status: "ready",
    category: "edit",
  },
  {
    key: "redact",
    name: "Redact PDF",
    description: "Permanently remove sensitive information (rasterize-based).",
    href: "/tools/redact",
    icon: "https://ext.same-assets.com/170935311/611706699.svg",
    status: "ready",
    category: "edit",
  },
  {
    key: "watermark",
    name: "Add Watermark",
    description: "Add a text watermark to all pages.",
    href: "/tools/watermark",
    icon: "https://ext.same-assets.com/170935311/3638955808.svg",
    status: "ready",
    category: "edit",
  },

  // Convert tools
  {
    key: "convert",
    name: "Convert Document",
    description: "Convert PDF ↔ images/text, images → PDF, Office → PDF.",
    href: "/tools/convert",
    icon: "https://ext.same-assets.com/170935311/201416504.svg",
    status: "ready",
    category: "convert",
  },
  {
    key: "compress",
    name: "Compress PDF",
    description: "Reduce file size (rasterize-based compression).",
    href: "/tools/compress",
    icon: "https://ext.same-assets.com/170935311/3220459703.svg",
    status: "ready",
    category: "convert",
  },
  {
    key: "merge",
    name: "Merge Documents",
    description: "Combine multiple PDFs into one.",
    href: "/tools/merge",
    icon: "https://ext.same-assets.com/170935311/2061392550.svg",
    status: "ready",
    category: "convert",
  },

  // Organize tools
  {
    key: "split",
    name: "Split & Extract Pages",
    description: "Split into PDFs or extract specific pages.",
    href: "/tools/split",
    icon: "https://ext.same-assets.com/170935311/1662545404.svg",
    status: "ready",
    category: "organize",
  },
  {
    key: "organize",
    name: "Organize Pages",
    description: "Reorder, rotate, delete, and export pages.",
    href: "/tools/organize",
    icon: "https://ext.same-assets.com/170935311/3060953847.svg",
    status: "ready",
    category: "organize",
  },
  {
    key: "rotate",
    name: "Rotate Pages",
    description: "Rotate pages (uses Organize Pages).",
    href: "/tools/rotate",
    icon: "https://ext.same-assets.com/170935311/1224187398.svg",
    status: "ready",
    category: "organize",
  },
  {
    key: "delete",
    name: "Delete Pages",
    description: "Delete pages from PDFs (uses Organize Pages).",
    href: "/tools/delete",
    icon: "https://ext.same-assets.com/170935311/4053557687.svg",
    status: "ready",
    category: "organize",
  },
  {
    key: "crop",
    name: "Crop Pages",
    description: "Crop pages by margins.",
    href: "/tools/crop",
    icon: "https://ext.same-assets.com/170935311/1066455525.svg",
    status: "ready",
    category: "organize",
  },

  // Security tools
  {
    key: "password",
    name: "Password Protect",
    description: "Encrypt a PDF with a password.",
    href: "/tools/password",
    icon: "https://ext.same-assets.com/170935311/227026812.svg",
    status: "ready",
    category: "security",
  },
  {
    key: "unlock",
    name: "Unlock PDF",
    description: "Remove PDF passwords (requires password).",
    href: "/tools/unlock",
    icon: "https://ext.same-assets.com/170935311/458112585.svg",
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
