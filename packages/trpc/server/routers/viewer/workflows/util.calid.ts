import type { CalIdWorkflowType } from "@calid/features/modules/workflows/config/types";
import { isSMSOrWhatsappAction } from "@calid/features/modules/workflows/config/utils";
import { scheduleEmailReminder } from "@calid/features/modules/workflows/managers/emailManager";
import { scheduleSMSReminder } from "@calid/features/modules/workflows/managers/smsManager";
import { scheduleWhatsappReminder } from "@calid/features/modules/workflows/managers/whatsappManager";
import emailRatingTemplate from "@calid/features/modules/workflows/templates/email/ratingTemplate";
import emailReminderTemplate from "@calid/features/modules/workflows/templates/email/reminder";
import { getAllWorkflows } from "@calid/features/modules/workflows/utils/getWorkflows";
import type { CalIdWorkflow, CalIdWorkflowStep } from "@prisma/client";
import type { z } from "zod";

import { SMS_REMINDER_NUMBER_FIELD } from "@calcom/features/bookings/lib/SystemField";
import {
  // getSmsReminderNumberField,
  getSmsReminderNumberSource,
} from "@calcom/features/bookings/lib/getBookingFields";
import { removeBookingField, upsertBookingField } from "@calcom/features/eventtypes/lib/bookingFieldsManager";
import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import logger from "@calcom/lib/logger";
import { CalIdWorkflowRepository } from "@calcom/lib/server/repository/workflow.calid";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { TimeUnit } from "@calcom/prisma/enums";
import { WorkflowTemplates } from "@calcom/prisma/enums";
import { SchedulingType } from "@calcom/prisma/enums";
import {
  BookingStatus,
  CalIdMembershipRole,
  WorkflowActions,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { ZCalIdWorkflows } from "./calid/getAllActiveWorkflows.schema";

const log = logger.getSubLogger({ prefix: ["calIdWorkflow"] });

export const bookingSelect = {
  userPrimaryEmail: true,
  startTime: true,
  endTime: true,
  title: true,
  uid: true,
  metadata: true,
  smsReminderNumber: true,
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

export const verifyCalIdEmailSender = async (email: string, userId: number, calIdTeamId: number | null) => {
  const verifiedEmail = await prisma.verifiedEmail.findFirst({
    where: {
      email,
      OR: [{ userId }, { calIdTeamId }],
    },
  });

  if (verifiedEmail) {
    if (calIdTeamId) {
      if (!verifiedEmail.calIdTeamId) {
        await prisma.verifiedEmail.update({
          where: {
            id: verifiedEmail.id,
          },
          data: {
            calIdTeamId,
          },
        });
      } else if (verifiedEmail.calIdTeamId !== calIdTeamId) {
        await prisma.verifiedEmail.create({
          data: {
            email,
            userId,
            calIdTeamId,
          },
        });
      }
    }
    return;
  }

  const userEmail = await prisma.user.findFirst({
    where: {
      id: userId,
      email,
    },
  });

  if (userEmail) {
    await prisma.verifiedEmail.create({
      data: {
        email,
        userId,
        calIdTeamId,
      },
    });
    return;
  }

  // Check if it's a verified secondary email of the user
  const secondaryEmail = await prisma.secondaryEmail.findFirst({
    where: {
      userId,
      email,
      emailVerified: {
        not: null,
      },
    },
  });

  if (secondaryEmail) {
    await prisma.verifiedEmail.create({
      data: {
        email,
        userId,
        calIdTeamId,
      },
    });
    return;
  }

  if (calIdTeamId) {
    const calIdTeam = await prisma.calIdTeam.findUnique({
      where: {
        id: calIdTeamId,
      },
      select: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                secondaryEmails: {
                  select: {
                    email: true,
                    emailVerified: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!calIdTeam) {
      throw new TRPCError({ code: "NOT_FOUND", message: "CalId Team not found" });
    }

    const isTeamMember = calIdTeam.members.some((member) => member.userId === userId);

    if (!isTeamMember) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this CalId team" });
    }

    let foundTeamMember = calIdTeam.members.find((member) => member.user.email === email);

    // Only check secondary emails if no match was found with primary email
    if (!foundTeamMember) {
      foundTeamMember = calIdTeam.members.find((member) =>
        member.user.secondaryEmails.some(
          (secondary) => secondary.email === email && !!secondary.emailVerified
        )
      );
    }

    if (foundTeamMember) {
      await prisma.verifiedEmail.create({
        data: {
          email,
          userId,
          calIdTeamId,
        },
      });
      return;
    }
  }

  throw new TRPCError({ code: "NOT_FOUND", message: "Email not verified" });
};

export function getCalIdSender(
  step: Pick<CalIdWorkflowStep, "action" | "sender"> & { senderName: string | null | undefined }
) {
  return isSMSOrWhatsappAction(step.action) ? step.sender || SENDER_ID : step.senderName || SENDER_NAME;
}

export async function isCalIdAuthorized(
  workflow: Pick<CalIdWorkflow, "id" | "calIdTeamId" | "userId"> | null,
  currentUserId: number,
  isWriteOperation?: boolean
) {
  if (!workflow) {
    return false;
  }
  if (!isWriteOperation) {
    const userWorkflow = await prisma.calIdWorkflow.findFirst({
      where: {
        id: workflow.id,
        OR: [
          { userId: currentUserId },
          {
            // for read operation every team member has access
            calIdTeam: {
              members: {
                some: {
                  userId: currentUserId,
                  acceptedInvitation: true,
                },
              },
            },
          },
        ],
      },
    });
    if (userWorkflow) return true;
  }

  const userWorkflow = await prisma.calIdWorkflow.findFirst({
    where: {
      id: workflow.id,
      OR: [
        { userId: currentUserId },
        {
          calIdTeam: {
            members: {
              some: {
                userId: currentUserId,
                acceptedInvitation: true,
                //only admins can update CalId team workflows
                NOT: {
                  role: CalIdMembershipRole.MEMBER,
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

export async function upsertCalIdSmsReminderFieldForEventTypes({
  activeOn,
  workflowId,
  isSmsReminderNumberRequired,
  isCalIdTeam,
}: {
  activeOn: number[];
  workflowId: number;
  isSmsReminderNumberRequired: boolean;
  isCalIdTeam: boolean;
}) {
  // For CalId workflows, we only handle event types (no team level complexity)
  for (const eventTypeId of activeOn) {
    await upsertBookingField(
      //getSmsReminderNumberField(),
      getSmsReminderNumberSource({
        workflowId,
        isSmsReminderNumberRequired,
      }),
      eventTypeId
    );
  }
}

export async function removeCalIdSmsReminderFieldForEventTypes({
  activeOnToRemove,
  workflowId,
}: {
  activeOnToRemove: number[];
  workflowId: number;
}) {
  // For CalId workflows, we only handle event types
  for (const eventTypeId of activeOnToRemove) {
    await removeCalIdSmsReminderFieldForEventType({
      workflowId,
      eventTypeId,
    });
  }
}

export async function removeCalIdSmsReminderFieldForEventType({
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

export async function isCalIdAuthorizedToAddActiveOnIds(
  newActiveIds: number[],
  isCalIdTeam: boolean,
  calIdTeamId?: number | null,
  userId?: number | null
) {
  for (const id of newActiveIds) {
    // For CalId workflows, we only handle event types (no team complexity)
    const newEventType = await prisma.eventType.findUnique({
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
      if (calIdTeamId && calIdTeamId !== newEventType.calIdTeamId) {
        return false;
      }
      if (
        !calIdTeamId &&
        userId &&
        newEventType.userId !== userId &&
        !newEventType?.users.find((eventTypeUser) => eventTypeUser.id === userId)
      ) {
        return false;
      }
    }
  }
  return true;
}

export async function deleteCalIdRemindersOfActiveOnIds({
  removedActiveOnIds,
  workflowSteps,
  isCalIdTeam,
  activeOnIds,
}: {
  removedActiveOnIds: number[];
  workflowSteps: CalIdWorkflowStep[];
  isCalIdTeam: boolean;
  activeOnIds?: number[];
}) {
  // For CalId workflows, we only handle event types
  const remindersToDelete = await getCalIdRemindersFromRemovedEventTypes(removedActiveOnIds, workflowSteps);
  await CalIdWorkflowRepository.deleteAllWorkflowReminders(remindersToDelete);
}

async function getCalIdRemindersFromRemovedEventTypes(
  removedEventTypes: number[],
  workflowSteps: CalIdWorkflowStep[]
) {
  const remindersToDeletePromise: Prisma.PrismaPromise<
    {
      id: number;
      referenceId: string | null;
      method: string;
    }[]
  >[] = [];
  removedEventTypes.forEach((eventTypeId) => {
    const remindersToDelete = prisma.calIdWorkflowReminder.findMany({
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

export async function scheduleCalIdWorkflowNotifications({
  workflow,
  activeOn,
  isCalIdTeam,
  workflowSteps,
  time,
  timeUnit,
  trigger,
  userId,
  calIdTeamId,
  alreadyScheduledActiveOnIds,
}: {
  workflow: CalIdWorkflow;
  activeOn: number[];
  isCalIdTeam: boolean;
  workflowSteps: Partial<CalIdWorkflowStep>[];
  time: number | null;
  timeUnit: TimeUnit | null;
  trigger: WorkflowTriggerEvents;
  userId: number;
  calIdTeamId: number | null;
  alreadyScheduledActiveOnIds?: number[];
}) {
  const bookingsToScheduleNotifications = await getCalIdBookings(activeOn, alreadyScheduledActiveOnIds);

  await scheduleCalIdBookingReminders(
    workflow,
    bookingsToScheduleNotifications,
    workflowSteps,
    time,
    timeUnit,
    trigger,
    userId,
    calIdTeamId
  );
}

async function getCalIdBookings(activeOn: number[], alreadyScheduledActiveOnIds: number[] = []) {
  if (activeOn.length === 0) return [];

  // For CalId workflows, we only handle event types
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

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type CalIdBookings = UnwrapPromise<ReturnType<typeof getCalIdBookings>>;

export async function scheduleCalIdBookingReminders(
  bookings: CalIdBookings,
  workflowSteps: Partial<CalIdWorkflowStep>[],
  time: number | null,
  timeUnit: TimeUnit | null,
  trigger: WorkflowTriggerEvents,
  userId: number,
  calIdTeamId: number | null
) {
  if (!bookings || !bookings.length) return;
  if (trigger !== WorkflowTriggerEvents.BEFORE_EVENT && trigger !== WorkflowTriggerEvents.AFTER_EVENT) return;

  // For CalId workflows, we don't use organization concept
  const bookerUrl = await getBookerBaseUrl(null);

  //create reminders for all bookings for each workflow step
  const promiseSteps = workflowSteps.map(async (step) => {
    const promiseScheduleReminders = bookings.map(async (booking) => {
      const defaultLocale = "en";
      const bookingInfo = {
        uid: booking.uid,
        bookerUrl,
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
        hideOrganizerEmail: booking.eventType?.hideOrganizerEmail,
        eventType: {
          slug: booking.eventType?.slug || "",
          schedulingType: booking.eventType?.schedulingType,
          hosts: booking.eventType?.hosts,
        },
        metadata: booking.metadata,
        customReplyToEmail: booking.eventType?.customReplyToEmail,
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
            const schedulingType = bookingInfo.eventType.schedulingType;
            const hosts = bookingInfo.eventType.hosts
              ?.filter((host) => bookingInfo.attendees.some((attendee) => attendee.email === host.user.email))
              .map(({ user }) => user.destinationCalendar?.primaryEmail ?? user.email);
            if (
              hosts &&
              (schedulingType === SchedulingType.ROUND_ROBIN || schedulingType === SchedulingType.COLLECTIVE)
            ) {
              sendTo = sendTo.concat(hosts);
            }
            break;
          case WorkflowActions.EMAIL_ATTENDEE:
            sendTo = bookingInfo.attendees.map((attendee) => attendee.email);
            break;
          case WorkflowActions.EMAIL_ADDRESS:
            await verifyCalIdEmailSender(step.sendTo || "", userId, calIdTeamId);
            sendTo = [step.sendTo || ""];
            break;
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
          calIdTeamId: calIdTeamId,
        });
      } else if (step.action === WorkflowActions.WHATSAPP_NUMBER && step.sendTo) {
        await scheduleWhatsappReminder({
          workflow,
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
          calIdTeamId: calIdTeamId,
          metaTemplateName: step.metaTemplateName,
          metaPhoneNumberId: step.metaTemplatePhoneNumberId,
        });
      } else if (booking.smsReminderNumber) {
        if (step.action === WorkflowActions.SMS_ATTENDEE) {
          await scheduleSMSReminder({
            evt: bookingInfo,
            reminderPhone: booking.smsReminderNumber,
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
            calIdTeamId: calIdTeamId,
          });
        } else if (step.action === WorkflowActions.WHATSAPP_ATTENDEE) {
          await scheduleWhatsappReminder({
            workflow,
            evt: bookingInfo,
            reminderPhone: booking.smsReminderNumber,
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
            calIdTeamId: calIdTeamId,
            metaTemplateName: step.metaTemplateName,
            metaPhoneNumberId: step.metaTemplatePhoneNumberId,
          });
        }
      }
    });
    await Promise.all(promiseScheduleReminders);
  });
  return Promise.all(promiseSteps);
}

export function isCalIdStepEdited(oldStep: CalIdWorkflowStep, newStep: CalIdWorkflowStep) {
  const oldStepKeys = Object.keys(oldStep);
  const newStepKeys = Object.keys(newStep);

  if (oldStepKeys.length !== newStepKeys.length) {
    return true;
  }

  for (const key of oldStepKeys) {
    if (oldStep[key as keyof CalIdWorkflowStep] !== newStep[key as keyof CalIdWorkflowStep]) {
      return true;
    }
  }

  return false;
}

export async function getAllCalIdWorkflowsFromEventType(
  eventType: {
    calIdWorkflows?: {
      workflow: CalIdWorkflowType;
    }[];
    calIdTeamId?: number | null;
    parentId?: number | null;
    parent?: {
      id?: number | null;
      calIdTeamId: number | null;
    } | null;
    metadata?: Prisma.JsonValue;
  } | null,
  userId?: number | null
): Promise<CalIdWorkflowType[]> {
  if (!eventType) return [];

  const eventTypeWorkflows = eventType?.calIdWorkflows?.map((workflowRel) => workflowRel.workflow) ?? [];

  const calIdTeamId = await getTeamIdFromEventType({
    eventType: {
      team: { id: eventType?.calIdTeamId ?? null },
      parentId: eventType?.parentId || eventType?.parent?.id || null,
    },
  });

  const isManagedEventType = !!eventType?.parent;

  const eventTypeMetadata = EventTypeMetaDataSchema.parse(eventType?.metadata || {});

  const workflowsLockedForUser = isManagedEventType
    ? !eventTypeMetadata?.managedEventConfig?.unlockedFields?.workflows
    : false;

  // For CalId workflows, we simplify to not handle organization workflows
  const allWorkflows = await getAllWorkflows(
    eventTypeWorkflows,
    userId,
    calIdTeamId,
    null, // No org support for CalId
    workflowsLockedForUser
  );

  return allWorkflows;
}

export const getCalIdEventTypeWorkflows = async (
  userId: number,
  eventTypeId: number
): Promise<z.infer<typeof ZCalIdWorkflows>> => {
  const workflows = await prisma.calIdWorkflow.findMany({
    where: {
      OR: [
        {
          userId: userId,
        },
        {
          calIdTeam: {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        },
      ],
      activeOn: {
        some: {
          eventTypeId: eventTypeId,
        },
      },
    },
    select: {
      name: true,
      id: true,
      trigger: true,
      time: true,
      timeUnit: true,
      userId: true,
      calIdTeamId: true,
      calIdTeam: {
        select: {
          id: true,
          slug: true,
          name: true,
          members: true,
        },
      },
      activeOn: {
        select: {
          eventType: {
            select: {
              id: true,
              title: true,
              parentId: true,
              _count: {
                select: {
                  children: true,
                },
              },
            },
          },
        },
      },
      steps: true,
    },
  });

  return workflows.map((workflow) => ({ workflow }));
};

export async function getCalIdEmailTemplateText(
  template: WorkflowTemplates,
  params: { locale: string; action: WorkflowActions; timeFormat: number | null }
) {
  const { locale, action } = params;

  const timeFormat = getTimeFormatStringFromUserTimeFormat(params.timeFormat);

  let { emailBody, emailSubject } = emailReminderTemplate({
    isEditingMode: true,
    locale,
    action,
    timeFormat,
  });

  if (template === WorkflowTemplates.RATING) {
    const ratingTemplate = emailRatingTemplate({
      isEditingMode: true,
      locale,
      action,
      timeFormat,
    });

    emailBody = ratingTemplate.emailBody;
    emailSubject = ratingTemplate.emailSubject;
  }

  return { emailBody, emailSubject };
}
