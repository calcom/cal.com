export interface BillingService {
  checkoutSessionIsPaid(paymentId: string): Promise<boolean>;
  handleSubscriptionCancel(subscriptionId: string): Promise<void>;
  handleSubscriptionCreation(subscriptionId: string): Promise<void>;
  handleSubscriptionUpdate(args: {
    subscriptionId: string;
    subscriptionItemId: string;
    membershipCount: number;
  }): Promise<void>;
  checkIfTeamHasActivePlan(subscriptionId: string): Promise<boolean>;
}
