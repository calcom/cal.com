import { OrganizationBilling } from "./organization-billing";
import { OrganizationBillingRepository } from "./organization-billing.repository";

export class StubOrganizationBilling extends OrganizationBilling {
  constructor(
    organization: Parameters<typeof OrganizationBilling>[0],
    repository: OrganizationBillingRepository = new OrganizationBillingRepository()
  ) {
    super(organization);
    this.repository = repository;
  }

  async getStripeCustomerId() {
    return "cus_stub";
  }

  async getSubscriptionId() {
    return "sub_stub";
  }

  async getSubscriptionItems() {
    return [{ id: "si_stub", quantity: 1 }];
  }

  async createPaymentIntent() {
    return {
      id: "pi_stub",
      client_secret: "pi_stub_secret",
      status: "requires_payment_method",
    };
  }
}
