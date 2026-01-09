import fs from "node:fs";
import path from "node:path";

function copyFileIfExists(from, to) {
  if (!fs.existsSync(from)) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  return true;
}

const root = process.cwd();
const qpdfWasmFrom = path.join(root, "node_modules", "qpdf-wasm", "qpdf.wasm");
const qpdfWasmTo = path.join(root, "public", "wasm", "qpdf.wasm");

copyFileIfExists(qpdfWasmFrom, qpdfWasmTo);

