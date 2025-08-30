import type { Logger } from "tslog";

import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import { withReporting } from "@calcom/lib/sentryWrapper";

type Props = {
  reqBodyStart: string;
  reqBodyEnd: string;
  eventTypeMultipleDuration?: number[];
  eventTypeLength: number;
  logger: Logger<unknown>;
};

// Define the function with underscore prefix
const _validateEventLength = ({
  reqBodyStart,
  reqBodyEnd,
  eventTypeMultipleDuration,
  eventTypeLength,
  logger,
}: Props) => {
  const reqEventLength = dayjs(reqBodyEnd).diff(dayjs(reqBodyStart), "minutes");
  const validEventLengths = eventTypeMultipleDuration?.length ? eventTypeMultipleDuration : [eventTypeLength];
  if (!validEventLengths.includes(reqEventLength)) {
    logger.warn({ message: "NewBooking: Invalid event length" });
    throw new HttpError({ statusCode: 400, message: "Invalid event length" });
  }
};

export const validateEventLength = withReporting(_validateEventLength, "validateEventLength");
