/* Schedule any attendee reminder that falls within 72 hours for email */
import { Prisma } from "@prisma/client";
import client from "@sendgrid/client";
import sgMail from "@sendgrid/mail";
import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

import reminderTemplate from "@ee/lib/reminders/templates/reminderEmailTemplate";

import { CalendarEvent, Person } from "@lib/integrations/calendar/interfaces/Calendar";
import prisma from "@lib/prisma";

const sendgridAPIKey = process.env.SENDGRID_API_KEY as string;
const senderEmail = process.env.SENDGRID_EMAIL as string;

sgMail.setApiKey(sendgridAPIKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const unscheduledReminders = await prisma.attendeeReminder.findMany({
    where: {
      scheduled: false,
      method: "EMAIL",
    },
    include: {
      booking: {
        include: {
          eventType: true,
          attendees: true,
          user: true,
          references: true,
        },
      },
    },
  });

  if (!unscheduledReminders.length) res.json({ ok: true });

  const inSeventyTwoHours = dayjs().add(72, "hour");

  for (const reminder of unscheduledReminders) {
    if (dayjs(reminder.scheduledDate).isBefore(inSeventyTwoHours)) {
      // Convert booking query into calender event type
      const booking: CalendarEvent = {
        title: reminder!.booking!.title,
        type: reminder!.booking!.eventType!.title,
        attendees: reminder!.booking!.attendees as unknown as Person[],
        startTime: reminder!.booking!.startTime as unknown as string,
        endTime: reminder!.booking!.endTime as unknown as string,
        description: reminder!.booking!.description,
        organizer: reminder!.booking!.user as unknown as Person,
        location: reminder!.booking!.location,
      };

      const batchIdResponse = await client.request({
        url: "/v3/mail/batch",
        method: "POST",
      });

      try {
        const response = await sgMail.send({
          to: booking!.attendees![0].email,
          from: senderEmail,
          subject: "Test email",
          content: [
            {
              type: "text/html",
              value: new reminderTemplate(booking, booking.attendees[0]).getHtmlBody(),
            },
          ],
          batchId: batchIdResponse[1].batch_id,
        });

        await prisma.attendeeReminder.update({
          where: {
            id: reminder.id,
          },
          data: {
            scheduled: true,
            referenceId: batchIdResponse[1].batch_id,
          },
        });
      } catch (error) {
        console.log(`Error scheduling email with error ${error}`);
      }
    }
  }
}
