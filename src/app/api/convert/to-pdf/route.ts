import { NextRequest, NextResponse } from "next/server";

const GOTENBERG_URL = process.env.GOTENBERG_URL;

export async function POST(request: NextRequest) {
  if (!GOTENBERG_URL) {
    return NextResponse.json(
      { error: "GOTENBERG_URL is not configured (self-hosted Gotenberg required)" },
      { status: 501 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
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
      { status: 502 }
    );
  }

  const filename = `${file.name.replace(/\.[^.]+$/, "")}.pdf`;
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
  const length = res.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  if (res.body) {
    return new NextResponse(res.body, { headers });
  }

  const pdfBytes = await res.arrayBuffer();
  return new NextResponse(pdfBytes, { headers });
}
