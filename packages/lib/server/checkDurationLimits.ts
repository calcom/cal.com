import dayjs from "@calcom/dayjs";
import type { IntervalLimit } from "@calcom/types/Calendar";

import { HttpError } from "../http-error";
import { parseDurationLimit } from "../isDurationLimits";
import { getTotalBookingDuration } from "./queries";

export async function checkDurationLimits(
  durationLimits: IntervalLimit,
  eventStartDate: Date,
  eventId: number
) {
  const parsedDurationLimits = parseDurationLimit(durationLimits);
  if (!parsedDurationLimits) {
    return false;
  }

  const limitCalculations = Object.entries(parsedDurationLimits).map(
    async ([key, limitingNumber]) =>
      await checkDurationLimit({ key, limitingNumber, eventStartDate, eventId })
  );

  await Promise.all(limitCalculations).catch((error) => {
    throw new HttpError({ message: error.message, statusCode: 401 });
  });

  return true;
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
  key: string;
  limitingNumber: number;
  returnBusyTimes?: boolean;
}) {
  {
    // Take PER_DAY and turn it into day and PER_WEEK into week etc.
    const filter = key.split("_")[1].toLocaleLowerCase() as "day" | "week" | "month" | "year";
    const startDate = dayjs(eventStartDate).startOf(filter).toDate();
    const endDate = dayjs(startDate).endOf(filter).toDate();

    const totalBookingDuration = await getTotalBookingDuration({ eventId, startDate, endDate });
    if (totalBookingDuration >= limitingNumber) {
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
}
