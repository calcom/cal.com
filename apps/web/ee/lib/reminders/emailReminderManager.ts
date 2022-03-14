import { EventTypeAttendeeReminder } from "@prisma/client/";
import sgMail from "@sendgrid/mail";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";
import prisma from "@lib/prisma";

const sendgridAPIKey = process.env.SENDGRID_API_KEY;

sgMail.setApiKey(sendgridAPIKey);

export const scheduleEmailReminder = async (
  evt: CalendarEvent,
  email: string,
  attendeeReminder: EventTypeAttendeeReminder
) => {
  const { startTime, uid } = evt;
  const currentDate = dayjs();
  const startTimeObject = dayjs(startTime);
  const scheduledDate = dayjs(startTime).subtract(attendeeReminder.time, attendeeReminder.unitTime);

  // Check the scheduled date and right now
  // Can only schedule at least 60 minutes in advance so send a reminder
  //   if (currentDate.isBetween(startTimeObject.subtract(1, "hour"), startTimeObject)) {
  //     try {
  //   const response = await client.messages.create({
  //     body: reminderTemplate(evt.title, evt.organizer.name, evt.startTime, evt.attendees[0].timeZone),
  //     messagingServiceSid: TWILIO_MESSAGING_SID,
  //     to: reminderPhone,
  //   });

  //   await prisma.attendeeReminder.create({
  //     data: {
  //       booking: {
  //         connect: {
  //           uid: uid,
  //         },
  //       },
  //       method: "SMS",
  //       sendTo: reminderPhone,
  //       referenceId: response.sid,
  //       scheduledDate: dayjs().toDate(),
  //       scheduled: true,
  //         },
  //       });
  //     } catch (error) {
  //       console.log(`Error sending SMS with error ${error}`);
  //     }
  //   }
  // Can only schedule text messages 7 days in advance
  //   if (scheduledDate.isBetween(currentDate, currentDate.add(7, "day"))) {
  //     try {
  //   const response = await client.messages.create({
  //     body: reminderTemplate(evt.title, evt.organizer.name, evt.startTime, evt.attendees[0].timeZone),
  //     messagingServiceSid: TWILIO_MESSAGING_SID,
  //     to: reminderPhone,
  //     scheduleType: "fixed",
  //     sendAt: scheduledDate.toDate(),
  //   });

  //   await prisma.attendeeReminder.create({
  //     data: {
  //       booking: {
  //         connect: {
  //           uid: uid,
  //         },
  //       },
  //       method: "SMS",
  //       sendTo: reminderPhone,
  //       referenceId: response.sid,
  //       scheduledDate: scheduledDate.toDate(),
  //       scheduled: true,
  //     },
  //   });
  //     } catch (error) {
  //       console.log(`Error scheduling SMS with error ${error}`);
  //     }
  //   }

  //   if (scheduledDate.isAfter(currentDate.add(7, "day"))) {
  // Write to DB and send to CRON if scheduled reminder date is past 7 days
  // await prisma.attendeeReminder.create({
  //   data: {
  //     booking: {
  //       connect: {
  //         uid: uid,
  //       },
  //     },
  //     method: "SMS",
  //     sendTo: reminderPhone,
  //     referenceId: "",
  //     scheduledDate: scheduledDate.toDate(),
  //     scheduled: false,
  //   },
  // });

  const response = await sgMail.send({
    to: email,
    from: "j.auyeung419@gmail.com",
    subject: "Test email",
    text: "This is a test email",
  });
  console.log("🚀 ~ file: emailReminderManager.ts ~ line 21 ~ response", response);
};
