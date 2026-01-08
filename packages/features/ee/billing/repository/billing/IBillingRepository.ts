export enum Plan {
  TEAM = "TEAM",
  ORGANIZATION = "ORGANIZATION",
  ENTERPRISE = "ENTERPRISE",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
  PAST_DUE = "PAST_DUE",
  TRIALING = "TRIALING",
  INCOMPLETE = "INCOMPLETE",
  INCOMPLETE_EXPIRED = "INCOMPLETE_EXPIRED",
  UNPAID = "UNPAID",
  PAUSED = "PAUSED",
}

export interface BillingRecord {
  id: string;
  teamId: number;
  subscriptionId: string;
  subscriptionItemId: string;
  customerId: string;
  planName: Plan;
  status: SubscriptionStatus;
}

export interface IBillingRepository {
  create(args: IBillingRepositoryCreateArgs): Promise<BillingRecord>;
}

export interface IBillingRepositoryConstructorArgs {
  teamId: number;
  isOrganization: boolean;
}

export enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

export interface IBillingRepositoryCreateArgs {
  teamId: number;
  subscriptionId: string;
  subscriptionItemId: string;
  customerId: string;
  planName: Plan;
  status: SubscriptionStatus;
  billingPeriod?: BillingPeriod;
  pricePerSeat?: number;
  paidSeats?: number;
  subscriptionStart?: Date;
  subscriptionTrialEnd?: Date;
  subscriptionEnd?: Date;
}
