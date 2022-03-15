/* Schedule any attendee reminder that falls within 7 days for SMS */
import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

import reminderTemplate from "@ee/lib/reminders/templates/reminderTemplate";

import prisma from "@lib/prisma";

const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_MESSAGING_SID = process.env.TWILIO_MESSAGING_SID;

const client = twilio(TWILIO_SID, TWILIO_TOKEN);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const unscheduledReminders = await prisma.attendeeReminder.findMany({
    where: {
      scheduled: false,
      method: "SMS",
    },
  });

  if (!unscheduledReminders.length) res.json({ ok: true });

  const inSevenDays = dayjs().add(7, "day");

  for (const reminder of unscheduledReminders) {
    if (dayjs(reminder.scheduledDate).isBefore(inSevenDays)) {
      const booking = prisma.booking.findUnique({
        where: {
          uid: reminder.bookingUid,
        },
        select: {
          title: true,
          startTime: true,
          user: true,
          attendees: true,
        },
      });

      try {
        const response = await client.messages.create({
          body: reminderTemplate(
            booking.title,
            booking.user.name,
            booking.startTime,
            booking.attendees[0].timeZone
          ),
          messagingServiceSid: TWILIO_MESSAGING_SID,
          to: reminder.sendTo,
          scheduleType: "fixed",
          sendAt: reminder.scheduledDate,
        });

        await prisma.attendeeReminder.update({
          where: {
            id: reminder.id,
          },
          data: {
            scheduled: true,
            referenceId: response.sid,
          },
        });
      } catch (error) {
        console.log(`Error scheduling SMS with error ${error}`);
      }
    }
  }
}
