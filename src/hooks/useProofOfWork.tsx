"use client";

/**
 * PoW (Proof of Work) React Hook
 * 用于在前端完成工作量证明验证
 */

import { useState, useCallback } from "react";
import { solveChallenge, type PoWChallenge, type PoWSolution } from "@/lib/security/proofOfWork";

interface UsePoWOptions {
  endpoint?: string; // 获取挑战的 API 端点
  onProgress?: (progress: number) => void;
}

interface UsePoWReturn {
  /** 执行 PoW 验证并返回解答 */
  solve: () => Promise<PoWSolution | null>;
  /** 当前是否正在计算 */
  isSolving: boolean;
  /** 计算进度 (0-1) */
  progress: number;
  /** 错误信息 */
  error: string | null;
  /** 重置状态 */
  reset: () => void;
}

export function useProofOfWork(options: UsePoWOptions = {}): UsePoWReturn {
  const { endpoint = "/api/contact" } = options;

  const [isSolving, setIsSolving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const solve = useCallback(async (): Promise<PoWSolution | null> => {
    setIsSolving(true);
    setProgress(0);
    setError(null);

    try {
      // 1. 获取挑战
      const challengeRes = await fetch(endpoint, { method: "GET" });
      if (!challengeRes.ok) {
        const data = await challengeRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get challenge");
      }

      const challengeData = await challengeRes.json();
      const challenge: PoWChallenge = {
        challenge: challengeData.challenge,
        difficulty: challengeData.difficulty,
        timestamp: Date.now(),
      };

      // 2. 解决挑战
      const solution = await solveChallenge(challenge, 1_000_000, (p) => {
        setProgress(p);
        options.onProgress?.(p);
      });

      if (!solution) {
        throw new Error("Failed to solve challenge (timeout)");
      }

      setProgress(1);
      return solution;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setIsSolving(false);
    }
  }, [endpoint, options]);

  const reset = useCallback(() => {
    setIsSolving(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    solve,
    isSolving,
    progress,
    error,
    reset,
  };
}

/**
 * PoW 验证状态组件
 */
export function PoWStatus({
  isSolving,
  progress,
}: {
  isSolving: boolean;
  progress: number;
}) {
  if (!isSolving) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span>Verifying... {Math.round(progress * 100)}%</span>
    </div>
  );
}
