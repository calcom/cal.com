/* Schedule any workflow reminder that falls within 7 days for WHATSAPP */
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { defaultHandler } from "@calcom/lib/server";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";

import { getWhatsappTemplateFunction } from "../lib/actionHelperFunctions";
import type { PartialWorkflowReminder } from "../lib/getWorkflowReminders";
import { select } from "../lib/getWorkflowReminders";
import * as twilio from "../lib/reminders/providers/twilioProvider";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  //delete all scheduled whatsapp reminders where scheduled date is past current date
  await prisma.workflowReminder.deleteMany({
    where: {
      method: WorkflowMethods.WHATSAPP,
      scheduledDate: {
        lte: dayjs().toISOString(),
      },
    },
  });

  //find all unscheduled WHATSAPP reminders
  const unscheduledReminders = (await prisma.workflowReminder.findMany({
    where: {
      method: WorkflowMethods.WHATSAPP,
      scheduled: false,
      scheduledDate: {
        lte: dayjs().add(7, "day").toISOString(),
      },
    },
    select,
  })) as PartialWorkflowReminder[];

  if (!unscheduledReminders.length) {
    res.json({ ok: true });
    return;
  }

  for (const reminder of unscheduledReminders) {
    if (!reminder.workflowStep || !reminder.booking) {
      continue;
    }
    const userId = reminder.workflowStep.workflow.userId;
    const teamId = reminder.workflowStep.workflow.teamId;

    try {
      const sendTo =
        reminder.workflowStep.action === WorkflowActions.WHATSAPP_NUMBER
          ? reminder.workflowStep.sendTo
          : reminder.booking?.smsReminderNumber;

      const userName =
        reminder.workflowStep.action === WorkflowActions.WHATSAPP_ATTENDEE
          ? reminder.booking?.attendees[0].name
          : "";

      const attendeeName =
        reminder.workflowStep.action === WorkflowActions.WHATSAPP_ATTENDEE
          ? reminder.booking?.user?.name
          : reminder.booking?.attendees[0].name;

      const timeZone =
        reminder.workflowStep.action === WorkflowActions.WHATSAPP_ATTENDEE
          ? reminder.booking?.attendees[0].timeZone
          : reminder.booking?.user?.timeZone;

      const templateFunction = getWhatsappTemplateFunction(reminder.workflowStep.template);
      const message = templateFunction(
        false,
        reminder.booking.user?.locale || "en",
        reminder.workflowStep.action,
        getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
        reminder.booking?.startTime.toISOString() || "",
        reminder.booking?.eventType?.title || "",
        timeZone || "",
        attendeeName || "",
        userName
      );

      if (message?.length && message?.length > 0 && sendTo) {
        const scheduledSMS = await twilio.scheduleSMS(
          sendTo,
          message,
          reminder.scheduledDate,
          "",
          userId,
          teamId,
          true
        );

        if (scheduledSMS) {
          await prisma.workflowReminder.update({
            where: {
              id: reminder.id,
            },
            data: {
              scheduled: true,
              referenceId: scheduledSMS.sid,
            },
          });
        }
      }
    } catch (error) {
      console.log(`Error scheduling WHATSAPP with error ${error}`);
    }
  }

  res.status(200).json({ message: "WHATSAPP scheduled" });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
