import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { DistributedTracing, type TraceContext } from "@calcom/lib/tracing";

type Props = {
  reqBodyStart: string;
  reqBodyEnd: string;
  eventTypeMultipleDuration?: number[];
  eventTypeLength: number;
  traceContext?: TraceContext;
};

// Define the function with underscore prefix
const _validateEventLength = ({
  reqBodyStart,
  reqBodyEnd,
  eventTypeMultipleDuration,
  eventTypeLength,
  traceContext,
}: Props) => {
  const spanContext = traceContext
    ? DistributedTracing.createSpan(traceContext, "validate_event_length", {
        meta: {
          reqBodyStart,
          reqBodyEnd,
          eventTypeMultipleDuration,
          eventTypeLength,
        },
      })
    : DistributedTracing.createTrace("validate_event_length_fallback", {
        meta: {
          reqBodyStart,
          reqBodyEnd,
          eventTypeMultipleDuration,
          eventTypeLength,
        },
      });
  const logger = DistributedTracing.getTracingLogger(spanContext);
  const reqEventLength = dayjs(reqBodyEnd).diff(dayjs(reqBodyStart), "minutes");
  const validEventLengths = eventTypeMultipleDuration?.length ? eventTypeMultipleDuration : [eventTypeLength];
  if (!validEventLengths.includes(reqEventLength)) {
    logger.warn({ message: "NewBooking: Invalid event length" });
    throw new HttpError({ statusCode: 400, message: "Invalid event length" });
  }
};

export const validateEventLength = withReporting(_validateEventLength, "validateEventLength");
