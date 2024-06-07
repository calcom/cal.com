import Stripe from "stripe";

import type { BillingService } from "./billing-service";

export class StripeBillingService implements BillingService {
  private stripe: Stripe | undefined;
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
      apiVersion: "2020-08-27",
    });
  }
  async handleTeamCreation() {
    throw new Error("Method not implemented.");
  }
  async handleTeamCancellation() {
    throw new Error("Method not implemented.");
  }
  async handleTeamDebt() {
    throw new Error("Method not implemented.");
  }
  async handleTeamDeletion() {
    throw new Error("Method not implemented.");
  }
  async handlePaymentSuccess() {
    throw new Error("Method not implemented.");
  }
  async handleSetupSuccess() {
    throw new Error("Method not implemented.");
  }
}
