import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  // eslint-disable-next-line no-console
  console.log("Removed .next");
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn("Failed to remove .next:", error);
}

