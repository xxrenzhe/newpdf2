import fs from "node:fs";
import path from "node:path";

const typesFile = path.join(process.cwd(), ".next", "types", "routes.d.ts");

if (!fs.existsSync(typesFile)) {
  fs.mkdirSync(path.dirname(typesFile), { recursive: true });
  fs.writeFileSync(typesFile, "export {};\n");
}

