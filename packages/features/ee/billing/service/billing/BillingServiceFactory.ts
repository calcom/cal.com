import { StripeBillingService } from "./StripeBillingService";

export class BillingFactory {
  constructor() {
    return new StripeBillingService();
  }
}
