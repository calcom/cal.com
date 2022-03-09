import { EventTypeAttendeeReminder } from "@prisma/client/";
import twilio from "twilio";

const accountSid = process.env.TWILIO_SID;
const token = process.env.TWILIO_TOKEN;
const senderNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, token);

export const scheduleSMSAttendeeReminders = async (
  reminderPhone: string,
  startTime: string,
  attendeeReminders: EventTypeAttendeeReminder[]
) => {
  // console.log("🚀 ~ file: reminder-manager.ts ~ line 8 ~ startTime", startTime);
  // console.log(
  //   "🚀 ~ file: reminder-manager.ts ~ line 8 ~ scheduleAttendeeReminders ~ eventType",
  //   attendeeReminders
  // );
  // console.log(
  //   "🚀 ~ file: reminder-manager.ts ~ line 8 ~ scheduleAttendeeReminders ~ bookings",
  //   reminderPhone
  // );

  await client.messages.create({
    body: "This is a test",
    from: senderNumber,
    to: reminderPhone,
  });
};
