import "dotenv/config";

import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

const emailWorkflowReminderEdit = async () => {
  // Workflow steps that need to be updated
  const emailWorkflowStepIds = [160276, 164180];

  const cursor = undefined;
  const batchSize = 50;

  let emailWorkflowsUpdated = 0;
  const emailWorkflowsFailedIds: number[] = [];

  while (true) {
    // Get all scheduled workflows
    const workflowReminders = await getWorkflowReminders({
      cursor,
      batchSize,
      emailWorkflowStepIds,
    });

    if (workflowReminders.length === 0) break;

    for (const reminder of workflowReminders) {
      // Get the current Meet URL
      const currentMeetLink = reminder.booking?.references.find(
        (reference) => reference.type === "google_video" && !reference.deleted
      )?.meetingUrl;

      if (!currentMeetLink) {
        console.log(`Reminder ${reminder.id}: No meet link found`);
        continue;
      }

      const oldMeetLinks = reminder.booking?.references
        .filter(
          (reference) =>
            reference.type === "google_video" && reference.deleted && reference.meetingUrl !== null
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

      // Helper function to replace old meet links with the current one
      const replaceOldMeetLinks = ({ value }: { value: string }) => {
        let newValue = value;

        // Each property in the payload will only have one instance of the Meet link
        const bodyContainsCurrentLink = value.includes(currentMeetLink);
        if (bodyContainsCurrentLink) return newValue;

        for (const oldUrl of oldMeetLinks) {
          const regex = new RegExp(oldUrl, "g");
          const matches = newValue.match(regex);

          if (matches && matches.length > 0) {
            newValue = newValue.replace(regex, currentMeetLink);
            updated = true;
          }

          return newValue;
        }
      };

      // Determine if the body and ics file contain the old meet link
      payload.html = replaceOldMeetLinks({ value: payload.html });
      payload.attachments = [replaceOldMeetLinks({ value: payload.attachments[0] })];

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
    }

    console.log(
      `Update ${emailWorkflowsUpdated} workflows with the following failures ${emailWorkflowsFailedIds}`
    );
  }
};

const getWorkflowReminders = async ({
  emailWorkflowStepIds,
  batchSize,
  cursor,
}: {
  emailWorkflowStepIds: number[];
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
        in: emailWorkflowStepIds,
      },
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
                type: "google_video",
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

const workflowReminderEdit = async () => {
  await emailWorkflowReminderEdit();
};

(async () => {
  await workflowReminderEdit();
})();
