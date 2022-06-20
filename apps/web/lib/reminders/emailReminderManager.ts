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
  sendTo: string | string[],
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

  let remindersToCreate: {
    bookingUid: string;
    method: string;
    sendTo: string;
    scheduledDate: Date;
    scheduled: boolean;
    workflowStepId: number;
    referenceId?: string;
  }[] = [];
  if (scheduledDate) {
    console.log(
      "scheduledDate.isBetween(currentDate, currentDate.add(72, )): " +
        scheduledDate.isBetween(currentDate, currentDate.add(72, "hour"))
    );
  }
  if (
    triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
    triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED
  ) {
    if (Array.isArray(sendTo)) {
      try {
        sendTo.forEach(async (email) => await sendWorkflowReminderEmail(evt, email, emailSubject, emailBody));
      } catch (error) {
        console.log("Error sending Emails");
      }
    } else
      try {
        await sendWorkflowReminderEmail(evt, evt.organizer.email, emailSubject, emailBody);
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

        if (Array.isArray(sendTo)) {
          remindersToCreate = sendTo.map((email) => ({
            bookingUid: uid,
            method: "Email",
            sendTo: email,
            scheduledDate: scheduledDate.toDate(),
            scheduled: true,
            workflowStepId: workflowStepId,
            referenceId: batchIdResponse[1].batch_id,
          }));
        } else {
          remindersToCreate = [
            {
              bookingUid: uid,
              workflowStepId: workflowStepId,
              method: "Email",
              sendTo: sendTo,
              scheduledDate: scheduledDate.toDate(),
              scheduled: true,
              referenceId: batchIdResponse[1].batch_id,
            },
          ];
        }
        await prisma.workflowReminder.createMany({
          data: remindersToCreate,
        });
      } catch (error) {
        console.log(`Error scheduling email with error ${error}`);
      }
    } else if (scheduledDate.isAfter(currentDate.add(72, "hour"))) {
      // Write to DB and send to CRON if scheduled reminder date is past 72 hours
      if (Array.isArray(sendTo)) {
        remindersToCreate = sendTo.map((email) => ({
          bookingUid: uid,
          method: "Email",
          sendTo: email,
          scheduledDate: scheduledDate.toDate(),
          scheduled: false,
          workflowStepId: workflowStepId,
        }));
      } else {
        await prisma.workflowReminder.create({
          data: {
            bookingUid: uid,
            workflowStepId: workflowStepId,
            method: "Email",
            sendTo: sendTo,
            scheduledDate: scheduledDate.toDate(),
            scheduled: false,
            referenceId: batchIdResponse[1].batch_id,
          },
        });
      }
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

    await prisma.workflowReminder.delete({
      where: {
        referenceId: referenceId,
      },
    });
  } catch (error) {
    console.log(`Error canceling reminder with error ${error}`);
  }
};
