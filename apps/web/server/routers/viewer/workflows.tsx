import { assignIn } from "lodash";
import { WorkersCumulativeStatisticsPage } from "twilio/lib/rest/taskrouter/v1/workspace/worker/workersCumulativeStatistics";
import { z } from "zod";

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
          steps: true,
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
            timeUnit,
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

      //update active on
      await ctx.prisma.workflowsOnEventTypes.deleteMany({
        where: {
          workflowId: id,
        },
      });
      if (activeOn && activeOn.length) {
        console.log("For each: " + JSON.stringify(activeOn));
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
          const stepToUpdate = steps.filter((s) => s.id === currStep.id)[0];
          //step was delete
          if (!stepToUpdate) {
            await ctx.prisma.workflowStep.delete({
              where: {
                id: currStep.id,
              },
            });
          } else if (JSON.stringify(currStep) !== JSON.stringify(stepToUpdate)) {
            //step was edited, i might need json.stringify here

            const updated = await ctx.prisma.workflowStep.update({
              where: {
                id: currStep.id,
              },
              data: {
                action: stepToUpdate.action,
                sendTo: stepToUpdate.sendTo,
                stepNumber: stepToUpdate.stepNumber,
                workflowId: stepToUpdate.workflowId,
              },
            });
          }
        });
        //added steps
        const addedSteps = steps.map((s) => {
          if (
            userWorkflow.steps.filter((currStep) => {
              currStep.id === s.id;
            }).length !== 0
          ) {
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
      console.log("TRIGGER TO CHANGE TO: " + trigger);
      const workflow = await ctx.prisma.workflow.update({
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

      return {
        workflow,
      };
    },
  });
