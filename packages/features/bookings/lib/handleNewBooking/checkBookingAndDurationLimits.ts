import dayjs from "@calcom/dayjs";
import { checkBookingLimits, checkDurationLimits } from "@calcom/lib/server";
import type { IntervalLimit } from "@calcom/types/Calendar";

import type { NewBookingEventType } from "./types";

type EventType = Pick<NewBookingEventType, "bookingLimits" | "durationLimits" | "id" | "schedule">;

type InputProps = {
  eventType: EventType;
  reqBodyStart: string;
  reqBodyRescheduleUid?: string;
};

export const checkBookingAndDurationLimits = async ({
  eventType,
  reqBodyStart,
  reqBodyRescheduleUid,
}: InputProps) => {
  if (
    Object.prototype.hasOwnProperty.call(eventType, "bookingLimits") ||
    Object.prototype.hasOwnProperty.call(eventType, "durationLimits")
  ) {
    const startAsDate = dayjs(reqBodyStart).toDate();
    if (eventType.bookingLimits && Object.keys(eventType.bookingLimits).length > 0) {
      await checkBookingLimits(
        eventType.bookingLimits as IntervalLimit,
        startAsDate,
        eventType.id,
        reqBodyRescheduleUid,
        eventType.schedule?.timeZone
      );
    }
    if (eventType.durationLimits) {
      await checkDurationLimits(
        eventType.durationLimits as IntervalLimit,
        startAsDate,
        eventType.id,
        reqBodyRescheduleUid
      );
    }
  }
};
