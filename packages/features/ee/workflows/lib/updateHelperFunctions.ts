import {
  deleteScheduledEmailReminder,
  scheduleEmailReminder,
} from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import {
  deleteScheduledSMSReminder,
  scheduleSMSReminder,
} from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import {
  deleteScheduledWhatsappReminder,
  scheduleWhatsappReminder,
} from "@calcom/features/ee/workflows/lib/reminders/whatsappReminderManager";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import type { Prisma, WorkflowStep } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/client";
import type { TimeUnit } from "@calcom/prisma/enums";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { TRPCError } from "@calcom/trpc";

//  move that code to file to util file

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

export async function isAuthorizedToAddActiveOnIds(
  newActiveIds: number[],
  isOrg: boolean,
  teamId?: number | null,
  userId?: number | null
) {
  for (const id of newActiveIds) {
    if (isOrg) {
      const newTeam = await prisma.team.findFirst({
        where: {
          id,
        },
        select: {
          parent: true,
        },
      });
      if (newTeam) {
        if (newTeam.parent?.id !== teamId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
      }
    } else {
      const newEventType = await prisma.eventType.findFirst({
        where: {
          id,
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
}

async function getRemindersFromRemovedTeams(
  removedTeams: number[],
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

  removedTeams.forEach((teamId) => {
    const reminderToDelete = prisma.workflowReminder.findMany({
      where: {
        booking: {
          eventType: {
            OR: [
              {
                teamId,
              },
              {
                parent: {
                  teamId,
                }, // test if this works as it should for managed event types
              },
            ],
          },
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
  const remindersToDelete = (await Promise.all(remindersToDeletePromise)).flat();
  return remindersToDelete;
}

async function getRemindersFromRemovedEventTypes(removedEventTypes: number[], workflowSteps: WorkflowStep[]) {
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
          //userId, // test if this is ok
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

  const remindersToDelete = (await Promise.all(remindersToDeletePromise)).flat();
  return remindersToDelete;
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
  removedActiveOnIds: number[],
  workflowSteps: WorkflowStep[],
  userId: number,
  isOrg: boolean
) {
  const remindersToDelete = isOrg
    ? await getRemindersFromRemovedEventTypes(removedActiveOnIds, workflowSteps)
    : await getRemindersFromRemovedTeams(removedActiveOnIds, workflowSteps, userId);
  await deleteAllReminders(remindersToDelete);
}

//probably better to just add a isOrg property
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

  if (newTeams.length > 0) {
    //test this
    const bookingsForReminders = await prisma.booking.findMany({
      where: {
        user: {
          teams: {
            some: {
              teamId: {
                in: newTeams,
              },
              accepted: true,
            },
          },
        },
      },
      select: bookingSelect,
    });
    return bookingsForReminders;
  }
  return [];
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

// Use it to get the actual resolved type of the Promise
type BookingsReminders = UnwrapPromise<ReturnType<typeof getBookingsForReminders>>;

export async function scheduleBookingReminders(
  bookingsReminders: BookingsReminders,
  workflowSteps: Partial<WorkflowStep>[],
  time: number | null,
  timeUnit: TimeUnit | null,
  trigger: WorkflowTriggerEvents,
  userId: number,
  teamId: number | null
) {
  if (!bookingsReminders.length) return;
  if (trigger !== WorkflowTriggerEvents.BEFORE_EVENT && trigger !== WorkflowTriggerEvents.AFTER_EVENT)
    return true;

  //create reminders for all bookings with newEventTypes
  const promiseSteps = workflowSteps.map(async (step) => {
    if (step.action !== WorkflowActions.SMS_ATTENDEE && step.action !== WorkflowActions.WHATSAPP_ATTENDEE) {
      //as we do not have attendees phone number (user is notified about that when setting this action)
      const promiseScheduleReminders = bookingsReminders.map(async (booking) => {
        const defaultLocale = "en";
        const bookingInfo = {
          uid: booking.uid,
          attendees: booking.attendees.map((attendee) => {
            return {
              name: attendee.name,
              email: attendee.email,
              timeZone: attendee.timeZone,
              language: { locale: attendee.locale || defaultLocale },
            };
          }),
          organizer: booking.user
            ? {
                language: { locale: booking.user.locale || defaultLocale },
                name: booking.user.name || "",
                email: booking?.userPrimaryEmail ?? booking.user.email,
                timeZone: booking.user.timeZone,
                timeFormat: getTimeFormatStringFromUserTimeFormat(booking.user.timeFormat),
              }
            : { name: "", email: "", timeZone: "", language: { locale: "" } },
          startTime: booking.startTime?.toISOString(),
          endTime: booking.endTime?.toISOString(),
          title: booking.title,
          language: { locale: booking?.user?.locale || defaultLocale },
          eventType: {
            slug: booking.eventType?.slug,
          },
        };
        if (
          step.action === WorkflowActions.EMAIL_HOST ||
          step.action === WorkflowActions.EMAIL_ATTENDEE /*||
                  step.action === WorkflowActions.EMAIL_ADDRESS*/
        ) {
          let sendTo: string[] = [];

          switch (step.action) {
            case WorkflowActions.EMAIL_HOST:
              sendTo = [bookingInfo.organizer?.email];
              break;
            case WorkflowActions.EMAIL_ATTENDEE:
              sendTo = bookingInfo.attendees.map((attendee) => attendee.email);
              break;
            /*case WorkflowActions.EMAIL_ADDRESS:
                      sendTo = step.sendTo || "";*/
          }

          await scheduleEmailReminder({
            evt: bookingInfo,
            triggerEvent: trigger,
            action: step.action,
            timeSpan: {
              time,
              timeUnit,
            },
            sendTo,
            emailSubject: step.emailSubject || "",
            emailBody: step.reminderBody || "",
            template: step.template,
            sender: step.sender, //in  edited step this is senderName --> missing that piece of code
            // const { senderName, ...newStep } = step;
            // newStep.sender = getSender({ // do that inside the helper function
            //   action: newStep.action,
            //   sender: newStep.sender || null,
            //   senderName: senderName,
            // });
            workflowStepId: step.id,
          });
        } else if (step.action === WorkflowActions.SMS_NUMBER && step.sendTo) {
          await scheduleSMSReminder({
            evt: bookingInfo,
            reminderPhone: step.sendTo,
            triggerEvent: trigger,
            action: step.action,
            timeSpan: {
              time,
              timeUnit,
            },
            message: step.reminderBody || "",
            workflowStepId: step.id,
            template: step.template,
            sender: step.sender,
            userId: userId,
            teamId: teamId,
          });
        } else if (step.action === WorkflowActions.WHATSAPP_NUMBER && step.sendTo) {
          await scheduleWhatsappReminder({
            evt: bookingInfo,
            reminderPhone: step.sendTo,
            triggerEvent: trigger,
            action: step.action,
            timeSpan: {
              time,
              timeUnit,
            },
            message: step.reminderBody || "",
            workflowStepId: step.id || 0,
            template: step.template,
            userId: userId,
            teamId: teamId,
          });
        }
      });
      await Promise.all(promiseScheduleReminders);
    }
  });
  return Promise.all(promiseSteps);
}
