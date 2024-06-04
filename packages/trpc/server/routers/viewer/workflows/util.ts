import type { Workflow } from "@prisma/client";

import { isSMSOrWhatsappAction } from "@calcom/ee/workflows/lib/actionHelperFunctions";
import {
  deleteScheduledEmailReminder,
  scheduleEmailReminder,
} from "@calcom/ee/workflows/lib/reminders/emailReminderManager";
import {
  deleteScheduledSMSReminder,
  scheduleSMSReminder,
} from "@calcom/ee/workflows/lib/reminders/smsReminderManager";
import {
  deleteScheduledWhatsappReminder,
  scheduleWhatsappReminder,
} from "@calcom/ee/workflows/lib/reminders/whatsappReminderManager";
import { SMS_REMINDER_NUMBER_FIELD } from "@calcom/features/bookings/lib/SystemField";
import {
  getSmsReminderNumberField,
  getSmsReminderNumberSource,
} from "@calcom/features/bookings/lib/getBookingFields";
import { removeBookingField, upsertBookingField } from "@calcom/features/eventtypes/lib/bookingFieldsManager";
import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma, type PrismaClient } from "@calcom/prisma";
import type { Prisma, WorkflowStep } from "@calcom/prisma/client";
import type { TimeUnit } from "@calcom/prisma/enums";
import {
  BookingStatus,
  MembershipRole,
  WorkflowActions,
  WorkflowMethods,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

const log = logger.getSubLogger({ prefix: ["workflow"] });

export const bookingSelect = {
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

export const verifyEmailSender = async (
  email: string,
  userId: number,
  teamId: number | null,
  prisma: PrismaClient
) => {
  const verifiedEmail = await prisma.verifiedEmail.findFirst({
    where: {
      email,
      OR: [{ userId }, { teamId }],
    },
  });

  if (!verifiedEmail) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Email not verified" });
  }

  if (teamId) {
    if (!verifiedEmail.teamId) {
      await prisma.verifiedEmail.update({
        where: {
          id: verifiedEmail.id,
        },
        data: {
          teamId,
        },
      });
    } else if (verifiedEmail.teamId !== teamId) {
      await prisma.verifiedEmail.create({
        data: {
          email,
          userId,
          teamId,
        },
      });
    }
  }
};

export function getSender(
  step: Pick<WorkflowStep, "action" | "sender"> & { senderName: string | null | undefined }
) {
  return isSMSOrWhatsappAction(step.action) ? step.sender || SENDER_ID : step.senderName || SENDER_NAME;
}

export async function isAuthorized(
  workflow: Pick<Workflow, "id" | "teamId" | "userId"> | null,
  prisma: PrismaClient,
  currentUserId: number,
  isReadOperation?: boolean
) {
  if (!workflow) {
    return false;
  }
  if (!isReadOperation) {
    const userWorkflow = await prisma.workflow.findFirst({
      where: {
        id: workflow.id,
        OR: [
          { userId: currentUserId },
          {
            // for non-read operation every team member has access
            team: {
              members: {
                some: {
                  userId: currentUserId,
                  accepted: true,
                },
              },
            },
          },
        ],
      },
    });
    if (userWorkflow) return true;
  }

  const userWorkflow = await prisma.workflow.findFirst({
    where: {
      id: workflow.id,
      OR: [
        { userId: currentUserId },
        {
          team: {
            members: {
              some: {
                userId: currentUserId,
                accepted: true,
                //only admins can update team/org workflows
                NOT: {
                  role: MembershipRole.MEMBER,
                },
              },
            },
          },
        },
      ],
    },
  });

  if (userWorkflow) return true;

  return false;
}

export async function upsertSmsReminderFieldForBooking({
  workflowId,
  eventTypeId,
  isSmsReminderNumberRequired,
}: {
  workflowId: number;
  isSmsReminderNumberRequired: boolean;
  eventTypeId: number;
}) {
  await upsertBookingField(
    getSmsReminderNumberField(),
    getSmsReminderNumberSource({
      workflowId,
      isSmsReminderNumberRequired,
    }),
    eventTypeId
  );
}

export async function removeSmsReminderFieldForBooking({
  workflowId,
  eventTypeId,
}: {
  workflowId: number;
  eventTypeId: number;
}) {
  await removeBookingField(
    {
      name: SMS_REMINDER_NUMBER_FIELD,
    },
    {
      id: `${workflowId}`,
      type: "workflow",
    },
    eventTypeId
  );
}

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
      if (newTeam?.parent?.id !== teamId) {
        return false;
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
          children: true,
        },
      });

      if (newEventType) {
        if (teamId && teamId !== newEventType.teamId) {
          return false;
        }
        if (
          !teamId &&
          userId &&
          newEventType.userId !== userId &&
          !newEventType?.users.find((eventTypeUser) => eventTypeUser.id === userId)
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

async function getRemindersFromRemovedTeams(
  removedTeams: number[],
  workflowSteps: WorkflowStep[],
  prisma: PrismaClient,
  activeOn?: number[]
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
        OR: [
          {
            //team event types + children managed event types
            booking: {
              eventType: {
                OR: [{ teamId: teamId }, { parentId: teamId, teamId: null }],
              },
            },
          },
          {
            // user bookings
            booking: {
              user: {
                AND: [
                  // user is part of team that got removed
                  {
                    teams: {
                      some: {
                        teamId: teamId,
                      },
                    },
                  },
                  // and user is not part of any team were the workflow is still active on
                  {
                    teams: {
                      none: {
                        teamId: {
                          in: activeOn,
                        },
                      },
                    },
                  },
                ],
              },
              eventType: {
                teamId: null,
                parentId: null, // children managed event types are handled above with team event types
              },
            },
          },
        ],
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

async function getRemindersFromRemovedEventTypes(
  removedEventTypes: number[],
  workflowSteps: WorkflowStep[],
  prisma: PrismaClient
) {
  const remindersToDeletePromise: Prisma.PrismaPromise<
    {
      id: number;
      referenceId: string | null;
      method: string;
    }[]
  >[] = [];
  removedEventTypes.forEach((eventTypeId) => {
    const remindersToDelete = prisma.workflowReminder.findMany({
      where: {
        booking: {
          eventTypeId,
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

    remindersToDeletePromise.push(remindersToDelete);
  });

  const remindersToDelete = (await Promise.all(remindersToDeletePromise)).flat();
  return remindersToDelete;
}

const reminderMethods: {
  [x: string]: (id: number, referenceId: string | null, prisma: PrismaClient) => void;
} = {
  [WorkflowMethods.EMAIL]: deleteScheduledEmailReminder,
  [WorkflowMethods.SMS]: deleteScheduledSMSReminder,
  [WorkflowMethods.WHATSAPP]: deleteScheduledWhatsappReminder,
};

export async function deleteAllWorkflowReminders(
  remindersToDelete:
    | {
        id: number;
        referenceId: string | null;
        method: string;
      }[]
    | null,
  prisma: PrismaClient
) {
  if (!remindersToDelete) return Promise.resolve();

  await Promise.all(
    remindersToDelete.map((reminder) => {
      return reminderMethods[reminder.method](reminder.id, reminder.referenceId, prisma);
    })
  ).catch((error) => {
    log.error("An error occurred when deleting workflow reminders", error);
  });
}

export async function deleteRemindersOfActiveOnIds(
  removedActiveOnIds: number[],
  workflowSteps: WorkflowStep[],
  isOrg: boolean,
  prisma: PrismaClient,
  activeOnIds?: number[]
) {
  const remindersToDelete = !isOrg
    ? await getRemindersFromRemovedEventTypes(removedActiveOnIds, workflowSteps, prisma)
    : await getRemindersFromRemovedTeams(removedActiveOnIds, workflowSteps, prisma, activeOnIds);
  await deleteAllWorkflowReminders(remindersToDelete, prisma);
}

export async function scheduleWorkflowNotifications(
  activeOn: number[],
  isOrg: boolean,
  workflowSteps: Partial<WorkflowStep>[],
  time: number | null,
  timeUnit: TimeUnit | null,
  trigger: WorkflowTriggerEvents,
  userId: number,
  teamId: number | null,
  prisma: PrismaClient,
  alreadyScheduledActiveOnIds?: number[]
) {
  const bookingstoScheduleNotifications = await getBookings(activeOn, isOrg, alreadyScheduledActiveOnIds);

  await scheduleBookingReminders(
    bookingstoScheduleNotifications,
    workflowSteps,
    time,
    timeUnit,
    trigger,
    userId,
    teamId,
    prisma
  );
}

async function getBookings(activeOn: number[], isOrg: boolean, alreadyScheduledActiveOnIds: number[] = []) {
  if (activeOn.length === 0) return [];

  if (isOrg) {
    // this query is pretty much the same as we do it for workflowReminders, maybe we can reuse this somehow
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
                  parentId: {
                    in: activeOn,
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
      },
      select: bookingSelect,
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
    });
    return bookingsForReminders;
  }
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type Bookings = UnwrapPromise<ReturnType<typeof getBookings>>;

// some parts of  scheduleWorkflowReminders (reminderSchedule.ts) is quite similar to this code
// we should consider refactoring this to  reuse similar code snippets
export async function scheduleBookingReminders(
  bookings: Bookings,
  workflowSteps: Partial<WorkflowStep>[],
  time: number | null,
  timeUnit: TimeUnit | null,
  trigger: WorkflowTriggerEvents,
  userId: number,
  teamId: number | null,
  prisma: PrismaClient
) {
  if (!bookings.length) return;
  if (trigger !== WorkflowTriggerEvents.BEFORE_EVENT && trigger !== WorkflowTriggerEvents.AFTER_EVENT) return;
  //create reminders for all bookings with newEventTypes
  const promiseSteps = workflowSteps.map(async (step) => {
    // we do not have attendees phone number (user is notified about that when setting this action)
    // in some scenarios we could already have the phone number, so we should still schedule if phone number exists
    if (step.action == WorkflowActions.SMS_ATTENDEE || step.action == WorkflowActions.WHATSAPP_ATTENDEE)
      return;

    const promiseScheduleReminders = bookings.map(async (booking) => {
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
        step.action === WorkflowActions.EMAIL_ATTENDEE ||
        step.action === WorkflowActions.EMAIL_ADDRESS
      ) {
        let sendTo: string[] = [];

        switch (step.action) {
          case WorkflowActions.EMAIL_HOST:
            sendTo = [bookingInfo.organizer?.email];
            break;
          case WorkflowActions.EMAIL_ATTENDEE:
            sendTo = bookingInfo.attendees.map((attendee) => attendee.email);
            break;
          case WorkflowActions.EMAIL_ADDRESS:
            await verifyEmailSender(step.sendTo || "", userId, teamId, prisma);
            sendTo = [step.sendTo || ""];
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
          sender: step.sender,
          workflowStepId: step.id,
          prisma,
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
          prisma: prisma,
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
  });
  return Promise.all(promiseSteps);
}
