import { spawn } from "node:child_process";
import { cp, rm } from "node:fs/promises";
import path from "node:path";

function readArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

const portArg = readArgValue("--port") ?? readArgValue("-p");
const port = portArg ?? process.env.PORT ?? "3000";

const projectRoot = process.cwd();
const srcStatic = path.join(projectRoot, ".next", "static");
const dstStatic = path.join(projectRoot, ".next", "standalone", ".next", "static");
const srcPublic = path.join(projectRoot, "public");
const dstPublic = path.join(projectRoot, ".next", "standalone", "public");
const standaloneServer = path.join(projectRoot, ".next", "standalone", "server.js");

await rm(dstStatic, { recursive: true, force: true });
await cp(srcStatic, dstStatic, { recursive: true });

await rm(dstPublic, { recursive: true, force: true });
await cp(srcPublic, dstPublic, { recursive: true });

const child = spawn(process.execPath, [standaloneServer], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
