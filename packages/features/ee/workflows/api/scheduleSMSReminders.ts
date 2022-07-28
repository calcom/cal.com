/* Schedule any workflow reminder that falls within 7 days for SMS */
import { WorkflowActions, WorkflowMethods, WorkflowTemplates } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import * as twilio from "../lib/reminders/smsProviders/twilioProvider";
import smsReminderTemplate from "../lib/reminders/templates/smsReminderTemplate";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  //delete all scheduled sms reminders where scheduled date is past current date
  await prisma.workflowReminder.deleteMany({
    where: {
      method: WorkflowMethods.SMS,
      scheduledDate: {
        lte: dayjs().toISOString(),
      },
    },
  });

  //find all unscheduled SMS reminders
  const unscheduledReminders = await prisma.workflowReminder.findMany({
    where: {
      method: WorkflowMethods.SMS,
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
        const sendTo =
          reminder.workflowStep.action === WorkflowActions.SMS_NUMBER
            ? reminder.workflowStep.sendTo
            : reminder.booking?.smsReminderNumber;

        const userName =
          reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
            ? reminder.booking?.attendees[0].name
            : "";

        const attendeeName =
          reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
            ? reminder.booking?.user?.name
            : reminder.booking?.attendees[0].name;

        const timeZone =
          reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
            ? reminder.booking?.attendees[0].timeZone
            : reminder.booking?.user?.timeZone;

        let message: string | null = reminder.workflowStep.reminderBody;
        switch (reminder.workflowStep.template) {
          case WorkflowTemplates.REMINDER:
            message = smsReminderTemplate(
              reminder.booking?.startTime.toISOString() || "",
              reminder.booking?.eventType?.title || "",
              timeZone || "",
              attendeeName || "",
              userName
            );
            break;
        }
        if (message?.length && message?.length > 0 && sendTo) {
          const scheduledSMS = await twilio.scheduleSMS(sendTo, message, reminder.scheduledDate);

          await prisma.workflowReminder.updateMany({
            where: {
              id: reminder.id,
            },
            data: {
              scheduled: true,
              referenceId: scheduledSMS.sid,
            },
          });
        }
      } catch (error) {
        console.log(`Error scheduling SMS with error ${error}`);
      }
    }
  });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
