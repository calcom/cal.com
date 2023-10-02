/* Schedule any workflow reminder that falls within 72 hours for email */
// import sgMail from "@sendgrid/mail";
import mailchimp from "@mailchimp/mailchimp_transactional";
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { WorkflowMethods } from "@calcom/prisma/enums";

// const sendgridAPIKey = process.env.SENDGRID_API_KEY as string;
// const senderEmail = process.env.SENDGRID_EMAIL as string;

// sgMail.setApiKey(sendgridAPIKey);
const apiKey = process.env.MAILCHIMP_API_KEY || "";
const mailchimpClient = mailchimp(apiKey);
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  // if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
  //   res.status(405).json({ message: "No SendGrid API key or email" });
  //   return;
  // }

  //const sandboxMode = process.env.NEXT_PUBLIC_IS_E2E ? true : false;

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
      const referenceId = reminder.referenceId;
      if (referenceId) {
        const idArray = referenceId.split(",").map((id) => id.trim());
        const cancelPromises = idArray.map(async (id, index) => {
          try {
            await mailchimpClient.messages.cancelScheduled({ id });
            console.log(`Successfully canceled schedule for ID: ${id}`);
          } catch (error) {
            console.error(`Error canceling schedule for ID: ${id}`, error);
            // Handle the error as needed (e.g., logging or error handling)
          }
        });

        try {
          await Promise.all(cancelPromises);
          console.log("All schedules canceled successfully.");
        } catch (error) {
          console.error("Error canceling schedules:", error);
          // Handle the error for Promise.all as needed
        }
      }
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
      const referenceId = reminder.referenceId;
      if (referenceId) {
        const idArray = referenceId.split(",").map((id) => id.trim());
        const cancelPromises = idArray.map(async (id, index) => {
          try {
            await mailchimpClient.messages.cancelScheduled({ id });
            console.log(`Successfully canceled schedule for ID: ${id}`);
          } catch (error) {
            console.error(`Error canceling schedule for ID: ${id}`, error);
            // Handle the error as needed (e.g., logging or error handling)
          }
        });

        try {
          await Promise.all(cancelPromises);
          console.log("All schedules canceled successfully.");
        } catch (error) {
          console.error("Error canceling schedules:", error);
          // Handle the error for Promise.all as needed
        }
      }

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
      scheduled: true,
      scheduledDate: {
        lte: dayjs().add(1, "hour").toISOString(),
      },
      OR: [{ cancelled: false }, { cancelled: null }],
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
      const referenceId = reminder.referenceId;
      if (referenceId) {
        const idArray = referenceId.split(",").map((id) => id.trim());
        const cancelPromises = idArray.map(async (id, index) => {
          try {
            await mailchimpClient.messages.reschedule({ id, send_at: dayjs().toISOString() });
            console.log(`Successfully sent message for ID: ${id}`);
          } catch (error) {
            console.error(`Error sending mail for ID: ${id}`, error);
            // Handle the error as needed (e.g., logging or error handling)
          }
        });

        try {
          await Promise.all(cancelPromises);
          console.log("All schedules canceled successfully.");
        } catch (error) {
          console.error("Error canceling schedules:", error);
          // Handle the error for Promise.all as needed
        }
      }

      await prisma.workflowReminder.delete({
        where: {
          id: reminder.id,
        },
      });
    } catch (error) {
      console.log(`Error scheduling Email with error ${error}`);
    }
  }
  res.status(200).json({ message: "Emails scheduled" });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
