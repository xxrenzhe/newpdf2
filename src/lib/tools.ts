export type ToolStatus = "ready" | "comingSoon";

export type ToolDefinition = {
  key: string;
  name: string;
  description: string;
  href: string;
  icon: string;
  status: ToolStatus;
};

export const TOOLS: ToolDefinition[] = [
  {
    key: "annotate",
    name: "Annotate PDF",
    description: "Add text, shapes, drawings, highlights, and more.",
    href: "/tools/annotate",
    icon: "https://ext.same-assets.com/170935311/1101188712.svg",
    status: "ready",
  },
  {
    key: "edit",
    name: "Edit PDF",
    description: "Overlay edits with text, shapes, and annotations.",
    href: "/tools/edit",
    icon: "https://ext.same-assets.com/170935311/4207141155.svg",
    status: "ready",
  },
  {
    key: "sign",
    name: "Sign PDF",
    description: "Draw and apply your signature to a PDF.",
    href: "/tools/sign",
    icon: "https://ext.same-assets.com/170935311/1168656911.svg",
    status: "ready",
  },
  {
    key: "convert",
    name: "Convert Document",
    description: "Convert PDF ↔ images/text, images → PDF, Office → PDF.",
    href: "/tools/convert",
    icon: "https://ext.same-assets.com/170935311/201416504.svg",
    status: "ready",
  },
  {
    key: "merge",
    name: "Merge Documents",
    description: "Combine multiple PDFs into one.",
    href: "/tools/merge",
    icon: "https://ext.same-assets.com/170935311/2061392550.svg",
    status: "ready",
  },
  {
    key: "compress",
    name: "Compress PDF",
    description: "Reduce file size (rasterize-based compression).",
    href: "/tools/compress",
    icon: "https://ext.same-assets.com/170935311/3220459703.svg",
    status: "ready",
  },
  {
    key: "split",
    name: "Split & Extract Pages",
    description: "Split into PDFs or extract specific pages.",
    href: "/tools/split",
    icon: "https://ext.same-assets.com/170935311/1662545404.svg",
    status: "ready",
  },
  {
    key: "organize",
    name: "Organize Pages",
    description: "Reorder, rotate, delete, and export pages.",
    href: "/tools/organize",
    icon: "https://ext.same-assets.com/170935311/3060953847.svg",
    status: "ready",
  },
  {
    key: "redact",
    name: "Redact PDF",
    description: "Permanently remove sensitive information (rasterize-based).",
    href: "/tools/redact",
    icon: "https://ext.same-assets.com/170935311/611706699.svg",
    status: "ready",
  },
  {
    key: "password",
    name: "Password Protect",
    description: "Encrypt a PDF with a password.",
    href: "/tools/password",
    icon: "https://ext.same-assets.com/170935311/227026812.svg",
    status: "ready",
  },
  {
    key: "unlock",
    name: "Unlock PDF",
    description: "Remove PDF passwords (requires password).",
    href: "/tools/unlock",
    icon: "https://ext.same-assets.com/170935311/458112585.svg",
    status: "ready",
  },
  {
    key: "watermark",
    name: "Add Watermark",
    description: "Add a text watermark to all pages.",
    href: "/tools/watermark",
    icon: "https://ext.same-assets.com/170935311/3638955808.svg",
    status: "ready",
  },
  {
    key: "rotate",
    name: "Rotate Pages",
    description: "Rotate pages (uses Organize Pages).",
    href: "/tools/rotate",
    icon: "https://ext.same-assets.com/170935311/1224187398.svg",
    status: "ready",
  },
  {
    key: "delete",
    name: "Delete Pages",
    description: "Delete pages from PDFs (uses Organize Pages).",
    href: "/tools/delete",
    icon: "https://ext.same-assets.com/170935311/4053557687.svg",
    status: "ready",
  },
  {
    key: "crop",
    name: "Crop Pages",
    description: "Crop pages by margins.",
    href: "/tools/crop",
    icon: "https://ext.same-assets.com/170935311/1066455525.svg",
    status: "ready",
  },
];

export const toolByKey: Record<string, ToolDefinition> = Object.fromEntries(
  TOOLS.map((t) => [t.key, t])
);
