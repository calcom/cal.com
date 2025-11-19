import { stripe } from "@calcom/features/ee/payments/server/stripe";

import { OrganizationBilling } from "./organization-billing";
import { OrganizationBillingRepository } from "./organization-billing.repository";

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
}
