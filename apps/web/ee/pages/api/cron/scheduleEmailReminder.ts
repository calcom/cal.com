/* Schedule any attendee reminder that falls within 72 hours for email */
import sgMail from "@sendgrid/mail";
import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

import prisma from "@lib/prisma";

const sendgridAPIKey = process.env.SENDGRID_API_KEY;

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
    },
  });

  if (!unscheduledReminders.length) res.json({ ok: true });

  const inSeventyTwoHours = dayjs().add(72, "hour");

  for (const reminder of unscheduledReminders) {
    if (dayjs(reminder.scheduledDate).isBefore(inSeventyTwoHours)) {
      const booking = prisma.booking.findUnique({
        where: {
          uid: reminder.bookingUid,
        },
        select: {
          title: true,
          startTime: true,
          user: true,
          attendees: true,
        },
      });

      const emailId = uuidv4();

      try {
        const response = await sgMail.send({
          to: booking.attendees[0].email,
          from: "j.auyeung419@gmail.com",
          subject: "Test email",
          text: "This is a test email",
          batchId: emailId,
        });

        await prisma.attendeeReminder.update({
          where: {
            id: reminder.id,
          },
          data: {
            scheduled: true,
            referenceId: emailId,
          },
        });
      } catch (error) {
        console.log(`Error scheduling SMS with error ${error}`);
      }
    }
  }
}
