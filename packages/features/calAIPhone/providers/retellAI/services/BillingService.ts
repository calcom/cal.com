import { z } from "zod";

import { getStripeCustomerIdFromUserId } from "@calcom/app-store/stripepayment/lib/customer";
import { getPhoneNumberMonthlyPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { CHECKOUT_SESSION_TYPES } from "@calcom/features/ee/billing/constants";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { WEBAPP_URL, IS_PRODUCTION } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import type { TrackingData } from "@calcom/lib/tracking";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import type { PhoneNumberRepositoryInterface } from "../../interfaces/PhoneNumberRepositoryInterface";
import type { RetellAIRepository } from "../types";

const stripeErrorSchema = z.object({
  raw: z.object({
    code: z.string(),
  }),
});

export class BillingService {
  private logger = logger.getSubLogger({ prefix: ["BillingService"] });
  constructor(
    private deps: {
      phoneNumberRepository: PhoneNumberRepositoryInterface;
      retellRepository: RetellAIRepository;
    }
  ) { }

  async generatePhoneNumberCheckoutSession({
    userId,
    teamId,
    agentId,
    workflowId,
    tracking,
  }: {
    userId: number;
    teamId?: number;
    agentId?: string | null;
    workflowId?: string;
    tracking?: TrackingData;
  }) {
    const phoneNumberPriceId = getPhoneNumberMonthlyPriceId();

    if (!phoneNumberPriceId) {
      throw new HttpError({
        statusCode: 500,
        message: "Phone number price ID not configured",
      });
    }

    const stripeCustomerId = await getStripeCustomerIdFromUserId(userId);
    if (!stripeCustomerId) {
      throw new HttpError({
        statusCode: 500,
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
      success_url: `${WEBAPP_URL}/api/calAIPhone/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
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
        type: CHECKOUT_SESSION_TYPES.PHONE_NUMBER_SUBSCRIPTION,
        ...(tracking?.googleAds?.gclid && { gclid: tracking.googleAds.gclid, campaignId: tracking.googleAds.campaignId }),
        ...(tracking?.linkedInAds?.liFatId && { liFatId: tracking.linkedInAds.liFatId, linkedInCampaignId: tracking.linkedInAds?.campaignId }),
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          teamId: teamId?.toString() || "",
          agentId: agentId || "",
          workflowId: workflowId || "",
          type: CHECKOUT_SESSION_TYPES.PHONE_NUMBER_SUBSCRIPTION,
        },
      },
    });

    if (!checkoutSession.url) {
      throw new HttpError({
        statusCode: 500,
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
      ? await this.deps.phoneNumberRepository.findByIdWithTeamAccess({
        id: phoneNumberId,
        teamId,
        userId,
      })
      : await this.deps.phoneNumberRepository.findByIdAndUserId({
        id: phoneNumberId,
        userId,
      });

    if (!phoneNumber) {
      throw new HttpError({
        statusCode: 404,
        message: "Phone number not found or you don't have permission to cancel it.",
      });
    }

    if (!phoneNumber.stripeSubscriptionId) {
      throw new HttpError({
        statusCode: 400,
        message: "Phone number doesn't have an active subscription.",
      });
    }

    try {
      await this.deps.phoneNumberRepository.updateSubscriptionStatus({
        id: phoneNumberId,
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        disconnectAgents: false,
      });

      try {
        await stripe.subscriptions.cancel(phoneNumber.stripeSubscriptionId);
      } catch (error) {
        const parsedError = stripeErrorSchema.safeParse(error);
        if (parsedError.success && parsedError.data.raw.code === "resource_missing") {
          this.logger.info("Subscription not found in Stripe (already cancelled or deleted):", {
            subscriptionId: phoneNumber.stripeSubscriptionId,
            phoneNumberId,
            stripeMessage: "Subscription resource not found",
          });
        } else {
          await this.deps.phoneNumberRepository.updateSubscriptionStatus({
            id: phoneNumberId,
            subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
          });
          throw error;
        }
      }

      // Disconnnect agent after cancelling from stripe
      await this.deps.phoneNumberRepository.updateSubscriptionStatus({
        id: phoneNumberId,
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        disconnectAgents: true,
      });

      // Delete the phone number from Retell, DB
      try {
        await this.deps.retellRepository.deletePhoneNumber(phoneNumber.phoneNumber);
      } catch (error) {
        this.logger.error("Failed to delete phone number from AI service, but subscription was cancelled:", {
          error,
        });
      }

      return { success: true, message: "Phone number subscription cancelled successfully." };
    } catch (error) {
      this.logger.error("Error cancelling phone number subscription:", { error });
      throw new HttpError({
        statusCode: 500,
        message: "Failed to cancel subscription. Please try again or contact support.",
      });
    }
  }
}
