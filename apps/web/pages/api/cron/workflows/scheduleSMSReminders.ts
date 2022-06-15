/* Schedule any attendee reminder that falls within 7 days for SMS */
import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@lib/prisma";
import * as twilio from "@lib/reminders/smsProviders/twilioProvider";
import reminderUpcomingSMSTemplate from "@lib/reminders/templates/reminderUpcomingSMSTemplate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const unscheduledReminders = await prisma.workflowReminders.findMany({
    where: {
      method: "SMS",
      scheduled: false,
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
    const smsBody = reminderUpcomingSMSTemplate(
      reminder!.booking!.title,
      reminder!.booking!.user!.name as string,
      reminder!.booking!.startTime as unknown as string,
      reminder!.booking!.attendees[0].timeZone
    ) as string;

    if (dayjs(reminder.scheduledDate).isBefore(inSevenDays)) {
      try {
        await twilio.scheduleSMS(reminder.sendTo, smsBody, reminder.scheduledDate);

        await prisma.workflowReminders.deleteMany({
          where: {
            id: reminder.id,
          },
        });
      } catch (error) {
        // @todo: Report to sentry
        console.log(`Error scheduling SMS with error ${error}`);
      }
    }
  }
}
