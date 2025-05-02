import type { Prisma } from "@prisma/client";
import type { PrismaClient as PrismaClientWithoutExtension } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";

import logger from "@calcom/lib/logger";

const SLOW_QUERY_THRESHOLD_MS = process.env.PRISMA_SLOW_QUERY_THRESHOLD_MS
  ? parseInt(process.env.PRISMA_SLOW_QUERY_THRESHOLD_MS, 10)
  : 500;

// Fields that might contain sensitive data
const SENSITIVE_FIELDS = [
  "accessToken",
  "api_key",
  "apiKey",
  "auth",
  "authorization",
  "client_id",
  "client_secret",
  "credential",
  "hash",
  "key",
  "password",
  "refreshToken",
  "secret",
  "token",
];

function redactSensitiveData(params: unknown): unknown {
  if (!params || typeof params !== "object") return params;

  const redacted = { ...params };
  for (const key in redacted) {
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field))) {
      // @ts-expect-error - This is a temporary solution to avoid type errors
      redacted[key] = "[REDACTED]";
    }
  }
  return redacted;
}

// Helper function to setup slow query monitoring
export const setupSlowQueryMonitoring = (client: PrismaClientWithoutExtension) => {
  // @ts-expect-error - For some reason, $on is not typed correctly
  client.$on("query", (e: Prisma.QueryEvent) => {
    if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
      const message = `Slow query detected (${e.duration}ms)`;
      const redactedParams = redactSensitiveData(e.params);

      // Log to console
      logger.warn(message, {
        query: e.query,
        params: redactedParams,
        duration: e.duration,
      });

      // Report to Sentry only if NEXT_PUBLIC_SENTRY_DSN is configured
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.captureMessage(message, {
          level: "warning",
          extra: {
            query: e.query,
            params: redactedParams,
            duration_ms: e.duration,
            threshold_ms: SLOW_QUERY_THRESHOLD_MS,
          },
          fingerprint: ["prisma", "slow-query", e.query.substring(0, 250)],
        });
      }
    }
  });
};
