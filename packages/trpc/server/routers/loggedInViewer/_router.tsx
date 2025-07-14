import { z } from "zod";

import { getStripeCustomerIdFromUserId } from "@calcom/app-store/stripepayment/lib/customer";
import { getPhoneNumberMonthlyPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../procedures/authedProcedure";
import { router } from "../../trpc";
import { ZAddNotificationsSubscriptionInputSchema } from "./addNotificationsSubscription.schema";
import { ZAddSecondaryEmailInputSchema } from "./addSecondaryEmail.schema";
import { ZConnectAndJoinInputSchema } from "./connectAndJoin.schema";
import { ZEventTypeOrderInputSchema } from "./eventTypeOrder.schema";
import { ZNoShowInputSchema } from "./markNoShow.schema";
import { teamsAndUserProfilesQuery } from "./procedures/teamsAndUserProfilesQuery";
import { ZRemoveNotificationsSubscriptionInputSchema } from "./removeNotificationsSubscription.schema";
import { ZRoutingFormOrderInputSchema } from "./routingFormOrder.schema";

type AppsRouterHandlerCache = {
  stripeCustomer?: typeof import("./stripeCustomer.handler").stripeCustomerHandler;
  eventTypeOrder?: typeof import("./eventTypeOrder.handler").eventTypeOrderHandler;
  routingFormOrder?: typeof import("./routingFormOrder.handler").routingFormOrderHandler;
  teamsAndUserProfilesQuery?: typeof import("./teamsAndUserProfilesQuery.handler").teamsAndUserProfilesQuery;
  connectAndJoin?: typeof import("./connectAndJoin.handler").Handler;
  addSecondaryEmail?: typeof import("./addSecondaryEmail.handler").addSecondaryEmailHandler;
  addNotificationsSubscription?: typeof import("./addNotificationsSubscription.handler").addNotificationsSubscriptionHandler;
  removeNotificationsSubscription?: typeof import("./removeNotificationsSubscription.handler").removeNotificationsSubscriptionHandler;
  markNoShow?: typeof import("./markNoShow.handler").markNoShow;
};

const generatePhoneNumberCheckoutSession = async ({
  userId,
  eventTypeId,
}: {
  userId: number;
  eventTypeId?: number;
}) => {
  const phoneNumberPriceId = getPhoneNumberMonthlyPriceId();

  if (!phoneNumberPriceId) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Phone number price ID not configured. Please contact support.",
    });
  }

  // Get or create Stripe customer
  const stripeCustomerId = await getStripeCustomerIdFromUserId(userId);
  if (!stripeCustomerId) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Stripe customer.",
    });
  }

  // Create Stripe checkout session for phone number subscription
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [
      {
        price: phoneNumberPriceId,
        quantity: 1,
      },
    ],
    success_url: `${WEBAPP_URL}/api/phone-numbers/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${WEBAPP_URL}/settings/my-account/phone-numbers`,
    allow_promotion_codes: true,
    customer_update: {
      address: "auto",
    },
    // Disabled when testing locally as usually developer doesn't setup Tax in Stripe Test mode
    automatic_tax: {
      enabled: IS_PRODUCTION,
    },
    metadata: {
      userId: userId.toString(),
      eventTypeId: eventTypeId?.toString() || "",
      type: "phone_number_subscription",
    },
    subscription_data: {
      metadata: {
        userId: userId.toString(),
        eventTypeId: eventTypeId?.toString() || "",
        type: "phone_number_subscription",
      },
    },
  });

  if (!checkoutSession.url) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create checkout session.",
    });
  }

  return { url: checkoutSession.url, message: "Payment required to purchase phone number" };
};

