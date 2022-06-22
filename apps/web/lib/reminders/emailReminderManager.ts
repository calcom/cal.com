import { TimeUnit, WorkflowTriggerEvents, WorkflowTemplates, WorkflowActions } from "@prisma/client";
import client from "@sendgrid/client";
import sgMail from "@sendgrid/mail";
import dayjs from "dayjs";

import { sendWorkflowReminderEmail } from "@calcom/emails";
import { CalendarEvent } from "@calcom/types/Calendar";

import prisma from "@lib/prisma";
import emailReminderTemplate from "@lib/reminders/templates/emailReminderTemplate";

enum timeUnitLowerCase {
  DAY = "day",
  MINUTE = "minute",
  YEAR = "year",
}

let sendgridAPIKey, senderEmail: string;

if (process.env.SENDGRID_API_KEY) {
  sendgridAPIKey = process.env.SENDGRID_API_KEY as string;
  senderEmail = process.env.SENDGRID_EMAIL as string;

  sgMail.setApiKey(sendgridAPIKey);
  client.setApiKey(sendgridAPIKey);
}

export const scheduleEmailReminder = async (
  evt: CalendarEvent,
  triggerEvent: WorkflowTriggerEvents,
  action: WorkflowActions,
  timeBefore: {
    time: number | null;
    timeUnit: TimeUnit | null;
  },
  sendTo: string,
  emailSubject: string,
  emailBody: string,
  workflowStepId: number,
  template: WorkflowTemplates
) => {
  const { startTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const timeUnit: timeUnitLowerCase | undefined =
    timeBefore.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  const scheduledDate =
    timeBefore.time && timeUnit ? dayjs(startTime).subtract(timeBefore.time, timeUnit) : null;

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) return;

  const batchIdResponse = await client.request({
    url: "/v3/mail/batch",
    method: "POST",
  });

  switch (template) {
    case WorkflowTemplates.REMINDER:
      const name = action === WorkflowActions.EMAIL_HOST ? evt.organizer.name : evt.attendees[0].name;
      const attendee = action === WorkflowActions.EMAIL_HOST ? evt.attendees[0].name : evt.organizer.name;
      const emailTemplate = emailReminderTemplate(
        name,
        startTime,
        evt.title,
        evt.attendees[0].timeZone,
        attendee
      );
      emailSubject = emailTemplate[0];
      emailBody = emailTemplate[1];
      break;
  }

  if (
    triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
    triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED
  ) {
    try {
      await sendWorkflowReminderEmail(evt, sendTo, emailSubject, emailBody);
    } catch (error) {
      console.log("Error sending Email");
    }
  } else if (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT && scheduledDate) {
    // Sendgrid to schedule emails
    // Can only schedule at least 60 minutes and at most 72 hours in advance
    if (
      !currentDate.isBetween(scheduledDate.subtract(1, "hour"), scheduledDate) &&
      scheduledDate.isBetween(currentDate, currentDate.add(72, "hour"))
    ) {
      try {
        await sgMail.send({
          to: sendTo,
          from: senderEmail,
          subject: emailSubject,
          content: [
            {
              type: "text/html",
              value: emailBody,
            },
          ],
          batchId: batchIdResponse[1].batch_id,
          sendAt: scheduledDate.unix(),
        });

        await prisma.workflowReminder.create({
          data: {
            bookingUid: uid,
            workflowStepId: workflowStepId,
            method: "Email",
            scheduledDate: scheduledDate.toDate(),
            scheduled: true,
            referenceId: batchIdResponse[1].batch_id,
          },
        });
      } catch (error) {
        console.log(`Error scheduling email with error ${error}`);
      }
    } else if (scheduledDate.isAfter(currentDate.add(72, "hour"))) {
      // Write to DB and send to CRON if scheduled reminder date is past 72 hours
      await prisma.workflowReminder.create({
        data: {
          bookingUid: uid,
          workflowStepId: workflowStepId,
          method: "Email",
          scheduledDate: scheduledDate.toDate(),
          scheduled: false,
        },
      });
    }
  }
};

export const deleteScheduledEmailReminder = async (referenceId: string) => {
  try {
    await client.request({
      url: "/v3/user/scheduled_sends",
      method: "POST",
      body: {
        batch_id: referenceId,
        status: "cancel",
      },
    });
  } catch (error) {
    console.log(`Error canceling reminder with error ${error}`);
  }
};
