import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageWorker = path.join(root, "packages", "pdfeditor", "src", "assets", "js", "pdfjs", "pdf.worker.min.js");
const oldcodeWorker = path.join(root, "oldcode", "pdfeditor", "src", "assets", "js", "pdfjs", "pdf.worker.min.js");
const nodeModulesWorker = path.join(root, "node_modules", "pdfjs-dist-v2", "build", "pdf.worker.min.js");
const preferOldcodeWorker = process.env.PDFEDITOR_USE_OLDCODE_WORKER === "1";
const assembleToken = Buffer.from("AssemblePDF");

function readIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}

function hasAssembleWorkerCapability(content) {
  return Buffer.isBuffer(content) && content.includes(assembleToken);
}

const nodeModulesContent = readIfExists(nodeModulesWorker);
const packageContent = readIfExists(packageWorker);
const oldcodeContent = readIfExists(oldcodeWorker);

let sourcePath = null;
let sourceContent = null;

if (preferOldcodeWorker && hasAssembleWorkerCapability(oldcodeContent)) {
  sourcePath = oldcodeWorker;
  sourceContent = oldcodeContent;
} else if (nodeModulesContent) {
  sourcePath = nodeModulesWorker;
  sourceContent = nodeModulesContent;
} else if (packageContent) {
  sourcePath = packageWorker;
  sourceContent = packageContent;
}

if (!sourcePath || !sourceContent) {
  console.warn("[sync-pdfjs-worker] no worker source found");
  process.exit(0);
}

if (sourcePath === oldcodeWorker) {
  console.info(`[sync-pdfjs-worker] using patched worker source: ${path.relative(root, sourcePath)}`);
}

if (!hasAssembleWorkerCapability(sourceContent)) {
  console.warn("[sync-pdfjs-worker] warning: selected worker source does not contain AssemblePDF");
}

const targets = [
  packageWorker,
  path.join(root, "public", "pdfeditor", "assets", "js", "pdfjs", "pdf.worker.min.js"),
];

let updated = 0;
for (const target of targets) {
  if (target === sourcePath) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const needCopy = !fs.existsSync(target) || !fs.readFileSync(target).equals(sourceContent);
  if (!needCopy) continue;
  fs.writeFileSync(target, sourceContent);
  updated += 1;
  console.info(`[sync-pdfjs-worker] updated: ${path.relative(root, target)}`);
}

if (updated === 0) {
  console.info("[sync-pdfjs-worker] already up to date");
}
