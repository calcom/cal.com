import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./",
  timeout: 180000, // 3 minutes to allow for large organization seeding
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "performance-results.json" }]],
  use: {
    baseURL: process.env.NEXT_PUBLIC_WEBAPP_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
};

export default config;
