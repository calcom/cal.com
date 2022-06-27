import {
  Prisma,
  PrismaPromise,
  WorkflowReminder,
  WorkflowActions,
  WorkflowTriggerEvents,
  BookingStatus,
} from "@prisma/client";
import { z } from "zod";

import { deleteScheduledEmailReminder, scheduleEmailReminder } from "@lib/reminders/emailReminderManager";
import { deleteScheduledSMSReminder, scheduleSMSReminder } from "@lib/reminders/smsReminderManager";
import { WORKFLOW_TEMPLATES, WORKFLOW_TRIGGER_EVENTS } from "@lib/workflows/constants";
import { WORKFLOW_ACTIONS } from "@lib/workflows/constants";
import { TIME_UNIT } from "@lib/workflows/constants";

import { createProtectedRouter } from "@server/createRouter";
import { TRPCError } from "@trpc/server";

export const workflowsRouter = createProtectedRouter()
  .query("list", {
    async resolve({ ctx }) {
      const workflows = await ctx.prisma.workflow.findMany({
        where: {
          userId: ctx.user.id,
        },
        include: {
          activeOn: {
            include: {
              eventType: true,
            },
          },
        },
        orderBy: {
          id: "asc",
        },
      });
      return { workflows };
    },
  })
  .query("get", {
    input: z.object({
      id: z.number(),
    }),
    async resolve({ ctx, input }) {
      const workflow = await ctx.prisma.workflow.findFirst({
        where: {
          AND: [
            {
              userId: ctx.user.id,
            },
            {
              id: input.id,
            },
          ],
        },
        select: {
          id: true,
          name: true,
          time: true,
          timeUnit: true,
          activeOn: {
            select: {
              eventType: true,
            },
          },
          trigger: true,
          steps: {
            orderBy: {
              stepNumber: "asc",
            },
          },
        },
      });
      return workflow;
    },
  })
  .mutation("create", {
    input: z.object({
      name: z.string(),
      trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
      action: z.enum(WORKFLOW_ACTIONS),
      timeUnit: z.enum(TIME_UNIT).optional(),
      time: z.number().optional(),
      sendTo: z.string().optional(),
    }),
    async resolve({ ctx, input }) {
      const { name, trigger, action, timeUnit, time, sendTo } = input;
      const userId = ctx.user.id;

      try {
        const workflow = await ctx.prisma.workflow.create({
          data: {
            name,
            trigger,
            userId,
            timeUnit: time ? timeUnit : null,
            time,
          },
        });

        await ctx.prisma.workflowStep.create({
          data: {
            stepNumber: 1,
            action,
            workflowId: workflow.id,
            sendTo,
          },
        });
        return { workflow };
      } catch (e) {
        throw e;
      }
    },
  })
  .mutation("delete", {
    input: z.object({
      id: z.number(),
    }),
    async resolve({ ctx, input }) {
      const { id } = input;

      await ctx.prisma.workflow.deleteMany({
        where: {
          id,
        },
      });

      return {
        id,
      };
    },
  })
  .mutation("update", {
    input: z.object({
      id: z.number(),
      name: z.string().optional(),
      activeOn: z.number().array().optional(),
      steps: z
        .object({
          id: z.number(),
          stepNumber: z.number(),
          action: z.enum(WORKFLOW_ACTIONS),
          workflowId: z.number(),
          sendTo: z.string().optional().nullable(),
          reminderBody: z.string().optional().nullable(),
          emailSubject: z.string().optional().nullable(),
          template: z.enum(WORKFLOW_TEMPLATES),
        })
        .array()
        .optional(),
      trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
      time: z.number().nullable(),
      timeUnit: z.enum(TIME_UNIT).nullable(),
    }),
    async resolve({ input, ctx }) {
      const { user } = ctx;
      const { id, name, activeOn, steps, trigger, time, timeUnit } = input;

      const userWorkflow = await ctx.prisma.workflow.findUnique({
        where: {
          id,
        },
        select: {
          userId: true,
          steps: true,
        },
      });

      if (!userWorkflow || userWorkflow.userId !== user.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      //remove all scheduled Email and SMS reminders for eventTypes that are not active any more
      const oldActiveOnEventTypes = await ctx.prisma.workflowsOnEventTypes.findMany({
        where: {
          workflowId: id,
        },
        select: {
          eventTypeId: true,
        },
      });

      const removedEventTypes = oldActiveOnEventTypes
        .map((eventType) => {
          return eventType.eventTypeId;
        })
        .filter((eventType) => {
          if (!activeOn || !activeOn.includes(eventType)) {
            return eventType;
          }
        });

      const remindersToDeletePromise: PrismaPromise<
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

      const deleteRemindersPromise: Prisma.Prisma__WorkflowReminderClient<WorkflowReminder>[] = [];
      remindersToDelete.forEach((group) => {
        group.forEach((reminder) => {
          //already scheduled reminders
          if (reminder.referenceId) {
            if (reminder.method === "Email") {
              deleteScheduledEmailReminder(reminder.referenceId);
            } else if (reminder.method === "SMS") {
              deleteScheduledSMSReminder(reminder.referenceId);
            }
          }
          const deleteReminder = ctx.prisma.workflowReminder.delete({
            where: {
              id: reminder.id,
            },
          });
          deleteRemindersPromise.push(deleteReminder);
        });
      });

      await Promise.all(deleteRemindersPromise);

      //update active on & reminders for new eventTypes
      await ctx.prisma.workflowsOnEventTypes.deleteMany({
        where: {
          workflowId: id,
        },
      });

      let newEventTypes: number[] = [];
      if (activeOn && activeOn.length) {
        if (trigger === WorkflowTriggerEvents.BEFORE_EVENT) {
          newEventTypes = activeOn.filter((eventType) => {
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

          steps?.forEach(async (step) => {
            if (step.action !== WorkflowActions.SMS_ATTENDEE) {
              //as we do not have attendees phone number (user is notified about that when setting this action)
              bookingsForReminders.forEach(async (booking) => {
                const bookingInfo = {
                  uid: booking.uid,
                  attendees: booking.attendees.map((attendee) => {
                    return { name: attendee.name, email: attendee.email, timeZone: attendee.timeZone };
                  }),
                  organizer: booking.user
                    ? { name: booking.user.name || "", email: booking.user.email }
                    : { name: "", email: "" },
                  startTime: booking.startTime.toISOString(),
                  title: booking.title,
                };
                if (
                  step.action === WorkflowActions.EMAIL_HOST ||
                  step.action === WorkflowActions.EMAIL_ATTENDEE
                ) {
                  const sendTo =
                    step.action === WorkflowActions.EMAIL_HOST
                      ? bookingInfo.organizer?.email
                      : bookingInfo.attendees[0].email;
                  await scheduleEmailReminder(
                    bookingInfo,
                    WorkflowTriggerEvents.BEFORE_EVENT,
                    step.action,
                    {
                      time,
                      timeUnit,
                    },
                    sendTo || "",
                    step.emailSubject || "",
                    step.reminderBody || "",
                    step.id || 0,
                    step.template
                  );
                } else if (step.action === WorkflowActions.SMS_NUMBER) {
                  await scheduleSMSReminder(
                    bookingInfo,
                    step.sendTo || "",
                    WorkflowTriggerEvents.BEFORE_EVENT,
                    step.action,
                    {
                      time,
                      timeUnit,
                    },
                    step.reminderBody || "",
                    step.id || 0,
                    step.template
                  );
                }
              });
            }
          });
        }

        activeOn.forEach(async (eventTypeId) => {
          await ctx.prisma.workflowsOnEventTypes.createMany({
            data: {
              workflowId: id,
              eventTypeId,
            },
          });
        });
      }

      if (steps) {
        userWorkflow.steps.map(async (currStep) => {
          const updatedStep = steps.filter((s) => s.id === currStep.id)[0];
          const remindersFromStep = await ctx.prisma.workflowReminder.findMany({
            where: {
              workflowStepId: currStep.id,
            },
            include: {
              booking: true,
            },
          });
          //step was deleted
          if (!updatedStep) {
            //delete already scheduled reminders
            if (remindersFromStep.length > 0) {
              remindersFromStep.forEach((reminder) => {
                if (reminder.referenceId) {
                  if (reminder.method === "Email") {
                    deleteScheduledEmailReminder(reminder.referenceId);
                  } else if (reminder.method === "SMS") {
                    deleteScheduledSMSReminder(reminder.referenceId);
                  }
                }
              });
            }
            //automatically deletes reminders from database
            await ctx.prisma.workflowStep.delete({
              where: {
                id: currStep.id,
              },
            });
            //step was edited
          } else if (JSON.stringify(currStep) !== JSON.stringify(updatedStep)) {
            await ctx.prisma.workflowStep.update({
              where: {
                id: currStep.id,
              },
              data: {
                action: updatedStep.action,
                sendTo: updatedStep.sendTo,
                stepNumber: updatedStep.stepNumber,
                workflowId: updatedStep.workflowId,
                reminderBody: updatedStep.reminderBody,
                emailSubject: updatedStep.emailSubject,
                template: updatedStep.template,
              },
            });
            //cancel all reminders of step and create new ones (not for newEventTypes)
            const remindersToUpdate = remindersFromStep.filter((reminder) => {
              if (reminder.booking?.eventTypeId && !newEventTypes.includes(reminder.booking?.eventTypeId)) {
                return reminder;
              }
            });
            remindersToUpdate.forEach(async (reminder) => {
              if (reminder.referenceId) {
                if (reminder.method === "Email") {
                  deleteScheduledEmailReminder(reminder.referenceId);
                } else if (reminder.method === "SMS") {
                  deleteScheduledSMSReminder(reminder.referenceId);
                }
              }
              await ctx.prisma.workflowReminder.deleteMany({
                where: {
                  id: reminder.id,
                },
              });
            });
            const eventTypesToUpdateReminders = activeOn?.filter((eventTypeId) => {
              if (!newEventTypes.includes(eventTypeId)) {
                return eventTypeId;
              }
            });
            if (eventTypesToUpdateReminders) {
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
                    return { name: attendee.name, email: attendee.email, timeZone: attendee.timeZone };
                  }),
                  organizer: booking.user
                    ? { name: booking.user.name || "", email: booking.user.email }
                    : { name: "", email: "" },
                  startTime: booking.startTime.toISOString(),
                  title: booking.title,
                };
                if (
                  updatedStep.action === WorkflowActions.EMAIL_HOST ||
                  updatedStep.action === WorkflowActions.EMAIL_ATTENDEE
                ) {
                  const sendTo =
                    updatedStep.action === WorkflowActions.EMAIL_HOST
                      ? bookingInfo.organizer?.email
                      : bookingInfo.attendees[0].email;
                  await scheduleEmailReminder(
                    bookingInfo,
                    WorkflowTriggerEvents.BEFORE_EVENT,
                    updatedStep.action,
                    {
                      time,
                      timeUnit,
                    },
                    sendTo || "",
                    updatedStep.emailSubject || "",
                    updatedStep.reminderBody || "",
                    updatedStep.id || 0,
                    updatedStep.template
                  );
                } else if (updatedStep.action === WorkflowActions.SMS_NUMBER) {
                  await scheduleSMSReminder(
                    bookingInfo,
                    updatedStep.sendTo || "",
                    WorkflowTriggerEvents.BEFORE_EVENT,
                    updatedStep.action,
                    {
                      time,
                      timeUnit,
                    },
                    updatedStep.reminderBody || "",
                    updatedStep.id || 0,
                    updatedStep.template
                  );
                }
              });
            }
          }
        });
        //added steps
        const addedSteps = steps.map((s) => {
          if (s.id <= 0) {
            const { id, ...stepToAdd } = s;
            if (stepToAdd) {
              return stepToAdd;
            }
          }
        });

        if (addedSteps) {
          addedSteps.forEach(async (step) => {
            if (step) {
              await ctx.prisma.workflowStep.create({
                data: step,
              });
            }
          });
          //create reminders for existing bookings (not for newEventTypes)
        }
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
          steps: true,
        },
      });

      return {
        workflow,
      };
    },
  });
