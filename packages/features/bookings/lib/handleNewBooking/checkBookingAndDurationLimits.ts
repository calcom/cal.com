import dayjs from "@calcom/dayjs";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { checkBookingLimits } from "@calcom/lib/intervalLimits/server/checkBookingLimits";
import { checkDurationLimits } from "@calcom/lib/intervalLimits/server/checkDurationLimits";
import { withReporting } from "@calcom/lib/sentryWrapper";

import type { NewBookingEventType } from "./getEventTypesFromDB";

type EventType = Pick<NewBookingEventType, "bookingLimits" | "durationLimits" | "id" | "schedule">;

type InputProps = {
  eventType: EventType;
  reqBodyStart: string;
  reqBodyRescheduleUid?: string;
};

const _checkBookingAndDurationLimits = async ({
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

export const checkBookingAndDurationLimits = withReporting(
  _checkBookingAndDurationLimits,
  "checkBookingAndDurationLimits"
);
