import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/server/rateLimit";

const MAX_BYTES = 110 * 1024 * 1024; // 110MB hard cap for proxy downloads
const MAX_REDIRECTS = 5;

function isAllowedCloudHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  // Exact allowlist
  const exact = new Set([
    "dropbox.com",
    "www.dropbox.com",
    "dl.dropboxusercontent.com",
    "dl.dropbox.com",
    "api.onedrive.com",
    "onedrive.live.com",
    "storage.live.com",
  ]);
  if (exact.has(host)) return true;

  // Suffix allowlist (public cloud CDNs / signed download hosts)
  const suffixes = [
    ".dropboxusercontent.com",
    ".1drv.com",
    ".1drv.ms",
    ".onedrive.com",
    ".sharepoint.com",
    ".sharepoint-df.com",
    ".livefilestore.com",
  ];
  return suffixes.some((suffix) => host.endsWith(suffix));
}

function parseAndValidateUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "https:") throw new Error("Only https:// URLs are allowed");
  if (url.username || url.password) throw new Error("Credentials in URL are not allowed");
  if (!isAllowedCloudHost(url.hostname)) throw new Error("Host is not allowed");

  return url;
}

async function fetchWithRedirects(url: URL): Promise<Response> {
  let current = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(current.toString(), { redirect: "manual", cache: "no-store" });

    const status = res.status;
    const isRedirect = status >= 300 && status < 400;
    const location = res.headers.get("location");
    if (isRedirect && location) {
      const next = new URL(location, current);
      current = parseAndValidateUrl(next.toString());
      continue;
    }

    return res;
  }

  throw new Error("Too many redirects");
}

function limitStream(body: ReadableStream<Uint8Array>, maxBytes: number): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let loaded = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      loaded += value.byteLength;
      if (loaded > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        controller.error(new Error("File is too large"));
        return;
      }
      controller.enqueue(value);
    },
    cancel(reason) {
      void reader.cancel(reason);
    },
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`cloud-fetch:${ip}`, { limit: 40, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  const urlRaw = typeof (body as { url?: unknown }).url === "string" ? (body as { url: string }).url : "";
  if (!urlRaw) {
    return NextResponse.json({ error: "url is required" }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  let url: URL;
  try {
    url = parseAndValidateUrl(urlRaw);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid URL" },
      { status: 400, headers: rateLimitHeaders(rl) }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetchWithRedirects(url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upstream fetch failed" },
      { status: 502, headers: rateLimitHeaders(rl) }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: "Upstream request failed", status: upstream.status, details: text.slice(0, 500) },
      { status: 502, headers: rateLimitHeaders(rl) }
    );
  }

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > MAX_BYTES) {
      return NextResponse.json(
        { error: "File is too large" },
        { status: 413, headers: rateLimitHeaders(rl) }
      );
    }
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
    "Cache-Control": "no-store",
    ...rateLimitHeaders(rl),
  });

  if (upstream.body) {
    const limited = limitStream(upstream.body, MAX_BYTES);
    return new NextResponse(limited, { headers });
  }

  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large" },
      { status: 413, headers: rateLimitHeaders(rl) }
    );
  }
  return new NextResponse(bytes, { headers });
}

