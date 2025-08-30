import dayjs from "@calcom/dayjs";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import type { CheckBookingLimitsService } from "@calcom/lib/intervalLimits/server/checkBookingLimits";
import { checkDurationLimits } from "@calcom/lib/intervalLimits/server/checkDurationLimits";
import { withReporting } from "@calcom/lib/sentryWrapper";

import type { NewBookingEventType } from "./getEventTypesFromDB";

type EventType = Pick<NewBookingEventType, "bookingLimits" | "durationLimits" | "id" | "schedule"> & {
  // Add user data to get weekStart preference
  users?: Array<{ weekStart?: number | null }>;
  // For team events, might need this structure instead
  owner?: { weekStart?: number | null };
};

type InputProps = {
  eventType: EventType;
  reqBodyStart: string;
  reqBodyRescheduleUid?: string;
};

export interface ICheckBookingAndDurationLimitsService {
  checkBookingLimitsService: CheckBookingLimitsService;
}

export class CheckBookingAndDurationLimitsService {
  constructor(private readonly dependencies: ICheckBookingAndDurationLimitsService) {}

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

      console.log("event types ", eventType);

      if (eventType.bookingLimits && Object.keys(eventType.bookingLimits).length > 0) {
        // Get weekStart preference - try multiple possible sources
        let weekStart: number | null = null;

        // For individual user events
        if (eventType.users && eventType.users.length > 0) {
          weekStart = eventType.users[0].weekStart ?? null;
        }

        // For team events or if users array doesn't have weekStart
        if (weekStart === null && eventType.owner) {
          weekStart = eventType.owner.weekStart ?? null;
        }

        // Default to 0 (Sunday) if no preference found
        if (weekStart === null) {
          weekStart = 0;
        }

        await this.dependencies.checkBookingLimitsService.checkBookingLimits(
          eventType.bookingLimits as IntervalLimit,
          startAsDate,
          eventType.id,
          reqBodyRescheduleUid,
          eventType.schedule?.timeZone,
          false, // includeManagedEvents - you may need to pass this as a parameter
          weekStart
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
