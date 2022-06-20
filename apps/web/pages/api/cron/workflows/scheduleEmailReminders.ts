/* Schedule any attendee reminder that falls within 7 days for SMS */
import { WorkflowActions, WorkflowTemplates } from "@prisma/client";
import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@lib/prisma";
import * as twilio from "@lib/reminders/smsProviders/twilioProvider";
import smsReminderTemplate from "@lib/reminders/templates/smsReminderTemplate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  //delete all scheduled email reminders where scheduled is past current date
  await prisma.workflowReminder.deleteMany({
    where: {
      method: "Email",
      scheduledDate: {
        lte: dayjs().toISOString(),
      },
    },
  });

  //find all unscheduled Email reminders
  const unscheduledReminders = await prisma.workflowReminder.findMany({
    where: {
      method: "Email",
      scheduled: false,
    },
    include: {
      workflowStep: true,
      booking: {
        include: {
          eventType: true,
          user: true,
          attendees: true,
        },
      },
    },
  });

  if (!unscheduledReminders.length) res.json({ ok: true });

  const dateInSevenDays = dayjs().add(7, "day");

  unscheduledReminders.forEach(async (reminder) => {
    if (dayjs(reminder.scheduledDate).isBefore(dateInSevenDays)) {
      try {
        const sentTo =
          reminder.workflowStep.action === WorkflowActions.SMS_NUMBER ? reminder.workflowStep.sendTo : null;

        let emailTemplate: string | undefined | null = reminder.workflowStep.reminderBody;
        switch (reminder.workflowStep.template) {
          case WorkflowTemplates.REMINDER:
            const organizer =
              reminder.workflowStep.action === WorkflowActions.SMS_NUMBER
                ? reminder.booking?.attendees[0].name
                : reminder.booking?.user?.name;
            emailTemplate = smsReminderTemplate(
              reminder.booking?.eventType?.title || "",
              organizer || "",
              reminder.booking?.startTime.toISOString(),
              reminder.booking?.attendees[0].timeZone
            );
            break;
        }
        if (emailTemplate?.length && emailTemplate?.length > 0) {
          await twilio.scheduleSMS(sentTo || reminder.sendTo, emailTemplate, reminder.scheduledDate);

          await prisma.workflowReminder.updateMany({
            where: {
              id: reminder.id,
            },
            data: {
              scheduled: true,
            },
          });
        }
      } catch (error) {
        console.log(`Error scheduling SMS with error ${error}`);
      }
    }
  });
}
