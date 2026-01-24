export type ToolStatus = "ready" | "comingSoon";

export type ToolCategory = "all" | "edit" | "convert" | "organize" | "security";

export type ToolDefinition = {
  key: string;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  href: string;
  icon: string;
  iconName: string; // New field for Lucide icon name
  status: ToolStatus;
  category: ToolCategory;
};

export const TOOL_CATEGORIES: { key: ToolCategory; label: string; labelKey: string; icon: string }[] = [
  { key: "all", label: "All Tools", labelKey: "allToolsTab", icon: "LayoutGrid" },
  { key: "edit", label: "Edit & Sign", labelKey: "editAndSignTab", icon: "PenTool" },
  { key: "convert", label: "Convert", labelKey: "convertTab", icon: "ArrowRightLeft" },
  { key: "organize", label: "Organize", labelKey: "organizeTab", icon: "Layers" },
  { key: "security", label: "Security", labelKey: "securityTab", icon: "ShieldCheck" },
];

export const TOOLS: ToolDefinition[] = [
  // Edit & Sign tools
  {
    key: "annotate",
    name: "Annotate PDF",
    nameKey: "annotatePdf",
    description: "Add text, shapes, drawings, highlights, and more.",
    descriptionKey: "annotatePdfDesc",
    href: "/tools/annotate",
    icon: "/assets/icons/tools/annotate.svg",
    iconName: "Highlighter",
    status: "ready",
    category: "edit",
  },
  {
    key: "edit",
    name: "Edit PDF",
    nameKey: "editPdf",
    description: "Overlay edits with text, shapes, and annotations.",
    descriptionKey: "editPdfDesc",
    href: "/tools/edit",
    icon: "/assets/icons/tools/edit.svg",
    iconName: "FilePenLine",
    status: "ready",
    category: "edit",
  },
  {
    key: "sign",
    name: "Sign PDF",
    nameKey: "signPdf",
    description: "Draw and apply your signature to a PDF.",
    descriptionKey: "signPdfDesc",
    href: "/tools/sign",
    icon: "/assets/icons/tools/sign.svg",
    iconName: "Signature",
    status: "ready",
    category: "edit",
  },
  {
    key: "redact",
    name: "Redact PDF",
    nameKey: "redactPdf",
    description: "Permanently remove sensitive information (rasterize-based).",
    descriptionKey: "redactPdfDesc",
    href: "/tools/redact",
    icon: "/assets/icons/tools/redact.svg",
    iconName: "Eraser",
    status: "ready",
    category: "edit",
  },
  {
    key: "watermark",
    name: "Add Watermark",
    nameKey: "addWatermark",
    description: "Add a text watermark to all pages.",
    descriptionKey: "addWatermarkDesc",
    href: "/tools/watermark",
    icon: "/assets/icons/tools/watermark.svg",
    iconName: "Stamp",
    status: "ready",
    category: "edit",
  },

  // Convert tools
  {
    key: "convert",
    name: "Convert Document",
    nameKey: "convertDocument",
    description: "Convert PDF ↔ images/text, images → PDF, Office → PDF.",
    descriptionKey: "convertDocumentDesc",
    href: "/tools/convert",
    icon: "/assets/icons/tools/convert.svg",
    iconName: "ArrowRightLeft",
    status: "ready",
    category: "convert",
  },
  {
    key: "compress",
    name: "Compress PDF",
    nameKey: "compressPdf",
    description: "Reduce file size (rasterize-based compression).",
    descriptionKey: "compressPdfDesc",
    href: "/tools/compress",
    icon: "/assets/icons/tools/compress.svg",
    iconName: "Minimize2",
    status: "ready",
    category: "convert",
  },
  {
    key: "merge",
    name: "Merge Documents",
    nameKey: "mergeDocuments",
    description: "Combine multiple PDFs into one.",
    descriptionKey: "mergeDocumentsDesc",
    href: "/tools/merge",
    icon: "/assets/icons/tools/merge.svg",
    iconName: "Files",
    status: "ready",
    category: "convert",
  },

  // Organize tools
  {
    key: "split",
    name: "Split & Extract Pages",
    nameKey: "splitExtractPages",
    description: "Split into PDFs or extract specific pages.",
    descriptionKey: "splitExtractPagesDesc",
    href: "/tools/split",
    icon: "/assets/icons/tools/split.svg",
    iconName: "Scissors",
    status: "ready",
    category: "organize",
  },
  {
    key: "organize",
    name: "Organize Pages",
    nameKey: "organizePages",
    description: "Reorder, rotate, delete, and export pages.",
    descriptionKey: "organizePagesDesc",
    href: "/tools/organize",
    icon: "/assets/icons/tools/organize.svg",
    iconName: "LayoutList",
    status: "ready",
    category: "organize",
  },
  {
    key: "rotate",
    name: "Rotate Pages",
    nameKey: "rotatePages",
    description: "Rotate pages (uses Organize Pages).",
    descriptionKey: "rotatePagesDesc",
    href: "/tools/rotate",
    icon: "/assets/icons/tools/rotate.svg",
    iconName: "RotateCw",
    status: "ready",
    category: "organize",
  },
  {
    key: "delete",
    name: "Delete Pages",
    nameKey: "deletePages",
    description: "Delete pages from PDFs by page order.",
    descriptionKey: "deletePagesDesc",
    href: "/tools/delete",
    icon: "/assets/icons/tools/delete.svg",
    iconName: "Trash2",
    status: "ready",
    category: "organize",
  },
  {
    key: "crop",
    name: "Crop Pages",
    nameKey: "cropPages",
    description: "Crop pages by margins.",
    descriptionKey: "cropPagesDesc",
    href: "/tools/crop",
    icon: "/assets/icons/tools/crop.svg",
    iconName: "Crop",
    status: "ready",
    category: "organize",
  },

  // Security tools
  {
    key: "password",
    name: "Password Protect",
    nameKey: "passwordProtect",
    description: "Encrypt a PDF with a password.",
    descriptionKey: "passwordProtectDesc",
    href: "/tools/password",
    icon: "/assets/icons/tools/password.svg",
    iconName: "Lock",
    status: "ready",
    category: "security",
  },
  {
    key: "unlock",
    name: "Unlock PDF",
    nameKey: "unlockPdf",
    description: "Remove PDF passwords (requires password).",
    descriptionKey: "unlockPdfDesc",
    href: "/tools/unlock",
    icon: "/assets/icons/tools/unlock.svg",
    iconName: "Unlock",
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
