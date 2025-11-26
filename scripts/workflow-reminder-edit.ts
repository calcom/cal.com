import dotenv from "dotenv";
import path from "path";

import {
  cancelSMS,
  getMessageBody,
} from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const emailWorkflowReminderEdit = async () => {
  // Workflow steps that need to be updated
  // const emailWorkflowStepIds = [160276, 164180];
  const emailWorkflowStepIds = [1];

  let cursor: number | undefined = undefined;
  const batchSize = 50;

  let emailWorkflowsUpdated = 0;
  const emailWorkflowsFailedIds: number[] = [];

  while (true) {
    // Get all scheduled workflows
    const workflowReminders = await getWorkflowReminders({
      cursor,
      batchSize,
      workflowStepIds: emailWorkflowStepIds,
    });

    if (workflowReminders.length === 0) break;

    for (const reminder of workflowReminders) {
      // Get the current Meet URL
      const currentMeetLink = reminder.booking?.references.find(
        (reference) => reference.type === "google_meet_video" && !reference.deleted
      )?.meetingUrl;

      if (!currentMeetLink) {
        console.log(`Reminder ${reminder.id}: No meet link found`);
        continue;
      }

      const oldMeetLinks = reminder.booking?.references
        .filter(
          (reference) =>
            reference.type === "google_meet_video" && reference.deleted && reference.meetingUrl !== null
        )
        .map((reference) => reference.meetingUrl as string);

      if (!oldMeetLinks || oldMeetLinks.length === 0) {
        console.log(`Reminder ${reminder.id}: No deleted Google Meet links`);
        continue;
      }

      // Get the scheduled task for the workflow
      if (!reminder.uuid) {
        console.log(`Reminder ${reminder.id}: No UUID`);
        continue;
      }

      const task = await prisma.task.findFirst({
        where: {
          referenceUid: reminder.uuid,
          scheduledAt: {
            gte: new Date(),
          },
        },
        select: {
          id: true,
          payload: true,
        },
      });

      if (!task) {
        console.log(`Reminder ${reminder.id}: No scheduled task found`);
        continue;
      }

      let payload;
      try {
        payload = JSON.parse(task.payload);
      } catch (error) {
        console.error(`Reminder ${reminder.id}: Failed to parse payload ${error}`);
        emailWorkflowsFailedIds.push(reminder.id);
        continue;
      }

      let updated = false;

      // Determine if the body and ics file contain the old meet link
      const htmlResult = replaceOldMeetLinks({ value: payload.html, currentMeetLink, oldMeetLinks });
      payload.html = htmlResult.value;
      updated = htmlResult.updated;

      const icsResult = replaceOldMeetLinks({
        value: payload.attachments[0].content,
        currentMeetLink,
        oldMeetLinks,
      });

      payload.attachments = [
        {
          content: icsResult.value,
        },
      ];
      updated = updated || icsResult.updated;

      if (!updated) {
        console.log(`Reminder ${reminder.id}: Contains current Meet link`);
        continue;
      }

      try {
        await prisma.task.update({
          where: {
            id: task.id,
          },
          data: {
            payload: JSON.stringify(payload),
          },
        });
        emailWorkflowsUpdated++;
      } catch (error) {
        console.error(`Reminder ${reminder.id}: Error updating task with new payload ${error}`);
        emailWorkflowsFailedIds.push(reminder.id);
      }

      // Add delay to avoid DB pressure
      await sleep(150);
    }
    cursor = workflowReminders[workflowReminders.length - 1]?.id;
  }
  console.log(
    `Update ${emailWorkflowsUpdated} email workflows with the following failures ${emailWorkflowsFailedIds}`
  );
};

