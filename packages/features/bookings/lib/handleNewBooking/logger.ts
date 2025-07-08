import { DistributedTracing, type TraceContext } from "@calcom/lib/tracing";

export const createLoggerWithEventDetails = (
  eventTypeId: number,
  reqBodyUser: string | string[] | undefined,
  eventTypeSlug: string | undefined,
  existingTraceContext?: TraceContext
) => {
  const traceContext = existingTraceContext
    ? {
        ...existingTraceContext,
        eventTypeId,
        eventTypeSlug,
      }
    : DistributedTracing.createTrace("booking_event", {
        eventTypeId,
        eventTypeSlug,
      });
  return DistributedTracing.getTracingLogger(traceContext);
};
