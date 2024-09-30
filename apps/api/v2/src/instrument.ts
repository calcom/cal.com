import { getEnv } from "@/env";
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  // Ensure to call this before requiring any other modules!
  Sentry.init({
    dsn: getEnv("SENTRY_DSN"),
    // Add Performance Monitoring by setting tracesSampleRate
    // We recommend adjusting this value in production
    // todo: Evaluate? tracesSampleRate: 1.0
  });
}
