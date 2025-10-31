import { StripeBillingService } from "./StripeBillingService";

export class BillingProviderServiceFactory {
  static getService() {
    return new StripeBillingService();
  }
}
