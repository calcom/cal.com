import dayjs from "@calcom/dayjs";
import type { IntervalLimit } from "@calcom/types/Calendar";

import { getErrorFromUnknown } from "../errors";
import { HttpError } from "../http-error";
import { ascendingLimitKeys, intervalLimitKeyToUnit } from "../intervalLimit";
import { parseDurationLimit } from "../isDurationLimits";
import { getTotalBookingDuration } from "./queries";

export async function checkDurationLimits(
  durationLimits: IntervalLimit,
  eventStartDate: Date,
  eventId: number
) {
  const parsedDurationLimits = parseDurationLimit(durationLimits);
  if (!parsedDurationLimits) return false;

  // not iterating entries to preserve types
  const limitCalculations = ascendingLimitKeys.map((key) =>
    checkDurationLimit({ key, limitingNumber: parsedDurationLimits[key], eventStartDate, eventId })
  );

  try {
    return !!(await Promise.all(limitCalculations));
  } catch (error) {
    throw new HttpError({ message: getErrorFromUnknown(error).message, statusCode: 401 });
  }
}

export async function checkDurationLimit({
  eventStartDate,
  eventId,
  key,
  limitingNumber,
}: {
  eventStartDate: Date;
  eventId: number;
  key: keyof IntervalLimit;
  limitingNumber: number | undefined;
}) {
  {
    if (!limitingNumber) return;

    const unit = intervalLimitKeyToUnit(key);

    const startDate = dayjs(eventStartDate).startOf(unit).toDate();
    const endDate = dayjs(eventStartDate).endOf(unit).toDate();

    const totalBookingDuration = await getTotalBookingDuration({ eventId, startDate, endDate });

    if (totalBookingDuration < limitingNumber) return;

    throw new HttpError({
      message: `duration_limit_reached`,
      statusCode: 403,
    });
  }
}
