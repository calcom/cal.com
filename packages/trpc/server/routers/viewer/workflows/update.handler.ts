import type { Prisma } from "@prisma/client";

import { isSMSOrWhatsappAction } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
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
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus, WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { hasTeamPlanHandler } from "../teams/hasTeamPlan.handler";
import type { TUpdateInputSchema } from "./update.schema";
import {
  getSender,
  isAuthorized,
  removeSmsReminderFieldForBooking,
  upsertSmsReminderFieldForBooking,
} from "./util";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const { user } = ctx;
  const { id, name, activeOn, steps, trigger, time, timeUnit } = input;

  const userWorkflow = await ctx.prisma.workflow.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      userId: true,
      teamId: true,
      user: {
        select: {
          teams: true,
        },
      },
      steps: true,
      activeOn: true,
    },
  });

  const isUserAuthorized = await isAuthorized(userWorkflow, ctx.prisma, ctx.user.id, true);

  if (!isUserAuthorized || !userWorkflow) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (steps.find((step) => step.workflowId != id)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const isCurrentUsernamePremium = hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;

  let isTeamsPlan = false;
  if (!isCurrentUsernamePremium) {
    const { hasTeamPlan } = await hasTeamPlanHandler({ ctx });
    isTeamsPlan = !!hasTeamPlan;
  }
  const hasPaidPlan = IS_SELF_HOSTED || isCurrentUsernamePremium || isTeamsPlan;

  const where: Prisma.EventTypeWhereInput = {};
  where.id = {
    in: activeOn,
  };
  if (userWorkflow.teamId) {
    //all children managed event types are added after
    where.parentId = null;
  }
  const activeOnEventTypes = await ctx.prisma.eventType.findMany({
    where,
    select: {
      id: true,
      children: {
        select: {
          id: true,
        },
      },
    },
  });

  const activeOnWithChildren = activeOnEventTypes
    .map((eventType) => [eventType.id].concat(eventType.children.map((child) => child.id)))
    .flat();

  const oldActiveOnEventTypes = await ctx.prisma.workflowsOnEventTypes.findMany({
    where: {
      workflowId: id,
    },
    select: {
      eventTypeId: true,
      eventType: {
        include: {
          children: true,
        },
      },
    },
  });

  const oldActiveOnEventTypeIds = oldActiveOnEventTypes
    .map((eventTypeRel) =>
      [eventTypeRel.eventType.id].concat(eventTypeRel.eventType.children.map((child) => child.id))
    )
    .flat();

  const newActiveEventTypes = activeOn.filter(
    (eventType) =>
      !oldActiveOnEventTypes ||
      !oldActiveOnEventTypes
        .map((oldEventType) => {
          return oldEventType.eventTypeId;
        })
        .includes(eventType)
  );

  //check if new event types belong to user or team
  for (const newEventTypeId of newActiveEventTypes) {
    const newEventType = await ctx.prisma.eventType.findFirst({
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
      if (userWorkflow.teamId && userWorkflow.teamId !== newEventType.teamId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (
        !userWorkflow.teamId &&
        userWorkflow.userId &&
        newEventType.userId !== userWorkflow.userId &&
        !newEventType?.users.find((eventTypeUser) => eventTypeUser.id === userWorkflow.userId)
      ) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }
  }

  //remove all scheduled Email and SMS reminders for eventTypes that are not active any more
  const removedEventTypes = oldActiveOnEventTypeIds.filter(
    (eventTypeId) => !activeOnWithChildren.includes(eventTypeId)
  );

  const remindersToDeletePromise: Prisma.PrismaPromise<
    {
      id: number;
      referenceId: string | null;
      method: string;
      scheduled: boolean;
    }[]
  >[] = [];

  removedEventTypes.forEach((eventTypeId) => {
    const reminderToDelete = ctx.prisma.workflowReminder.findMany({
      where: {
        booking: {
          eventTypeId: eventTypeId,
          userId: ctx.user.id,
        },
        workflowStepId: {
          in: userWorkflow.steps.map((step) => {
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

  const remindersToDelete = await Promise.all(remindersToDeletePromise);

  //cancel workflow reminders for all bookings from event types that got disabled
  remindersToDelete.flat().forEach((reminder) => {
    if (reminder.method === WorkflowMethods.EMAIL) {
      deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
    } else if (reminder.method === WorkflowMethods.SMS) {
      deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
    } else if (reminder.method === WorkflowMethods.WHATSAPP) {
      deleteScheduledWhatsappReminder(reminder.id, reminder.referenceId);
    }
  });

  //update active on & reminders for new eventTypes
  await ctx.prisma.workflowsOnEventTypes.deleteMany({
    where: {
      workflowId: id,
    },
  });

  let newEventTypes: number[] = [];
  if (activeOn.length) {
    if (trigger === WorkflowTriggerEvents.BEFORE_EVENT || trigger === WorkflowTriggerEvents.AFTER_EVENT) {
      newEventTypes = newActiveEventTypes;
    }
    if (newEventTypes.length > 0) {
      //create reminders for all bookings with newEventTypes
      const bookingsForReminders = await ctx.prisma.booking.findMany({
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
        include: {
          attendees: true,
          eventType: true,
          user: true,
        },
      });

      const promiseSteps = userWorkflow.steps.map(async (step) => {
        if (
          step.action !== WorkflowActions.SMS_ATTENDEE &&
          step.action !== WorkflowActions.WHATSAPP_ATTENDEE
        ) {
          //as we do not have attendees phone number (user is notified about that when setting this action)
          const promiseScheduleReminders = bookingsForReminders.map(async (booking) => {
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
              startTime: booking.startTime.toISOString(),
              endTime: booking.endTime.toISOString(),
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
                sender: step.sender,
                workflowStepId: step.id,
              });
            } else if (step.action === WorkflowActions.SMS_NUMBER) {
              await scheduleSMSReminder({
                evt: bookingInfo,
                reminderPhone: step.sendTo || "",
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
                userId: user.id,
                teamId: userWorkflow.teamId,
              });
            } else if (step.action === WorkflowActions.WHATSAPP_NUMBER) {
              await scheduleWhatsappReminder({
                evt: bookingInfo,
                reminderPhone: step.sendTo || "",
                triggerEvent: trigger,
                action: step.action,
                timeSpan: {
                  time,
                  timeUnit,
                },
                message: step.reminderBody || "",
                workflowStepId: step.id || 0,
                template: step.template,
                userId: user.id,
                teamId: userWorkflow.teamId,
              });
            }
          });
          await Promise.all(promiseScheduleReminders);
        }
      });
      await Promise.all(promiseSteps);
    }
    //create all workflow - eventtypes relationships
    await ctx.prisma.workflowsOnEventTypes.createMany({
      data: activeOnEventTypes.map((eventType) => ({
        workflowId: id,
        eventTypeId: eventType.id,
      })),
    });
    await Promise.all(
      activeOnEventTypes.map((eventType) =>
        ctx.prisma.workflowsOnEventTypes.createMany({
          data: eventType.children.map((chEventType) => ({
            workflowId: id,
            eventTypeId: chEventType.id,
          })),
        })
      )
    );
  }

  userWorkflow.steps.map(async (oldStep) => {
    const newStep = steps.filter((s) => s.id === oldStep.id)[0];
    const remindersFromStep = await ctx.prisma.workflowReminder.findMany({
      where: {
        workflowStepId: oldStep.id,
      },
      include: {
        booking: true,
      },
    });

    //step was deleted
    if (!newStep) {
      // cancel all workflow reminders from deleted steps
      if (remindersFromStep.length > 0) {
        remindersFromStep.forEach((reminder) => {
          if (reminder.method === WorkflowMethods.EMAIL) {
            deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
          } else if (reminder.method === WorkflowMethods.SMS) {
            deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
          } else if (reminder.method === WorkflowMethods.WHATSAPP) {
            deleteScheduledWhatsappReminder(reminder.id, reminder.referenceId);
          }
        });
      }
      await ctx.prisma.workflowStep.delete({
        where: {
          id: oldStep.id,
        },
      });

      //step was edited
    } else if (JSON.stringify(oldStep) !== JSON.stringify(newStep)) {
      // check if step that require team plan already existed before
      if (!hasPaidPlan && !isSMSOrWhatsappAction(oldStep.action) && isSMSOrWhatsappAction(newStep.action)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not available on free plan" });
      }
      const requiresSender =
        newStep.action === WorkflowActions.SMS_NUMBER || newStep.action === WorkflowActions.WHATSAPP_NUMBER;
      await ctx.prisma.workflowStep.update({
        where: {
          id: oldStep.id,
        },
        data: {
          action: newStep.action,
          sendTo: requiresSender /*||
                newStep.action === WorkflowActions.EMAIL_ADDRESS*/
            ? newStep.sendTo
            : null,
          stepNumber: newStep.stepNumber,
          workflowId: newStep.workflowId,
          reminderBody: newStep.reminderBody,
          emailSubject: newStep.emailSubject,
          template: newStep.template,
          numberRequired: newStep.numberRequired,
          sender: getSender({
            action: newStep.action,
            sender: newStep.sender || null,
            senderName: newStep.senderName,
          }),
          numberVerificationPending: false,
          includeCalendarEvent: newStep.includeCalendarEvent,
        },
      });
      //cancel all reminders of step and create new ones (not for newEventTypes)
      const remindersToUpdate = remindersFromStep.filter(
        (reminder) => reminder.booking?.eventTypeId && !newEventTypes.includes(reminder.booking?.eventTypeId)
      );

      //cancel all workflow reminders from steps that were edited
      // FIXME: async calls into ether
      remindersToUpdate.forEach((reminder) => {
        if (reminder.method === WorkflowMethods.EMAIL) {
          deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
        } else if (reminder.method === WorkflowMethods.SMS) {
          deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
        } else if (reminder.method === WorkflowMethods.WHATSAPP) {
          deleteScheduledWhatsappReminder(reminder.id, reminder.referenceId);
        }
      });

      const eventTypesToUpdateReminders = activeOn.filter(
        (eventTypeId) => !newEventTypes.includes(eventTypeId)
      );
      if (
        eventTypesToUpdateReminders &&
        (trigger === WorkflowTriggerEvents.BEFORE_EVENT || trigger === WorkflowTriggerEvents.AFTER_EVENT)
      ) {
        const bookingsOfEventTypes = await ctx.prisma.booking.findMany({
          where: {
            eventTypeId: {
              in: eventTypesToUpdateReminders,
            },
            status: BookingStatus.ACCEPTED,
            startTime: {
              gte: new Date(),
            },
          },
          include: {
            attendees: true,
            eventType: true,
            user: true,
          },
        });
        const promiseScheduleReminders = bookingsOfEventTypes.map(async (booking) => {
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
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
            title: booking.title,
            language: { locale: booking?.user?.locale || defaultLocale },
            eventType: {
              slug: booking.eventType?.slug,
            },
          };
          if (
            newStep.action === WorkflowActions.EMAIL_HOST ||
            newStep.action === WorkflowActions.EMAIL_ATTENDEE /*||
                newStep.action === WorkflowActions.EMAIL_ADDRESS*/
          ) {
            let sendTo: string[] = [];

            switch (newStep.action) {
              case WorkflowActions.EMAIL_HOST:
                sendTo = [bookingInfo.organizer?.email];
                break;
              case WorkflowActions.EMAIL_ATTENDEE:
                sendTo = bookingInfo.attendees.map((attendee) => attendee.email);
                break;
              /*case WorkflowActions.EMAIL_ADDRESS:
                    sendTo = newStep.sendTo || "";*/
            }

            await scheduleEmailReminder({
              evt: bookingInfo,
              triggerEvent: trigger,
              action: newStep.action,
              timeSpan: {
                time,
                timeUnit,
              },
              sendTo,
              emailSubject: newStep.emailSubject || "",
              emailBody: newStep.reminderBody || "",
              template: newStep.template,
              sender: newStep.senderName,
              workflowStepId: newStep.id,
            });
          } else if (newStep.action === WorkflowActions.SMS_NUMBER) {
            await scheduleSMSReminder({
              evt: bookingInfo,
              reminderPhone: newStep.sendTo || "",
              triggerEvent: trigger,
              action: newStep.action,
              timeSpan: {
                time,
                timeUnit,
              },
              message: newStep.reminderBody || "",
              workflowStepId: newStep.id || 0,
              template: newStep.template,
              sender: newStep.sender,
              userId: user.id,
              teamId: userWorkflow.teamId,
            });
          } else if (newStep.action === WorkflowActions.WHATSAPP_NUMBER) {
            await scheduleWhatsappReminder({
              evt: bookingInfo,
              reminderPhone: newStep.sendTo || "",
              triggerEvent: trigger,
              action: newStep.action,
              timeSpan: {
                time,
                timeUnit,
              },
              message: newStep.reminderBody || "",
              workflowStepId: newStep.id || 0,
              template: newStep.template,
              userId: user.id,
              teamId: userWorkflow.teamId,
            });
          }
        });
        await Promise.all(promiseScheduleReminders);
      }
    }
  });
  //added steps
  const addedSteps = steps.map((s) => {
    if (s.id <= 0) {
      if (isSMSOrWhatsappAction(s.action) && !hasPaidPlan) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not available on free plan" });
      }
      const { id: _stepId, ...stepToAdd } = s;
      return stepToAdd;
    }
  });
  if (addedSteps) {
    const promiseAddedSteps = addedSteps.map(async (step) => {
      if (step) {
        const { senderName, ...newStep } = step;
        newStep.sender = getSender({
          action: newStep.action,
          sender: newStep.sender || null,
          senderName: senderName,
        });
        const createdStep = await ctx.prisma.workflowStep.create({
          data: { ...newStep, numberVerificationPending: false },
        });
        if (
          (trigger === WorkflowTriggerEvents.BEFORE_EVENT || trigger === WorkflowTriggerEvents.AFTER_EVENT) &&
          step.action !== WorkflowActions.SMS_ATTENDEE &&
          step.action !== WorkflowActions.WHATSAPP_ATTENDEE
        ) {
          const bookingsForReminders = await ctx.prisma.booking.findMany({
            where: {
              eventTypeId: { in: activeOn },
              status: BookingStatus.ACCEPTED,
              startTime: {
                gte: new Date(),
              },
            },
            include: {
              attendees: true,
              eventType: true,
              user: true,
            },
          });
          for (const booking of bookingsForReminders) {
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
                slug: booking.eventType?.slug,
              },
            };

            if (
              step.action === WorkflowActions.EMAIL_ATTENDEE ||
              step.action === WorkflowActions.EMAIL_HOST /*||
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
                sender: step.senderName,
                workflowStepId: createdStep.id,
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
                workflowStepId: createdStep.id,
                template: step.template,
                sender: step.sender,
                userId: user.id,
                teamId: userWorkflow.teamId,
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
                workflowStepId: createdStep.id,
                template: step.template,
                userId: user.id,
                teamId: userWorkflow.teamId,
              });
            }
          }
        }
      }
    });
    await Promise.all(promiseAddedSteps);
  }

  //update trigger, name, time, timeUnit
  await ctx.prisma.workflow.update({
    where: {
      id,
    },
    data: {
      name,
      trigger,
      time,
      timeUnit,
    },
  });

  const workflow = await ctx.prisma.workflow.findFirst({
    where: {
      id,
    },
    include: {
      activeOn: {
        select: {
          eventType: true,
        },
      },
      team: {
        select: {
          id: true,
          slug: true,
          members: true,
          name: true,
        },
      },
      steps: {
        orderBy: {
          stepNumber: "asc",
        },
      },
    },
  });

  // Remove or add booking field for sms reminder number
  const smsReminderNumberNeeded =
    activeOn.length &&
    steps.some(
      (step) =>
        step.action === WorkflowActions.SMS_ATTENDEE || step.action === WorkflowActions.WHATSAPP_ATTENDEE
    );

  for (const removedEventType of removedEventTypes) {
    await removeSmsReminderFieldForBooking({
      workflowId: id,
      eventTypeId: removedEventType,
    });
  }

  for (const eventTypeId of activeOnWithChildren) {
    if (smsReminderNumberNeeded) {
      await upsertSmsReminderFieldForBooking({
        workflowId: id,
        isSmsReminderNumberRequired: steps.some(
          (s) =>
            (s.action === WorkflowActions.SMS_ATTENDEE || s.action === WorkflowActions.WHATSAPP_ATTENDEE) &&
            s.numberRequired
        ),
        eventTypeId,
      });
    } else {
      await removeSmsReminderFieldForBooking({ workflowId: id, eventTypeId });
    }
  }

  return {
    workflow,
  };
};
