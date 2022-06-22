import {
  Prisma,
  PrismaPromise,
  WorkflowReminder,
  WorkflowActions,
  WorkflowTriggerEvents,
} from "@prisma/client";
import { z } from "zod";

import { deleteScheduledEmailReminder } from "@lib/reminders/emailReminderManager";
import { deleteScheduledSMSReminder, scheduleSMSReminder } from "@lib/reminders/smsReminderManager";
import { WORKFLOW_TRIGGER_EVENTS } from "@lib/workflows/constants";
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
        orderBy: {
          id: "asc",
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
          id: z.number().optional(),
          stepNumber: z.number(),
          action: z.enum(["EMAIL_HOST", "EMAIL_ATTENDEE", "SMS_ATTENDEE", "SMS_NUMBER"]),
          workflowId: z.number(),
          sendTo: z.string().optional().nullable(),
          reminderBody: z.string().optional().nullable(),
          emailSubject: z.string().optional().nullable(),
          template: z.enum(["CUSTOM", "REMINDER"]),
        })
        .array()
        .optional(),
      trigger: z.enum(["BEFORE_EVENT", "EVENT_CANCELLED", "NEW_EVENT"]).optional(),
      time: z.number().nullable(),
      timeUnit: z.enum(["DAY", "MINUTE", "HOUR"]).nullable(),
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

      //create reminders here for all existing bookings!!

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
          if (!!reminder.referenceId) {
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

      //update active on
      await ctx.prisma.workflowsOnEventTypes.deleteMany({
        where: {
          workflowId: id,
        },
      });
      if (activeOn && activeOn.length) {
        //create reminders for bookings from new active eventTypes (only for "before event starts" trigger)
        if (trigger === WorkflowTriggerEvents.BEFORE_EVENT) {
          const newEventTypes = activeOn.filter((eventType) => {
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
          //create reminders for all bookings with newEventTypes
          const bookingsForReminders = await ctx.prisma.booking.findMany({
            where: {
              eventTypeId: { in: newEventTypes },
            },
            include: {
              attendees: true,
              eventType: true,
              user: true,
            },
          });

          steps?.forEach(async (step) => {
            if (step.action === WorkflowActions.SMS_NUMBER) {
              bookingsForReminders.forEach(async (booking) => {
                const bookingInfo = {
                  uid: booking.uid,
                  attendees: booking.attendees,
                  organizer: booking.user,
                  startTime: booking.startTime.toISOString(),
                  title: booking.title,
                };
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
          //step was deleted
          if (!updatedStep) {
            await ctx.prisma.workflowStep.delete({
              where: {
                id: currStep.id,
              },
            });
          } else if (JSON.stringify(currStep) !== JSON.stringify(updatedStep)) {
            //step was edited
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
          }
        });
        //added steps
        const addedSteps = steps.map((s) => {
          if (s.id === -1) {
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
