import { WorkflowTriggerEvents } from "@prisma/client/";
import { TimeUnit } from "@prisma/client/";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

import { CalendarEvent } from "@calcom/types/Calendar";

import prisma from "@lib/prisma";
import * as twilio from "@lib/reminders/smsProviders/twilioProvider";
import reminderSMSTemplate from "@lib/reminders/templates/reminderSMSTemplate";

dayjs.extend(isBetween);

enum timeUnitLowerCase {
  DAY = "day",
  MINUTE = "minute",
  YEAR = "year",
}

export const scheduleSMSAttendeeReminder = async (
  evt: CalendarEvent,
  reminderPhone: string,
  triggerEvent: WorkflowTriggerEvents,
  timeBefore: {
    time: number | null;
    timeUnit: TimeUnit | null;
  }
) => {
  const { startTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const startTimeObject = dayjs(startTime);
  const timeUnit: timeUnitLowerCase | undefined =
    timeBefore.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  const scheduledDate =
    timeBefore.time && timeUnit ? dayjs(startTime).subtract(timeBefore.time, timeUnit) : null;
  const smsBody = reminderSMSTemplate(
    evt.title,
    evt.organizer.name,
    evt.startTime,
    evt.attendees[0].timeZone
  ) as string;

  //send SMS right away when event is booked/cancelled
  if (
    triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
    triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED
  ) {
    try {
      await twilio.sendSMS(reminderPhone, smsBody);
    } catch (error) {
      console.log(`Error sending SMS with error ${error}`);
    }
  }
  if (scheduledDate) {
    if (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT) {
      // Can only schedule at least 60 minutes in advance and at most 7 days in advance
      if (
        !currentDate.isBetween(startTimeObject.subtract(1, "hour"), startTimeObject) &&
        scheduledDate.isBetween(currentDate, currentDate.add(7, "day"))
      ) {
        try {
          await twilio.scheduleSMS(reminderPhone, smsBody, scheduledDate.toDate());
        } catch (error) {
          console.log(`Error scheduling SMS with error ${error}`);
        }
      }

      // Write to DB and send to CRON if scheduled reminder date is past 7 days
      if (scheduledDate.isAfter(currentDate.add(7, "day"))) {
        await prisma.unscheduledReminders.create({
          data: {
            booking: {
              connect: {
                uid: uid,
              },
            },
            method: "SMS",
            sendTo: reminderPhone,
            scheduledDate: scheduledDate.toDate(),
            scheduled: false,
          },
        });
      }
    }
  }
};

// There are no bulk cancel so must do one at a time
export const deleteScheduledSMSReminder = async (referenceId: string) => {
  try {
    await twilio.cancelSMS(referenceId);
  } catch (error) {
    console.log(`Error canceling reminder with error ${error}`);
  }
};
