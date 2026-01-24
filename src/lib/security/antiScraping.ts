/**
 * 前端安全保护模块
 * - iframe 嵌入防护
 * - 域名锁定
 */

/**
 * 防止网站被嵌入到其他域名的 iframe 中
 * 配合 X-Frame-Options 和 CSP frame-ancestors 使用
 */
export function preventIframeEmbedding(): void {
  if (typeof window === "undefined") return;

  if (window.self !== window.top) {
    // 被嵌入到 iframe 中，重定向到 403 页面
    window.location.href = "/403";
  }
}

/**
 * 域名锁定 - 防止代码被复制到其他域名运行
 * @param allowedDomains - 允许运行的域名列表，支持通配符如 "*.example.com"
 * @param options - 配置选项
 */
export function domainLock(
  allowedDomains: string[],
  options: {
    allowLocalhost?: boolean; // 是否允许 localhost (开发环境)
    onViolation?: () => void; // 违规时的自定义回调
  } = {}
): boolean {
  if (typeof window === "undefined") return true;

  const { allowLocalhost = true, onViolation } = options;
  const hostname = window.location.hostname;

  // 开发环境白名单
  if (allowLocalhost) {
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.endsWith(".local")
    ) {
      return true;
    }
  }

  // 检查域名是否在白名单中
  const isAllowed = allowedDomains.some((domain) => {
    // 通配符匹配 *.example.com
    if (domain.startsWith("*.")) {
      const baseDomain = domain.slice(2);
      return hostname === baseDomain || hostname.endsWith("." + baseDomain);
    }
    // 精确匹配
    return hostname === domain;
  });

  if (!isAllowed) {
    // 域名不在白名单中
    if (onViolation) {
      onViolation();
    } else {
      // 默认行为：清空页面并显示警告
      console.error(`Domain not authorized: ${hostname}`);
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;text-align:center;background:#f5f5f5;">
          <div>
            <h1 style="color:#e53e3e;font-size:2rem;margin-bottom:1rem;">Access Denied</h1>
            <p style="color:#666;">This application is not authorized to run on this domain.</p>
          </div>
        </div>
      `;
    }
    return false;
  }

  return true;
}
