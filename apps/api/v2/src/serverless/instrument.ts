import { getEnv } from "@/env";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const dsn = getEnv("SENTRY_DSN");
const environment = getEnv("NODE_ENV");

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: getEnv("SENTRY_TRACES_SAMPLE_RATE") ?? 1.0,
    profilesSampleRate: getEnv("SENTRY_PROFILES_SAMPLE_RATE") ?? 1.0,
  });
}
