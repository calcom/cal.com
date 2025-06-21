import type { Logger } from "tslog";

import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { convertTimeToUTC } from "@calcom/lib/timeUtils";

type Props = {
  reqBodyStart: string;
  reqBodyEnd: string;
  timeZone: string;
  eventTypeMultipleDuration?: number[];
  eventTypeLength: number;
  logger: Logger<unknown>;
};

// Define the function with underscore prefix
const _validateEventLength = ({
  reqBodyStart,
  reqBodyEnd,
  timeZone,
  eventTypeMultipleDuration,
  eventTypeLength,
  logger,
}: Props) => {
  const startUTC = convertTimeToUTC(reqBodyStart, timeZone);
  const endUTC = convertTimeToUTC(reqBodyEnd, timeZone);
  const reqEventLength = dayjs(endUTC).diff(dayjs(startUTC), "minutes");
  const validEventLengths = eventTypeMultipleDuration?.length ? eventTypeMultipleDuration : [eventTypeLength];
  if (!validEventLengths.includes(reqEventLength)) {
    logger.warn({ message: "NewBooking: Invalid event length" });
    throw new HttpError({ statusCode: 400, message: "Invalid event length" });
  }
};

export const validateEventLength = withReporting(_validateEventLength, "validateEventLength");
