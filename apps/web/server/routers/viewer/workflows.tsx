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
          activeOn: {
            select: {
              eventType: true,
            },
          },
          trigger: true,
          steps: true,
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
    }),
    async resolve({ input, ctx }) {
      const { user } = ctx;
      const { id, name, activeOn } = input;

      const userWorkflow = await ctx.prisma.workflow.findUnique({
        where: {
          id,
        },
        select: {
          userId: true,
        },
      });

      if (!userWorkflow || userWorkflow.userId !== user.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      //create reminders here for all existing bookings!!
      await ctx.prisma.workflowsOnEventTypes.deleteMany({
        where: {
          workflowId: id,
        },
      });
      if (activeOn && activeOn.length) {
        activeOn.forEach(async (eventTypeId) => {
          await ctx.prisma.workflowsOnEventTypes.createMany({
            data: {
              workflowId: id,
              eventTypeId,
            },
          });
        });
      }

      const workflow = await ctx.prisma.workflow.update({
        where: {
          id,
        },
        data: {
          name,
        },
      });

      return {
        workflow,
      };
    },
  });
