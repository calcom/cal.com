import { EventTypeAttendeeReminder } from "@prisma/client/";
import dayjs from "dayjs";
import twilio from "twilio";

import prisma from "@lib/prisma";

const accountSid = process.env.TWILIO_SID;
const token = process.env.TWILIO_TOKEN;
const senderNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, token);

export const scheduleSMSAttendeeReminders = async (
  uid: string,
  reminderPhone: string,
  startTime: string,
  attendeeReminder: EventTypeAttendeeReminder
) => {
  // console.log("🚀 ~ file: reminder-manager.ts ~ line 8 ~ startTime", startTime);
  console.log(
    "🚀 ~ file: reminder-manager.ts ~ line 8 ~ scheduleAttendeeReminders ~ eventType",
    attendeeReminder
  );
  // console.log(
  //   "🚀 ~ file: reminder-manager.ts ~ line 8 ~ scheduleAttendeeReminders ~ bookings",
  //   reminderPhone
  // );

  // await client.messages.create({
  //   body: "This is a test",
  //   from: senderNumber,
  //   to: reminderPhone,
  // });

  await prisma.attendeeReminder.create({
    data: {
      booking: {
        connect: {
          uid: uid,
        },
      },
      method: "SMS",
      referenceId: "123",
      scheduledFor: dayjs().toISOString(),
      scheduled: true,
    },
  });
};