const smsWorkflowRemindersEdit = async () => {
  const smsWorkflowStepIds = [168906, 168911];

  let cursor: number | undefined = undefined;
  const batchSize = 50;

  let smsWorkflowsUpdated = 0;
  const smsWorkflowsFailedIds: number[] = [];

  while (true) {
    // Get all scheduled SMS workflows
    const workflowReminders = await getWorkflowReminders({
      cursor,
      batchSize,
      workflowStepIds: smsWorkflowStepIds,
    });

    if (workflowReminders.length === 0) break;

    for (const reminder of workflowReminders) {
      // Get the current Meet URL
      const currentMeetLink = reminder.booking?.references.find(
        (reference) => reference.type === "google_meet_video" && !reference.deleted
      )?.meetingUrl;

      if (!currentMeetLink) {
        console.log(`Reminder ${reminder.id}: No meet link found`);
        continue;
      }

      const oldMeetLinks = reminder.booking?.references
        .filter(
          (reference) =>
            reference.type === "google_meet_video" && reference.deleted && reference.meetingUrl !== null
        )
        .map((reference) => reference.meetingUrl as string);

      if (!oldMeetLinks || oldMeetLinks.length === 0) {
        console.log(`Reminder ${reminder.id}: No deleted Google Meet links`);
        continue;
      }
      if (!reminder.referenceId) {
        console.log(`Reminder ${reminder.id}: Does not have a referenceId`);
        continue;
      }

      let messageBody;
      try {
        messageBody = await getMessageBody(reminder.referenceId);
      } catch (error) {
        console.error(`Reminder ${reminder.id}: Error getting message body ${error}`);
        continue;
      }

      let updated = false;

      const messageBodyResult = replaceOldMeetLinks({ value: messageBody, currentMeetLink, oldMeetLinks });
      updated = messageBodyResult.updated;

      if (!updated) {
        console.log(`Reminder ${reminder.id}: SMS body contains current meet link`);
        continue;
      }

      // Delete the scheduled SMS with the old link
      try {
        await cancelSMS(reminder.referenceId);
      } catch (error) {
        console.error(`Reminder ${reminder.id}: Error deleting scheduled SMS ${error}`);
        smsWorkflowsFailedIds.push(reminder.id);
        continue;
      }

      // Force the a new scheduled SMS where the updated link will be included
      try {
        await prisma.workflowReminder.update({
          where: {
            id: reminder.id,
          },
          data: {
            scheduled: false,
            referenceId: null,
          },
        });
        smsWorkflowsUpdated++;
      } catch (error) {
        console.error(`Reminder ${reminder.id}: Error updating workflow reminder ${error}`);
        smsWorkflowsFailedIds.push(reminder.id);
        continue;
      }

      // Add delay to avoid Twilio rate limiting and DB pressure
      await sleep(150);
    }

    cursor = workflowReminders[workflowReminders.length - 1]?.id;
  }
  console.log(
    `Update ${smsWorkflowsUpdated} sms workflows with the following failures ${smsWorkflowsFailedIds}`
  );
};

const getWorkflowReminders = async ({
  workflowStepIds,
  batchSize,
  cursor,
}: {
  workflowStepIds: number[];
  batchSize: number;
  cursor: number | undefined;
}) => {
  return await prisma.workflowReminder.findMany({
    where: {
      // Ensure they are future dated
      scheduledDate: {
        gte: new Date(),
      },
      workflowStepId: {
        in: workflowStepIds,
      },
      scheduled: true,
      booking: {
        AND: [
          {
            // Reassigned bookings are what's causing this error
            assignmentReason: {
              some: {},
            },
          },
          {
            // Ensure that the booking is still accepted
            status: BookingStatus.ACCEPTED,
          },
          {
            references: {
              some: {
                type: "google_meet_video",
                deleted: true,
              },
            },
          },
        ],
      },
    },
    select: {
      id: true,
      uuid: true,
      referenceId: true,
      booking: {
        select: {
          references: {
            select: {
              type: true,
              meetingUrl: true,
              deleted: true,
            },
          },
        },
      },
    },
    ...(cursor
      ? {
          // When using a cursor need to skip the cursor id
          skip: 1,
          cursor: { id: cursor },
        }
      : {}),
    take: batchSize,
    orderBy: {
      id: "asc",
    },
  });
};

// Helper function to replace old meet links with the current one
const replaceOldMeetLinks = ({
  value,
  currentMeetLink,
  oldMeetLinks,
}: {
  value: string;
  currentMeetLink: string;
  oldMeetLinks: string[];
}) => {
  let newValue = value;

  // Each property in the payload will only have one instance of the Meet link
  const bodyContainsCurrentLink = value.includes(currentMeetLink);
  if (bodyContainsCurrentLink) return { value: newValue, updated: false };

  for (const oldUrl of oldMeetLinks) {
    const regex = new RegExp(oldUrl, "g");
    const matches = newValue.match(regex);

    if (matches && matches.length > 0) {
      newValue = newValue.replace(regex, currentMeetLink);
      return { value: newValue, updated: true };
    }
  }
  return { value: newValue, updated: true };
};

const workflowReminderEdit = async () => {
  await emailWorkflowReminderEdit();
  await smsWorkflowRemindersEdit();
};

(async () => {
  await workflowReminderEdit();
})();
