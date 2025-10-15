import { StripeBillingService } from "./stripe-billing-service";

export class BillingFactory {
  constructor() {
    return new StripeBillingService();
  }
}
