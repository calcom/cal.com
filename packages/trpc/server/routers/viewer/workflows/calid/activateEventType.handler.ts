import { scheduleEmailReminder } from "@calid/features/modules/workflows/managers/emailManager";
import { scheduleSMSReminder } from "@calid/features/modules/workflows/managers/smsManager";
import { scheduleWhatsappReminder } from "@calid/features/modules/workflows/managers/whatsappManager";

import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import { CalIdWorkflowRepository } from "@calcom/lib/server/repository/workflow.calid";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/client";
import { CalIdMembershipRole, SchedulingType, WorkflowActions } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import {
  removeCalIdSmsReminderFieldForEventTypes,
  upsertCalIdSmsReminderFieldForEventTypes,
} from "../util.calid";
import type { TCalIdActivateEventTypeInputSchema } from "./activateEventType.schema";

type CalIdActivateEventTypeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdActivateEventTypeInputSchema;
};

export const calIdActivateEventTypeHandler = async ({ ctx, input }: CalIdActivateEventTypeOptions) => {
  const { eventTypeId, workflowId } = input;

  // Check that event type belong to the user or CalId team
  const userEventType = await prisma.eventType.findFirst({
    where: {
      id: eventTypeId,
      OR: [
        { userId: ctx.user.id },
        {
          calIdTeam: {
            members: {
              some: {
                userId: ctx.user.id,
                acceptedInvitation: true,
                NOT: {
                  role: CalIdMembershipRole.MEMBER,
                },
              },
            },
          },
        },
      ],
    },
    include: {
      children: true,
    },
  });

  if (!userEventType)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authorized to edit this event type" });

  // Check that the workflow belongs to the user or CalId team
  const eventTypeWorkflow = await prisma.calIdWorkflow.findFirst({
    where: {
      id: workflowId,
      OR: [
        {
          userId: ctx.user.id,
        },
        {
          calIdTeamId: userEventType.calIdTeamId || undefined,
        },
      ],
    },
    include: {
      steps: true,
      calIdTeam: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!eventTypeWorkflow)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authorized to enable/disable this CalId workflow",
    });

  //check if event type is already active
  const isActive =
    !!(await prisma.calIdWorkflowsOnEventTypes.findFirst({
      where: {
        workflowId,
        eventTypeId,
      },
    })) || eventTypeWorkflow.isActiveOnAll;

  const activeOn = [eventTypeId].concat(userEventType.children.map((ch) => ch.id));

  if (isActive) {
    // disable workflow for this event type & delete all reminders
    const remindersToDelete = await prisma.calIdWorkflowReminder.findMany({
      where: {
        booking: {
          eventTypeId: eventTypeId,
          userId: ctx.user.id,
        },
        workflowStepId: {
          in: eventTypeWorkflow.steps.map((step) => {
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

    await CalIdWorkflowRepository.deleteAllWorkflowReminders(remindersToDelete);

    await prisma.calIdWorkflowsOnEventTypes.deleteMany({
      where: {
        workflowId,
        eventTypeId: { in: [eventTypeId].concat(userEventType.children.map((ch) => ch.id)) },
      },
    });

    if (eventTypeWorkflow.isActiveOnAll) {
      await prisma.calIdWorkflow.update({
        where: {
          id: workflowId,
        },
        data: {
          isActiveOnAll: false,
        },
      });

      let allEventTypes = [];

      //get all event types of CalId team or user
      if (eventTypeWorkflow.calIdTeamId) {
        allEventTypes = await prisma.eventType.findMany({
          where: {
            id: {
              not: eventTypeId,
            },
            calIdTeamId: eventTypeWorkflow.calIdTeamId,
          },
        });
      } else {
        const allEventTypesWithLocked = await prisma.eventType.findMany({
          where: {
            id: {
              not: eventTypeId,
            },
            userId: eventTypeWorkflow.userId,
          },
        });

        //if workflows are locked on managed event type then don't set user workflow active
        allEventTypes = allEventTypesWithLocked.filter(
          (eventType) =>
            !eventType.parentId ||
            EventTypeMetaDataSchema.parse(eventType.metadata)?.managedEventConfig?.unlockedFields?.workflows
        );
      }

      // activate all event types on the workflow
      for (const eventType of allEventTypes) {
        await prisma.calIdWorkflowsOnEventTypes.upsert({
          create: {
            workflowId,
            eventTypeId: eventType.id,
          },
          update: {},
          where: {
            workflowId_eventTypeId: {
              eventTypeId: eventType.id,
              workflowId,
            },
          },
        });
      }
    }
    await removeCalIdSmsReminderFieldForEventTypes({
      activeOnToRemove: activeOn,
      workflowId,
    });
  } else {
    // activate workflow and schedule reminders for existing bookings

    const bookingsForReminders = await prisma.booking.findMany({
      where: {
        eventTypeId: eventTypeId,
        status: BookingStatus.ACCEPTED,
        startTime: {
          gte: new Date(),
        },
      },
      include: {
        attendees: true,
        eventType: {
          select: {
            schedulingType: true,
            slug: true,
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
            id: true,
          },
        },
        user: true,
      },
    });

    // For CalId workflows, we don't use organization concept
    const bookerUrl = await getBookerBaseUrl(null);

    for (const booking of bookingsForReminders) {
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
              name: booking.user.name || "",
              email: booking?.userPrimaryEmail ?? booking.user.email,
              timeZone: booking.user.timeZone,
              timeFormat: getTimeFormatStringFromUserTimeFormat(booking.user.timeFormat),
              language: { locale: booking.user.locale || defaultLocale },
            }
          : { name: "", email: "", timeZone: "", language: { locale: "" } },
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        title: booking.title,
        language: { locale: booking?.user?.locale || defaultLocale },
        eventType: {
          slug: booking.eventType?.slug || "",
          schedulingType: booking.eventType?.schedulingType,
          hosts: booking.eventType?.hosts,
          id: booking.eventType?.id,
        },
        metadata: booking.metadata,
      };
      for (const step of eventTypeWorkflow.steps) {
        if (
          step.action === WorkflowActions.EMAIL_ATTENDEE ||
          step.action === WorkflowActions.EMAIL_HOST ||
          step.action === WorkflowActions.EMAIL_ADDRESS
        ) {
          let sendTo: string[] = [];

          switch (step.action) {
            case WorkflowActions.EMAIL_HOST:
              sendTo = [bookingInfo.organizer?.email];
              const schedulingType = bookingInfo.eventType?.schedulingType;
              const hosts = bookingInfo.eventType.hosts
                ?.filter((host) =>
                  bookingInfo.attendees.some((attendee) => host.user.email === attendee.email)
                )
                .map(({ user }) => user.destinationCalendar?.primaryEmail ?? user.email);
              if (
                (schedulingType === SchedulingType.ROUND_ROBIN ||
                  schedulingType === SchedulingType.COLLECTIVE) &&
                hosts
              ) {
                sendTo = sendTo.concat(hosts);
              }
              break;
            case WorkflowActions.EMAIL_ATTENDEE:
              sendTo = bookingInfo.attendees
                .map((attendee) => attendee.email)
                .filter((email): email is string => !!email);
              break;
            case WorkflowActions.EMAIL_ADDRESS:
              sendTo = step.sendTo ? [step.sendTo] : [];
              break;
          }

          await scheduleEmailReminder({
            evt: bookingInfo,
            triggerEvent: eventTypeWorkflow.trigger,
            action: step.action,
            timeSpan: {
              time: eventTypeWorkflow.time,
              timeUnit: eventTypeWorkflow.timeUnit,
            },
            sendTo,
            emailSubject: step.emailSubject || "",
            emailBody: step.reminderBody || "",
            template: step.template,
            sender: step.sender,
            workflowStepId: step.id,
            workflowId: step.workflowId,
          });
        } else if (step.action === WorkflowActions.SMS_NUMBER && step.sendTo) {
          await scheduleSMSReminder({
            evt: bookingInfo,
            reminderPhone: step.sendTo,
            triggerEvent: eventTypeWorkflow.trigger,
            action: step.action,
            timeSpan: {
              time: eventTypeWorkflow.time,
              timeUnit: eventTypeWorkflow.timeUnit,
            },
            message: step.reminderBody || "",
            workflowStepId: step.id,
            template: step.template,
            sender: step.sender,
            userId: booking.userId,
            calIdTeamId: eventTypeWorkflow.calIdTeamId,
          });
        } else if (step.action === WorkflowActions.WHATSAPP_NUMBER && step.sendTo) {
          await scheduleWhatsappReminder({
            evt: bookingInfo,
            reminderPhone: step.sendTo,
            triggerEvent: eventTypeWorkflow.trigger,
            action: step.action,
            timeSpan: {
              time: eventTypeWorkflow.time,
              timeUnit: eventTypeWorkflow.timeUnit,
            },
            message: step.reminderBody || "",
            workflowStepId: step.id,
            template: step.template,
            userId: booking.userId,
            calIdTeamId: eventTypeWorkflow.calIdTeamId,
          });
        }
      }
    }

    await prisma.calIdWorkflowsOnEventTypes.createMany({
      data: [
        {
          workflowId,
          eventTypeId,
        },
      ].concat(userEventType.children.map((ch) => ({ workflowId, eventTypeId: ch.id }))),
    });
    const requiresAttendeeNumber = (action: WorkflowActions) =>
      action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.WHATSAPP_ATTENDEE;

    if (eventTypeWorkflow.steps.some((step) => requiresAttendeeNumber(step.action))) {
      const isSmsReminderNumberRequired = eventTypeWorkflow.steps.some((step) => {
        return requiresAttendeeNumber(step.action) && step.numberRequired;
      });

      await upsertCalIdSmsReminderFieldForEventTypes({
        activeOn,
        workflowId,
        isSmsReminderNumberRequired,
        isCalIdTeam: false,
      });
    }
  }
};
