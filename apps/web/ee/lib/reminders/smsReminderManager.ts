import { EventTypeAttendeeReminder } from "@prisma/client/";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

import { CalendarEvent } from "@calcom/types/Calendar";
import * as twilio from "@ee/lib/reminders/smsProviders/twilioProvider";
import reminderTemplate from "@ee/lib/reminders/templates/reminderSMSTemplate";

import prisma from "@lib/prisma";

dayjs.extend(isBetween);

interface reminderPhone {
  reminderPhone: string;
}

export const scheduleSMSAttendeeReminder = async (
  evt: CalendarEvent,
  reminderPhone: string,
  attendeeReminder: EventTypeAttendeeReminder
) => {
  const { startTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const startTimeObject = dayjs(startTime);
  const scheduledDate = dayjs(startTime).subtract(attendeeReminder.time, attendeeReminder.unitTime);

  const smsBody = reminderTemplate(
    evt.title,
    evt.organizer.name,
    evt.startTime,
    evt.attendees[0].timeZone
  ) as string;

  // Check the scheduled date and right now
  // Can only schedule at least 60 minutes in advance so send a reminder
  if (currentDate.isBetween(startTimeObject.subtract(1, "hour"), startTimeObject)) {
    try {
      const response = await twilio.sendSMS(reminderPhone, smsBody);

      await prisma.attendeeReminder.create({
        data: {
          booking: {
            connect: {
              uid: uid,
            },
          },
          method: "SMS",
          sendTo: reminderPhone,
          referenceId: response.sid,
          scheduledDate: dayjs().toDate(),
          scheduled: true,
        },
      });
    } catch (error) {
      console.log(`Error sending SMS with error ${error}`);
    }
  }
  // Can only schedule text messages 7 days in advance
  if (scheduledDate.isBetween(currentDate, currentDate.add(7, "day"))) {
    try {
      const response = await twilio.scheduleSMS(reminderPhone, smsBody, scheduledDate.toDate());

      await prisma.attendeeReminder.create({
        data: {
          booking: {
            connect: {
              uid: uid,
            },
          },
          method: "SMS",
          sendTo: reminderPhone,
          referenceId: response.sid,
          scheduledDate: scheduledDate.toDate(),
          scheduled: true,
        },
      });
    } catch (error) {
      console.log(`Error scheduling SMS with error ${error}`);
    }
  }

  if (scheduledDate.isAfter(currentDate.add(7, "day"))) {
    // Write to DB and send to CRON if scheduled reminder date is past 7 days
    await prisma.attendeeReminder.create({
      data: {
        booking: {
          connect: {
            uid: uid,
          },
        },
        method: "SMS",
        sendTo: reminderPhone,
        referenceId: "",
        scheduledDate: scheduledDate.toDate(),
        scheduled: false,
      },
    });
  }
};

// There are no bulk cancel so must do one at a time
export const deleteScheduledSMSReminder = async (referenceId: string) => {
  try {
    await twilio.cancelSMS(referenceId);

    await prisma.attendeeReminder.delete({
      where: {
        referenceId: referenceId,
      },
    });
  } catch (error) {
    console.log(`Error canceling reminder with error ${error}`);
  }
};
