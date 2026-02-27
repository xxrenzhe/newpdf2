import { defineConfig, devices } from "playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const e2eNextAuthSecret =
  process.env.PLAYWRIGHT_NEXTAUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  "playwright-e2e-secret-change-me";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    acceptDownloads: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", viewport: { width: 1280, height: 720 } },
    },
    {
      name: "firefox",
      use: { browserName: "firefox", viewport: { width: 1280, height: 720 } },
    },
    {
      name: "webkit",
      use: { browserName: "webkit", viewport: { width: 1280, height: 720 } },
    },
    {
      name: "chromium-mobile",
      use: { browserName: "chromium", ...devices["Pixel 5"] },
    },
    {
      name: "firefox-mobile",
      use: {
        browserName: "firefox",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
    {
      name: "webkit-mobile",
      use: { browserName: "webkit", ...devices["iPhone 13"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run build && node scripts/start-standalone.mjs --port ${port}`,
        env: {
          ...process.env,
          NEXT_PUBLIC_E2E: "1",
          NEXTAUTH_SECRET: e2eNextAuthSecret,
          NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? baseURL,
        },
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
