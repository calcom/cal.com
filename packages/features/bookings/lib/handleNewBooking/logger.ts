import type { TraceContext } from "@calcom/lib/tracing";
import { TracedError } from "@calcom/lib/tracing/error";
import { distributedTracing } from "@calcom/lib/tracing/factory";

export const createLoggerWithEventDetails = (
  existingTraceContext: TraceContext | undefined,
  eventMeta: Record<string, unknown>
) => {
  const traceContext = existingTraceContext
    ? distributedTracing.createSpan(existingTraceContext, "booking_event", eventMeta)
    : distributedTracing.createTrace("booking_event", {
        meta: eventMeta,
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
