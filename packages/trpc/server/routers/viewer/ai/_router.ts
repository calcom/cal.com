import { z } from "zod";

import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";
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
    console.log("loggedInViewerRouter.getConfig", input);
    const { AISelfServeConfigurationRepository } = await import(
      "@calcom/lib/server/repository/aiSelfServeConfiguration"
    );
    return await AISelfServeConfigurationRepository.findByEventTypeId({
      eventTypeId: input.eventTypeId,
    });
  }),

  setup: authedProcedure
    .input(z.object({ eventTypeId: z.number(), agentTimeZone: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { eventTypeId, agentTimeZone } = input;

      const { createHandler: createApiKeyHandler } = await import(
        "@calcom/trpc/server/routers/viewer/apiKeys/create.handler"
      );

      const calApiKey = await createApiKeyHandler({
        ctx,
        input: {
          note: `cal.ai api key for making phone calls for event type id: ${eventTypeId}`,
          neverExpires: true,
        },
      });

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

      const aiService = createDefaultAIPhoneServiceProvider();

      try {
        const { llmId, agentId } = await aiService.setupConfiguration({
          calApiKey,
          timeZone: agentTimeZone,
          eventTypeId,
        });

        const { AISelfServeConfigurationRepository } = await import(
          "@calcom/lib/server/repository/aiSelfServeConfiguration"
        );
        const config = await AISelfServeConfigurationRepository.create({
          eventTypeId,
          enabled: true,
          llmId,
          agentId,
          agentTimeZone,
        });

        return config;
      } catch (error) {
        console.error("Error setting up AI configuration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set up AI configuration. Please try again or contact support.",
        });
      }
    }),

  getLlm: authedProcedure.input(z.object({ llmId: z.string() })).query(async ({ input }) => {
    const aiService = createDefaultAIPhoneServiceProvider();
    return aiService.getLLMDetails(input.llmId);
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
      const { llmId, ...updateData } = input;

      const { AISelfServeConfigurationRepository } = await import(
        "@calcom/lib/server/repository/aiSelfServeConfiguration"
      );
      const config = await AISelfServeConfigurationRepository.findByLlmIdAndUserId({
        llmId: llmId,
        userId: ctx.user.id,
      });

      if (!config) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const aiService = createDefaultAIPhoneServiceProvider();

      return aiService.updateLLMConfiguration(llmId, updateData);
    }),
  makeSelfServePhoneCall: authedProcedure
    .input(z.object({ eventTypeId: z.number(), numberToCall: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { eventTypeId, numberToCall } = input;

      // Check if user has at least 5 credits before making a call
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      const creditService = new CreditService();

      const hasCredits = await creditService.hasAvailableCredits({ userId: ctx.user.id });
      if (!hasCredits) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient credits to make phone calls. Please purchase more credits.",
        });
      }

      // Get detailed credit information to check minimum threshold
      const creditInfo = await creditService.getAllCredits({ userId: ctx.user.id });
      const totalAvailableCredits = creditInfo.totalRemainingMonthlyCredits + creditInfo.additionalCredits;

      if (totalAvailableCredits < 5) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Insufficient credits to make phone calls. You need at least 5 credits but only have ${totalAvailableCredits}. Please purchase more credits.`,
        });
      }

      const { handleCreateSelfServePhoneCall } = await import("@calcom/features/ee/cal-ai-phone");
      const call = await handleCreateSelfServePhoneCall({
        userId: ctx.user.id,
        eventTypeId,
        numberToCall,
      });
      return call;
    }),

  deleteAiConfig: authedProcedure
    .input(z.object({ eventTypeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { eventTypeId } = input;

      // Get the AI configuration for this event type
      const { AISelfServeConfigurationRepository } = await import(
        "@calcom/lib/server/repository/aiSelfServeConfiguration"
      );
      const config = await AISelfServeConfigurationRepository.findByEventTypeIdAndUserId({
        eventTypeId,
        userId: ctx.user.id,
      });

      if (!config) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AI configuration not found for this event type.",
        });
      }

      const aiService = createDefaultAIPhoneServiceProvider();

      try {
        // Delete external resources with fault tolerance
        const deletionResult = await aiService.deleteConfiguration({
          llmId: config.llmId || undefined,
          agentId: config.agentId || undefined,
        });

        await AISelfServeConfigurationRepository.delete({
          id: config.id,
        });

        if (deletionResult.success) {
          return {
            success: true,
            message: "AI configuration deleted successfully.",
            deletionResult,
          };
        } else {
          return {
            success: true,
            message:
              "AI configuration deleted from database. Some external resources may need manual cleanup.",
            deletionResult,
            warnings: deletionResult.errors,
          };
        }
      } catch (error) {
        console.error("Error deleting AI configuration:", error);

        // Try to delete database record even if external deletion fails
        try {
          await AISelfServeConfigurationRepository.delete({
            id: config.id,
          });

          return {
            success: true,
            message:
              "AI configuration deleted from database, but external cleanup failed. Manual cleanup may be required.",
            warnings: [
              `External deletion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            ],
          };
        } catch (dbError) {
          console.error("Failed to delete AI configuration from database:", dbError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete AI configuration. Please try again or contact support.",
          });
        }
      }
    }),
});
