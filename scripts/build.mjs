import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { createRequire } from "node:module";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runInherit(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", env });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

function runCapture(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["inherit", "pipe", "pipe"], env });
    let output = "";

    const append = (chunk) => {
      output += chunk.toString("utf8");
      if (output.length > 200_000) output = output.slice(-200_000);
    };

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      append(chunk);
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      append(chunk);
    });

    child.on("exit", (code) => resolve({ code: code ?? 0, output }));
  });
}

function looksLikeTransientNextBuildFailure(output) {
  if (!output.includes("ENOENT")) return false;
  if (!output.includes(".next")) return false;
  return (
    output.includes("routes-manifest.json") ||
    output.includes("pages-manifest.json") ||
    output.includes("build-manifest.json") ||
    output.includes("app-path-routes-manifest.json") ||
    output.includes("prerender-manifest.json") ||
    output.includes(".nft.json")
  );
}

const env = { ...process.env, NEXT_IGNORE_INCORRECT_LOCKFILE: "1" };

const pdfeditorCode = await runInherit("npm", ["run", "build:pdfeditor"], env);
if (pdfeditorCode !== 0) process.exit(pdfeditorCode);

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const maxAttempts = 3;
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  if (attempt > 1) {
    // eslint-disable-next-line no-console
    console.warn(`Retrying Next build (attempt ${attempt}/${maxAttempts}) due to transient ENOENT…`);
    await rm(".next", { recursive: true, force: true });
    await sleep(500);
  }

  const { code, output } = await runCapture(process.execPath, [nextBin, "build"], env);
  if (code === 0) process.exit(0);
  if (!looksLikeTransientNextBuildFailure(output)) process.exit(code);
}

process.exit(1);
