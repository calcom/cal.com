import { EventTypeAttendeeReminder } from "@prisma/client/";
import client from "@sendgrid/client";
import sgMail from "@sendgrid/mail";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { v4 as uuidv4 } from "uuid";

import { CalendarEvent } from "@calcom/types/Calendar";

import prisma from "@lib/prisma";

import reminderTemplate from "./templates/reminderEmailTemplate";

let sendgridAPIKey, senderEmail: string;

if (process.env.SENDGRID_API_KEY) {
  sendgridAPIKey = process.env.SENDGRID_API_KEY as string;
  senderEmail = process.env.SENDGRID_EMAIL as string;

  sgMail.setApiKey(sendgridAPIKey);
  client.setApiKey(sendgridAPIKey);
}

export const scheduleEmailReminder = async (
  evt: CalendarEvent,
  email: string,
  attendeeReminder: EventTypeAttendeeReminder
) => {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) return;

  const { startTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const startTimeObject = dayjs(startTime);
  const scheduledDate = dayjs(startTime).subtract(attendeeReminder.time, attendeeReminder.unitTime);
  const batchIdResponse = await client.request({
    url: "/v3/mail/batch",
    method: "POST",
  });

  // Check the scheduled date and right now
  // Can only schedule at least 60 minutes in advance so send a reminder
  if (currentDate.isBetween(startTimeObject.subtract(1, "hour"), startTimeObject)) {
    try {
      const response = await sgMail.send({
        to: email,
        from: senderEmail,
        subject: "Booking Reminder",
        content: [
          {
            type: "text/html",
            value: new reminderTemplate(evt, evt.attendees[0]).getHtmlBody(),
          },
        ],
        batchId: batchIdResponse[1].batch_id,
      });

      await prisma.attendeeReminder.create({
        data: {
          booking: {
            connect: {
              uid: uid,
            },
          },
          method: "EMAIL",
          sendTo: email,
          referenceId: batchIdResponse[1].batch_id,
          scheduledDate: dayjs().toDate(),
          scheduled: true,
        },
      });
    } catch (error) {
      console.log(`Error sending email with error ${error}`);
    }
  }
  // Can only schedule emails 72 hours in advance
  if (scheduledDate.isBetween(currentDate, currentDate.add(72, "hour"))) {
    try {
      const response = await sgMail.send({
        to: email,
        from: senderEmail,
        subject: "Booking Reminder",
        content: [
          {
            type: "text/html",
            value: new reminderTemplate(evt, evt.attendees[0]).getHtmlBody(),
          },
        ],
        batchId: batchIdResponse[1].batch_id,
        sendAt: scheduledDate.unix(),
      });

      await prisma.attendeeReminder.create({
        data: {
          booking: {
            connect: {
              uid: uid,
            },
          },
          method: "EMAIL",
          sendTo: email,
          referenceId: batchIdResponse[1].batch_id,
          scheduledDate: scheduledDate.toDate(),
          scheduled: true,
        },
      });
    } catch (error) {
      console.log(`Error scheduling email with error ${error}`);
    }
  }

  if (scheduledDate.isAfter(currentDate.add(72, "hour"))) {
    // Write to DB and send to CRON if scheduled reminder date is past 72 hours
    await prisma.attendeeReminder.create({
      data: {
        booking: {
          connect: {
            uid: uid,
          },
        },
        method: "EMAIL",
        sendTo: email,
        referenceId: "",
        scheduledDate: scheduledDate.toDate(),
        scheduled: false,
      },
    });
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

    await prisma.attendeeReminder.delete({
      where: {
        referenceId: referenceId,
      },
    });
  } catch (error) {
    console.log(`Error canceling reminder with error ${error}`);
  }
};
