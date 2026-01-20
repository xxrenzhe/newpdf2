import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/server/rateLimit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`contact:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body = await request.json();
    console.log("Contact form submission:", body);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store", ...rateLimitHeaders(rl) } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400, headers: rateLimitHeaders(rl) }
    );
  }
}
