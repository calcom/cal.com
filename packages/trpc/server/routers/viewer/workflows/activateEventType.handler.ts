import { scheduleEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { scheduleSMSReminder } from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import { scheduleWhatsappReminder } from "@calcom/features/ee/workflows/lib/reminders/whatsappReminderManager";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { MembershipRole, SchedulingType, WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TActivateEventTypeInputSchema } from "./activateEventType.schema";
import { removeSmsReminderFieldForEventTypes, upsertSmsReminderFieldForEventTypes } from "./util";

type ActivateEventTypeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TActivateEventTypeInputSchema;
};

export const activateEventTypeHandler = async ({ ctx, input }: ActivateEventTypeOptions) => {
  const { eventTypeId, workflowId } = input;

  // Check that event type belong to the user or team
  const eventType = await prisma.eventType.findFirst({
    where: {
      id: eventTypeId,
      OR: [
        { userId: ctx.user.id },
        {
          team: {
            members: {
              some: {
                userId: ctx.user.id,
                accepted: true,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      teamId: true,
      hideOrganizerEmail: true,
      customReplyToEmail: true,
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
      children: {
        select: {
          id: true,
          teamId: true,
          hideOrganizerEmail: true,
          customReplyToEmail: true,
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
        },
      },
    },
  });

  if (!eventType)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authorized to edit this event type" });

  if (eventType.teamId) {
    const permissionCheckService = new PermissionCheckService();

    const hasPermissionToActivate = await permissionCheckService.checkPermission({
      userId: ctx.user.id,
      teamId: eventType.teamId,
      permission: "eventType.update",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!hasPermissionToActivate) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authorized to edit this event type" });
    }
  }

  // at this point we know that the event type belongs to the user or team
  // so we don't use OR, we use logic.
  const whereClause = eventType.teamId ? { teamId: eventType.teamId } : { userId: ctx.user.id };

  // Check that the workflow belongs to the user or team
  const eventTypeWorkflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      ...whereClause,
    },
    select: {
      steps: {
        select: {
          id: true,
          action: true,
          sendTo: true,
          numberRequired: true,
          template: true,
          sender: true,
          emailSubject: true,
          reminderBody: true,
          verifiedAt: true,
        },
      },
      trigger: true,
      time: true,
      timeUnit: true,
      isActiveOnAll: true,
      teamId: true,
      userId: true,
      team: {
        select: {
          isOrganization: true,
        },
      },
    },
  });

  if (!eventTypeWorkflow)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authorized to enable/disable this workflow",
    });

  //check if event type is already active
  const isActive =
    !!(await prisma.workflowsOnEventTypes.findFirst({
      where: {
        workflowId,
        eventTypeId,
      },
    })) || eventTypeWorkflow.isActiveOnAll;

  const isOrg = eventTypeWorkflow.team?.isOrganization ?? false;

  const activeOnEventTypes = new Map<number, typeof eventType>([
    [eventType.id, eventType],
    ...(eventType.children
      ? eventType.children.map((child) => [child.id, child] as [number, typeof eventType])
      : []),
  ]);

  if (isActive) {
    // disable workflow for this event type & delete all reminders
    const remindersToDelete = await prisma.workflowReminder.findMany({
      where: {
        booking: {
          eventTypeId: {
            in: Array.from(activeOnEventTypes.keys()),
          },
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

    await WorkflowRepository.deleteAllWorkflowReminders(remindersToDelete);

    await prisma.workflowsOnEventTypes.deleteMany({
      where: {
        workflowId,
        eventTypeId: { in: Array.from(activeOnEventTypes.keys()) },
      },
    });

    if (eventTypeWorkflow.isActiveOnAll) {
      await prisma.workflow.update({
        where: {
          id: workflowId,
        },
        data: {
          isActiveOnAll: false,
        },
      });

      let allEventTypes = [];

      //get all event types of team or user
      if (eventTypeWorkflow.teamId) {
        allEventTypes = await prisma.eventType.findMany({
          where: {
            id: {
              not: eventTypeId,
            },
            teamId: eventTypeWorkflow.teamId,
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
        await prisma.workflowsOnEventTypes.upsert({
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
    await removeSmsReminderFieldForEventTypes({
      activeOnToRemove: Array.from(activeOnEventTypes.keys()),
      workflowId,
      isOrg,
    });
  } else {
    if (
      eventTypeWorkflow.trigger == WorkflowTriggerEvents.BEFORE_EVENT ||
      eventTypeWorkflow.trigger == WorkflowTriggerEvents.AFTER_EVENT
    ) {
      // activate workflow and schedule reminders for existing bookings
      const bookingsForReminders = await prisma.booking.findMany({
        where: {
          eventTypeId: {
            in: Array.from(activeOnEventTypes.keys()),
          },
          status: BookingStatus.ACCEPTED,
          startTime: {
            gte: new Date(),
          },
        },
        select: {
          eventTypeId: true,
          metadata: true,
          userId: true,
          smsReminderNumber: true,
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
          user: {
            select: {
              name: true,
              email: true,
              timeZone: true,
              locale: true,
              timeFormat: true,
            },
          },
        },
      });

      const bookerUrl = await getBookerBaseUrl(ctx.user.organizationId ?? null);

      for (const booking of bookingsForReminders) {
        // eventTypeId is technically nullable but we know it will be there
        const bookingEventType = activeOnEventTypes.get(booking.eventTypeId!);
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
          hideOrganizerEmail: bookingEventType?.hideOrganizerEmail,
          eventType: {
            slug: bookingEventType?.slug || "",
            schedulingType: bookingEventType?.schedulingType,
            hosts: bookingEventType?.hosts,
          },
          metadata: booking.metadata,
          customReplyToEmail: bookingEventType?.customReplyToEmail,
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
              verifiedAt: step.verifiedAt,
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
              teamId: eventTypeWorkflow.teamId,
              verifiedAt: step.verifiedAt,
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
              teamId: eventTypeWorkflow.teamId,
              verifiedAt: step.verifiedAt,
            });
          } else if (booking.smsReminderNumber) {
            if (step.action === WorkflowActions.SMS_ATTENDEE) {
              await scheduleSMSReminder({
                evt: bookingInfo,
                reminderPhone: booking.smsReminderNumber,
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
                teamId: eventTypeWorkflow.teamId,
                verifiedAt: step.verifiedAt,
              });
            } else if (step.action === WorkflowActions.WHATSAPP_ATTENDEE) {
              await scheduleWhatsappReminder({
                evt: bookingInfo,
                reminderPhone: booking.smsReminderNumber,
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
                teamId: eventTypeWorkflow.teamId,
                verifiedAt: step.verifiedAt,
              });
            }
          }
        }
      }
    }

    await prisma.workflowsOnEventTypes.createMany({
      data: Array.from(activeOnEventTypes).map(([eventTypeId]) => ({
        workflowId,
        eventTypeId,
      })),
    });
    const requiresAttendeeNumber = (action: WorkflowActions) =>
      action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.WHATSAPP_ATTENDEE;

    if (eventTypeWorkflow.steps.some((step) => requiresAttendeeNumber(step.action))) {
      const isSmsReminderNumberRequired = eventTypeWorkflow.steps.some((step) => {
        return requiresAttendeeNumber(step.action) && step.numberRequired;
      });

      await upsertSmsReminderFieldForEventTypes({
        activeOn: Array.from(activeOnEventTypes.keys()),
        workflowId,
        isSmsReminderNumberRequired,
        isOrg,
      });
    }
  }
};
