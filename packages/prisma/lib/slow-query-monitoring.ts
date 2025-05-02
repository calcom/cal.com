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

function redactSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  try {
    let jsonString = JSON.stringify(data);

    // Create a regex to find sensitive keys and replace their values
    // This regex looks for "sensitiveKey":"anyValue" patterns
    // It handles string, number, boolean, null, array, and object values.
    for (const field of SENSITIVE_FIELDS) {
      // Escape special characters in the field name for regex
      const escapedField = field.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
      // Match the key (in quotes) followed by a colon, optional whitespace,
      // and then the value (string, number, boolean, null, object, or array)
      const regex = new RegExp(
        `"${escapedField}"\s*:\s*(?:"(?:[^"\\]|\\.)*"|\d+(?:\.\d+)?|true|false|null|\[.*?\]|\{[^]*?\})`,
        "gi"
      );
      jsonString = jsonString.replace(regex, `"${field}":"[REDACTED]"`);
    }

    return JSON.parse(jsonString);
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
