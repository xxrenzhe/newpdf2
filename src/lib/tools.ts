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
    description: "Convert PDF ↔ images/text, or images → PDF.",
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
    description: "Split and extract pages (coming soon).",
    href: "/tools/split",
    icon: "https://ext.same-assets.com/170935311/1662545404.svg",
    status: "comingSoon",
  },
  {
    key: "organize",
    name: "Organize Pages",
    description: "Reorder, rotate, delete pages (coming soon).",
    href: "/tools/organize",
    icon: "https://ext.same-assets.com/170935311/3060953847.svg",
    status: "comingSoon",
  },
  {
    key: "redact",
    name: "Redact PDF",
    description: "Permanently remove sensitive information (coming soon).",
    href: "/tools/redact",
    icon: "https://ext.same-assets.com/170935311/611706699.svg",
    status: "comingSoon",
  },
  {
    key: "password",
    name: "Password Protect",
    description: "Add a password to PDFs (coming soon).",
    href: "/tools/password",
    icon: "https://ext.same-assets.com/170935311/227026812.svg",
    status: "comingSoon",
  },
  {
    key: "unlock",
    name: "Unlock PDF",
    description: "Remove PDF passwords (coming soon).",
    href: "/tools/unlock",
    icon: "https://ext.same-assets.com/170935311/458112585.svg",
    status: "comingSoon",
  },
  {
    key: "watermark",
    name: "Add Watermark",
    description: "Add a watermark to PDFs (coming soon).",
    href: "/tools/watermark",
    icon: "https://ext.same-assets.com/170935311/3638955808.svg",
    status: "comingSoon",
  },
  {
    key: "rotate",
    name: "Rotate Pages",
    description: "Rotate pages (coming soon).",
    href: "/tools/rotate",
    icon: "https://ext.same-assets.com/170935311/1224187398.svg",
    status: "comingSoon",
  },
  {
    key: "delete",
    name: "Delete Pages",
    description: "Delete pages from PDFs (coming soon).",
    href: "/tools/delete",
    icon: "https://ext.same-assets.com/170935311/4053557687.svg",
    status: "comingSoon",
  },
  {
    key: "crop",
    name: "Crop Pages",
    description: "Crop PDF pages (coming soon).",
    href: "/tools/crop",
    icon: "https://ext.same-assets.com/170935311/1066455525.svg",
    status: "comingSoon",
  },
];

export const toolByKey: Record<string, ToolDefinition> = Object.fromEntries(
  TOOLS.map((t) => [t.key, t])
);

