import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

const ORIGIN = "https://qwerpdf.com";
const START_URLS = [
  "https://qwerpdf.com/en",
  // Representative PDF editor sample provided by user:
  "https://qwerpdf.com/app/guest/document?documentId=6453bfa3-d333-4d60-883a-1483c00f5b37",
];

const OUT_DIR = path.resolve("reports/files-editor-audit");
const MAX_PAGES = Number(process.env.AUDIT_MAX_PAGES ?? 60);
const NAV_TIMEOUT_MS = Number(process.env.AUDIT_NAV_TIMEOUT_MS ?? 45_000);

function sha1(input) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 10);
}

function safeNameFromUrl(url) {
  const u = new URL(url);
  const base = `${u.pathname.replace(/\/+/g, "_").replace(/[^\w.-]+/g, "_")}${u.search ? "_q" : ""}`;
  return `${base}_${sha1(url)}`.replace(/^_+/, "").slice(0, 120);
}

function normalizeHref(baseUrl, href) {
  if (!href) return null;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  if (href.startsWith("javascript:")) return null;
  if (href === "#" || href.startsWith("#")) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function shouldVisit(url) {
  const u = new URL(url);
  if (u.origin !== ORIGIN) return false;
  // Avoid obviously non-page endpoints.
  if (u.pathname.endsWith(".pdf") || u.pathname.endsWith(".zip")) return false;
  if (u.pathname.startsWith("/api/")) return false;
  // Keep guest document traversal bounded.
  if (u.pathname === "/app/guest/document") {
    const documentId = u.searchParams.get("documentId");
    const chosenTool = u.searchParams.get("chosenTool");
    // Allow tool entry (upload) pages.
    if (!documentId && chosenTool) return true;
    // Allow exactly one sample docId (or docs created by automated upload if enabled).
    if (documentId) return true;
    return false;
  }
  return true;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const headless = String(process.env.AUDIT_HEADLESS ?? "1") !== "0";
  const browser = await chromium.launch({
    headless,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-default-browser-check",
      "--no-first-run",
    ],
  });
  const context = await browser.newContext({
    locale: "en-US",
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  const queue = [...START_URLS];
  const visited = new Set();
  const results = [];

  while (queue.length > 0 && results.length < MAX_PAGES) {
    const url = queue.shift();
    if (!url) break;
    if (visited.has(url)) continue;
    if (!shouldVisit(url)) continue;
    visited.add(url);

    const page = await context.newPage();
    const requests = [];
    const consoleMessages = [];

    page.on("requestfailed", (r) => {
      requests.push({
        url: r.url(),
        method: r.method(),
        failure: r.failure()?.errorText ?? "unknown",
      });
    });
    page.on("console", (m) => {
      consoleMessages.push({
        type: m.type(),
        text: m.text(),
      });
    });

    const record = {
      url,
      finalUrl: url,
      status: null,
      title: "",
      description: "",
      h1: [],
      h2: [],
      navLinks: [],
      buttons: [],
      inputs: [],
      iframes: [],
      linkCount: 0,
      uploadAttempted: false,
      uploadResultUrl: "",
      interactiveHints: [],
      requestFailures: [],
      console: [],
      screenshot: "",
      ts: new Date().toISOString(),
    };

    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
      record.status = response?.status() ?? null;
      record.finalUrl = page.url();

      // Best-effort: allow app shells to render (PDF editor UIs can take longer).
      {
        const u = new URL(record.finalUrl);
        if (u.origin === ORIGIN && u.pathname === "/app/guest/document" && u.searchParams.get("documentId")) {
          await page.waitForTimeout(6000);
        } else if (u.origin === ORIGIN && u.pathname === "/app/guest/document" && u.searchParams.get("chosenTool")) {
          await page.waitForTimeout(3000);
        } else {
          await page.waitForTimeout(1500);
        }
      }

      record.title = await page.title().catch(() => "");
      record.description =
        (await page.locator('meta[name="description"]').getAttribute("content").catch(() => "")) ?? "";

      record.h1 = await page
        .locator("h1")
        .evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()).filter(Boolean))
        .catch(() => []);
      record.h2 = await page
        .locator("h2")
        .evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()).filter(Boolean))
        .catch(() => []);

      record.navLinks = await page
        .locator("header a, nav a")
        .evaluateAll((els) =>
          els
            .map((e) => ({
              text: (e.textContent ?? "").trim(),
              href: e.getAttribute("href") ?? "",
            }))
            .filter((x) => x.href),
        )
        .catch(() => []);

      record.buttons = await page
        .locator('button, [role="button"], a[role="button"]')
        .evaluateAll((els) =>
          els
            .map((e) => ({
              text: (e.textContent ?? "").trim().slice(0, 80),
              ariaLabel: e.getAttribute("aria-label") ?? "",
              title: e.getAttribute("title") ?? "",
            }))
            .filter((x) => x.text || x.ariaLabel || x.title),
        )
        .catch(() => []);

      record.inputs = await page
        .locator("input, textarea, select")
        .evaluateAll((els) =>
          els.map((e) => ({
            tag: e.tagName.toLowerCase(),
            type: e.getAttribute("type") ?? "",
            name: e.getAttribute("name") ?? "",
            placeholder: e.getAttribute("placeholder") ?? "",
            ariaLabel: e.getAttribute("aria-label") ?? "",
          })),
        )
        .catch(() => []);

      record.iframes = await page
        .locator("iframe[src]")
        .evaluateAll((els) => els.map((e) => e.getAttribute("src") ?? "").filter(Boolean))
        .catch(() => []);

      // Heuristic hints for rich editors (toolbar / canvas / sidebars).
      record.interactiveHints = await page
        .evaluate(() => {
          const hints = [];
          const hasCanvas = Boolean(document.querySelector("canvas"));
          const hasIframe = Boolean(document.querySelector("iframe"));
          const hasPdfJsViewer =
            Boolean(document.querySelector("#viewerContainer")) || Boolean(document.querySelector(".pdfViewer"));
          const toolbars = [
            ...document.querySelectorAll('[class*="toolbar"], [id*="toolbar"], [class*="Tool"], [id*="Tool"]'),
          ]
            .slice(0, 8)
            .map((el) => el.getAttribute("class") || el.id || "toolbar");
          if (hasCanvas) hints.push("has-canvas");
          if (hasIframe) hints.push("has-iframe");
          if (hasPdfJsViewer) hints.push("looks-like-pdfjs-viewer");
          if (toolbars.length) hints.push(`toolbars:${toolbars.join(",")}`);
          return hints;
        })
        .catch(() => []);

      const links = await page
        .locator("a[href]")
        .evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? "").filter(Boolean))
        .catch(() => []);
      record.linkCount = links.length;

      // Optional: try to proceed past "choose tool -> upload file" step.
      if (String(process.env.AUDIT_UPLOAD ?? "0") === "1") {
        const u = new URL(record.finalUrl);
        if (u.origin === ORIGIN && u.pathname === "/app/guest/document" && u.searchParams.get("chosenTool") && !u.searchParams.get("documentId")) {
          const input = page.locator('input[type="file"]').first();
          if (await input.count()) {
            record.uploadAttempted = true;
            const samplePath = path.resolve(OUT_DIR, "sample.pdf");
            try {
              await fs.access(samplePath);
            } catch {
              // Tiny 1-page PDF (base64) to keep network load minimal.
              const pdfBase64 =
                "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0vUmVzb3VyY2VzPDwvRm9udDw8L0YxIDQgMCBSPj4+Pi9Db250ZW50cyA1IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iago1IDAgb2JqCjw8L0xlbmd0aCA0ND4+c3RyZWFtCkJUIDcwIDcyMCBUZgowLjg2IDAgMCAwLjg2IDAgMCB0bQovRjEgMjQgVGYKKChUaW55IFBERikpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDExIDAwMDAwIG4gCjAwMDAwMDAwNjIgMDAwMDAgbiAKMDAwMDAwMDExNyAwMDAwMCBuIAowMDAwMDAwMjQzIDAwMDAwIG4gCjAwMDAwMDAzMTkgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDcKJSVFT0YK";
              await fs.mkdir(path.dirname(samplePath), { recursive: true });
              await fs.writeFile(samplePath, Buffer.from(pdfBase64, "base64"));
            }
            await input.setInputFiles(samplePath);
            await page.waitForTimeout(2500);
            record.uploadResultUrl = page.url();
            if (record.uploadResultUrl && record.uploadResultUrl !== record.finalUrl && shouldVisit(record.uploadResultUrl) && !visited.has(record.uploadResultUrl)) {
              queue.push(record.uploadResultUrl);
            }
          }
        }
      }

      for (const href of links) {
        const next = normalizeHref(record.finalUrl, href);
        if (!next) continue;
        if (!shouldVisit(next)) continue;
        if (!visited.has(next)) queue.push(next);
      }

      const screenshotName = `${safeNameFromUrl(record.finalUrl)}.png`;
      const screenshotPath = path.join(OUT_DIR, "screenshots", screenshotName);
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: false });
      record.screenshot = path.relative(OUT_DIR, screenshotPath);
    } catch (e) {
      record.requestFailures.push({ url, error: String(e) });
    } finally {
      record.requestFailures.push(...requests);
      record.console = consoleMessages;
      results.push(record);
      await page.close().catch(() => {});
    }
  }

  await browser.close();

  const outJson = path.join(OUT_DIR, "summary.json");
  await fs.writeFile(outJson, JSON.stringify({ origin: ORIGIN, startedAt: new Date().toISOString(), pages: results }, null, 2));

  const outMd = path.join(OUT_DIR, "summary.md");
  const md = [
    `# qwerpdf.com frontend audit (automated)`,
    ``,
    `- Origin: ${ORIGIN}`,
    `- Pages captured: ${results.length} (limit ${MAX_PAGES})`,
    `- Generated: ${new Date().toISOString()}`,
    ``,
    `## Pages`,
    ...results.map((p) => {
      const lines = [];
      lines.push(`### ${p.title || p.url}`);
      lines.push(`- URL: ${p.finalUrl}`);
      lines.push(`- Status: ${p.status ?? "n/a"}`);
      if (p.description) lines.push(`- Description: ${p.description}`);
      if (p.h1?.length) lines.push(`- H1: ${p.h1.join(" | ")}`);
      if (p.h2?.length) lines.push(`- H2: ${p.h2.slice(0, 6).join(" | ")}${p.h2.length > 6 ? " ..." : ""}`);
      if (p.interactiveHints?.length) lines.push(`- Hints: ${p.interactiveHints.join(", ")}`);
      if (p.screenshot) lines.push(`- Screenshot: ${p.screenshot}`);
      return lines.join("\n");
    }),
    ``,
  ].join("\n");
  await fs.writeFile(outMd, md);

  process.stdout.write(`Wrote ${path.relative(process.cwd(), outJson)} and ${path.relative(process.cwd(), outMd)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
