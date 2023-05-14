import type { Prisma } from "@prisma/client";

import { isSMSAction } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import {
  deleteScheduledEmailReminder,
  scheduleEmailReminder,
} from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import {
  deleteScheduledSMSReminder,
  scheduleSMSReminder,
} from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import { IS_SELF_HOSTED, SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import type { PrismaClient } from "@calcom/prisma/client";
import { BookingStatus, WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

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

  const oldActiveOnEventTypes = await ctx.prisma.workflowsOnEventTypes.findMany({
    where: {
      workflowId: id,
    },
    select: {
      eventTypeId: true,
    },
  });

  const newActiveEventTypes = activeOn.filter((eventType) => {
    if (
      !oldActiveOnEventTypes ||
      !oldActiveOnEventTypes
        .map((oldEventType) => {
          return oldEventType.eventTypeId;
        })
        .includes(eventType)
    ) {
      return eventType;
    }
  });

  //check if new event types belong to user or team
  for (const newEventTypeId of newActiveEventTypes) {
    const newEventType = await ctx.prisma.eventType.findFirst({
      where: {
        id: newEventTypeId,
      },
      include: {
        users: true,
        team: {
          include: {
            members: true,
          },
        },
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
  const removedEventTypes = oldActiveOnEventTypes
    .map((eventType) => {
      return eventType.eventTypeId;
    })
    .filter((eventType) => {
      if (!activeOn.includes(eventType)) {
        return eventType;
      }
    });

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
          eventTypeId: { in: newEventTypes },
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

      steps.forEach(async (step) => {
        if (step.action !== WorkflowActions.SMS_ATTENDEE) {
          //as we do not have attendees phone number (user is notified about that when setting this action)
          bookingsForReminders.forEach(async (booking) => {
            const bookingInfo = {
              uid: booking.uid,
              attendees: booking.attendees.map((attendee) => {
                return {
                  name: attendee.name,
                  email: attendee.email,
                  timeZone: attendee.timeZone,
                  language: { locale: attendee.locale || "" },
                };
              }),
              organizer: booking.user
                ? {
                    language: { locale: booking.user.locale || "" },
                    name: booking.user.name || "",
                    email: booking.user.email,
                    timeZone: booking.user.timeZone,
                  }
                : { name: "", email: "", timeZone: "", language: { locale: "" } },
              startTime: booking.startTime.toISOString(),
              endTime: booking.endTime.toISOString(),
              title: booking.title,
              language: { locale: booking?.user?.locale || "" },
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

              await scheduleEmailReminder(
                bookingInfo,
                trigger,
                step.action,
                {
                  time,
                  timeUnit,
                },
                sendTo,
                step.emailSubject || "",
                step.reminderBody || "",
                step.id,
                step.template,
                step.senderName || SENDER_NAME
              );
            } else if (step.action === WorkflowActions.SMS_NUMBER) {
              await scheduleSMSReminder(
                bookingInfo,
                step.sendTo || "",
                trigger,
                step.action,
                {
                  time,
                  timeUnit,
                },
                step.reminderBody || "",
                step.id,
                step.template,
                step.sender || SENDER_ID,
                user.id,
                userWorkflow.teamId
              );
            }
          });
        }
      });
    }
    //create all workflow - eventtypes relationships
    activeOn.forEach(async (eventTypeId) => {
      await ctx.prisma.workflowsOnEventTypes.createMany({
        data: {
          workflowId: id,
          eventTypeId,
        },
      });
    });
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
      if (
        !userWorkflow.teamId &&
        !userWorkflow.user?.teams.length &&
        !isSMSAction(oldStep.action) &&
        isSMSAction(newStep.action) &&
        !IS_SELF_HOSTED
      ) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await ctx.prisma.workflowStep.update({
        where: {
          id: oldStep.id,
        },
        data: {
          action: newStep.action,
          sendTo:
            newStep.action === WorkflowActions.SMS_NUMBER /*||
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
        },
      });
      //cancel all reminders of step and create new ones (not for newEventTypes)
      const remindersToUpdate = remindersFromStep.filter((reminder) => {
        if (reminder.booking?.eventTypeId && !newEventTypes.includes(reminder.booking?.eventTypeId)) {
          return reminder;
        }
      });

      //cancel all workflow reminders from steps that were edited
      remindersToUpdate.forEach(async (reminder) => {
        if (reminder.method === WorkflowMethods.EMAIL) {
          deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
        } else if (reminder.method === WorkflowMethods.SMS) {
          deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
        }
      });
      const eventTypesToUpdateReminders = activeOn.filter((eventTypeId) => {
        if (!newEventTypes.includes(eventTypeId)) {
          return eventTypeId;
        }
      });
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
        bookingsOfEventTypes.forEach(async (booking) => {
          const bookingInfo = {
            uid: booking.uid,
            attendees: booking.attendees.map((attendee) => {
              return {
                name: attendee.name,
                email: attendee.email,
                timeZone: attendee.timeZone,
                language: { locale: attendee.locale || "" },
              };
            }),
            organizer: booking.user
              ? {
                  language: { locale: booking.user.locale || "" },
                  name: booking.user.name || "",
                  email: booking.user.email,
                  timeZone: booking.user.timeZone,
                }
              : { name: "", email: "", timeZone: "", language: { locale: "" } },
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
            title: booking.title,
            language: { locale: booking?.user?.locale || "" },
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

            await scheduleEmailReminder(
              bookingInfo,
              trigger,
              newStep.action,
              {
                time,
                timeUnit,
              },
              sendTo,
              newStep.emailSubject || "",
              newStep.reminderBody || "",
              newStep.id,
              newStep.template,
              newStep.senderName || SENDER_NAME
            );
          } else if (newStep.action === WorkflowActions.SMS_NUMBER) {
            await scheduleSMSReminder(
              bookingInfo,
              newStep.sendTo || "",
              trigger,
              newStep.action,
              {
                time,
                timeUnit,
              },
              newStep.reminderBody || "",
              newStep.id || 0,
              newStep.template,
              newStep.sender || SENDER_ID,
              user.id,
              userWorkflow.teamId
            );
          }
        });
      }
    }
  });
  //added steps
  const addedSteps = steps.map((s) => {
    if (s.id <= 0) {
      if (!userWorkflow.user?.teams.length && isSMSAction(s.action) && !IS_SELF_HOSTED) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const { id: _stepId, ...stepToAdd } = s;
      return stepToAdd;
    }
  });

  if (addedSteps) {
    const eventTypesToCreateReminders = activeOn.map((activeEventType) => {
      if (activeEventType && !newEventTypes.includes(activeEventType)) {
        return activeEventType;
      }
    });
    addedSteps.forEach(async (step) => {
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
          eventTypesToCreateReminders &&
          step.action !== WorkflowActions.SMS_ATTENDEE
        ) {
          const bookingsForReminders = await ctx.prisma.booking.findMany({
            where: {
              eventTypeId: { in: eventTypesToCreateReminders as number[] },
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
            const bookingInfo = {
              uid: booking.uid,
              attendees: booking.attendees.map((attendee) => {
                return {
                  name: attendee.name,
                  email: attendee.email,
                  timeZone: attendee.timeZone,
                  language: { locale: attendee.locale || "" },
                };
              }),
              organizer: booking.user
                ? {
                    name: booking.user.name || "",
                    email: booking.user.email,
                    timeZone: booking.user.timeZone,
                    language: { locale: booking.user.locale || "" },
                  }
                : { name: "", email: "", timeZone: "", language: { locale: "" } },
              startTime: booking.startTime.toISOString(),
              endTime: booking.endTime.toISOString(),
              title: booking.title,
              language: { locale: booking?.user?.locale || "" },
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

              await scheduleEmailReminder(
                bookingInfo,
                trigger,
                step.action,
                {
                  time,
                  timeUnit,
                },
                sendTo,
                step.emailSubject || "",
                step.reminderBody || "",
                createdStep.id,
                step.template,
                step.senderName || SENDER_NAME
              );
            } else if (step.action === WorkflowActions.SMS_NUMBER && step.sendTo) {
              await scheduleSMSReminder(
                bookingInfo,
                step.sendTo,
                trigger,
                step.action,
                {
                  time,
                  timeUnit,
                },
                step.reminderBody || "",
                createdStep.id,
                step.template,
                step.sender || SENDER_ID,
                user.id,
                userWorkflow.teamId
              );
            }
          }
        }
      }
    });
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
    activeOn.length && steps.some((step) => step.action === WorkflowActions.SMS_ATTENDEE);

  for (const removedEventType of removedEventTypes) {
    await removeSmsReminderFieldForBooking({
      workflowId: id,
      eventTypeId: removedEventType,
    });
  }

  for (const eventTypeId of activeOn) {
    if (smsReminderNumberNeeded) {
      await upsertSmsReminderFieldForBooking({
        workflowId: id,
        isSmsReminderNumberRequired: steps.some(
          (s) => s.action === WorkflowActions.SMS_ATTENDEE && s.numberRequired
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
