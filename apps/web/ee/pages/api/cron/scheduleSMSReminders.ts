/* Schedule any attendee reminder that falls within 7 days for SMS */
import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

import twilio from "@ee/lib/reminders/smsProviders/twilioProvider";
import reminderSMSTemplate from "@ee/lib/reminders/templates/reminderSMSTemplate";

import prisma from "@lib/prisma";

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
    include: {
      booking: {
        include: {
          user: true,
          attendees: true,
        },
      },
    },
  });

  if (!unscheduledReminders.length) res.json({ ok: true });

  const inSevenDays = dayjs().add(7, "day");

  for (const reminder of unscheduledReminders) {
    const smsBody = reminderSMSTemplate(
      reminder!.booking!.title,
      reminder!.booking!.user!.name as string,
      reminder!.booking!.startTime as unknown as string,
      reminder!.booking!.attendees[0].timeZone
    );

    if (dayjs(reminder.scheduledDate).isBefore(inSevenDays)) {
      try {
        const response = await twilio.sendSMS(reminder.sendTo, smsBody, reminder.scheduledDate);

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
        // @todo: Report to sentry
        console.log(`Error scheduling SMS with error ${error}`);
      }
    }
  }
}
