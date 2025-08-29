import type { TraceContext } from "@calcom/lib/tracing";
import { TracedError } from "@calcom/lib/tracing/error";
import { distributedTracing } from "@calcom/lib/tracing/factory";

export const createLoggerWithEventDetails = (
  existingTraceContext: TraceContext | undefined,
  eventMeta: Record<string, unknown>
) => {
  // Convert unknown values to strings for tracing
  const stringMeta: Record<string, string> = Object.fromEntries(
    Object.entries(eventMeta).map(([key, value]) => [key, value?.toString() || "null"])
  );

  const traceContext = existingTraceContext
    ? distributedTracing.createSpan(existingTraceContext, "booking_event", stringMeta)
    : distributedTracing.createTrace("booking_event", {
        meta: stringMeta,
      });

  const logger = distributedTracing.getTracingLogger(traceContext);

  return {
    logger,
    traceContext,
    createTracedError: (error: unknown, additionalData?: Record<string, unknown>) => {
      return TracedError.createFromError(error, traceContext, additionalData);
    },
  };
};
