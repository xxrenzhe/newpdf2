import type { NextRequest } from "next/server";

type Counter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, Counter>();

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterMs: number;
};

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const existing = counters.get(key);

  if (!existing || now >= existing.resetAt) {
    const next: Counter = { count: 1, resetAt: now + opts.windowMs };
    counters.set(key, next);
    return {
      ok: true,
      limit: opts.limit,
      remaining: Math.max(0, opts.limit - next.count),
      resetMs: next.resetAt - now,
      retryAfterMs: 0,
    };
  }

  if (existing.count >= opts.limit) {
    return {
      ok: false,
      limit: opts.limit,
      remaining: 0,
      resetMs: existing.resetAt - now,
      retryAfterMs: existing.resetAt - now,
    };
  }

  existing.count += 1;
  return {
    ok: true,
    limit: opts.limit,
    remaining: Math.max(0, opts.limit - existing.count),
    resetMs: existing.resetAt - now,
    retryAfterMs: 0,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const resetSeconds = Math.max(0, Math.ceil(result.resetMs / 1000));
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(resetSeconds),
  };
  if (!result.ok) {
    headers["Retry-After"] = String(Math.max(1, Math.ceil(result.retryAfterMs / 1000)));
  }
  return headers;
}

