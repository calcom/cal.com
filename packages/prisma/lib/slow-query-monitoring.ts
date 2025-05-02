import type { Prisma } from "@prisma/client";
import type { PrismaClient as PrismaClientWithoutExtension } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";

import logger from "@calcom/lib/logger";

import { createReplacer } from "./replacer";

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

// Create a Set for efficient O(1) average time complexity lookups
const SENSITIVE_FIELDS_SET = new Set<string>(SENSITIVE_FIELDS);

function redactSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  try {
    const closureReplacer = createReplacer(SENSITIVE_FIELDS_SET);
    return JSON.parse(JSON.stringify(data, closureReplacer, 2));
  } catch (error) {
    // Fallback or logging if JSON operations fail
    logger.error("Failed to redact sensitive data using JSON.stringify/parse", error);
    // Return a generic redacted object or the original data as a fallback
    return { error: "Redaction failed" };
  }
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
