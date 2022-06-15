import { TimeUnit, WorkflowTriggerEvents } from "@prisma/client";
import dayjs from "dayjs";

import { sendCustomEmail } from "@calcom/emails";
import { CalendarEvent } from "@calcom/types/Calendar";

enum timeUnitLowerCase {
  DAY = "day",
  MINUTE = "minute",
  YEAR = "year",
}

export const scheduleEmailReminder = async (
  evt: CalendarEvent,
  triggerEvent: WorkflowTriggerEvents,
  timeBefore: {
    time: number | null;
    timeUnit: TimeUnit | null;
  },
  emailSubject: string,
  emailbody: string
) => {
  const { startTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const timeUnit: timeUnitLowerCase | undefined =
    timeBefore.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  const scheduledDate =
    timeBefore.time && timeUnit ? dayjs(startTime).subtract(timeBefore.time, timeUnit) : null;

  if (
    triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
    triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED
  ) {
    await sendCustomEmail(evt, evt.organizer.email, emailSubject, emailbody);
  }
};
