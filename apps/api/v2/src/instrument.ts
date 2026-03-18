import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { getEnv } from "@/env";

if (process.env.SENTRY_DSN) {
  // Ensure to call this before requiring any other modules!
  Sentry.init({
    dsn: getEnv("SENTRY_DSN"),
    integrations: [nodeProfilingIntegration()],
    // Performance Monitoring
    tracesSampleRate: getEnv("SENTRY_TRACES_SAMPLE_RATE") ?? 1.0,
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: getEnv("SENTRY_PROFILES_SAMPLE_RATE") ?? 1.0,
    // Filter noisy Prisma child spans (serialize, compile, query, db_query) but keep prisma:client:operation.
    // Also filter low-level "db" spans (pg-pool.connect, SELECT, etc.) that are children of Prisma spans.
    ignoreSpans: [{ op: /^prisma:client:(?!operation)/ }, { op: "db" }],
  });
}
