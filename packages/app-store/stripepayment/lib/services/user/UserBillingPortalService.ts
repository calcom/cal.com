import type { NextApiResponse } from "next";

import logger from "@calcom/lib/logger";

import { getStripeCustomerIdFromUserId } from "../../customer";
import stripe from "../../server";

/**
 * Billing portal service for individual users
 */
export class UserBillingPortalService {
  /**
   * Get customer ID for a user
   */
  async getCustomerId(userId: number): Promise<string | null> {
    return await getStripeCustomerIdFromUserId(userId);
  }

  /**
   * Process billing portal request for a user
   */
  async processBillingPortal(userId: number, returnUrl: string, res: NextApiResponse): Promise<void> {
    const customerId = await this.getCustomerId(userId);
    if (!customerId) {
      res.status(404).json({ message: "CustomerId not found" });
      return;
    }

    const billingPortalUrl = await this.createBillingPortalUrl(customerId, returnUrl);
    res.redirect(302, billingPortalUrl);
  }

  /**
   * Creates a billing portal URL for a Stripe customer
   */
  private async createBillingPortalUrl(customerId: string, returnUrl: string): Promise<string> {
    const log = logger.getSubLogger({ prefix: ["createBillingPortalUrl"] });

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return portalSession.url;
    } catch (e) {
      log.error(`Failed to create billing portal session for ${customerId}: ${e}`);
      throw new Error("Failed to create billing portal session");
    }
  }
}
