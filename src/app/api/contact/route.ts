import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/server/rateLimit";

// ============================================================================
// POST - 提交联系表单
// ============================================================================

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // 速率限制: 每小时最多 5 次
  const rl = rateLimit(`contact:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body: ContactFormData = await request.json();

    // 基础验证
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { ok: false, error: "Name, email, and message are required" },
        { status: 400, headers: rateLimitHeaders(rl) }
      );
    }

    // 简单邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email format" },
        { status: 400, headers: rateLimitHeaders(rl) }
      );
    }

    // 处理联系表单
    console.log("Contact form submission:", {
      name: body.name,
      email: body.email,
      message: body.message?.slice(0, 100),
      ip,
    });

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store", ...rateLimitHeaders(rl) } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400, headers: rateLimitHeaders(rl) }
    );
  }
}
