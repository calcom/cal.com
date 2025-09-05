import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { getEnv } from "@/env";

if (process.env.SENTRY_DSN) {
  // Ensure to call this before requiring any other modules!
  Sentry.init({
    dsn: getEnv("SENTRY_DSN"),
    integrations: [nodeProfilingIntegration(), Sentry.prismaIntegration()],
    // Performance Monitoring
    tracesSampleRate: getEnv("SENTRY_TRACES_SAMPLE_RATE") ?? 1.0, //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: getEnv("SENTRY_PROFILES_SAMPLE_RATE") ?? 1.0,
  });
}
