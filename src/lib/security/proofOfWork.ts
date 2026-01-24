/**
 * 工作量证明 (Proof-of-Work) 机制
 * 借鉴 qwerpdf.com 的 hashString(g + ":" + h + ":" + v) 实现
 * 用于防止自动化滥用和机器人攻击
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface PoWChallenge {
  challenge: string;
  difficulty: number; // 要求哈希以多少个 0 结尾
  timestamp: number;
}

export interface PoWSolution {
  challenge: string;
  nonce: number;
  hash: string;
}

export interface PoWVerificationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// SHA-256 实现 (使用 Web Crypto API)
// ============================================================================

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 同步版本 (用于服务端验证)
function sha256Sync(message: string): string {
  // 简单的同步 SHA-256 实现
  // 使用 Node.js crypto 模块
  if (typeof globalThis.crypto?.subtle === "undefined") {
    // Node.js 环境 - dynamic import for server-side
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(message).digest("hex");
  }
  throw new Error("Sync SHA-256 not available in browser");
}

// ============================================================================
// 客户端：计算工作量证明
// ============================================================================

/**
 * 解决工作量证明挑战
 * @param challenge - 服务端发送的挑战
 * @param maxIterations - 最大迭代次数 (默认 1,000,000)
 * @param onProgress - 进度回调
 * @returns 解决方案或 null (超时)
 */
export async function solveChallenge(
  challenge: PoWChallenge,
  maxIterations = 1_000_000,
  onProgress?: (progress: number) => void
): Promise<PoWSolution | null> {
  const { challenge: c, difficulty } = challenge;
  const target = "0".repeat(difficulty);

  for (let nonce = 0; nonce < maxIterations; nonce++) {
    const input = `${c}:${nonce}`;
    const hash = await sha256(input);

    if (hash.endsWith(target)) {
      return { challenge: c, nonce, hash };
    }

    // 每 10000 次让出主线程，避免阻塞 UI
    if (nonce % 10000 === 0) {
      await new Promise((r) => setTimeout(r, 0));
      onProgress?.(nonce / maxIterations);
    }
  }
  return null;
}

/**
 * 使用 Web Worker 解决挑战 (不阻塞主线程)
 */
export function createPoWWorker(): {
  solve: (challenge: PoWChallenge) => Promise<PoWSolution | null>;
  terminate: () => void;
} {
  const workerCode = `
    async function sha256(message) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    self.onmessage = async (e) => {
      const { challenge, difficulty, maxIterations } = e.data;
      const target = "0".repeat(difficulty);

      for (let nonce = 0; nonce < maxIterations; nonce++) {
        const input = challenge + ":" + nonce;
        const hash = await sha256(input);

        if (hash.endsWith(target)) {
          self.postMessage({ success: true, solution: { challenge, nonce, hash } });
          return;
        }

        if (nonce % 50000 === 0) {
          self.postMessage({ progress: nonce / maxIterations });
        }
      }
      self.postMessage({ success: false, solution: null });
    };
  `;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const worker = new Worker(URL.createObjectURL(blob));

  return {
    solve: (challenge: PoWChallenge): Promise<PoWSolution | null> => {
      return new Promise((resolve) => {
        worker.onmessage = (e) => {
          if ("success" in e.data) {
            resolve(e.data.solution);
          }
        };
        worker.postMessage({
          challenge: challenge.challenge,
          difficulty: challenge.difficulty,
          maxIterations: 1_000_000,
        });
      });
    },
    terminate: () => worker.terminate(),
  };
}

// ============================================================================
// 服务端：生成和验证挑战
// ============================================================================

/**
 * 生成工作量证明挑战
 * @param difficulty - 难度 (1 = 哈希以 "0" 结尾, 2 = "00" 结尾, etc.)
 */
export function generateChallenge(difficulty = 1): PoWChallenge {
  const challenge = crypto.randomUUID();
  return {
    challenge,
    difficulty,
    timestamp: Date.now(),
  };
}

/**
 * 验证工作量证明解答
 * @param challenge - 原始挑战
 * @param solution - 客户端提交的解答
 * @param maxAgeMs - 挑战有效期 (默认 5 分钟)
 */
export function verifyProof(
  challenge: PoWChallenge,
  solution: PoWSolution,
  maxAgeMs = 300_000
): PoWVerificationResult {
  // 检查时效性
  if (Date.now() - challenge.timestamp > maxAgeMs) {
    return { valid: false, error: "Challenge expired" };
  }

  // 检查挑战匹配
  if (challenge.challenge !== solution.challenge) {
    return { valid: false, error: "Challenge mismatch" };
  }

  // 验证哈希
  const input = `${solution.challenge}:${solution.nonce}`;
  let hash: string;

  try {
    hash = sha256Sync(input);
  } catch {
    // 如果同步版本不可用，返回错误
    return { valid: false, error: "Server-side verification unavailable" };
  }

  const target = "0".repeat(challenge.difficulty);

  if (hash !== solution.hash) {
    return { valid: false, error: "Invalid hash" };
  }

  if (!hash.endsWith(target)) {
    return { valid: false, error: "Hash does not meet difficulty requirement" };
  }

  return { valid: true };
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * 用于 React 组件的 PoW Hook
 */
export function useProofOfWork() {
  const solveWithProgress = async (
    challenge: PoWChallenge,
    setProgress: (p: number) => void
  ): Promise<PoWSolution | null> => {
    return solveChallenge(challenge, 1_000_000, setProgress);
  };

  return { solveChallenge: solveWithProgress };
}
