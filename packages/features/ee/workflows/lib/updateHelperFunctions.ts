import prisma from "@calcom/prisma";
import type { Prisma, WorkflowStep } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/client";
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
export async function deleteRemindersFromRemovedEventTypes(
  removedEventTypes: number[],
  workflowSteps: WorkflowStep[],
  userId: number
) {
  const remindersToDeletePromise: Prisma.PrismaPromise<
    {
      id: number;
      referenceId: string | null;
      method: string;
      scheduled: boolean;
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
        scheduled: true,
      },
    });

    remindersToDeletePromise.push(reminderToDelete);
  });
  return (await Promise.all(remindersToDeletePromise)).flat();
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
