import { DistributedTracing } from "@calcom/lib/tracing";

export const createLoggerWithEventDetails = (
  eventTypeId: number,
  reqBodyUser: string | string[] | undefined,
  eventTypeSlug: string | undefined
) => {
  const traceContext = DistributedTracing.createTrace("booking_event", {
    eventTypeId,
    userInfo: reqBodyUser,
    eventTypeSlug,
  });
  return DistributedTracing.getTracingLogger(traceContext);
};
