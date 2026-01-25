const requiredEnvVars = [
  "NEXT_PUBLIC_ALLOWED_DOMAINS", // 域名锁定白名单
  "NEXTAUTH_SECRET", // NextAuth 加密密钥
  "NEXTAUTH_URL", // NextAuth 回调 URL
];

const recommendedEnvVars = [
  { key: "NEXT_PUBLIC_APP_URL", desc: "应用公开 URL" },
  { key: "STRIPE_SECRET_KEY", desc: "Stripe 支付密钥" },
  { key: "STRIPE_WEBHOOK_SECRET", desc: "Stripe Webhook 密钥" },
  { key: "GOOGLE_CLIENT_ID", desc: "Google OAuth 客户端 ID" },
  { key: "GOOGLE_CLIENT_SECRET", desc: "Google OAuth 客户端密钥" },
  { key: "NEXT_PUBLIC_GOOGLE_CLIENT_ID", desc: "Google Drive Picker 客户端 ID" },
  { key: "NEXT_PUBLIC_GOOGLE_API_KEY", desc: "Google Drive Picker API Key" },
  { key: "NEXT_PUBLIC_DROPBOX_APP_KEY", desc: "Dropbox Chooser App Key" },
  { key: "NEXT_PUBLIC_ONEDRIVE_CLIENT_ID", desc: "OneDrive Picker Client ID" },
  { key: "NEXT_PUBLIC_ONEDRIVE_REDIRECT_URI", desc: "OneDrive Picker Redirect URI" },
];

function parseAllowedDomains(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((domain) => domain.trim())
    .filter((domain) => domain.length > 0);
}

const missingRequired = requiredEnvVars.filter((key) => {
  const value = process.env[key];
  if (!value || value.trim().length === 0) return true;
  if (key === "NEXT_PUBLIC_ALLOWED_DOMAINS") return parseAllowedDomains(value).length === 0;
  return false;
});

if (missingRequired.length > 0) {
  console.error(`\n${"=".repeat(70)}`);
  console.error("❌ FATAL: Missing required environment variables in production:");
  missingRequired.forEach((key) => {
    console.error(`   - ${key}`);
  });
  console.error("\nPlease configure these variables before starting the application.");
  console.error("See .env.example for reference.");
  console.error(`${"=".repeat(70)}\n`);
  process.exit(1);
}

const missingRecommended = recommendedEnvVars.filter((v) => !process.env[v.key]);
if (missingRecommended.length > 0) {
  console.warn(`\n${"-".repeat(70)}`);
  console.warn("⚠️  WARNING: Missing recommended environment variables:");
  missingRecommended.forEach((v) => {
    console.warn(`   - ${v.key} (${v.desc})`);
  });
  console.warn(`${"-".repeat(70)}\n`);
}
