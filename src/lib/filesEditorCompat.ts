export const CHOSEN_TOOL_TO_TOOL_KEY: Record<string, string> = {
  annotate: "annotate",
  "edit-pdf": "edit",
  sign: "edit",
  redact: "edit",
  watermark: "edit",
  "delete-pages": "edit",
  convert: "convert",
  merge: "merge",
  compress: "compress",
  "split-extract-pages": "split",
  organize: "organize",
  "password-protect": "password",
  unlock: "unlock",
  crop: "crop",
  "rotate-pages": "rotate",
};

export const TOOL_KEY_TO_CHOSEN_TOOL: Record<string, string> = {
  annotate: "annotate",
  edit: "edit-pdf",
  sign: "sign",
  redact: "redact",
  watermark: "watermark",
  delete: "delete-pages",
  convert: "convert",
  merge: "merge",
  compress: "compress",
  split: "split-extract-pages",
  organize: "organize",
  password: "password-protect",
  unlock: "unlock",
  crop: "crop",
  rotate: "rotate-pages",
};

export function toolKeyFromChosenTool(chosenTool: string | null | undefined): string {
  if (!chosenTool) return "annotate";
  return CHOSEN_TOOL_TO_TOOL_KEY[chosenTool] ?? "annotate";
}

export function chosenToolFromToolKey(toolKey: string): string {
  return TOOL_KEY_TO_CHOSEN_TOOL[toolKey] ?? "annotate";
}

export function pdfEditorInitialTool(chosenTool: string | null | undefined): string | null {
  if (chosenTool === "sign") return "signature";
  if (chosenTool === "redact") return "radact";
  if (chosenTool === "watermark") return "watermark";
  if (chosenTool === "delete-pages") return "delete_pages";
  return null;
}

export function displayToolKeyFromChosenTool(chosenTool: string | null | undefined, fallbackToolKey: string): string {
  if (chosenTool === "sign") return "sign";
  if (chosenTool === "redact") return "redact";
  if (chosenTool === "watermark") return "watermark";
  if (chosenTool === "delete-pages") return "delete";
  return fallbackToolKey;
}
