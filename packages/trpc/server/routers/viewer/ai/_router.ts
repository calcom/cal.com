import { z } from "zod";

import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import type { RetellLLMGeneralTools } from "@calcom/features/calAIPhone/providers/retellAI/types";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const aiRouter = router({
  list: authedProcedure
    .input(
      z
        .object({
          teamId: z.number().optional(),
          scope: z.enum(["personal", "team", "all"]).optional().default("all"),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const aiService = createDefaultAIPhoneServiceProvider();

      return await aiService.listAgents({
        userId: ctx.user.id,
        teamId: input?.teamId,
        scope: input?.scope ?? "all",
      });
    }),

  get: authedProcedure
    .input(
      z.object({
        id: z.string(),
        teamId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const aiService = createDefaultAIPhoneServiceProvider();

      return await aiService.getAgentWithDetails({
        id: input.id,
        userId: ctx.user.id,
        teamId: input.teamId,
      });
    }),

  create: authedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        teamId: z.number().optional(),
        workflowStepId: z.number().optional(),
        generalPrompt: z.string().optional(),
        beginMessage: z.string().optional(),
        generalTools: z
          .array(
            z.object({
              type: z.string(),
              name: z.string(),
              description: z.string().optional(),
              cal_api_key: z.string().optional(),
              event_type_id: z.number().optional(),
              timezone: z.string().optional(),
            })
          )
          .optional(),
        voiceId: z.string().optional().default("11labs-Adrian"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, name, workflowStepId, ...retellConfig } = input;

      const aiService = createDefaultAIPhoneServiceProvider();

      return await aiService.createAgent({
        name,
        userId: ctx.user.id,
        teamId,
        workflowStepId,
        generalPrompt: retellConfig.generalPrompt,
        beginMessage: retellConfig.beginMessage,
        generalTools: retellConfig.generalTools as RetellLLMGeneralTools,
        userTimeZone: ctx.user.timeZone,
      });
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        teamId: z.number().optional(),
        name: z.string().optional(),
        enabled: z.boolean().optional(),
        generalPrompt: z.string().nullish().default(null),
        beginMessage: z.string().nullish().default(null),
        generalTools: z
          .array(
            z.object({
              type: z.string(),
              name: z.string(),
              description: z.string().nullish().default(null),
              cal_api_key: z.string().nullish().default(null),
              event_type_id: z.number().nullish().default(null),
              timezone: z.string().nullish().default(null),
            })
          )
          .optional(),
        voiceId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, teamId, name, enabled, ...retellUpdates } = input;

      const aiService = createDefaultAIPhoneServiceProvider();

      return await aiService.updateAgentConfiguration({
        id,
        userId: ctx.user.id,
        teamId,
        name,
        generalPrompt: retellUpdates.generalPrompt,
        beginMessage: retellUpdates.beginMessage,
        generalTools: retellUpdates.generalTools as RetellLLMGeneralTools,
        voiceId: retellUpdates.voiceId,
      });
    }),

  delete: authedProcedure
    .input(
      z.object({
        id: z.string(),
        teamId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const aiService = createDefaultAIPhoneServiceProvider();

      return await aiService.deleteAgent({
        id: input.id,
        userId: ctx.user.id,
        teamId: input.teamId,
      });
    }),

  testCall: authedProcedure
    .input(
      z.object({
        agentId: z.string(),
        phoneNumber: z.string().optional(),
        teamId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const aiService = createDefaultAIPhoneServiceProvider();

      return await aiService.createTestCall({
        agentId: input.agentId,
        phoneNumber: input.phoneNumber,
        userId: ctx.user.id,
        teamId: input.teamId,
      });
    }),
});
