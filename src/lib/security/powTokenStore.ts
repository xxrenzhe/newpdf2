/**
 * PoW Token 存储和验证
 * 用于在 API 之间共享验证状态
 */

const TOKEN_TTL = 30 * 60 * 1000; // 30 分钟
const CLEANUP_INTERVAL = 60 * 1000; // 1 分钟

interface TokenData {
  ip: string;
  verifiedAt: number;
}

// 验证过的令牌存储
const verifiedTokens = new Map<string, TokenData>();

// 自动清理过期令牌
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [token, data] of verifiedTokens) {
      if (now - data.verifiedAt > TOKEN_TTL) {
        verifiedTokens.delete(token);
      }
    }
  }, CLEANUP_INTERVAL);
}

startCleanup();

/**
 * 存储验证过的令牌
 */
export function storePoWToken(token: string, ip: string): void {
  verifiedTokens.set(token, { ip, verifiedAt: Date.now() });
}

/**
 * 获取令牌过期时间
 */
export function getTokenTTL(): number {
  return TOKEN_TTL;
}

/**
 * 验证 PoW 令牌
 */
export function validatePoWToken(token: string, ip: string): boolean {
  const data = verifiedTokens.get(token);
  if (!data) return false;

  // 检查 IP 匹配
  if (data.ip !== ip) return false;

  // 检查是否过期
  if (Date.now() - data.verifiedAt > TOKEN_TTL) {
    verifiedTokens.delete(token);
    return false;
  }

  return true;
}

/**
 * 使验证令牌失效 (一次性使用)
 */
export function consumePoWToken(token: string): boolean {
  return verifiedTokens.delete(token);
}
