import { deleteScheduledEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { deleteScheduledSMSReminder } from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import { deleteScheduledWhatsappReminder } from "@calcom/features/ee/workflows/lib/reminders/whatsappReminderManager";
import prisma from "@calcom/prisma";
import type { Prisma, WorkflowStep } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/client";
import { WorkflowMethods } from "@calcom/prisma/enums";
import { TRPCError } from "@calcom/trpc";

const bookingSelect = {
  userPrimaryEmail: true,
  startTime: true,
  endTime: true,
  title: true,
  uid: true,
  attendees: {
    select: {
      name: true,
      email: true,
      timeZone: true,
      locale: true,
    },
  },
  eventType: {
    select: {
      slug: true,
      id: true,
    },
  },
  user: {
    select: {
      name: true,
      timeZone: true,
      timeFormat: true,
      locale: true,
      email: true,
    },
  },
};

export async function isAuthorizedToAddEventtypes(
  newActiveEventTypes: number[],
  teamId?: number | null,
  userId?: number | null
) {
  for (const newEventTypeId of newActiveEventTypes) {
    const newEventType = await prisma.eventType.findFirst({
      where: {
        id: newEventTypeId,
      },
      include: {
        users: {
          select: {
            id: true,
          },
        },
        team: {
          include: {
            members: true,
          },
        },
        children: true,
      },
    });

    if (newEventType) {
      if (teamId && teamId !== newEventType.teamId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (
        !teamId &&
        userId &&
        newEventType.userId !== userId &&
        !newEventType?.users.find((eventTypeUser) => eventTypeUser.id === userId)
      ) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }
  }
}

//what about team id
async function getRemindersFromRemovedActiveOn(
  removedEventTypes: number[],
  workflowSteps: WorkflowStep[],
  userId: number
) {
  const remindersToDeletePromise: Prisma.PrismaPromise<
    {
      id: number;
      referenceId: string | null;
      method: string;
    }[]
  >[] = [];

  removedEventTypes.forEach((eventTypeId) => {
    const reminderToDelete = prisma.workflowReminder.findMany({
      where: {
        booking: {
          eventTypeId: eventTypeId,
          userId,
        },
        workflowStepId: {
          in: workflowSteps.map((step) => {
            return step.id;
          }),
        },
      },
      select: {
        id: true,
        referenceId: true,
        method: true,
      },
    });

    remindersToDeletePromise.push(reminderToDelete);
  });
  return (await Promise.all(remindersToDeletePromise)).flat();
}

export async function deleteAllReminders(
  remindersToDelete: {
    id: number;
    referenceId: string | null;
    method: string;
  }[]
) {
  for (const reminder of remindersToDelete) {
    if (reminder.method === WorkflowMethods.EMAIL) {
      deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
    } else if (reminder.method === WorkflowMethods.SMS) {
      deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
    } else if (reminder.method === WorkflowMethods.WHATSAPP) {
      deleteScheduledWhatsappReminder(reminder.id, reminder.referenceId);
    }
  }
}

export async function deleteRemindersFromRemovedActiveOn(
  removedEventTypes: number[],
  workflowSteps: WorkflowStep[],
  userId: number
) {
  const remindersToDelete = await getRemindersFromRemovedActiveOn(removedEventTypes, workflowSteps, userId);
  await deleteAllReminders(remindersToDelete);
}

export async function getBookingsForReminders(newEventTypes: number[], newTeams: number[]) {
  if (newEventTypes.length > 0) {
    const bookingsForReminders = await prisma.booking.findMany({
      where: {
        OR: [
          { eventTypeId: { in: newEventTypes } },
          {
            eventType: {
              parentId: {
                in: newEventTypes,
              },
            },
          },
        ],
        status: BookingStatus.ACCEPTED,
        startTime: {
          gte: new Date(),
        },
      },
      select: bookingSelect,
    });
    return bookingsForReminders;
  }

  if (newTeams.length) {
    return [];
  }
  return [];
}
