import type { Prisma, PrismaPromise } from "@prisma/client";
import {
  WorkflowTemplates,
  WorkflowActions,
  WorkflowTriggerEvents,
  BookingStatus,
  WorkflowMethods,
  TimeUnit,
} from "@prisma/client";
import { z } from "zod";

// import dayjs from "@calcom/dayjs";
import {
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
  WORKFLOW_ACTIONS,
  TIME_UNIT,
} from "@calcom/features/ee/workflows/lib/constants";
import { getWorkflowActionOptions } from "@calcom/features/ee/workflows/lib/getOptions";
import { isSMSAction } from "@calcom/features/ee/workflows/lib/isSMSAction";
import {
  deleteScheduledEmailReminder,
  scheduleEmailReminder,
} from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import {
  //  BookingInfo,
  deleteScheduledSMSReminder,
  scheduleSMSReminder,
} from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import {
  verifyPhoneNumber,
  sendVerificationCode,
} from "@calcom/features/ee/workflows/lib/reminders/verifyPhoneNumber";
import { IS_SELF_HOSTED, SENDER_ID } from "@calcom/lib/constants";
import { SENDER_NAME } from "@calcom/lib/constants";
// import { getErrorFromUnknown } from "@calcom/lib/errors";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { WorkflowStep } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import { router, authedProcedure } from "../../trpc";
import { viewerTeamsRouter } from "./teams";

function getSender(
  step: Pick<WorkflowStep, "action" | "sender"> & { senderName: string | null | undefined }
) {
  return isSMSAction(step.action) ? step.sender || SENDER_ID : step.senderName || SENDER_NAME;
}

