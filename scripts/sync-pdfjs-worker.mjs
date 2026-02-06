import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "node_modules", "pdfjs-dist-v2", "build", "pdf.worker.min.js");
const targets = [
  path.join(root, "packages", "pdfeditor", "src", "assets", "js", "pdfjs", "pdf.worker.min.js"),
  path.join(root, "public", "pdfeditor", "assets", "js", "pdfjs", "pdf.worker.min.js"),
];

if (!fs.existsSync(source)) {
  console.warn(`[sync-pdfjs-worker] source missing: ${source}`);
  process.exit(0);
}

const sourceContent = fs.readFileSync(source);

let updated = 0;
for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const needCopy = !fs.existsSync(target) || !fs.readFileSync(target).equals(sourceContent);
  if (!needCopy) continue;
  fs.copyFileSync(source, target);
  updated += 1;
  console.info(`[sync-pdfjs-worker] updated: ${path.relative(root, target)}`);
}

if (updated === 0) {
  console.info("[sync-pdfjs-worker] already up to date");
}
