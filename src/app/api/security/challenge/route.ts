/**
 * 工作量证明 (PoW) 挑战 API
 * GET - 获取新的挑战
 * POST - 验证解答
 */

import { NextResponse } from "next/server";
import {
  generateChallenge,
  verifyProof,
  type PoWChallenge,
  type PoWSolution,
} from "@/lib/security/proofOfWork";
import { storePoWToken, getTokenTTL } from "@/lib/security/powTokenStore";
import { getClientIp } from "@/lib/server/rateLimit";
import type { NextRequest } from "next/server";

// ============================================================================
// 挑战存储 (生产环境应使用 Redis)
// ============================================================================

interface StoredChallenge {
  challenge: PoWChallenge;
  ip: string;
  createdAt: number;
}

const pendingChallenges = new Map<string, StoredChallenge>();

// 自动清理过期挑战
const CHALLENGE_TTL = 5 * 60 * 1000; // 5 分钟
const CLEANUP_INTERVAL = 60 * 1000; // 1 分钟

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();

    // 清理过期挑战
    for (const [id, stored] of pendingChallenges) {
      if (now - stored.createdAt > CHALLENGE_TTL) {
        pendingChallenges.delete(id);
      }
    }
  }, CLEANUP_INTERVAL);
}

startCleanup();

// ============================================================================
// GET - 获取新挑战
// ============================================================================

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  // 检查是否有太多未完成的挑战 (防止 DoS)
  let ipChallengeCount = 0;
  for (const stored of pendingChallenges.values()) {
    if (stored.ip === ip) ipChallengeCount++;
  }

  if (ipChallengeCount >= 10) {
    return NextResponse.json(
      { error: "Too many pending challenges. Please complete existing ones first." },
      { status: 429 }
    );
  }

  // 生成新挑战 (难度 1 = 哈希以 "0" 结尾)
  const challenge = generateChallenge(1);

  // 存储挑战
  pendingChallenges.set(challenge.challenge, {
    challenge,
    ip,
    createdAt: Date.now(),
  });

  return NextResponse.json({
    challenge: challenge.challenge,
    difficulty: challenge.difficulty,
    expiresIn: CHALLENGE_TTL,
  });
}

// ============================================================================
// POST - 验证解答
// ============================================================================

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  let body: PoWSolution;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 验证必需字段
  if (!body.challenge || typeof body.nonce !== "number" || !body.hash) {
    return NextResponse.json(
      { error: "Missing required fields: challenge, nonce, hash" },
      { status: 400 }
    );
  }

  // 获取存储的挑战
  const stored = pendingChallenges.get(body.challenge);

  if (!stored) {
    return NextResponse.json(
      { valid: false, error: "Challenge not found or expired" },
      { status: 400 }
    );
  }

  // 验证 IP 匹配 (防止挑战窃取)
  if (stored.ip !== ip) {
    return NextResponse.json(
      { valid: false, error: "Challenge was issued to a different client" },
      { status: 403 }
    );
  }

  // 验证解答
  const result = verifyProof(stored.challenge, body);

  if (result.valid) {
    // 删除已使用的挑战
    pendingChallenges.delete(body.challenge);

    // 生成验证令牌
    const token = crypto.randomUUID();
    storePoWToken(token, ip);

    return NextResponse.json({
      valid: true,
      token,
      expiresIn: getTokenTTL(),
    });
  }

  return NextResponse.json(
    { valid: false, error: result.error },
    { status: 400 }
  );
}
