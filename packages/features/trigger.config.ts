import { defineConfig } from "@trigger.dev/sdk";
import dotEnv from "dotenv";

dotEnv.config({ path: "../../.env" });

export default defineConfig({
  // Your project ref from the Trigger.dev dashboard
  project: process.env.TRIGGER_DEV_PROJECT_REF ?? "", // e.g., "proj_abc123"

  // Directories containing your tasks
  dirs: ["./bookings/lib/tasker/trigger/notifications"], // Customize based on your project structure

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

  // Build configuration (optional)
  build: {
    external: ["@prisma/client", "nodemailer", "jsdom", "playwright-core", "playwright", "chromium-bidi"],
  },

  // Max duration of a task in seconds
  maxDuration: 600,
});
