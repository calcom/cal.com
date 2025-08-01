import { z } from "zod";

import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";
import { PhoneNumberRepository } from "@calcom/lib/server/repository/phoneNumber";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const phoneNumberRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    return await PhoneNumberRepository.findPhoneNumbersFromUserId({ userId: ctx.user.id });
  }),

  buy: authedProcedure
    .input(
      z
        .object({
          teamId: z.number().optional(),
          agentId: z.string().nullish(),
          workflowId: z.string().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const aiService = createDefaultAIPhoneServiceProvider();

      // Generate checkout session for phone number subscription
      const checkoutSession = await aiService.generatePhoneNumberCheckoutSession({
        userId,
        teamId: input?.teamId,
        agentId: input?.agentId,
        workflowId: input?.workflowId,
      });

      if (checkoutSession) {
        return {
          checkoutUrl: checkoutSession.url,
          message: checkoutSession.message,
          phoneNumber: null,
        };
      }

      // This shouldn't happen as phone numbers always require payment
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Phone number billing is required but not configured.",
      });
    }),

  import: authedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        terminationUri: z.string(),
        sipTrunkAuthUsername: z.string().optional(),
        sipTrunkAuthPassword: z.string().optional(),
        nickname: z.string().optional(),
        teamId: z.number().optional(),
        agentId: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        phoneNumber,
        terminationUri,
        sipTrunkAuthUsername,
        sipTrunkAuthPassword,
        nickname,
        teamId,
        agentId,
      } = input;
      const aiService = createDefaultAIPhoneServiceProvider();

      // Use the service's importPhoneNumber which now handles agent assignment
      const importedPhoneNumber = await aiService.importPhoneNumber({
        phone_number: phoneNumber,
        termination_uri: terminationUri,
        sip_trunk_auth_username: sipTrunkAuthUsername,
        sip_trunk_auth_password: sipTrunkAuthPassword,
        nickname,
        userId: ctx.user.id,
        teamId,
        agentId,
      });

      return importedPhoneNumber;
    }),

  cancel: authedProcedure
    .input(
      z.object({
        phoneNumberId: z.number(),
        teamId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { phoneNumberId, teamId } = input;
      const aiService = createDefaultAIPhoneServiceProvider();

      return await aiService.cancelPhoneNumberSubscription({
        phoneNumberId,
        userId: ctx.user.id,
        teamId,
      });
    }),

  delete: authedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        teamId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const aiService = createDefaultAIPhoneServiceProvider();

      await aiService.deletePhoneNumber({
        phoneNumber: input.phoneNumber,
        userId: ctx.user.id,
        teamId: input.teamId,
        deleteFromDB: true,
      });

      return { message: "Phone number deleted successfully" };
    }),

  update: authedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        inboundAgentId: z.string().nullish().default(null),
        outboundAgentId: z.string().nullish().default(null),
        teamId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { phoneNumber, inboundAgentId, outboundAgentId, teamId } = input;
      const aiService = createDefaultAIPhoneServiceProvider();

      return await aiService.updatePhoneNumberWithAgents({
        phoneNumber,
        userId: ctx.user.id,
        teamId,
        inboundAgentId,
        outboundAgentId,
      });
    }),
});
