import { z } from "zod";

import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const aiRouter = router({
  test: authedProcedure.query(async ({ ctx }) => {
    return {
      message: "test",
    };
  }),
  getConfig: authedProcedure.input(z.object({ eventTypeId: z.number() })).query(async ({ input }) => {
    console.log("getConfig", input);
    return await prisma.aISelfServeConfiguration.findUnique({
      where: { eventTypeId: input.eventTypeId },
    });
  }),
  setup: authedProcedure
    .input(z.object({ eventTypeId: z.number(), calApiKey: z.string(), timeZone: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { eventTypeId, calApiKey, timeZone } = input;

      const { initialSetupLLM, createAgent } = await import(
        "@calcom/features/ee/cal-ai-phone/retellAIService"
      );

      const eventType = await prisma.eventType.findFirst({
        where: {
          id: eventTypeId,
          userId: ctx.user.id,
        },
      });

      console.log("eventType", eventType);

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
  getLlm: authedProcedure.input(z.object({ llmId: z.string() })).query(async ({ input }) => {
    const { getRetellLLM } = await import("@calcom/features/ee/cal-ai-phone/retellAIService");
    return getRetellLLM(input.llmId);
  }),
  updateLlm: authedProcedure
    .input(
      z.object({
        llmId: z.string(),
        generalPrompt: z.string().optional(),
        beginMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { updateRetellLLM } = await import("@calcom/features/ee/cal-ai-phone/retellAIService");
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
  makeSelfServePhoneCall: authedProcedure
    .input(z.object({ eventTypeId: z.number(), numberToCall: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { eventTypeId, numberToCall } = input;
      const { handleCreateSelfServePhoneCall } = await import(
        "@calcom/features/ee/cal-ai-phone/handleCreateSelfServePhoneCall"
      );
      return handleCreateSelfServePhoneCall({
        userId: ctx.user.id,
        eventTypeId,
        numberToCall,
      });
    }),
});
