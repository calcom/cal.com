import type { Logger } from "tslog";

import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";

type Props = {
  reqBodyStart: string;
  reqBodyEnd: string;
  eventTypeMutipleDuration?: number[];
  eventTypeLength: number;
  logger: Logger<unknown>;
};

export const validateEventLength = ({
  reqBodyStart,
  reqBodyEnd,
  eventTypeMutipleDuration,
  eventTypeLength,
  logger,
}: Props) => {
  const reqEventLength = dayjs(reqBodyEnd).diff(dayjs(reqBodyStart), "minutes");
  const validEventLengths = eventTypeMutipleDuration?.length ? eventTypeMutipleDuration : [eventTypeLength];
  if (!validEventLengths.includes(reqEventLength)) {
    logger.warn({ message: "NewBooking: Invalid event length" });
    throw new HttpError({ statusCode: 400, message: "Invalid event length" });
  }
};
