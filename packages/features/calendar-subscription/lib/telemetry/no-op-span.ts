import type { SpanFn } from "./types";

/**
 * No-op implementation of telemetry spans for calendar subscription
 * Useful for testing or when telemetry is disabled
 */
export const noOpSpan: SpanFn = async (_options, callback) => {
  return Promise.resolve(callback());
};
