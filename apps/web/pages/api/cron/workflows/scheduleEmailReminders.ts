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

        let emailTemplate: (string | null)[] = [
          reminder.workflowStep.emailSubject,
          reminder.workflowStep.reminderBody,
        ];
        switch (reminder.workflowStep.template) {
          case WorkflowTemplates.REMINDER:
            const userName =
              reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
                ? reminder.booking?.attendees[0].name
                : reminder.booking?.user?.name;
            const attendeeName =
              reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
                ? reminder.booking?.user?.name
                : reminder.booking?.attendees[0].name;
            emailTemplate = emailReminderTemplate(
              userName || "",
              reminder.booking?.startTime.toISOString() || "",
              reminder.booking?.eventType?.title || "",
              reminder.booking?.attendees[0].timeZone || "",
              attendeeName || ""
            );
            break;
        }
        if (
          emailTemplate[0]?.length &&
          emailTemplate[1]?.length &&
          emailTemplate[0]?.length > 0 &&
          emailTemplate[1]?.length > 0
        ) {
          await sgMail.send({
            to: sendTo,
            from: senderEmail,
            subject: emailTemplate[0],
            content: [
              {
                type: "text/html",
                value: emailTemplate[1],
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
