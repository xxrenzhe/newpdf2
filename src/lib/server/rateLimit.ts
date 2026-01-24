/**
 * 增强版速率限制模块
 * 借鉴 qwerpdf.com 的多层防护机制
 * 包含: IP 速率限制、指纹识别、临时封禁、滑动窗口
 */

import type { NextRequest } from "next/server";

// ============================================================================
// 类型定义
// ============================================================================

interface Counter {
  count: number;
  resetAt: number;
  violations: number; // 违规次数
  blocked: boolean;
  blockUntil: number;
}

interface FingerprintData {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  hash: string;
}

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterMs: number;
  blocked: boolean;
  reason?: string;
};

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  blockDurationMs?: number; // 超限后的封禁时长
  maxViolations?: number; // 允许的最大违规次数后升级封禁
  skipSuccessfulRequests?: boolean; // 成功请求不计入限制
}

// ============================================================================
// 存储
// ============================================================================

const counters = new Map<string, Counter>();
const blocklist = new Map<string, { until: number; reason: string }>();

// 定期清理过期条目
const CLEANUP_INTERVAL = 60 * 1000; // 1 分钟

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();

    // 清理过期计数器
    for (const [key, counter] of counters) {
      if (now >= counter.resetAt && !counter.blocked) {
        counters.delete(key);
      } else if (counter.blocked && now >= counter.blockUntil) {
        counter.blocked = false;
        counter.violations = 0;
      }
    }

    // 清理过期封禁
    for (const [key, block] of blocklist) {
      if (now >= block.until) {
        blocklist.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

startCleanup();

// ============================================================================
// IP 获取 (增强版)
// ============================================================================

/**
 * 获取客户端 IP 地址
 * 支持多种代理头，优先使用可信的头
 */
export function getClientIp(request: NextRequest): string {
  // Cloudflare
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // Vercel
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0]!.trim();

  // 标准代理头
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();

  return "unknown";
}

/**
 * 生成客户端指纹 (用于更精确的限制)
 */
export function getClientFingerprint(request: NextRequest): FingerprintData {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "";
  const acceptLanguage = request.headers.get("accept-language") || "";

  // 简单哈希
  const data = `${ip}:${userAgent}:${acceptLanguage}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return {
    ip,
    userAgent: userAgent.slice(0, 100),
    acceptLanguage: acceptLanguage.slice(0, 50),
    hash: Math.abs(hash).toString(36),
  };
}

/**
 * 生成复合限制键
 */
export function getRateLimitKey(request: NextRequest, prefix: string): string {
  const fp = getClientFingerprint(request);
  return `${prefix}:${fp.ip}:${fp.hash}`;
}

// ============================================================================
// 白名单 (跳过速率限制)
// ============================================================================

const whitelist = new Set<string>([
  // 添加可信 IP 或用户标识
  // "127.0.0.1",
  // "::1",
]);

/**
 * 检查是否在白名单中
 */
export function isWhitelisted(ip: string): boolean {
  return whitelist.has(ip);
}

/**
 * 添加到白名单
 */
export function addToWhitelist(ip: string): void {
  whitelist.add(ip);
}

/**
 * 从白名单移除
 */
export function removeFromWhitelist(ip: string): void {
  whitelist.delete(ip);
}

// ============================================================================
// 核心速率限制函数
// ============================================================================

/**
 * 执行速率限制检查
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const blockDuration = opts.blockDurationMs || opts.windowMs * 2;
  const maxViolations = opts.maxViolations || 3;

  // 检查白名单 - 提取 IP 部分
  const ipMatch = key.match(/:([^:]+):/);
  if (ipMatch && isWhitelisted(ipMatch[1]!)) {
    return {
      ok: true,
      limit: opts.limit,
      remaining: opts.limit,
      resetMs: opts.windowMs,
      retryAfterMs: 0,
      blocked: false,
    };
  }

  // 检查是否在封禁名单中
  const blocked = blocklist.get(key);
  if (blocked && now < blocked.until) {
    return {
      ok: false,
      limit: opts.limit,
      remaining: 0,
      resetMs: blocked.until - now,
      retryAfterMs: blocked.until - now,
      blocked: true,
      reason: blocked.reason,
    };
  }

  const existing = counters.get(key);

  // 检查是否被临时封禁
  if (existing?.blocked && now < existing.blockUntil) {
    return {
      ok: false,
      limit: opts.limit,
      remaining: 0,
      resetMs: existing.blockUntil - now,
      retryAfterMs: existing.blockUntil - now,
      blocked: true,
      reason: "Temporary block due to rate limit violations",
    };
  }

  // 窗口已过期，重置计数器
  if (!existing || now >= existing.resetAt) {
    const next: Counter = {
      count: 1,
      resetAt: now + opts.windowMs,
      violations: existing?.violations || 0,
      blocked: false,
      blockUntil: 0,
    };
    counters.set(key, next);
    return {
      ok: true,
      limit: opts.limit,
      remaining: Math.max(0, opts.limit - 1),
      resetMs: opts.windowMs,
      retryAfterMs: 0,
      blocked: false,
    };
  }

  // 检查是否超限
  if (existing.count >= opts.limit) {
    existing.violations += 1;

    // 累计违规过多，实施更长时间的封禁
    if (existing.violations >= maxViolations) {
      existing.blocked = true;
      existing.blockUntil = now + blockDuration * existing.violations;

      // 添加到封禁名单
      blocklist.set(key, {
        until: existing.blockUntil,
        reason: `Repeated rate limit violations (${existing.violations} times)`,
      });
    } else {
      existing.blocked = true;
      existing.blockUntil = now + blockDuration;
    }

    return {
      ok: false,
      limit: opts.limit,
      remaining: 0,
      resetMs: existing.resetAt - now,
      retryAfterMs: existing.blockUntil - now,
      blocked: true,
      reason: `Rate limit exceeded. Violations: ${existing.violations}`,
    };
  }

  // 正常计数
  existing.count += 1;
  return {
    ok: true,
    limit: opts.limit,
    remaining: Math.max(0, opts.limit - existing.count),
    resetMs: existing.resetAt - now,
    retryAfterMs: 0,
    blocked: false,
  };
}

/**
 * 滑动窗口速率限制 (更精确但占用更多内存)
 */
export function slidingWindowRateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  // 使用时间戳数组实现滑动窗口
  const timestampsKey = `sw:${key}`;
  let timestamps: number[] = (slidingWindowStore.get(timestampsKey) as number[]) || [];

  // 移除窗口外的时间戳
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= opts.limit) {
    const oldestInWindow = Math.min(...timestamps);
    const retryAfter = oldestInWindow + opts.windowMs - now;

    return {
      ok: false,
      limit: opts.limit,
      remaining: 0,
      resetMs: retryAfter,
      retryAfterMs: retryAfter,
      blocked: false,
    };
  }

  // 添加当前请求时间戳
  timestamps.push(now);
  slidingWindowStore.set(timestampsKey, timestamps);

  return {
    ok: true,
    limit: opts.limit,
    remaining: opts.limit - timestamps.length,
    resetMs: opts.windowMs,
    retryAfterMs: 0,
    blocked: false,
  };
}

const slidingWindowStore = new Map<string, number[]>();

// ============================================================================
// 手动封禁管理
// ============================================================================

/**
 * 手动封禁 IP
 */
export function blockIp(ip: string, durationMs: number, reason: string): void {
  blocklist.set(`ip:${ip}`, {
    until: Date.now() + durationMs,
    reason,
  });
}

/**
 * 解除封禁
 */
export function unblockIp(ip: string): boolean {
  return blocklist.delete(`ip:${ip}`);
}

/**
 * 检查 IP 是否被封禁
 */
export function isIpBlocked(ip: string): { blocked: boolean; reason?: string; until?: number } {
  const entry = blocklist.get(`ip:${ip}`);
  if (!entry) return { blocked: false };

  if (Date.now() >= entry.until) {
    blocklist.delete(`ip:${ip}`);
    return { blocked: false };
  }

  return { blocked: true, reason: entry.reason, until: entry.until };
}

// ============================================================================
// HTTP 响应头
// ============================================================================

/**
 * 生成速率限制响应头
 */
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

  if (result.blocked) {
    headers["X-RateLimit-Blocked"] = "true";
  }

  return headers;
}

// ============================================================================
// 预设配置
// ============================================================================

export const RATE_LIMIT_PRESETS = {
  // API 通用限制
  api: { limit: 60, windowMs: 60 * 1000 }, // 60/分钟

  // 敏感操作
  sensitive: { limit: 10, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 }, // 10/分钟

  // 文件上传
  upload: { limit: 30, windowMs: 60 * 60 * 1000 }, // 30/小时

  // 认证相关
  auth: { limit: 5, windowMs: 15 * 60 * 1000, maxViolations: 3 }, // 5/15分钟

  // 联系表单
  contact: { limit: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 24 * 60 * 60 * 1000 }, // 3/小时

  // 搜索/查询
  search: { limit: 30, windowMs: 60 * 1000 }, // 30/分钟
} as const;

// ============================================================================
// 中间件辅助函数
// ============================================================================

/**
 * 创建速率限制中间件
 */
export function createRateLimiter(preset: keyof typeof RATE_LIMIT_PRESETS | RateLimitOptions) {
  const opts = typeof preset === "string" ? RATE_LIMIT_PRESETS[preset] : preset;

  return (request: NextRequest, keyPrefix: string = "default"): RateLimitResult => {
    const key = getRateLimitKey(request, keyPrefix);
    return rateLimit(key, opts);
  };
}
