/* Schedule any workflow reminder that falls within 72 hours for email */
import client from "@sendgrid/client";
import sgMail from "@sendgrid/mail";
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods, WorkflowTemplates } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import type { VariablesType } from "../lib/reminders/templates/customTemplate";
import customTemplate from "../lib/reminders/templates/customTemplate";
import emailReminderTemplate from "../lib/reminders/templates/emailReminderTemplate";

const sendgridAPIKey = process.env.SENDGRID_API_KEY as string;
const senderEmail = process.env.SENDGRID_EMAIL as string;

sgMail.setApiKey(sendgridAPIKey);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
    res.status(405).json({ message: "No SendGrid API key or email" });
    return;
  }

  //delete batch_ids with already past scheduled date from scheduled_sends
  const remindersToDelete = await prisma.workflowReminder.findMany({
    where: {
      method: WorkflowMethods.EMAIL,
      cancelled: true,
      scheduledDate: {
        lte: dayjs().toISOString(),
      },
    },
  });

  for (const reminder of remindersToDelete) {
    try {
      await client.request({
        url: `/v3/user/scheduled_sends/${reminder.referenceId}`,
        method: "DELETE",
      });
    } catch (error) {
      console.log(`Error deleting batch id from scheduled_sends: ${error}`);
    }
  }

  await prisma.workflowReminder.deleteMany({
    where: {
      method: WorkflowMethods.EMAIL,
      scheduledDate: {
        lte: dayjs().toISOString(),
      },
    },
  });

  //cancel reminders for cancelled/rescheduled bookings that are scheduled within the next hour
  const remindersToCancel = await prisma.workflowReminder.findMany({
    where: {
      cancelled: true,
      scheduled: true, //if it is false then they are already cancelled
      scheduledDate: {
        lte: dayjs().add(1, "hour").toISOString(),
      },
    },
  });

  for (const reminder of remindersToCancel) {
    try {
      await client.request({
        url: "/v3/user/scheduled_sends",
        method: "POST",
        body: {
          batch_id: reminder.referenceId,
          status: "cancel",
        },
      });

      await prisma.workflowReminder.update({
        where: {
          id: reminder.id,
        },
        data: {
          scheduled: false, // to know which reminder already got cancelled (to avoid error from cancelling the same reminders again)
        },
      });
    } catch (error) {
      console.log(`Error cancelling scheduled Emails: ${error}`);
    }
  }

  //find all unscheduled Email reminders
  const unscheduledReminders = await prisma.workflowReminder.findMany({
    where: {
      method: WorkflowMethods.EMAIL,
      scheduled: false,
      cancelled: false,
      scheduledDate: {
        lte: dayjs().add(72, "hour").toISOString(),
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
    res.status(200).json({ message: "No Emails to schedule" });
    return;
  }

  for (const reminder of unscheduledReminders) {
    if (!reminder.workflowStep || !reminder.booking) {
      continue;
    }
    try {
      let sendTo;

      switch (reminder.workflowStep.action) {
        case WorkflowActions.EMAIL_HOST:
          sendTo = reminder.booking.user?.email;
          break;
        case WorkflowActions.EMAIL_ATTENDEE:
          sendTo = reminder.booking.attendees[0].email;
          break;
        case WorkflowActions.EMAIL_ADDRESS:
          sendTo = reminder.workflowStep.sendTo;
      }

      const name =
        reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
          ? reminder.booking.attendees[0].name
          : reminder.booking.user?.name;

      const attendeeName =
        reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
          ? reminder.booking.user?.name
          : reminder.booking.attendees[0].name;

      const timeZone =
        reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
          ? reminder.booking.attendees[0].timeZone
          : reminder.booking.user?.timeZone;

      const locale =
        reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE ||
        reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
          ? reminder.booking.attendees[0].locale
          : reminder.booking.user?.locale;

      let emailContent = {
        emailSubject: reminder.workflowStep.emailSubject || "",
        emailBody: `<body style="white-space: pre-wrap;">${reminder.workflowStep.reminderBody || ""}</body>`,
      };

      let emailBodyEmpty = false;

      if (reminder.workflowStep.reminderBody) {
        const { responses } = getCalEventResponses({
          bookingFields: reminder.booking.eventType?.bookingFields ?? null,
          booking: reminder.booking,
        });

        const variables: VariablesType = {
          eventName: reminder.booking.eventType?.title || "",
          organizerName: reminder.booking.user?.name || "",
          attendeeName: reminder.booking.attendees[0].name,
          attendeeEmail: reminder.booking.attendees[0].email,
          eventDate: dayjs(reminder.booking.startTime).tz(timeZone),
          eventEndTime: dayjs(reminder.booking?.endTime).tz(timeZone),
          timeZone: timeZone,
          location: reminder.booking.location || "",
          additionalNotes: reminder.booking.description,
          responses: responses,
          meetingUrl: bookingMetadataSchema.parse(reminder.booking.metadata || {})?.videoCallUrl,
          cancelLink: `/booking/${reminder.booking.uid}?cancel=true`,
          rescheduleLink: `/${reminder.booking.user?.username}/${reminder.booking.eventType?.slug}?rescheduleUid=${reminder.booking.uid}`,
        };
        const emailSubject = customTemplate(
          reminder.workflowStep.emailSubject || "",
          variables,
          locale || "",
          !!reminder.booking.user?.hideBranding
        ).text;
        emailContent.emailSubject = emailSubject;
        emailContent.emailBody = customTemplate(
          reminder.workflowStep.reminderBody || "",
          variables,
          locale || "",
          !!reminder.booking.user?.hideBranding
        ).html;

        emailBodyEmpty =
          customTemplate(reminder.workflowStep.reminderBody || "", variables, locale || "").text.length === 0;
      } else if (reminder.workflowStep.template === WorkflowTemplates.REMINDER) {
        emailContent = emailReminderTemplate(
          false,
          reminder.workflowStep.action,
          reminder.booking.startTime.toISOString() || "",
          reminder.booking.endTime.toISOString() || "",
          reminder.booking.eventType?.title || "",
          timeZone || "",
          attendeeName || "",
          name || "",
          !!reminder.booking.user?.hideBranding
        );
      }

      if (emailContent.emailSubject.length > 0 && !emailBodyEmpty && sendTo) {
        const batchIdResponse = await client.request({
          url: "/v3/mail/batch",
          method: "POST",
        });

        const batchId = batchIdResponse[1].batch_id;

        if (reminder.workflowStep.action !== WorkflowActions.EMAIL_ADDRESS) {
          await sgMail.send({
            to: sendTo,
            from: {
              email: senderEmail,
              name: reminder.workflowStep.sender || "Cal.com",
            },
            subject: emailContent.emailSubject,
            html: emailContent.emailBody,
            batchId: batchId,
            sendAt: dayjs(reminder.scheduledDate).unix(),
            replyTo: reminder.booking.user?.email || senderEmail,
          });
        }

        await prisma.workflowReminder.update({
          where: {
            id: reminder.id,
          },
          data: {
            scheduled: true,
            referenceId: batchId,
          },
        });
      }
    } catch (error) {
      console.log(`Error scheduling Email with error ${error}`);
    }
  }
  res.status(200).json({ message: "Emails scheduled" });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
