/* Schedule any workflow reminder that falls within 72 hours for email */
import { WorkflowActions, WorkflowMethods, WorkflowTemplates } from "@prisma/client";
import client from "@sendgrid/client";
import sgMail from "@sendgrid/mail";
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

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

  const batchIdResponse = await client.request({
    url: "/v3/mail/batch",
    method: "POST",
  });

  //delete all scheduled email reminders where scheduled is past current date
  await prisma.workflowReminder.deleteMany({
    where: {
      method: WorkflowMethods.EMAIL,
      scheduledDate: {
        lte: dayjs().toISOString(),
      },
    },
  });

  //find all unscheduled Email reminders
  const unscheduledReminders = await prisma.workflowReminder.findMany({
    where: {
      method: WorkflowMethods.EMAIL,
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

  const dateInSeventyTwoHours = dayjs().add(72, "hour");

  unscheduledReminders.forEach(async (reminder) => {
    if (dayjs(reminder.scheduledDate).isBefore(dateInSeventyTwoHours)) {
      try {
        const sendTo =
          reminder.workflowStep.action === WorkflowActions.EMAIL_HOST
            ? reminder.booking?.user?.email
            : reminder.booking?.attendees[0].email;

        const name =
          reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
            ? reminder.booking?.attendees[0].name
            : reminder.booking?.user?.name;

        const attendeeName =
          reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
            ? reminder.booking?.user?.name
            : reminder.booking?.attendees[0].name;

        const timeZone =
          reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
            ? reminder.booking?.attendees[0].timeZone
            : reminder.booking?.user?.timeZone;

        let emailContent = {
          emailSubject: reminder.workflowStep.emailSubject || "",
          emailBody: {
            text: reminder.workflowStep.reminderBody || "",
            html: `<body style="white-space: pre-wrap;">${reminder.workflowStep.reminderBody || ""}</body>`,
          },
        };

        switch (reminder.workflowStep.template) {
          case WorkflowTemplates.REMINDER:
            emailContent = emailReminderTemplate(
              reminder.booking?.startTime.toISOString() || "",
              reminder.booking?.eventType?.title || "",
              timeZone || "",
              attendeeName || "",
              name || ""
            );
            break;
        }
        if (emailContent.emailSubject.length > 0 && emailContent.emailBody.text.length > 0 && sendTo) {
          await sgMail.send({
            to: sendTo,
            from: senderEmail,
            subject: emailContent.emailSubject,
            text: emailContent.emailBody.text,
            html: emailContent.emailBody.html,
            batchId: batchIdResponse[1].batch_id,
            sendAt: dayjs(reminder.scheduledDate).unix(),
          });
        }
        await prisma.workflowReminder.updateMany({
          where: {
            id: reminder.id,
          },
          data: {
            scheduled: true,
            referenceId: batchIdResponse[1].batch_id,
          },
        });
      } catch (error) {
        console.log(`Error scheduling Email with error ${error}`);
      }
    }
  });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
