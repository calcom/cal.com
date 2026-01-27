import dayjs from "@calcom/dayjs";
import type { CheckBookingLimitsService } from "@calcom/features/bookings/lib/checkBookingLimits";
import { checkDurationLimits } from "@calcom/features/bookings/lib/checkDurationLimits";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { withReporting } from "@calcom/lib/sentryWrapper";

import type { NewBookingEventType } from "./getEventTypesFromDB";

type EventType = Pick<
  NewBookingEventType,
  "bookingLimits" | "durationLimits" | "id" | "schedule" | "timeZone" | "users"
>;

type InputProps = {
  eventType: EventType;
  reqBodyStart: string;
  reqBodyRescheduleUid?: string;
};

export interface ICheckBookingAndDurationLimitsService {
  checkBookingLimitsService: CheckBookingLimitsService;
}

export class CheckBookingAndDurationLimitsService {
  constructor(private readonly dependencies: ICheckBookingAndDurationLimitsService) { }

  checkBookingAndDurationLimits = withReporting(
    this._checkBookingAndDurationLimits.bind(this),
    "checkBookingAndDurationLimits"
  );

  async _checkBookingAndDurationLimits({ eventType, reqBodyStart, reqBodyRescheduleUid }: InputProps) {
    if (
      Object.prototype.hasOwnProperty.call(eventType, "bookingLimits") ||
      Object.prototype.hasOwnProperty.call(eventType, "durationLimits")
    ) {
      const startAsDate = dayjs(reqBodyStart).toDate();
      if (eventType.bookingLimits && Object.keys(eventType.bookingLimits).length > 0) {
        // Prioritize event type timezone, then schedule timezone, then user timezone
        const timeZone =
          eventType.timeZone || eventType.schedule?.timeZone || eventType.users?.[0]?.timeZone;

        await this.dependencies.checkBookingLimitsService.checkBookingLimits(
          eventType.bookingLimits as IntervalLimit,
          startAsDate,
          eventType.id,
          reqBodyRescheduleUid,
          timeZone
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
  }
}