export const loggedInViewerRouter = router({
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

  list: authedProcedure.query(async ({ ctx }) => {
    const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");
    return await PhoneNumberRepository.findPhoneNumbersFromUserId({ userId: ctx.user.id });
  }),

  buy: authedProcedure
    .input(z.object({ eventTypeId: z.number().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const eventTypeId = input?.eventTypeId;
      const userId = ctx.user.id;

      // Generate checkout session for phone number subscription
      const checkoutSession = await generatePhoneNumberCheckoutSession({
        userId,
        eventTypeId,
      });

      // If there is a checkout session, return it
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

  cancel: authedProcedure.input(z.object({ phoneNumberId: z.number() })).mutation(async ({ ctx, input }) => {
    const { phoneNumberId } = input;

    // Find the phone number and verify ownership
    const phoneNumber = await prisma.calAiPhoneNumber.findFirst({
      where: {
        id: phoneNumberId,
        userId: ctx.user.id,
      },
    });

    if (!phoneNumber) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Phone number not found or you don't have permission to cancel it.",
      });
    }

    if (!phoneNumber.stripeSubscriptionId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Phone number doesn't have an active subscription.",
      });
    }

    try {
      // Cancel the Stripe subscription
      await stripe.subscriptions.cancel(phoneNumber.stripeSubscriptionId);

      // Update the phone number status
      await prisma.calAiPhoneNumber.update({
        where: {
          id: phoneNumberId,
        },
        data: {
          subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        },
      });

      // Remove phone number from AI configurations
      const { AISelfServeConfigurationRepository } = await import(
        "@calcom/lib/server/repository/aiSelfServeConfiguration"
      );
      await AISelfServeConfigurationRepository.removePhoneNumberFromConfigurations({
        phoneNumberId,
      });

      // Delete the phone number from AI service
      try {
        const aiService = createDefaultAIPhoneServiceProvider();
        await aiService.deletePhoneNumber(phoneNumber.phoneNumber);
      } catch (error) {
        // Log the error but don't fail the cancellation
        console.error(
          "Failed to delete phone number from AI service, but subscription was cancelled:",
          error
        );
      }

      return { success: true, message: "Phone number subscription cancelled successfully." };
    } catch (error) {
      console.error("Error cancelling phone number subscription:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel subscription. Please try again or contact support.",
      });
    }
  }),

  stripeCustomer: authedProcedure.query(async ({ ctx }) => {
    const { stripeCustomerHandler } = await import("./stripeCustomer.handler");
    return stripeCustomerHandler({ ctx });
  }),

  unlinkConnectedAccount: authedProcedure.mutation(async (opts) => {
    const unlinkConnectedAccountHandler = await import("./unlinkConnectedAccount.handler").then(
      (mod) => mod.default
    );
    return unlinkConnectedAccountHandler(opts);
  }),

  eventTypeOrder: authedProcedure.input(ZEventTypeOrderInputSchema).mutation(async ({ ctx, input }) => {
    const { eventTypeOrderHandler } = await import("./eventTypeOrder.handler");
    return eventTypeOrderHandler({ ctx, input });
  }),

  routingFormOrder: authedProcedure.input(ZRoutingFormOrderInputSchema).mutation(async ({ ctx, input }) => {
    const { routingFormOrderHandler } = await import("./routingFormOrder.handler");
    return routingFormOrderHandler({ ctx, input });
  }),

  teamsAndUserProfilesQuery,
  connectAndJoin: authedProcedure.input(ZConnectAndJoinInputSchema).mutation(async ({ ctx, input }) => {
    const { Handler } = await import("./connectAndJoin.handler");
    return Handler({ ctx, input });
  }),
  addSecondaryEmail: authedProcedure.input(ZAddSecondaryEmailInputSchema).mutation(async ({ ctx, input }) => {
    const { addSecondaryEmailHandler } = await import("./addSecondaryEmail.handler");
    return addSecondaryEmailHandler({ ctx, input });
  }),
  addNotificationsSubscription: authedProcedure
    .input(ZAddNotificationsSubscriptionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { addNotificationsSubscriptionHandler } = await import("./addNotificationsSubscription.handler");
      return addNotificationsSubscriptionHandler({ ctx, input });
    }),
  removeNotificationsSubscription: authedProcedure
    .input(ZRemoveNotificationsSubscriptionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { removeNotificationsSubscriptionHandler } = await import(
        "./removeNotificationsSubscription.handler"
      );
      return removeNotificationsSubscriptionHandler({ ctx, input });
    }),
  markNoShow: authedProcedure.input(ZNoShowInputSchema).mutation(async (opts) => {
    const { markNoShow } = await import("./markNoShow.handler");
    return markNoShow(opts);
  }),

  assignPhoneNumber: authedProcedure
    .input(z.object({ eventTypeId: z.number(), phoneNumberId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { eventTypeId, phoneNumberId } = input;

      // Get the AI configuration for this event type
      const { AISelfServeConfigurationRepository } = await import(
        "@calcom/lib/server/repository/aiSelfServeConfiguration"
      );
      const config = await AISelfServeConfigurationRepository.findByEventTypeIdAndUserId({
        eventTypeId,
        userId: ctx.user.id,
      });

      if (!config || !config.agentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "AI agent not found for this event type.",
        });
      }

      // Get the phone number details
      const phoneNumber = await prisma.calAiPhoneNumber.findFirst({
        where: {
          id: phoneNumberId,
          userId: ctx.user.id,
        },
      });

      if (!phoneNumber) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Phone number not found or you don't have permission to use it.",
        });
      }

      const aiService = createDefaultAIPhoneServiceProvider();

      try {
        await aiService.updatePhoneNumber(phoneNumber.phoneNumber, {
          inboundAgentId: config.agentId,
          outboundAgentId: config.agentId,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign phone number to agent in AI service.",
        });
      }

      // Update the AI configuration to link the phone number
      const updatedConfig = await AISelfServeConfigurationRepository.updatePhoneNumberAssignment({
        configId: config.id,
        yourPhoneNumberId: phoneNumberId,
      });

      return { success: true, config: updatedConfig };
    }),

  unassignPhoneNumber: authedProcedure
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
          code: "BAD_REQUEST",
          message: "AI configuration not found for this event type.",
        });
      }

      // Update the AI configuration to unlink the phone number
      const updatedConfig = await AISelfServeConfigurationRepository.updatePhoneNumberAssignment({
        configId: config.id,
        yourPhoneNumberId: null,
      });

      return { success: true, config: updatedConfig };
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
