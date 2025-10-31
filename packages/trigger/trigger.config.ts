import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  // Your project ref from the Trigger.dev dashboard
  project: "proj_klpqoyhxnkrxlceolbfy", // e.g., "proj_abc123"

  // Directories containing your tasks
  dirs: ["./tasks"], // Customize based on your project structure

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
    extensions: [
      prismaExtension({
        schema: "../prisma/schema.prisma",
        clientGenerator: "client",
      }),
    ],
  },

  // Max duration of a task in seconds
  maxDuration: 3600,
});
