import { metrics } from "@sentry/nextjs";
import type { SpanFn } from "./types";

/**
 * Sentry implementation of telemetry using lightweight metrics instead of spans.
 * Reports operation duration and call count without consuming span quota.
 */
export const sentrySpan: SpanFn = async (options, callback) => {
  const startTime = performance.now();
  try {
    const result = await callback();
    metrics.distribution("watchlist.operation.duration_ms", performance.now() - startTime, {
      attributes: { name: options.name, op: options.op ?? "unknown", status: "ok" },
    });
    metrics.count("watchlist.operation.calls", 1, {
      attributes: { name: options.name, op: options.op ?? "unknown" },
    });
    return result;
  } catch (error) {
    metrics.distribution("watchlist.operation.duration_ms", performance.now() - startTime, {
      attributes: { name: options.name, op: options.op ?? "unknown", status: "error" },
    });
    metrics.count("watchlist.operation.error", 1, {
      attributes: { name: options.name, op: options.op ?? "unknown" },
    });
    throw error;
  }
};
