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

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

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

export const phoneNumberRouter = router({
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

  import: authedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        terminationUri: z.string(),
        sipTrunkAuthUsername: z.string().optional(),
        sipTrunkAuthPassword: z.string().optional(),
        nickname: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { phoneNumber, terminationUri, sipTrunkAuthUsername, sipTrunkAuthPassword, nickname } = input;
      const aiService = createDefaultAIPhoneServiceProvider();

      const importedPhoneNumber = await aiService.importPhoneNumber({
        phoneNumber,
        terminationUri,
        sipTrunkAuthUsername,
        sipTrunkAuthPassword,
        nickname,
        userId: ctx.user.id,
      });

      return importedPhoneNumber;
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

      // Delete the phone number from AI service
      try {
        const aiService = createDefaultAIPhoneServiceProvider();
        await aiService.deletePhoneNumber({
          phoneNumber: phoneNumber.phoneNumber,
          userId: ctx.user.id,
          deleteFromDB: false,
        });
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

  delete: authedProcedure.input(z.object({ phoneNumber: z.string() })).mutation(async ({ ctx, input }) => {
    const aiService = createDefaultAIPhoneServiceProvider();

    await aiService.deletePhoneNumber({
      phoneNumber: input.phoneNumber,
      userId: ctx.user.id,
      deleteFromDB: true,
    });

    return { message: "Phone number deleted successfully" };
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

      if (!config.yourPhoneNumber?.phoneNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Phone number not found for this event type.",
        });
      }

      // unassign the phone number from the AI service
      const aiService = createDefaultAIPhoneServiceProvider();
      await aiService.updatePhoneNumber(config.yourPhoneNumber.phoneNumber, {
        inboundAgentId: null,
        outboundAgentId: null,
      });

      // Update the AI configuration to unlink the phone number
      const updatedConfig = await AISelfServeConfigurationRepository.updatePhoneNumberAssignment({
        configId: config.id,
        yourPhoneNumberId: null,
      });

      return { success: true, config: updatedConfig };
    }),
});
