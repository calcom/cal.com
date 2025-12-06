import dayjs from "@calcom/dayjs";
import type { CheckBookingLimitsService } from "@calcom/features/bookings/lib/checkBookingLimits";
import { checkDurationLimits } from "@calcom/features/bookings/lib/checkDurationLimits";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";

import type { NewBookingEventType } from "./getEventTypesFromDB";

type EventType = Pick<
  NewBookingEventType,
  "bookingLimits" | "durationLimits" | "id" | "schedule" | "userId" | "schedulingType"
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
      if (eventType.bookingLimits && Object.keys(eventType.bookingLimits).length > 0) {
        await this.dependencies.checkBookingLimitsService.checkBookingLimits(
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

      // We are only interested in global booking limits for individual user events
      if (eventType.userId && !eventType.schedulingType) {
        const eventTypeUser = await prisma.user.findUnique({
          where: {
            id: eventType.userId,
          },
          select: {
            id: true,
            email: true,
            bookingLimits: true,
          },
        });
        if (eventTypeUser?.bookingLimits && Object.keys(eventTypeUser.bookingLimits).length > 0) {
          await this.dependencies.checkBookingLimitsService.checkBookingLimits(
            eventTypeUser.bookingLimits as IntervalLimit,
            startAsDate,
            eventType.id,
            reqBodyRescheduleUid,
            eventType.schedule?.timeZone,
            { id: eventTypeUser.id, email: eventTypeUser.email }
          );
        }
      }
    }
  }
}
