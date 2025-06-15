import { z } from "zod";

import { handleCreateSelfServePhoneCall } from "@calcom/features/ee/cal-ai-phone/handleCreateSelfServePhoneCall";
import {
  createAgent,
  getRetellLLM,
  initialSetupLLM,
  updateRetellLLM,
} from "@calcom/features/ee/cal-ai-phone/retellAIService";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../../trpc";

export const aiRouter = router({
  getConfig: protectedProcedure.input(z.object({ eventTypeId: z.number() })).query(async ({ input }) => {
    return prisma.aISelfServeConfiguration.findUnique({
      where: { eventTypeId: input.eventTypeId },
    });
  }),
  setup: protectedProcedure
    .input(z.object({ eventTypeId: z.number(), calApiKey: z.string(), timeZone: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { eventTypeId, calApiKey, timeZone } = input;

      const eventType = await prisma.eventType.findFirst({
        where: {
          id: eventTypeId,
          userId: ctx.user.id,
        },
      });

      if (!eventType) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const llm = await initialSetupLLM(calApiKey, timeZone, eventTypeId);
      if (!llm.llm_id) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create LLM." });
      }

      const agentName = `agent-for-user-${ctx.user.id}-${ctx.user.username}-${Math.floor(
        Math.random() * 10000
      )}`;
      const agent = await createAgent(llm.llm_id, agentName);
      if (!agent.agent_id) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create agent." });
      }

      const config = await prisma.aISelfServeConfiguration.create({
        data: {
          eventTypeId,
          enabled: true,
          llmId: llm.llm_id,
          agentId: agent.agent_id,
          agentTimeZone: timeZone,
        },
      });

      return config;
    }),
  getLlm: protectedProcedure.input(z.object({ llmId: z.string() })).query(async ({ input }) => {
    return getRetellLLM(input.llmId);
  }),
  updateLlm: protectedProcedure
    .input(
      z.object({
        llmId: z.string(),
        generalPrompt: z.string().optional(),
        beginMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { llmId, ...updateData } = input;

      const config = await prisma.aISelfServeConfiguration.findFirst({
        where: {
          llmId: llmId,
          eventType: {
            userId: ctx.user.id,
          },
        },
      });

      if (!config) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return updateRetellLLM(llmId, updateData);
    }),
  makePhoneCall: protectedProcedure
    .input(z.object({ eventTypeId: z.number(), numberToCall: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { eventTypeId, numberToCall } = input;
      return handleCreateSelfServePhoneCall({
        userId: ctx.user.id,
        eventTypeId,
        numberToCall,
      });
    }),
});
