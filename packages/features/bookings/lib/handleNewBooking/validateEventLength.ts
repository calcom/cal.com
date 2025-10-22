import type { Logger } from "tslog";

import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { TraceContext } from "@calcom/lib/tracing";
import { distributedTracing } from "@calcom/lib/tracing/factory";

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
    ? distributedTracing.createSpan(traceContext, "validate_event_length", {
        reqBodyStart,
        reqBodyEnd,
        eventTypeMultipleDuration: JSON.stringify(eventTypeMultipleDuration),
        eventTypeLength: eventTypeLength.toString(),
      })
    : distributedTracing.createTrace("validate_event_length_fallback", {
        meta: {
          reqBodyStart,
          reqBodyEnd,
          eventTypeMultipleDuration: JSON.stringify(eventTypeMultipleDuration),
          eventTypeLength: eventTypeLength.toString(),
        },
      });
  const logger = distributedTracing.getTracingLogger(spanContext);

  const reqEventLength = dayjs(reqBodyEnd).diff(dayjs(reqBodyStart), "minutes");
  const validEventLengths = eventTypeMultipleDuration?.length ? eventTypeMultipleDuration : [eventTypeLength];
  if (!validEventLengths.includes(reqEventLength)) {
    logger.warn({ message: "NewBooking: Invalid event length" });
    throw new HttpError({ statusCode: 400, message: "Invalid event length" });
  }
};

export const validateEventLength = withReporting(_validateEventLength, "validateEventLength");
