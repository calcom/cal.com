import { EventTypeAttendeeReminder } from "@prisma/client/";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import twilio from "twilio";

import reminderTemplate from "@ee/lib/reminders/templates/reminderSMSTemplate";

import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";
import prisma from "@lib/prisma";

dayjs.extend(isBetween);

const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_MESSAGING_SID = process.env.TWILIO_MESSAGING_SID;

const client = twilio(TWILIO_SID, TWILIO_TOKEN);

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

  // Check the scheduled date and right now
  // Can only schedule at least 60 minutes in advance so send a reminder
  if (currentDate.isBetween(startTimeObject.subtract(1, "hour"), startTimeObject)) {
    try {
      const response = await client.messages.create({
        body: reminderTemplate(evt.title, evt.organizer.name, evt.startTime, evt.attendees[0].timeZone),
        messagingServiceSid: TWILIO_MESSAGING_SID,
        to: reminderPhone,
      });

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
      const response = await client.messages.create({
        body: reminderTemplate(evt.title, evt.organizer.name, evt.startTime, evt.attendees[0].timeZone),
        messagingServiceSid: TWILIO_MESSAGING_SID,
        to: reminderPhone,
        scheduleType: "fixed",
        sendAt: scheduledDate.toDate(),
      });

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
    await client.messages(referenceId).update({ status: "canceled" });

    await prisma.attendeeReminder.delete({
      where: {
        referenceId: referenceId,
      },
    });
  } catch (error) {
    console.log(`Error canceling reminder with error ${error}`);
  }
};
