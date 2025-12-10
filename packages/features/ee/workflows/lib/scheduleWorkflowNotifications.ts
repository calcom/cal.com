import { prisma } from "@calcom/prisma";
import type { WorkflowStep } from "@calcom/prisma/client";
import { BookingStatus, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { TimeUnit } from "@calcom/prisma/enums";

import { scheduleBookingReminders } from "./scheduleBookingReminders";

export const bookingSelect = {
  userPrimaryEmail: true,
  startTime: true,
  endTime: true,
  title: true,
  uid: true,
  metadata: true,
  smsReminderNumber: true,
  responses: true,
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
      schedulingType: true,
      hideOrganizerEmail: true,
      customReplyToEmail: true,
      hosts: {
        select: {
          user: {
            select: {
              email: true,
              destinationCalendar: {
                select: {
                  primaryEmail: true,
                },
              },
            },
          },
        },
      },
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

export async function scheduleWorkflowNotifications({
  activeOn,
  isOrg,
  workflowSteps,
  time,
  timeUnit,
  trigger,
  userId,
  teamId,
  alreadyScheduledActiveOnIds,
}: {
  activeOn: number[];
  isOrg: boolean;
  workflowSteps: Partial<WorkflowStep>[];
  time: number | null;
  timeUnit: TimeUnit | null;
  trigger: WorkflowTriggerEvents;
  userId: number;
  teamId: number | null;
  alreadyScheduledActiveOnIds?: number[];
}) {
  if (trigger !== WorkflowTriggerEvents.BEFORE_EVENT && trigger !== WorkflowTriggerEvents.AFTER_EVENT) return;

  const bookingsToScheduleNotifications = await getBookings(activeOn, isOrg, alreadyScheduledActiveOnIds);

  await scheduleBookingReminders(
    bookingsToScheduleNotifications,
    workflowSteps,
    time,
    timeUnit,
    trigger,
    userId,
    teamId,
    isOrg
  );
}

export async function getBookings(
  activeOn: number[],
  isOrg: boolean,
  alreadyScheduledActiveOnIds: number[] = []
) {
  if (activeOn.length === 0) return [];

  if (isOrg) {
    const bookingsForReminders = await prisma.booking.findMany({
      where: {
        OR: [
          {
            // bookings from team event types + children managed event types
            eventType: {
              OR: [
                {
                  teamId: {
                    in: activeOn,
                  },
                },
                {
                  teamId: null,
                  parent: {
                    teamId: {
                      in: activeOn,
                    },
                  },
                },
              ],
            },
          },
          {
            // user bookings
            user: {
              teams: {
                some: {
                  teamId: {
                    in: activeOn,
                  },
                  accepted: true,
                },
              },
            },
            eventType: {
              teamId: null,
              parentId: null, // children managed event types are handled above with team event types
            },
            // if user is already part of an already scheduled activeOn connecting reminders are already scheduled
            NOT: {
              user: {
                teams: {
                  some: {
                    teamId: {
                      in: alreadyScheduledActiveOnIds,
                    },
                  },
                },
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
      orderBy: {
        startTime: "asc",
      },
    });
    return bookingsForReminders;
  } else {
    const bookingsForReminders = await prisma.booking.findMany({
      where: {
        OR: [
          { eventTypeId: { in: activeOn } },
          {
            eventType: {
              parentId: {
                in: activeOn, // child event type can not disable workflows, so this should work
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
      orderBy: {
        startTime: "asc",
      },
    });
    return bookingsForReminders;
  }
}
