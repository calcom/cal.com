import { getEnv } from "@/env";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

if (process.env.SENTRY_DSN) {
  // Ensure to call this before requiring any other modules!
  Sentry.init({
    dsn: getEnv("SENTRY_DSN"),
    integrations: [nodeProfilingIntegration()],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });
}
