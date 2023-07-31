import dayjs from "@calcom/dayjs";
import type { IntervalLimit } from "@calcom/types/Calendar";

import { getErrorFromUnknown } from "../errors";
import { HttpError } from "../http-error";
import { intervalLimitKeyToUnit } from "../intervalLimit";
import { parseDurationLimit } from "../isDurationLimits";
import { getTotalBookingDuration } from "./queries";

export async function checkDurationLimits(
  durationLimits: IntervalLimit,
  eventStartDate: Date,
  eventId: number
) {
  const parsedDurationLimits = parseDurationLimit(durationLimits);
  if (!parsedDurationLimits) return false;

  const entries = Object.entries(parsedDurationLimits) as [keyof IntervalLimit, number][];
  const limitCalculations = entries.map(([key, limitingNumber]) =>
    checkDurationLimit({ key, limitingNumber, eventStartDate, eventId })
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
  returnBusyTimes = false,
}: {
  eventStartDate: Date;
  eventId: number;
  key: keyof IntervalLimit;
  limitingNumber: number;
  returnBusyTimes?: boolean;
}) {
  {
    const unit = intervalLimitKeyToUnit(key);

    const startDate = dayjs(eventStartDate).startOf(unit).toDate();
    const endDate = dayjs(eventStartDate).endOf(unit).toDate();

    const totalBookingDuration = await getTotalBookingDuration({ eventId, startDate, endDate });

    if (totalBookingDuration < limitingNumber) return;

    // This is used when getting availability
    if (returnBusyTimes) {
      return {
        start: startDate,
        end: endDate,
      };
    }

    throw new HttpError({
      message: `duration_limit_reached`,
      statusCode: 403,
    });
  }
}
