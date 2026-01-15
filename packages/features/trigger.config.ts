import process from "node:process";
import { syncVercelEnvVars } from "@trigger.dev/build/extensions/core";
import { defineConfig } from "@trigger.dev/sdk";
import dotEnv from "dotenv";

dotEnv.config({ path: "../../.env" });

const canSyncEnvVars = Boolean(
  process.env.TRIGGER_DEV_VERCEL_ACCESS_TOKEN &&
    process.env.TRIGGER_DEV_VERCEL_PROJECT_ID &&
    process.env.TRIGGER_DEV_VERCEL_TEAM_ID
);

export default defineConfig({
  // Your project ref from the Trigger.dev dashboard
  project: process.env.TRIGGER_DEV_PROJECT_REF ?? "", // e.g., "proj_abc123"

  // Directories containing your tasks
  dirs: ["./bookings/lib/tasker/trigger/notifications", "./calendars/lib/tasker/trigger"], // Customize based on your project structure

  // Retry configuration
  retries: {
    enabledInDev: false, // Enable retries in development
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },

  // Keep the process alive after the task has finished running so the next task doesn’t have to wait for the process to start up again.
  processKeepAlive: true,

  // Build configuration (optional)
  build: {
    external: [
      "@prisma/client",
      "nodemailer",
      "jsdom",
      "playwright-core",
      "playwright",
      "chromium-bidi",
      "http-cookie-agent",
      "deasync",
    ],
    extensions: canSyncEnvVars
      ? [
          syncVercelEnvVars({
            // A personal access token created in your Vercel account settings
            // Used to authenticate API requests to Vercel
            // Generate at: https://vercel.com/account/tokens
            vercelAccessToken: process.env.TRIGGER_DEV_VERCEL_ACCESS_TOKEN,
            // The unique identifier of your Vercel project
            // Found in Project Settings > General > Project ID
            projectId: process.env.TRIGGER_DEV_VERCEL_PROJECT_ID,
            // Optional: The ID of your Vercel team
            // Only required for team projects
            // Found in Team Settings > General > Team ID
            vercelTeamId: process.env.TRIGGER_DEV_VERCEL_TEAM_ID,
          }),
        ]
      : [],
  },

  // Max duration of a task in seconds
  maxDuration: 600,
});