export const workflowsRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const workflows = await ctx.prisma.workflow.findMany({
      where: {
        userId: ctx.user.id,
      },
      include: {
        activeOn: {
          select: {
            eventType: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        steps: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    return { workflows };
  }),
  get: authedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const workflow = await ctx.prisma.workflow.findFirst({
        where: {
          userId: ctx.user.id,
          id: input.id,
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
      if (!workflow) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }
      return workflow;
    }),
  create: authedProcedure
    .input(
      z.object({
        name: z.string(),
        trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
        action: z.enum(WORKFLOW_ACTIONS),
        timeUnit: z.enum(TIME_UNIT).optional(),
        time: z.number().optional(),
        sendTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, trigger, action, timeUnit, time, sendTo } = input;
      const userId = ctx.user.id;

      try {
        const workflow = await ctx.prisma.workflow.create({
          data: {
            name,
            trigger,
            userId,
            timeUnit: time ? timeUnit : undefined,
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
    }),
  createV2: authedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    try {
      const workflow = await ctx.prisma.workflow.create({
        data: {
          name: "",
          trigger: WorkflowTriggerEvents.BEFORE_EVENT,
          time: 24,
          timeUnit: TimeUnit.HOUR,
          userId,
        },
      });

      await ctx.prisma.workflowStep.create({
        data: {
          stepNumber: 1,
          action: WorkflowActions.EMAIL_HOST,
          template: WorkflowTemplates.REMINDER,
          workflowId: workflow.id,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
      });
      return { workflow };
    } catch (e) {
      throw e;
    }
  }),
  delete: authedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const workflowToDelete = await ctx.prisma.workflow.findFirst({
        where: {
          id,
          userId: ctx.user.id,
        },
      });

      if (workflowToDelete) {
        const scheduledReminders = await ctx.prisma.workflowReminder.findMany({
          where: {
            workflowStep: {
              workflowId: id,
            },
            scheduled: true,
            NOT: {
              referenceId: null,
            },
          },
        });

        scheduledReminders.forEach((reminder) => {
          if (reminder.referenceId) {
            if (reminder.method === WorkflowMethods.EMAIL) {
              deleteScheduledEmailReminder(reminder.referenceId);
            } else if (reminder.method === WorkflowMethods.SMS) {
              deleteScheduledSMSReminder(reminder.referenceId);
            }
          }
        });

        await ctx.prisma.workflow.deleteMany({
          where: {
            userId: ctx.user.id,
            id,
          },
        });
      }

      return {
        id,
      };
    }),
  update: authedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string(),
        activeOn: z.number().array(),
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
            numberRequired: z.boolean().nullable(),
            sender: z.string().optional().nullable(),
            senderName: z.string().optional().nullable(),
          })
          .array(),
        trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
        time: z.number().nullable(),
        timeUnit: z.enum(TIME_UNIT).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { id, name, activeOn, steps, trigger, time, timeUnit } = input;

      const userWorkflow = await ctx.prisma.workflow.findUnique({
        where: {
          id,
        },
        select: {
          userId: true,
          user: {
            select: {
              teams: true,
            },
          },
          steps: true,
        },
      });

      if (
        !userWorkflow ||
        userWorkflow.userId !== user.id ||
        steps.filter((step) => step.workflowId != id).length > 0
      )
        throw new TRPCError({ code: "UNAUTHORIZED" });

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

      //check if new event types belong to user
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
        if (
          newEventType &&
          newEventType.userId !== user.id &&
          !newEventType?.team?.members.find((membership) => membership.userId === user.id) &&
          !newEventType?.users.find((eventTypeUser) => eventTypeUser.id === user.id)
        ) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
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

      const deleteReminderPromise: PrismaPromise<Prisma.BatchPayload>[] = [];
      remindersToDelete.flat().forEach((reminder) => {
        //already scheduled reminders
        if (reminder.referenceId) {
          if (reminder.method === WorkflowMethods.EMAIL) {
            deleteScheduledEmailReminder(reminder.referenceId);
          } else if (reminder.method === WorkflowMethods.SMS) {
            deleteScheduledSMSReminder(reminder.referenceId);
          }
        }
        const deleteReminder = ctx.prisma.workflowReminder.deleteMany({
          where: {
            id: reminder.id,
            booking: {
              userId: ctx.user.id,
            },
          },
        });
        deleteReminderPromise.push(deleteReminder);
      });

      await Promise.all(deleteReminderPromise);

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
                };
                if (
                  step.action === WorkflowActions.EMAIL_HOST ||
                  step.action === WorkflowActions.EMAIL_ATTENDEE /*||
                  step.action === WorkflowActions.EMAIL_ADDRESS*/
                ) {
                  let sendTo = "";

                  switch (step.action) {
                    case WorkflowActions.EMAIL_HOST:
                      sendTo = bookingInfo.organizer?.email;
                      break;
                    case WorkflowActions.EMAIL_ATTENDEE:
                      sendTo = bookingInfo.attendees[0].email;
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
                    user.id
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
          //delete already scheduled reminders
          if (remindersFromStep.length > 0) {
            remindersFromStep.forEach((reminder) => {
              if (reminder.referenceId) {
                if (reminder.method === WorkflowMethods.EMAIL) {
                  deleteScheduledEmailReminder(reminder.referenceId);
                } else if (reminder.method === WorkflowMethods.SMS) {
                  deleteScheduledSMSReminder(reminder.referenceId);
                }
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
            !userWorkflow.user.teams.length &&
            !isSMSAction(oldStep.action) &&
            isSMSAction(newStep.action)
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
              reminderBody: newStep.template === WorkflowTemplates.CUSTOM ? newStep.reminderBody : null,
              emailSubject: newStep.template === WorkflowTemplates.CUSTOM ? newStep.emailSubject : null,
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
          remindersToUpdate.forEach(async (reminder) => {
            if (reminder.referenceId) {
              if (reminder.method === WorkflowMethods.EMAIL) {
                deleteScheduledEmailReminder(reminder.referenceId);
              } else if (reminder.method === WorkflowMethods.SMS) {
                deleteScheduledSMSReminder(reminder.referenceId);
              }
            }
            await ctx.prisma.workflowReminder.deleteMany({
              where: {
                id: reminder.id,
              },
            });
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
              };
              if (
                newStep.action === WorkflowActions.EMAIL_HOST ||
                newStep.action === WorkflowActions.EMAIL_ATTENDEE /*||
                newStep.action === WorkflowActions.EMAIL_ADDRESS*/
              ) {
                let sendTo = "";

                switch (newStep.action) {
                  case WorkflowActions.EMAIL_HOST:
                    sendTo = bookingInfo.organizer?.email;
                    break;
                  case WorkflowActions.EMAIL_ATTENDEE:
                    sendTo = bookingInfo.attendees[0].email;
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
                  user.id
                );
              }
            });
          }
        }
      });
      //added steps
      const addedSteps = steps.map((s) => {
        if (s.id <= 0) {
          if (!userWorkflow.user.teams.length && isSMSAction(s.action)) {
            throw new TRPCError({ code: "UNAUTHORIZED" });
          }
          const { id: stepId, ...stepToAdd } = s;
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
              (trigger === WorkflowTriggerEvents.BEFORE_EVENT ||
                trigger === WorkflowTriggerEvents.AFTER_EVENT) &&
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
                };

                if (
                  step.action === WorkflowActions.EMAIL_ATTENDEE ||
                  step.action === WorkflowActions.EMAIL_HOST /*||
                  step.action === WorkflowActions.EMAIL_ADDRESS*/
                ) {
                  let sendTo = "";

                  switch (step.action) {
                    case WorkflowActions.EMAIL_HOST:
                      sendTo = bookingInfo.organizer?.email;
                      break;
                    case WorkflowActions.EMAIL_ATTENDEE:
                      sendTo = bookingInfo.attendees[0].email;
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
                    user.id
                  );
                }
              });
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
          steps: {
            orderBy: {
              stepNumber: "asc",
            },
          },
        },
      });

      return {
        workflow,
      };
    }),
  /* testAction: authedRateLimitedProcedure({ intervalInMs: 10000, limit: 3 })
    .input(
      z.object({
        step: z.object({
          id: z.number(),
          stepNumber: z.number(),
          action: z.enum(WORKFLOW_ACTIONS),
          workflowId: z.number(),
          sendTo: z.string().optional().nullable(),
          reminderBody: z.string().optional().nullable(),
          emailSubject: z.string().optional().nullable(),
          template: z.enum(WORKFLOW_TEMPLATES),
          numberRequired: z.boolean().nullable(),
          sender: z.string().optional().nullable(),
        }),
        emailSubject: z.string(),
        reminderBody: z.string(),
      })
    )
  .mutation(async ({ ctx, input }) => {
  const { user } = ctx;
  const { step, emailSubject, reminderBody } = input;
  const { action, template, sendTo, sender } = step;

  const senderID = sender || SENDER_ID;

  if (action === WorkflowActions.SMS_NUMBER) {
    if (!sendTo) throw new TRPCError({ code: "BAD_REQUEST", message: "Missing sendTo" });
    const verifiedNumbers = await ctx.prisma.verifiedNumber.findFirst({
      where: {
        userId: ctx.user.id,
        phoneNumber: sendTo,
      },
    });
    if (!verifiedNumbers)
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Phone number is not verified" });
  }

  try {
    const userWorkflow = await ctx.prisma.workflow.findUnique({
      where: {
        id: step.workflowId,
      },
      select: {
        userId: true,
        steps: true,
      },
    });

    if (!userWorkflow || userWorkflow.userId !== user.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (isSMSAction(step.action) /*|| step.action === WorkflowActions.EMAIL_ADDRESS*/ /*) {
const hasTeamPlan = (await ctx.prisma.membership.count({ where: { userId: user.id } })) > 0;
if (!hasTeamPlan) {
  throw new TRPCError({ code: "UNAUTHORIZED", message: "Team plan needed" });
}
}

const booking = await ctx.prisma.booking.findFirst({
orderBy: {
  createdAt: "desc",
},
where: {
  userId: ctx.user.id,
},
include: {
  attendees: true,
  user: true,
},
});

let evt: BookingInfo;
if (booking) {
evt = {
  uid: booking?.uid,
  attendees:
    booking?.attendees.map((attendee) => {
      return { name: attendee.name, email: attendee.email, timeZone: attendee.timeZone };
    }) || [],
  organizer: {
    language: {
      locale: booking?.user?.locale || "",
    },
    name: booking?.user?.name || "",
    email: booking?.user?.email || "",
    timeZone: booking?.user?.timeZone || "",
  },
  startTime: booking?.startTime.toISOString() || "",
  endTime: booking?.endTime.toISOString() || "",
  title: booking?.title || "",
  location: booking?.location || null,
  additionalNotes: booking?.description || null,
  customInputs: booking?.customInputs,
};
} else {
//if no booking exists create an example booking
evt = {
  attendees: [{ name: "John Doe", email: "john.doe@example.com", timeZone: "Europe/London" }],
  organizer: {
    language: {
      locale: ctx.user.locale,
    },
    name: ctx.user.name || "",
    email: ctx.user.email,
    timeZone: ctx.user.timeZone,
  },
  startTime: dayjs().add(10, "hour").toISOString(),
  endTime: dayjs().add(11, "hour").toISOString(),
  title: "Example Booking",
  location: "Office",
  additionalNotes: "These are additional notes",
};
}

if (
action === WorkflowActions.EMAIL_ATTENDEE ||
action === WorkflowActions.EMAIL_HOST /*||
action === WorkflowActions.EMAIL_ADDRESS*/
  /*) {
      scheduleEmailReminder(
        evt,
        WorkflowTriggerEvents.NEW_EVENT,
        action,
        { time: null, timeUnit: null },
        ctx.user.email,
        emailSubject,
        reminderBody,
        0,
        template
      );
      return { message: "Notification sent" };
    } else if (action === WorkflowActions.SMS_NUMBER && sendTo) {
      scheduleSMSReminder(
        evt,
        sendTo,
        WorkflowTriggerEvents.NEW_EVENT,
        action,
        { time: null, timeUnit: null },
        reminderBody,
        0,
        template,
        senderID,
        ctx.user.id
      );
      return { message: "Notification sent" };
    }
    return {
      ok: false,
      status: 500,
      message: "Notification could not be sent",
    };
  } catch (_err) {
    const error = getErrorFromUnknown(_err);
    return {
      ok: false,
      status: 500,
      message: error.message,
    };
  }
  }),
  */
  activateEventType: authedProcedure
    .input(
      z.object({
        eventTypeId: z.number(),
        workflowId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { eventTypeId, workflowId } = input;

      // Check that workflow & event type belong to the user
      const userEventType = await ctx.prisma.eventType.findFirst({
        where: {
          id: eventTypeId,
          users: {
            some: {
              id: ctx.user.id,
            },
          },
        },
      });

      if (!userEventType)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "This event type does not belong to the user" });

      // Check that the workflow belongs to the user
      const eventTypeWorkflow = await ctx.prisma.workflow.findFirst({
        where: {
          id: workflowId,
          userId: ctx.user.id,
        },
      });

      if (!eventTypeWorkflow)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "This event type does not belong to the user" });

      //check if event type is already active
      const isActive = await ctx.prisma.workflowsOnEventTypes.findFirst({
        where: {
          workflowId,
          eventTypeId,
        },
      });

      if (isActive) {
        await ctx.prisma.workflowsOnEventTypes.deleteMany({
          where: {
            workflowId,
            eventTypeId,
          },
        });
      } else {
        await ctx.prisma.workflowsOnEventTypes.create({
          data: {
            workflowId,
            eventTypeId,
          },
        });
      }
    }),
  sendVerificationCode: authedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { phoneNumber } = input;
      return sendVerificationCode(phoneNumber);
    }),
  verifyPhoneNumber: authedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        code: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { phoneNumber, code } = input;
      const { user } = ctx;
      const verifyStatus = await verifyPhoneNumber(phoneNumber, code, user.id);
      return verifyStatus;
    }),
  getVerifiedNumbers: authedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    const verifiedNumbers = await ctx.prisma.verifiedNumber.findMany({
      where: {
        userId: user.id,
      },
    });

    return verifiedNumbers;
  }),
  getWorkflowActionOptions: authedProcedure.query(async ({ ctx }) => {
    const { hasTeamPlan } = await viewerTeamsRouter.createCaller(ctx).hasTeamPlan();
    const t = await getTranslation(ctx.user.locale, "common");
    return getWorkflowActionOptions(t, IS_SELF_HOSTED || !!hasTeamPlan);
  }),
});
