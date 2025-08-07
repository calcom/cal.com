import { getStripeCustomerIdFromUserId } from "@calcom/app-store/stripepayment/lib/customer";
import { getPhoneNumberMonthlyPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { WEBAPP_URL, IS_PRODUCTION } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { PhoneNumberRepositoryInterface } from "../../interfaces/PhoneNumberRepositoryInterface";
import type { RetellAIRepository } from "../types";

export class BillingService {
  private logger = logger.getSubLogger({ prefix: ["BillingService"] });

  constructor(
    private phoneNumberRepository: PhoneNumberRepositoryInterface,
    private retellRepository: RetellAIRepository
  ) {}

  async generatePhoneNumberCheckoutSession({
    userId,
    teamId,
    agentId,
    workflowId,
  }: {
    userId: number;
    teamId?: number;
    agentId?: string | null;
    workflowId?: string;
  }) {
    const phoneNumberPriceId = getPhoneNumberMonthlyPriceId();

    if (!phoneNumberPriceId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Phone number price ID not configured. Please contact support.",
      });
    }

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
      cancel_url: `${WEBAPP_URL}/workflows/${workflowId}`,
      allow_promotion_codes: true,
      customer_update: {
        address: "auto",
      },
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
  }

  async cancelPhoneNumberSubscription({
    phoneNumberId,
    userId,
    teamId,
  }: {
    phoneNumberId: number;
    userId: number;
    teamId?: number;
  }) {
    // Find phone number with proper team authorization
    const phoneNumber = teamId
      ? await this.phoneNumberRepository.findByIdWithTeamAccess({
          id: phoneNumberId,
          teamId,
          userId,
        })
      : await this.phoneNumberRepository.findByIdAndUserId({
          id: phoneNumberId,
          userId,
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
      await stripe.subscriptions.cancel(phoneNumber.stripeSubscriptionId);

      await this.phoneNumberRepository.updateSubscriptionStatus({
        id: phoneNumberId,
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        disconnectOutboundAgent: true,
      });

      // Delete the phone number from Retell, DB
      try {
        await this.retellRepository.deletePhoneNumber(phoneNumber.phoneNumber);
      } catch (error) {
        this.logger.error("Failed to delete phone number from AI service, but subscription was cancelled:", {
          error,
        });
      }

      return { success: true, message: "Phone number subscription cancelled successfully." };
    } catch (error) {
      this.logger.error("Error cancelling phone number subscription:", { error });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel subscription. Please try again or contact support.",
      });
    }
  }
}
