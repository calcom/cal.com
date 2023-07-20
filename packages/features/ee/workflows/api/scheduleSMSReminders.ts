/* Schedule any workflow reminder that falls within 7 days for SMS */
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { defaultHandler } from "@calcom/lib/server";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods, WorkflowTemplates } from "@calcom/prisma/enums";
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

  if (!unscheduledReminders.length) {
    res.json({ ok: true });
    return;
  }

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

      if (reminder.workflowStep.reminderBody) {
        const { responses } = getCalEventResponses({
          bookingFields: reminder.booking.eventType?.bookingFields ?? null,
          booking: reminder.booking,
        });

        const variables: VariablesType = {
          eventName: reminder.booking?.eventType?.title,
          organizerName: reminder.booking?.user?.name || "",
          attendeeName: reminder.booking?.attendees[0].name,
          attendeeEmail: reminder.booking?.attendees[0].email,
          eventDate: dayjs(reminder.booking?.startTime).tz(timeZone),
          eventEndTime: dayjs(reminder.booking?.endTime).tz(timeZone),
          timeZone: timeZone,
          location: reminder.booking?.location || "",
          additionalNotes: reminder.booking?.description,
          responses: responses,
          meetingUrl: bookingMetadataSchema.parse(reminder.booking?.metadata || {})?.videoCallUrl,
          cancelLink: `/booking/${reminder.booking.uid}?cancel=true`,
          rescheduleLink: `/${reminder.booking.user?.username}/${reminder.booking.eventType?.slug}?rescheduleUid=${reminder.booking.uid}`,
        };
        const customMessage = customTemplate(
          reminder.workflowStep.reminderBody || "",
          variables,
          locale || "en",
          getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat)
        );
        message = customMessage.text;
      } else if (reminder.workflowStep.template === WorkflowTemplates.REMINDER) {
        message = smsReminderTemplate(
          false,
          reminder.workflowStep.action,
          getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
          reminder.booking?.startTime.toISOString() || "",
          reminder.booking?.eventType?.title || "",
          timeZone || "",
          attendeeName || "",
          userName
        );
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
