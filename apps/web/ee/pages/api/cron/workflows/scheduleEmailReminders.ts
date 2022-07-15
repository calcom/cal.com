/* Schedule any workflow reminder that falls within 72 hours for email */
import { WorkflowActions, WorkflowTemplates, WorkflowMethods } from "@prisma/client";
import client from "@sendgrid/client";
import sgMail from "@sendgrid/mail";
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { defaultHandler } from "@calcom/lib/server";
import emailReminderTemplate from "@ee/lib/workflows/reminders/templates/emailReminderTemplate";

import prisma from "@lib/prisma";

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

        let emailTemplate = {
          subject: reminder.workflowStep.emailSubject || "",
          body: reminder.workflowStep.reminderBody || "",
        };

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

        switch (reminder.workflowStep.template) {
          case WorkflowTemplates.REMINDER:
            emailTemplate = emailReminderTemplate(
              reminder.booking?.startTime.toISOString() || "",
              reminder.booking?.eventType?.title || "",
              timeZone || "",
              attendeeName || "",
              name || ""
            );
            break;
        }
        if (emailTemplate.subject.length > 0 && emailTemplate.body.length > 0 && sendTo) {
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
