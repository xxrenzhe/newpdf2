import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/server/rateLimit";
import { generateChallenge, verifyProof, type PoWChallenge, type PoWSolution } from "@/lib/security/proofOfWork";

// ============================================================================
// PoW 挑战存储 (生产环境应使用 Redis)
// ============================================================================

const pendingChallenges = new Map<string, { challenge: PoWChallenge; createdAt: number }>();
const CHALLENGE_TTL = 5 * 60 * 1000; // 5 分钟

// 定期清理
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingChallenges) {
    if (now - value.createdAt > CHALLENGE_TTL) {
      pendingChallenges.delete(key);
    }
  }
}, 60 * 1000);

// ============================================================================
// GET - 获取 PoW 挑战（提交表单前调用）
// ============================================================================

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  // 检查是否有太多未完成的挑战
  let count = 0;
  for (const [key] of pendingChallenges) {
    if (key.startsWith(`contact:${ip}:`)) count++;
  }

  if (count >= 5) {
    return NextResponse.json(
      { error: "Too many pending challenges" },
      { status: 429 }
    );
  }

  const challenge = generateChallenge(1); // 难度 1：哈希需以 "0" 结尾
  const challengeId = `contact:${ip}:${challenge.challenge}`;

  pendingChallenges.set(challengeId, {
    challenge,
    createdAt: Date.now(),
  });

  return NextResponse.json({
    challenge: challenge.challenge,
    difficulty: challenge.difficulty,
    expiresIn: CHALLENGE_TTL,
  });
}

// ============================================================================
// POST - 提交联系表单（需要 PoW 验证）
// ============================================================================

interface ContactFormData {
  name: string;
  email: string;
  message: string;
  pow?: PoWSolution; // PoW 解答
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // 速率限制
  const rl = rateLimit(`contact:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body: ContactFormData = await request.json();

    // ============================================================
    // PoW 验证
    // ============================================================
    if (!body.pow) {
      return NextResponse.json(
        { ok: false, error: "Proof of work required", requiresPow: true },
        { status: 400, headers: rateLimitHeaders(rl) }
      );
    }

    const challengeId = `contact:${ip}:${body.pow.challenge}`;
    const stored = pendingChallenges.get(challengeId);

    if (!stored) {
      return NextResponse.json(
        { ok: false, error: "Challenge not found or expired", requiresPow: true },
        { status: 400, headers: rateLimitHeaders(rl) }
      );
    }

    const verification = verifyProof(stored.challenge, body.pow);

    if (!verification.valid) {
      return NextResponse.json(
        { ok: false, error: `Invalid proof: ${verification.error}`, requiresPow: true },
        { status: 400, headers: rateLimitHeaders(rl) }
      );
    }

    // 验证成功，删除已使用的挑战
    pendingChallenges.delete(challengeId);

    // ============================================================
    // 处理联系表单
    // ============================================================
    console.log("Contact form submission (PoW verified):", {
      name: body.name,
      email: body.email,
      message: body.message?.slice(0, 100),
      ip,
    });

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store", ...rateLimitHeaders(rl) } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400, headers: rateLimitHeaders(rl) }
    );
  }
}
