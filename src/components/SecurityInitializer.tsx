"use client";

import { useEffect } from "react";
import { preventIframeEmbedding, domainLock } from "@/lib/security/antiScraping";

/**
 * 从服务端运行时配置获取允许的域名列表
 * 运行时来源: /api/security-config
 */
async function getAllowedDomains(): Promise<string[]> {
  try {
    const response = await fetch("/api/security-config", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as unknown;
    if (!data || typeof data !== "object") return [];
    const allowedDomains = (data as { allowedDomains?: unknown }).allowedDomains;
    if (!Array.isArray(allowedDomains)) return [];
    return allowedDomains.filter((domain): domain is string => typeof domain === "string" && domain.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Client-side security initializer component
 * Runs security checks when the app loads
 */
export function SecurityInitializer() {
  useEffect(() => {
    preventIframeEmbedding();

    let cancelled = false;

    const run = async () => {
      const allowedDomains = await getAllowedDomains();
      if (cancelled) return;

      // 1. 域名锁定 - 防止代码被复制到其他域名
      // 开发环境自动允许 localhost
      const allowLocalhost =
        process.env.NEXT_PUBLIC_E2E === "1" || process.env.NODE_ENV !== "production";
      domainLock(allowedDomains, { allowLocalhost });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
