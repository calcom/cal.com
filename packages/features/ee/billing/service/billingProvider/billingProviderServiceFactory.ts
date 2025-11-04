import { StripeBillingService } from "./StripeBillingService";

export class BillingProviderServiceFactory {
  private static instance: StripeBillingService | null = null;

  static getService() {
    if (!this.instance) {
      this.instance = new StripeBillingService();
    }
    return this.instance;
  }
}
