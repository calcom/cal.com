import { getStripeCustomerIdFromUserId } from "@calcom/app-store/stripepayment/lib/customer";
import { checkIfTeamPaymentRequired } from "@calcom/features/ee/teams/lib/payments";
import { stripe } from "@calcom/features/ee/payments/server/stripe";
import {
  IS_PRODUCTION,
  ORGANIZATION_SELF_SERVE_PRICE,
  WEBAPP_URL,
  ORG_TRIAL_DAYS,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { BillingPeriod } from "@calcom/prisma/zod-utils";

import { OrganizationBilling, type OrgCheckoutSessionInput } from "./organization-billing";
import { OrganizationBillingRepository } from "./organization-billing.repository";

const log = logger.getSubLogger({ prefix: ["InternalOrganizationBilling"] });

export class InternalOrganizationBilling extends OrganizationBilling {
  constructor(
    organization: Parameters<typeof OrganizationBilling>[0],
    repository: OrganizationBillingRepository = new OrganizationBillingRepository()
  ) {
    super(organization);
    this.repository = repository;
  }

  async getStripeCustomerId() {
    return this.repository.getStripeCustomerId(this.organization.id);
  }

  async getSubscriptionId() {
    return this.repository.getSubscriptionId(this.organization.id);
  }

  async getSubscriptionItems() {
    const subscriptionId = await this.getSubscriptionId();
    if (!subscriptionId) return [];

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription.items.data.map((item) => ({
      id: item.id,
      quantity: item.quantity ?? 0,
    }));
  }

  async createPaymentIntent({ seats, pricePerSeat }: { seats: number; pricePerSeat: number }) {
    const stripeCustomerId = await this.getStripeCustomerId();
    if (!stripeCustomerId) {
      throw new Error("No stripe customer id found");
    }

    const amount = seats * pricePerSeat;

    return stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        organizationId: this.organization.id,
        seats,
        pricePerSeat,
      },
    });
  }

  async createCheckoutSession(input: OrgCheckoutSessionInput): Promise<{ url: string | null }> {
    const {
      userId,
      seatsUsed,
      seatsToChargeFor,
      pricePerSeat,
      billingPeriod = BillingPeriod.MONTHLY,
      tracking,
    } = input;
    const teamId = this.organization.id;

    const { url } = await checkIfTeamPaymentRequired({ teamId });
    if (url) return { url };

    const quantity = seatsToChargeFor ?? seatsUsed;
    const customer = await getStripeCustomerIdFromUserId(userId);
    const priceId = await this.resolveOrgPriceId({ pricePerSeat, billingPeriod });

    const session = await stripe.checkout.sessions.create({
      customer,
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${WEBAPP_URL}/api/teams/${teamId}/upgrade?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${WEBAPP_URL}/settings/my-account/profile`,
      line_items: [{ price: priceId, quantity }],
      customer_update: { address: "auto" },
      automatic_tax: { enabled: IS_PRODUCTION },
      metadata: {
        teamId,
        ...(tracking?.googleAds?.gclid && {
          gclid: tracking.googleAds.gclid,
          campaignId: tracking.googleAds.campaignId,
        }),
        ...(tracking?.linkedInAds?.liFatId && {
          liFatId: tracking.linkedInAds.liFatId,
          linkedInCampaignId: tracking.linkedInAds?.campaignId,
        }),
      },
      subscription_data: {
        metadata: { teamId, dubCustomerId: userId },
        ...(ORG_TRIAL_DAYS && { trial_period_days: ORG_TRIAL_DAYS }),
      },
    });

    return { url: session.url };
  }

  private async resolveOrgPriceId({
    pricePerSeat,
    billingPeriod,
  }: {
    pricePerSeat: number | null;
    billingPeriod: BillingPeriod;
  }): Promise<string> {
    const fixedPriceId = process.env.STRIPE_ORG_MONTHLY_PRICE_ID;
    if (!fixedPriceId) {
      throw new Error("STRIPE_ORG_MONTHLY_PRICE_ID env variable is not set");
    }

    if (!pricePerSeat) {
      return fixedPriceId;
    }

    if (pricePerSeat === ORGANIZATION_SELF_SERVE_PRICE) {
      return fixedPriceId;
    }

    // Custom price per seat: create a new Stripe price
    const fixedPriceObj = await stripe.prices.retrieve(fixedPriceId);
    if (!fixedPriceObj) throw new Error(`No price found for ID ${fixedPriceId}`);

    const teamId = this.organization.id;
    try {
      const pricePerSeatInCents = pricePerSeat * 100;
      const occurrence = billingPeriod === BillingPeriod.MONTHLY ? 1 : 12;
      const unitAmount = pricePerSeatInCents * occurrence;

      const customPrice = await stripe.prices.create({
        nickname: `Custom price for Organization ID: ${teamId}`,
        unit_amount: unitAmount,
        currency: fixedPriceObj.currency,
        recurring: { interval: billingPeriod === BillingPeriod.MONTHLY ? "month" : "year" },
        product: fixedPriceObj.product as string,
        tax_behavior: "exclusive",
      });
      return customPrice.id;
    } catch (e) {
      log.error(`Error creating custom price for Organization ID: ${teamId}`, safeStringify(e));
      throw new Error("Error in creation of custom price");
    }
  }
}
