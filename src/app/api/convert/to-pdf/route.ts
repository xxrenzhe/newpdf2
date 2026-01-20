import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/server/rateLimit";

const GOTENBERG_URL = process.env.GOTENBERG_URL;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const session = await getServerSession(authOptions).catch(() => null);
  const limit = session?.user?.email ? 30 : 8;
  const rl = rateLimit(`convert-to-pdf:${ip}`, { limit, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  if (!GOTENBERG_URL) {
    return NextResponse.json(
      { error: "GOTENBERG_URL is not configured (self-hosted Gotenberg required)" },
      { status: 501, headers: rateLimitHeaders(rl) }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400, headers: rateLimitHeaders(rl) });
  }

  const maxBytes = 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: "File is too large (max 25MB)" },
      { status: 413, headers: rateLimitHeaders(rl) }
    );
  }

  const allowedExt = /\.(doc|docx|ppt|pptx|xls|xlsx|txt)$/i;
  if (!allowedExt.test(file.name)) {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 400, headers: rateLimitHeaders(rl) }
    );
  }

  const upstream = new FormData();
  upstream.set("files", file, file.name);

  const res = await fetch(`${GOTENBERG_URL.replace(/\/$/, "")}/forms/libreoffice/convert`, {
    method: "POST",
    body: upstream,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "Conversion failed", details: text.slice(0, 500) },
      { status: 502, headers: rateLimitHeaders(rl) }
    );
  }

  const filename = `${file.name.replace(/\.[^.]+$/, "")}.pdf`;
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
    ...rateLimitHeaders(rl),
  });
  const length = res.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  if (res.body) {
    return new NextResponse(res.body, { headers });
  }

  const pdfBytes = await res.arrayBuffer();
  return new NextResponse(pdfBytes, { headers });
}
