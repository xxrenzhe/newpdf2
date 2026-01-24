"use client";

import { useEffect } from "react";
import { preventIframeEmbedding, domainLock } from "@/lib/security/antiScraping";

/**
 * 从环境变量解析允许的域名列表
 * 格式: "example.com,*.example.com,app.example.org"
 */
function getAllowedDomains(): string[] {
  const envValue = process.env.NEXT_PUBLIC_ALLOWED_DOMAINS;

  if (!envValue) {
    // 开发环境如果未配置，返回空数组（domainLock 会自动允许 localhost）
    if (process.env.NODE_ENV !== "production") {
      return [];
    }
    // 生产环境必须配置（在 next.config.js 中已验证）
    console.error("NEXT_PUBLIC_ALLOWED_DOMAINS is not configured");
    return [];
  }

  return envValue
    .split(",")
    .map((domain) => domain.trim())
    .filter((domain) => domain.length > 0);
}

/**
 * Client-side security initializer component
 * Runs security checks when the app loads
 */
export function SecurityInitializer() {
  useEffect(() => {
    const allowedDomains = getAllowedDomains();

    // 1. 域名锁定 - 防止代码被复制到其他域名
    // 开发环境自动允许 localhost
    domainLock(allowedDomains, {
      allowLocalhost: process.env.NODE_ENV !== "production",
    });

    // 2. iframe 嵌入防护
    preventIframeEmbedding();
  }, []);

  return null;
}
