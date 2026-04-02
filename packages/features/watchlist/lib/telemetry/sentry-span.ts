import { startSpan } from "@sentry/nextjs";
import type { SpanFn } from "./types";

/**
 * Sentry implementation of telemetry spans
 * Wraps Sentry's startSpan for production use
 */
export const sentrySpan: SpanFn = async (options, callback) => {
  return startSpan({ name: options.name, op: options.op }, callback);
};
