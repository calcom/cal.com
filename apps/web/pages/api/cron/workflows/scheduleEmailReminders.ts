/* Schedule any attendee reminder that falls within 7 days for SMS */
import { WorkflowActions, WorkflowTemplates } from "@prisma/client";
import client from "@sendgrid/client";
import sgMail from "@sendgrid/mail";
import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@lib/prisma";
import emailReminderTemplate from "@lib/reminders/templates/emailReminderTemplate";

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

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
    res.status(405).json({ message: "No SendGrid API key or email" });
    return;
  }

  const sendgridAPIKey = process.env.SENDGRID_API_KEY as string;
  const senderEmail = process.env.SENDGRID_EMAIL as string;

  sgMail.setApiKey(sendgridAPIKey);
  client.setApiKey(sendgridAPIKey);

  const batchIdResponse = await client.request({
    url: "/v3/mail/batch",
    method: "POST",
  });

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
        const sendTo =
          reminder.workflowStep.action === WorkflowActions.EMAIL_HOST
            ? reminder.booking?.user?.email
            : reminder.booking?.attendees[0].email;

        let emailTemplate = {
          subject: reminder.workflowStep.emailSubject,
          body: reminder.workflowStep.reminderBody,
        };

        const name =
          reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
            ? reminder.booking?.attendees[0].name
            : reminder.booking?.user?.name;

        const attendeeName =
          reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
            ? reminder.booking?.user?.name
            : reminder.booking?.attendees[0].name;

        switch (reminder.workflowStep.template) {
          case WorkflowTemplates.REMINDER:
            emailTemplate = emailReminderTemplate(
              name || "",
              reminder.booking?.startTime.toISOString() || "",
              reminder.booking?.eventType?.title || "",
              reminder.booking?.attendees[0].timeZone || "",
              attendeeName || ""
            );
            break;
        }
        if (
          emailTemplate.subject?.length &&
          emailTemplate.body?.length &&
          emailTemplate.subject?.length > 0 &&
          emailTemplate.body?.length > 0
        ) {
          await sgMail.send({
            to: sendTo,
            from: senderEmail,
            subject: emailTemplate.subject,
            content: [
              {
                type: "text/html",
                value: emailTemplate.body,
              },
            ],
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
          },
        });
      } catch (error) {
        console.log(`Error scheduling Email with error ${error}`);
      }
    }
  });
}
