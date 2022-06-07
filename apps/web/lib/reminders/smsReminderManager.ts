import { WorkflowTriggerEvents } from "@prisma/client/";
import { TimeUnit } from "@prisma/client/";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

import { CalendarEvent } from "@calcom/types/Calendar";

import * as twilio from "@lib/reminders/smsProviders/twilioProvider";
import reminderTemplate from "@lib/reminders/templates/reminder-sms";

dayjs.extend(isBetween);

interface reminderPhone {
  smsReminderNumber: string;
}

export const scheduleSMSAttendeeReminder = async (
  evt: CalendarEvent,
  reminderPhone: string,
  triggerEvent: WorkflowTriggerEvents,
  timeBefore?: {
    time: number;
    timeUnit: TimeUnit;
  }
) => {
  const { startTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const startTimeObject = dayjs(startTime);
  const scheduledDate = timeBefore ? dayjs(startTime).subtract(timeBefore.time, timeBefore.timeUnit) : null;

  const smsBody = reminderTemplate(
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

  if (WorkflowTriggerEvents.BEFORE_EVENT === triggerEvent) {
    // Can only schedule at least 60 minutes in advance and at most 7 days in advance
    if (
      scheduledDate &&
      !currentDate.isBetween(startTimeObject.subtract(1, "hour"), startTimeObject) &&
      scheduledDate.isBetween(currentDate, currentDate.add(7, "day"))
    ) {
      try {
        await twilio.scheduleSMS(reminderPhone, smsBody, scheduledDate.toDate());
      } catch (error) {
        console.log(`Error scheduling SMS with error ${error}`);
      }
    }
  }

  // if (scheduledDate.isAfter(currentDate.add(7, "day"))) {
  //   // Write to DB and send to CRON if scheduled reminder date is past 7 days
  //   await prisma.attendeeReminder.create({
  //     data: {
  //       booking: {
  //         connect: {
  //           uid: uid,
  //         },
  //       },
  //       method: "SMS",
  //       sendTo: reminderPhone,
  //       referenceId: "",
  //       scheduledDate: scheduledDate.toDate(),
  //       scheduled: false,
  //     },
  //   });
  // }
};

// There are no bulk cancel so must do one at a time
export const deleteScheduledSMSReminder = async (referenceId: string) => {
  try {
    await twilio.cancelSMS(referenceId);
  } catch (error) {
    console.log(`Error canceling reminder with error ${error}`);
  }
};
