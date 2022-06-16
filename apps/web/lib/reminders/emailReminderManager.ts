import { TimeUnit, WorkflowTriggerEvents } from "@prisma/client";
import dayjs from "dayjs";

import { sendCustomEmail } from "@calcom/emails";
import { CalendarEvent } from "@calcom/types/Calendar";

import prisma from "@lib/prisma";

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
  sendTo: string | string[],
  emailSubject: string,
  emailbody: string,
  workflowStepId: number
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
    if (Array.isArray(sendTo)) {
      try {
        sendTo.forEach(async (email) => await sendCustomEmail(evt, email, emailSubject, emailbody));
      } catch (error) {
        console.log("Error sending Emails");
      }
    } else
      try {
        await sendCustomEmail(evt, evt.organizer.email, emailSubject, emailbody);
      } catch (error) {
        console.log("Error sending Email");
      }
  } else if (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT && scheduledDate) {
    let remindersToCreate;
    //schedule Email
    if (Array.isArray(sendTo)) {
      remindersToCreate = sendTo.map((email) => ({
        bookingUid: uid,
        method: "Email",
        sendTo: email,
        scheduledDate: scheduledDate.toDate(),
        scheduled: true,
        workflowStepId: workflowStepId,
      }));
    } else {
      remindersToCreate = {
        bookingUid: uid,
        method: "Email",
        sendTo: sendTo,
        scheduledDate: scheduledDate.toDate(),
        scheduled: true,
        workflowStepId: workflowStepId,
      };
    }

    await prisma.workflowReminder.createMany({
      data: remindersToCreate,
    });
  }
};
