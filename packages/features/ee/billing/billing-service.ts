export interface BillingService {
  handleSubscriptionCreation(subscriptionId: string): Promise<void>;
  handleSubscriptionCancel(subscriptionId: string): Promise<void>;
}
