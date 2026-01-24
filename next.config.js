/** @type {import('next').NextConfig} */

// ============================================================================
// 生产环境必需的环境变量验证
// ============================================================================
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  // 必需的环境变量（缺失则启动失败）
  const requiredEnvVars = [
    "NEXT_PUBLIC_ALLOWED_DOMAINS", // 域名锁定白名单
    "NEXTAUTH_SECRET",             // NextAuth 加密密钥
    "NEXTAUTH_URL",                // NextAuth 回调 URL
  ];

  // 推荐配置的环境变量（缺失则警告）
  const recommendedEnvVars = [
    { key: "NEXT_PUBLIC_APP_URL", desc: "应用公开 URL" },
    { key: "STRIPE_SECRET_KEY", desc: "Stripe 支付密钥" },
    { key: "STRIPE_WEBHOOK_SECRET", desc: "Stripe Webhook 密钥" },
    { key: "GOOGLE_CLIENT_ID", desc: "Google OAuth 客户端 ID" },
    { key: "GOOGLE_CLIENT_SECRET", desc: "Google OAuth 客户端密钥" },
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("\n" + "=".repeat(70));
    console.error("❌ FATAL: Missing required environment variables in production:");
    missing.forEach((key) => {
      console.error(`   - ${key}`);
    });
    console.error("\nPlease configure these variables before starting the application.");
    console.error("See .env.example for reference.");
    console.error("=".repeat(70) + "\n");
    process.exit(1);
  }

  // 检查推荐的环境变量
  const missingRecommended = recommendedEnvVars.filter((v) => !process.env[v.key]);
  if (missingRecommended.length > 0) {
    console.warn("\n" + "-".repeat(70));
    console.warn("⚠️  WARNING: Missing recommended environment variables:");
    missingRecommended.forEach((v) => {
      console.warn(`   - ${v.key} (${v.desc})`);
    });
    console.warn("-".repeat(70) + "\n");
  }
}

const nextConfig = {
  // 启用 standalone 输出模式，用于 Docker 部署
  output: "standalone",
  outputFileTracingRoot: __dirname,
  allowedDevOrigins: ["*.preview.same-app.com"],
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      isProd ? "connect-src 'self' https:" : "connect-src 'self' https: http: ws: wss:",
      "worker-src 'self' blob:",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/tools/password",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      {
        source: "/tools/unlock",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      {
        source: "/pdfeditor/index.html",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/pdfeditor/js/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/pdfeditor/css/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/pdfeditor/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        source: "/wasm/:path*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pdfjs-dist$": "pdfjs-dist/legacy/build/pdf.mjs",
      "pdfjs-dist/build/pdf.mjs$": "pdfjs-dist/legacy/build/pdf.mjs",
      "pdfjs-dist/build/pdf.worker.min.mjs$": "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    };

    return config;
  },
  images: {
    unoptimized: true,
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "ext.same-assets.com",
      "ugc.same-assets.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ugc.same-assets.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
