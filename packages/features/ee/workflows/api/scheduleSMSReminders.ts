/* Schedule any workflow reminder that falls within 7 days for SMS */
import { WorkflowActions, WorkflowMethods, WorkflowTemplates } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import { getSenderId } from "../lib/alphanumericSenderIdSupport";
import * as twilio from "../lib/reminders/smsProviders/twilioProvider";
import type { VariablesType } from "../lib/reminders/templates/customTemplate";
import customTemplate from "../lib/reminders/templates/customTemplate";
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
      scheduledDate: {
        lte: dayjs().add(7, "day").toISOString(),
      },
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

  for (const reminder of unscheduledReminders) {
    if (!reminder.workflowStep || !reminder.booking) {
      continue;
    }
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

      const senderID = getSenderId(sendTo, reminder.workflowStep.sender);

      const locale =
        reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE ||
        reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
          ? reminder.booking?.attendees[0].locale
          : reminder.booking?.user?.locale;

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
          const variables: VariablesType = {
            eventName: reminder.booking?.eventType?.title,
            organizerName: reminder.booking?.user?.name || "",
            attendeeName: reminder.booking?.attendees[0].name,
            attendeeEmail: reminder.booking?.attendees[0].email,
            eventDate: dayjs(reminder.booking?.startTime).tz(timeZone),
            eventTime: dayjs(reminder.booking?.startTime).tz(timeZone),
            timeZone: timeZone,
            location: reminder.booking?.location || "",
            additionalNotes: reminder.booking?.description,
            responses: reminder.booking?.responses,
            meetingUrl: bookingMetadataSchema.parse(reminder.booking?.metadata || {})?.videoCallUrl,
          };
          const customMessage = await customTemplate(
            reminder.workflowStep.reminderBody || "",
            variables,
            locale || ""
          );
          message = customMessage.text;
          break;
      }
      if (message?.length && message?.length > 0 && sendTo) {
        const scheduledSMS = await twilio.scheduleSMS(sendTo, message, reminder.scheduledDate, senderID);

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
    } catch (error) {
      console.log(`Error scheduling SMS with error ${error}`);
    }
  }
  res.status(200).json({ message: "SMS scheduled" });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
