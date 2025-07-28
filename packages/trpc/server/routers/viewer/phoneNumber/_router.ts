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
  teamId,
  agentId,
  workflowId,
}: {
  userId: number;
  teamId?: number;
  agentId?: string;
  workflowId?: string;
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
      teamId: teamId?.toString() || "",
      agentId: agentId || "",
      workflowId: workflowId || "",
      type: "phone_number_subscription",
    },
    subscription_data: {
      metadata: {
        userId: userId.toString(),
        teamId: teamId?.toString() || "",
        agentId: agentId || "",
        workflowId: workflowId || "",
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
    .input(
      z
        .object({
          teamId: z.number().optional(),
          agentId: z.string().optional(),
          workflowId: z.string().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Generate checkout session for phone number subscription
      const checkoutSession = await generatePhoneNumberCheckoutSession({
        userId,
        teamId: input?.teamId,
        agentId: input?.agentId,
        workflowId: input?.workflowId,
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
        teamId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { phoneNumber, terminationUri, sipTrunkAuthUsername, sipTrunkAuthPassword, nickname } = input;
      const aiService = createDefaultAIPhoneServiceProvider();

      const importedPhoneNumber = await aiService.importPhoneNumber({
        phone_number: phoneNumber,
        termination_uri: terminationUri,
        sip_trunk_auth_username: sipTrunkAuthUsername,
        sip_trunk_auth_password: sipTrunkAuthPassword,
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

  update: authedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        inboundAgentId: z.string().nullish().default(null),
        outboundAgentId: z.string().nullish().default(null),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { phoneNumber, inboundAgentId, outboundAgentId } = input;

      // Find the phone number and verify ownership
      const phoneNumberRecord = await prisma.calAiPhoneNumber.findFirst({
        where: {
          phoneNumber,
          userId: ctx.user.id,
        },
      });

      if (!phoneNumberRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Phone number not found or you don't have permission to update it.",
        });
      }

      if (inboundAgentId) {
        const inboundAgent = await prisma.agent.findFirst({
          where: {
            retellAgentId: inboundAgentId,
            OR: [
              { userId: ctx.user.id },
              {
                team: {
                  members: {
                    some: {
                      userId: ctx.user.id,
                      accepted: true,
                    },
                  },
                },
              },
            ],
          },
        });

        if (!inboundAgent) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to use the selected inbound agent.",
          });
        }
      }

      if (outboundAgentId) {
        const outboundAgent = await prisma.agent.findFirst({
          where: {
            retellAgentId: outboundAgentId,
            OR: [
              { userId: ctx.user.id },
              {
                team: {
                  members: {
                    some: {
                      userId: ctx.user.id,
                      accepted: true,
                    },
                  },
                },
              },
            ],
          },
        });

        if (!outboundAgent) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to use the selected outbound agent.",
          });
        }
      }

      const aiService = createDefaultAIPhoneServiceProvider();

      try {
        await aiService.getPhoneNumber(phoneNumber);

        const retellUpdateData: { inbound_agent_id?: string | null; outbound_agent_id?: string | null } = {};

        if (inboundAgentId !== undefined) {
          retellUpdateData.inbound_agent_id = inboundAgentId;
        }

        if (outboundAgentId !== undefined) {
          retellUpdateData.outbound_agent_id = outboundAgentId;
        }

        if (Object.keys(retellUpdateData).length > 0) {
          await aiService.updatePhoneNumber(phoneNumber, retellUpdateData);
        }
      } catch (error: any) {
        // Check if it's a 404 error (phone number not found in Retell)
        if (error.message?.includes("404") || error.message?.includes("Not Found")) {
          console.log(`Phone number ${phoneNumber} not found in Retell - updating local database only`);
        } else {
          console.error("Failed to update phone number in AI service:", error);
        }
      }

      const updateData: {
        inboundAgent?: { connect: { retellAgentId: string } } | { disconnect: true };
        outboundAgent?: { connect: { retellAgentId: string } } | { disconnect: true };
      } = {};

      if (inboundAgentId !== undefined) {
        if (inboundAgentId) {
          updateData.inboundAgent = {
            connect: { retellAgentId: inboundAgentId },
          };
        } else {
          updateData.inboundAgent = { disconnect: true };
        }
      }

      if (outboundAgentId !== undefined) {
        if (outboundAgentId) {
          updateData.outboundAgent = {
            connect: { retellAgentId: outboundAgentId },
          };
        } else {
          updateData.outboundAgent = { disconnect: true };
        }
      }

      await prisma.calAiPhoneNumber.update({
        where: {
          id: phoneNumberRecord.id,
        },
        data: updateData,
      });

      return { message: "Phone number updated successfully" };
    }),
});
