import { DistributedTracing, type TraceContext } from "@calcom/lib/tracing";
import { TracedError } from "@calcom/lib/tracing/error";

export const createLoggerWithEventDetails = (
  eventTypeId: number,
  reqBodyUser: string | string[] | undefined,
  eventTypeSlug: string | undefined,
  existingTraceContext?: TraceContext
) => {
  const eventMeta = {
    eventTypeId,
    userInfo: reqBodyUser,
    eventTypeSlug,
  };

  const traceContext = existingTraceContext
    ? DistributedTracing.createSpan(existingTraceContext, "booking_event", eventMeta)
    : DistributedTracing.createTrace("booking_event", {
        meta: eventMeta,
      });

  const logger = DistributedTracing.getTracingLogger(traceContext);

  return {
    logger,
    traceContext,
    createTracedError: (error: unknown, additionalData?: Record<string, unknown>) => {
      return TracedError.createFromError(error, traceContext, additionalData);
    },
  };
};
