import dayjs from "@calcom/dayjs";
import { checkBookingLimits, checkDurationLimits } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import type { IntervalLimit } from "@calcom/types/Calendar";

import type { NewBookingEventType } from "./types";

type EventType = Pick<
  NewBookingEventType,
  "bookingLimits" | "durationLimits" | "id" | "schedule" | "userId" | "schedulingType"
>;

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
  const startAsDate = dayjs(reqBodyStart).toDate();
  if (
    Object.prototype.hasOwnProperty.call(eventType, "bookingLimits") ||
    Object.prototype.hasOwnProperty.call(eventType, "durationLimits")
  ) {
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
      await checkBookingLimits(
        eventTypeUser.bookingLimits as IntervalLimit,
        startAsDate,
        eventType.id,
        reqBodyRescheduleUid,
        eventType.schedule?.timeZone,
        { id: eventTypeUser.id, email: eventTypeUser.email },
        true
      );
    }
  }
};
