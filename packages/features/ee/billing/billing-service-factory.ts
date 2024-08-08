import { StripeBillingService } from "./stripe-billling-service";

export class BillingFactory {
  constructor() {
    return new StripeBillingService();
  }
}
