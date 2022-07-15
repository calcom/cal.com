/* Schedule any workflow reminder that falls within 7 days for SMS */
import { WorkflowActions, WorkflowTemplates, WorkflowMethods } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { defaultHandler } from "@calcom/lib/server";
import * as twilio from "@ee/lib/workflows/reminders/smsProviders/twilioProvider";
import customTemplate, { DynamicVariablesType } from "@ee/lib/workflows/reminders/templates/customTemplate";
import smsReminderTemplate from "@ee/lib/workflows/reminders/templates/smsReminderTemplate";

import prisma from "@lib/prisma";

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
          case WorkflowTemplates.CUSTOM:
            const dynamicVariables: DynamicVariablesType = {
              eventName: reminder.booking?.eventType?.title,
              organizerName: userName,
              attendeeName: attendeeName || "",
              eventDate: dayjs(reminder.booking?.startTime).tz(timeZone).format("dddd, MMMM D, YYYY"),
              eventTime: dayjs(reminder.booking?.startTime).tz(timeZone).format("h:mma"),
              timeZone: timeZone,
              location: reminder.booking?.location || "",
            };
            message = customTemplate(reminder.workflowStep.reminderBody || "", dynamicVariables);
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
